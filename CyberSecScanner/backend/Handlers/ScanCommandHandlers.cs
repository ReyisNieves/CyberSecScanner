using CyberSecScanner.Backend.Commands;
using CyberSecScanner.Backend.Models;
using CyberSecScanner.Backend.Services;
using MediatR;

namespace CyberSecScanner.Backend.Handlers;

public class ScanCommandHandlers : 
    IRequestHandler<StartScanCommand, string>,
    IRequestHandler<StopScanCommand, bool>,
    IRequestHandler<GetScanResultQuery, ScanResult?>,
    IRequestHandler<GetSystemMetricsQuery, SystemMetrics>,
    IRequestHandler<GetActiveScanResultsQuery, IEnumerable<ScanResult>>
{
    private readonly IScanEngine _scanEngine;
    private readonly ISystemMetricsService _systemMetrics;
    private readonly ILogger<ScanCommandHandlers> _logger;

    public ScanCommandHandlers(
        IScanEngine scanEngine,
        ISystemMetricsService systemMetrics,
        ILogger<ScanCommandHandlers> logger)
    {
        _scanEngine = scanEngine;
        _systemMetrics = systemMetrics;
        _logger = logger;
    }

    public async Task<string> Handle(StartScanCommand request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Handling start scan command for scan type {ScanType}", request.Request.Type);
        return await _scanEngine.StartScanAsync(request.Request, cancellationToken);
    }

    public async Task<bool> Handle(StopScanCommand request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Handling stop scan command for scan {ScanId}", request.ScanId);
        return await _scanEngine.StopScanAsync(request.ScanId, cancellationToken);
    }

    public async Task<ScanResult?> Handle(GetScanResultQuery request, CancellationToken cancellationToken)
    {
        return await _scanEngine.GetScanResultAsync(request.ScanId, cancellationToken);
    }

    public async Task<SystemMetrics> Handle(GetSystemMetricsQuery request, CancellationToken cancellationToken)
    {
        return await _systemMetrics.GetCurrentMetricsAsync(cancellationToken);
    }

    public async Task<IEnumerable<ScanResult>> Handle(GetActiveScanResultsQuery request, CancellationToken cancellationToken)
    {
        var results = new List<ScanResult>();
        await foreach (var result in _scanEngine.GetActiveScanResultsAsync(cancellationToken))
        {
            results.Add(result);
        }
        return results;
    }
}
