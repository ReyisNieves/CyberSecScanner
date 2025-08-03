using System.Diagnostics;
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;
using System.Threading.Channels;
using CyberSecScanner.Backend.Models;
using MediatR;
using Microsoft.Extensions.Logging;

namespace CyberSecScanner.Backend.Services;

public interface IScanEngine
{
    Task<string> StartScanAsync(ScanRequest request, CancellationToken cancellationToken = default);
    Task<bool> StopScanAsync(string scanId, CancellationToken cancellationToken = default);
    Task<ScanResult?> GetScanResultAsync(string scanId, CancellationToken cancellationToken = default);
    IAsyncEnumerable<ScanResult> GetActiveScanResultsAsync(CancellationToken cancellationToken = default);
}

public class ScanEngine : IScanEngine
{
    private readonly ILogger<ScanEngine> _logger;
    private readonly IMediator _mediator;
    private readonly ISystemMetricsService _systemMetrics;
    private readonly Channel<ScanRequest> _scanQueue;
    private readonly Dictionary<string, ScanResult> _activeScanResults;
    private readonly Dictionary<string, CancellationTokenSource> _scanCancellationTokens;
    private readonly SemaphoreSlim _concurrencyControl;
    private readonly Timer _resourceMonitorTimer;

    public ScanEngine(
        ILogger<ScanEngine> logger,
        IMediator mediator,
        ISystemMetricsService systemMetrics)
    {
        _logger = logger;
        _mediator = mediator;
        _systemMetrics = systemMetrics;
        
        // Create bounded channel for scan queue
        var options = new BoundedChannelOptions(100)
        {
            FullMode = BoundedChannelFullMode.Wait,
            SingleReader = false,
            SingleWriter = false
        };
        
        _scanQueue = Channel.CreateBounded<ScanRequest>(options);
        _activeScanResults = new Dictionary<string, ScanResult>();
        _scanCancellationTokens = new Dictionary<string, CancellationTokenSource>();
        _concurrencyControl = new SemaphoreSlim(3, 3); // Max 3 concurrent scans
        
        // Start processing queue
        _ = Task.Run(ProcessScanQueueAsync);
        
        // Monitor system resources every 30 seconds
        _resourceMonitorTimer = new Timer(MonitorSystemResources, null, TimeSpan.Zero, TimeSpan.FromSeconds(30));
    }

    public async Task<string> StartScanAsync(ScanRequest request, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Queuing scan request {ScanId} of type {ScanType}", request.Id, request.Type);
        
        // Create initial scan result
        var scanResult = new ScanResult
        {
            Id = Guid.NewGuid().ToString(),
            ScanId = request.Id,
            Status = ScanStatus.Queued,
            StartTime = DateTime.UtcNow
        };
        
        _activeScanResults[request.Id] = scanResult;
        
        // Queue the scan request
        await _scanQueue.Writer.WriteAsync(request, cancellationToken);
        
        return request.Id;
    }

    public Task<bool> StopScanAsync(string scanId, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Stopping scan {ScanId}", scanId);
        
        if (_scanCancellationTokens.TryGetValue(scanId, out var cts))
        {
            cts.Cancel();
            
            if (_activeScanResults.TryGetValue(scanId, out var result))
            {
                result.Status = ScanStatus.Cancelled;
                result.EndTime = DateTime.UtcNow;
            }
            
            return Task.FromResult(true);
        }
        
        return Task.FromResult(false);
    }

    public Task<ScanResult?> GetScanResultAsync(string scanId, CancellationToken cancellationToken = default)
    {
        var result = _activeScanResults.TryGetValue(scanId, out var scanResult) ? scanResult : null;
        return Task.FromResult(result);
    }

    public async IAsyncEnumerable<ScanResult> GetActiveScanResultsAsync([EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        await Task.Yield(); // Make it properly async
        
        foreach (var result in _activeScanResults.Values)
        {
            if (result.Status == ScanStatus.Running || result.Status == ScanStatus.Starting)
            {
                yield return result;
            }
        }
    }

    private async Task ProcessScanQueueAsync()
    {
        await foreach (var scanRequest in _scanQueue.Reader.ReadAllAsync())
        {
            _ = Task.Run(async () =>
            {
                await _concurrencyControl.WaitAsync();
                try
                {
                    await ExecuteScanAsync(scanRequest);
                }
                finally
                {
                    _concurrencyControl.Release();
                }
            });
        }
    }

    private async Task ExecuteScanAsync(ScanRequest request)
    {
        var cts = new CancellationTokenSource();
        _scanCancellationTokens[request.Id] = cts;
        
        var scanResult = _activeScanResults[request.Id];
        
        try
        {
            _logger.LogInformation("Starting execution of scan {ScanId}", request.Id);
            
            scanResult.Status = ScanStatus.Starting;
            await Task.Delay(1000, cts.Token); // Simulate startup delay
            
            scanResult.Status = ScanStatus.Running;
            scanResult.StartTime = DateTime.UtcNow;
            
            // Get MITRE techniques for this scan
            var techniques = MitreTechniques.GetSupportedTechniques();
            var selectedTechniques = techniques.Where(t => request.Techniques.Contains(t.Key)).ToList();
            
            var totalCommands = selectedTechniques.Sum(t => t.Value.Commands.Count);
            var commandsExecuted = 0;
            
            foreach (var technique in selectedTechniques)
            {
                if (cts.Token.IsCancellationRequested)
                    break;
                
                _logger.LogDebug("Executing technique {TechniqueId}: {TechniqueName}", 
                    technique.Key, technique.Value.Name);
                
                await ExecuteTechniqueAsync(technique.Value, scanResult, cts.Token);
                
                commandsExecuted += technique.Value.Commands.Count;
                scanResult.Progress = (int)((double)commandsExecuted / totalCommands * 100);
                
                // Add delay between techniques to avoid overwhelming the system
                await Task.Delay(2000, cts.Token);
            }
            
            scanResult.Status = ScanStatus.Completed;
            scanResult.EndTime = DateTime.UtcNow;
            scanResult.Progress = 100;
            
            _logger.LogInformation("Scan {ScanId} completed with {DetectionCount} detections", 
                request.Id, scanResult.Detections.Count);
        }
        catch (OperationCanceledException)
        {
            scanResult.Status = ScanStatus.Cancelled;
            scanResult.EndTime = DateTime.UtcNow;
            _logger.LogInformation("Scan {ScanId} was cancelled", request.Id);
        }
        catch (Exception ex)
        {
            scanResult.Status = ScanStatus.Failed;
            scanResult.EndTime = DateTime.UtcNow;
            scanResult.ErrorMessage = ex.Message;
            _logger.LogError(ex, "Scan {ScanId} failed", request.Id);
        }
        finally
        {
            _scanCancellationTokens.Remove(request.Id);
        }
    }

    private async Task ExecuteTechniqueAsync(MitreAttackTechnique technique, ScanResult scanResult, CancellationToken cancellationToken)
    {
        var platform = GetCurrentPlatform();
        var commands = technique.Commands.Where(c => c.Platform.Equals(platform, StringComparison.OrdinalIgnoreCase)).ToList();
        
        if (!commands.Any())
        {
            _logger.LogWarning("No commands available for technique {TechniqueId} on platform {Platform}", 
                technique.Id, platform);
            return;
        }
        
        foreach (var command in commands)
        {
            if (cancellationToken.IsCancellationRequested)
                break;
            
            var scanCommand = await ExecuteCommandAsync(command, technique.Id, cancellationToken);
            scanResult.ExecutedCommands.Add(scanCommand);
            
            // Analyze command output for potential detections
            var detections = AnalyzeCommandOutput(scanCommand, technique);
            scanResult.Detections.AddRange(detections);
        }
    }

    private async Task<ScanCommand> ExecuteCommandAsync(MitreCommand mitreCommand, string techniqueId, CancellationToken cancellationToken)
    {
        var scanCommand = new ScanCommand
        {
            Command = mitreCommand.Command,
            Arguments = mitreCommand.Arguments,
            Technique = techniqueId,
            ExecutedAt = DateTime.UtcNow
        };
        
        var startTime = DateTime.UtcNow;
        
        try
        {
            using var process = new Process();
            process.StartInfo.FileName = mitreCommand.Command;
            process.StartInfo.UseShellExecute = false;
            process.StartInfo.RedirectStandardOutput = true;
            process.StartInfo.RedirectStandardError = true;
            process.StartInfo.CreateNoWindow = true;
            
            foreach (var arg in mitreCommand.Arguments)
            {
                process.StartInfo.ArgumentList.Add(arg);
            }
            
            var outputTask = Task.Run(async () =>
            {
                try
                {
                    process.Start();
                    var output = await process.StandardOutput.ReadToEndAsync();
                    var error = await process.StandardError.ReadToEndAsync();
                    await process.WaitForExitAsync(cancellationToken);
                    
                    return new { Output = output, Error = error, ExitCode = process.ExitCode };
                }
                catch (Exception ex)
                {
                    return new { Output = "", Error = ex.Message, ExitCode = -1 };
                }
            });
            
            var result = await outputTask.WaitAsync(TimeSpan.FromMinutes(5), cancellationToken);
            
            scanCommand.Output = result.Output;
            scanCommand.Error = result.Error;
            scanCommand.ExitCode = result.ExitCode;
        }
        catch (Exception ex)
        {
            scanCommand.Error = ex.Message;
            scanCommand.ExitCode = -1;
        }
        
        scanCommand.Duration = DateTime.UtcNow - startTime;
        
        return scanCommand;
    }

    private List<Detection> AnalyzeCommandOutput(ScanCommand command, MitreAttackTechnique technique)
    {
        var detections = new List<Detection>();
        
        // Simple analysis - in a real implementation, this would be much more sophisticated
        if (command.ExitCode == 0 && !string.IsNullOrEmpty(command.Output))
        {
            // Simulate finding suspicious indicators based on command output
            var lines = command.Output.Split('\n', StringSplitOptions.RemoveEmptyEntries);
            
            foreach (var expectedIndicator in technique.Commands
                .Where(c => c.Command == command.Command)
                .SelectMany(c => c.ExpectedIndicators))
            {
                if (ShouldGenerateDetection(lines, expectedIndicator))
                {
                    var detection = new Detection
                    {
                        Title = $"Potential {technique.Name} Activity",
                        Description = $"Detected {expectedIndicator} - {technique.Description}",
                        Severity = DetermineSeverity(expectedIndicator),
                        Technique = technique.Id,
                        Details = new Dictionary<string, object>
                        {
                            ["command"] = command.Command,
                            ["arguments"] = string.Join(" ", command.Arguments),
                            ["indicator"] = expectedIndicator,
                            ["executedAt"] = command.ExecutedAt
                        }
                    };
                    
                    detections.Add(detection);
                }
            }
        }
        
        return detections;
    }

    private bool ShouldGenerateDetection(string[] outputLines, string indicator)
    {
        // Simulate detection logic - randomly generate detections for demo purposes
        // In a real implementation, this would analyze the actual command output
        return Random.Shared.NextDouble() < 0.3; // 30% chance of detection
    }

    private DetectionSeverity DetermineSeverity(string indicator)
    {
        // Simple severity determination based on indicator type
        return indicator.ToLower() switch
        {
            var i when i.Contains("privilege") || i.Contains("escalation") => DetectionSeverity.Critical,
            var i when i.Contains("suspicious") || i.Contains("unsigned") => DetectionSeverity.High,
            var i when i.Contains("unusual") || i.Contains("modified") => DetectionSeverity.Medium,
            _ => DetectionSeverity.Low
        };
    }

    private string GetCurrentPlatform()
    {
        if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
            return "Windows";
        if (RuntimeInformation.IsOSPlatform(OSPlatform.OSX))
            return "macOS";
        if (RuntimeInformation.IsOSPlatform(OSPlatform.Linux))
            return "Linux";
        
        return "Unknown";
    }

    private void MonitorSystemResources(object? state)
    {
        try
        {
            var metrics = _systemMetrics.GetCurrentMetrics();
            
            // Check if we should throttle scans based on system resources
            if (metrics.CpuUsage > 80 || metrics.MemoryUsage > 75)
            {
                _logger.LogWarning("High system resource usage detected. CPU: {CpuUsage}%, Memory: {MemoryUsage}%",
                    metrics.CpuUsage, metrics.MemoryUsage);
                
                // Could implement throttling logic here
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error monitoring system resources");
        }
    }

    public void Dispose()
    {
        _resourceMonitorTimer?.Dispose();
        _concurrencyControl?.Dispose();
        
        // Cancel all active scans
        foreach (var cts in _scanCancellationTokens.Values)
        {
            cts.Cancel();
            cts.Dispose();
        }
    }
}
