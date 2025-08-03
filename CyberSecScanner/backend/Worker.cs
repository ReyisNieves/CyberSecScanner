using CyberSecScanner.Backend.Commands;
using CyberSecScanner.Backend.Models;
using CyberSecScanner.Backend.Services;
using MediatR;

namespace CyberSecScanner.Backend;

public class Worker : BackgroundService
{
    private readonly ILogger<Worker> _logger;
    private readonly IMediator _mediator;
    private readonly ISystemMetricsService _systemMetrics;

    public Worker(ILogger<Worker> logger, IMediator mediator, ISystemMetricsService systemMetrics)
    {
        _logger = logger;
        _mediator = mediator;
        _systemMetrics = systemMetrics;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("CyberSecScanner Backend Worker started at: {time}", DateTimeOffset.Now);

        // Start periodic system metrics logging
        var metricsTimer = new PeriodicTimer(TimeSpan.FromSeconds(30));
        
        var metricsTask = Task.Run(async () =>
        {
            while (await metricsTimer.WaitForNextTickAsync(stoppingToken))
            {
                try
                {
                    var metrics = await _mediator.Send(new GetSystemMetricsQuery(), stoppingToken);
                    _logger.LogDebug("System Metrics - CPU: {CpuUsage}%, Memory: {MemoryUsage}%", 
                        metrics.CpuUsage, metrics.MemoryUsage);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error getting system metrics");
                }
            }
        }, stoppingToken);

        // Example: Start a demo scan after 10 seconds
        await Task.Delay(10000, stoppingToken);
        
        if (!stoppingToken.IsCancellationRequested)
        {
            _logger.LogInformation("Starting demo scan...");
            
            var demoScanRequest = new ScanRequest
            {
                Type = ScanType.Processes,
                Techniques = new List<string> { "T1055", "T1053" },
                Priority = ScanPriority.Normal
            };

            try
            {
                var scanId = await _mediator.Send(new StartScanCommand(demoScanRequest), stoppingToken);
                _logger.LogInformation("Demo scan started with ID: {ScanId}", scanId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to start demo scan");
            }
        }

        // Keep the service running
        while (!stoppingToken.IsCancellationRequested)
        {
            await Task.Delay(5000, stoppingToken);
            
            // Get and log active scans
            try
            {
                var activeScans = await _mediator.Send(new GetActiveScanResultsQuery(), stoppingToken);
                var scanCount = activeScans.Count();
                
                if (scanCount > 0)
                {
                    _logger.LogInformation("Active scans: {ActiveScanCount}", scanCount);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting active scans");
            }
        }

        _logger.LogInformation("CyberSecScanner Backend Worker stopping at: {time}", DateTimeOffset.Now);
    }
}
