using CyberSecScanner.Backend.Commands;
using CyberSecScanner.Backend.Models;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace CyberSecScanner.Backend.Api;

[ApiController]
[Route("api/[controller]")]
public class ScanController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ILogger<ScanController> _logger;

    public ScanController(IMediator mediator, ILogger<ScanController> logger)
    {
        _mediator = mediator;
        _logger = logger;
    }

    [HttpPost("start")]
    public async Task<ActionResult<string>> StartScan([FromBody] ScanRequest request)
    {
        try
        {
            var scanId = await _mediator.Send(new StartScanCommand(request));
            return Ok(scanId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error starting scan");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("stop/{scanId}")]
    public async Task<ActionResult<bool>> StopScan(string scanId)
    {
        try
        {
            var result = await _mediator.Send(new StopScanCommand(scanId));
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error stopping scan");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpGet("{scanId}")]
    public async Task<ActionResult<ScanResult?>> GetScanResult(string scanId)
    {
        try
        {
            var result = await _mediator.Send(new GetScanResultQuery(scanId));
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting scan result");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpGet("active")]
    public async Task<ActionResult<IEnumerable<ScanResult>>> GetActiveScans()
    {
        try
        {
            var results = await _mediator.Send(new GetActiveScanResultsQuery());
            return Ok(results);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting active scans");
            return StatusCode(500, new { error = ex.Message });
        }
    }
}

[ApiController]
[Route("api/[controller]")]
public class MetricsController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ILogger<MetricsController> _logger;

    public MetricsController(IMediator mediator, ILogger<MetricsController> logger)
    {
        _mediator = mediator;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<SystemMetrics>> GetSystemMetrics()
    {
        try
        {
            var metrics = await _mediator.Send(new GetSystemMetricsQuery());
            return Ok(metrics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting system metrics");
            return StatusCode(500, new { error = ex.Message });
        }
    }
}
