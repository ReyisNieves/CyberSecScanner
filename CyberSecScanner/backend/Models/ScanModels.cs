namespace CyberSecScanner.Backend.Models;

public class ScanRequest
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public ScanType Type { get; set; }
    public List<string> Techniques { get; set; } = new();
    public ScanPriority Priority { get; set; } = ScanPriority.Normal;
    public DateTime RequestedAt { get; set; } = DateTime.UtcNow;
    public string? RequestedBy { get; set; }
}

public class ScanResult
{
    public string Id { get; set; } = string.Empty;
    public string ScanId { get; set; } = string.Empty;
    public ScanStatus Status { get; set; }
    public int Progress { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    public List<Detection> Detections { get; set; } = new();
    public List<ScanCommand> ExecutedCommands { get; set; } = new();
    public string? ErrorMessage { get; set; }
    public Dictionary<string, object> Metadata { get; set; } = new();
}

public class Detection
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DetectionSeverity Severity { get; set; }
    public string Technique { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public string ScanId { get; set; } = string.Empty;
    public Dictionary<string, object> Details { get; set; } = new();
    public bool IsReviewed { get; set; }
    public DateTime? ReviewedAt { get; set; }
}

public class ScanCommand
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Command { get; set; } = string.Empty;
    public List<string> Arguments { get; set; } = new();
    public string Technique { get; set; } = string.Empty;
    public DateTime ExecutedAt { get; set; }
    public int ExitCode { get; set; }
    public string Output { get; set; } = string.Empty;
    public string Error { get; set; } = string.Empty;
    public TimeSpan Duration { get; set; }
}

public class SystemMetrics
{
    public double CpuUsage { get; set; }
    public double MemoryUsage { get; set; }
    public long MemoryTotal { get; set; }
    public long MemoryAvailable { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public Dictionary<string, object> AdditionalMetrics { get; set; } = new();
}

public enum ScanType
{
    Full,
    Processes,
    ScheduledTasks,
    Network,
    Registry,
    Files,
    Services
}

public enum ScanPriority
{
    Low,
    Normal,
    High,
    Critical
}

public enum ScanStatus
{
    Queued,
    Starting,
    Running,
    Completed,
    Failed,
    Cancelled,
    Timeout
}

public enum DetectionSeverity
{
    Low,
    Medium,
    High,
    Critical
}
