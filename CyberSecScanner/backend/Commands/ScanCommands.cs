using CyberSecScanner.Backend.Models;
using MediatR;

namespace CyberSecScanner.Backend.Commands;

public record StartScanCommand(ScanRequest Request) : IRequest<string>;

public record StopScanCommand(string ScanId) : IRequest<bool>;

public record GetScanResultQuery(string ScanId) : IRequest<ScanResult?>;

public record GetSystemMetricsQuery() : IRequest<SystemMetrics>;

public record GetActiveScanResultsQuery() : IRequest<IEnumerable<ScanResult>>;
