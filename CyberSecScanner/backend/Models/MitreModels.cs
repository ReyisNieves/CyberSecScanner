namespace CyberSecScanner.Backend.Models;

public class MitreAttackTechnique
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Tactic { get; set; } = string.Empty;
    public List<string> Platforms { get; set; } = new();
    public List<MitreCommand> Commands { get; set; } = new();
    public bool IsImplemented { get; set; }
}

public class MitreCommand
{
    public string Platform { get; set; } = string.Empty;
    public string Command { get; set; } = string.Empty;
    public List<string> Arguments { get; set; } = new();
    public string Description { get; set; } = string.Empty;
    public List<string> ExpectedIndicators { get; set; } = new();
}

public static class MitreTechniques
{
    public static Dictionary<string, MitreAttackTechnique> GetSupportedTechniques()
    {
        return new Dictionary<string, MitreAttackTechnique>
        {
            ["T1053"] = new MitreAttackTechnique
            {
                Id = "T1053",
                Name = "Scheduled Task/Job",
                Description = "Adversaries may abuse task scheduling functionality to facilitate initial or recurring execution of malicious code.",
                Tactic = "Persistence",
                Platforms = new List<string> { "Windows", "Linux", "macOS" },
                IsImplemented = true,
                Commands = new List<MitreCommand>
                {
                    new MitreCommand
                    {
                        Platform = "Windows",
                        Command = "schtasks",
                        Arguments = new List<string> { "/query", "/fo", "csv", "/v" },
                        Description = "Query all scheduled tasks",
                        ExpectedIndicators = new List<string> { "suspicious task names", "unusual execution times", "non-standard locations" }
                    },
                    new MitreCommand
                    {
                        Platform = "macOS",
                        Command = "launchctl",
                        Arguments = new List<string> { "list" },
                        Description = "List all launch agents and daemons",
                        ExpectedIndicators = new List<string> { "unsigned binaries", "unusual locations", "suspicious names" }
                    },
                    new MitreCommand
                    {
                        Platform = "Linux",
                        Command = "crontab",
                        Arguments = new List<string> { "-l" },
                        Description = "List user cron jobs",
                        ExpectedIndicators = new List<string> { "unusual scripts", "suspicious commands", "privilege escalation attempts" }
                    }
                }
            },
            ["T1055"] = new MitreAttackTechnique
            {
                Id = "T1055",
                Name = "Process Injection",
                Description = "Adversaries may inject code into processes in order to evade process-based defenses or elevate privileges.",
                Tactic = "Defense Evasion",
                Platforms = new List<string> { "Windows", "Linux", "macOS" },
                IsImplemented = true,
                Commands = new List<MitreCommand>
                {
                    new MitreCommand
                    {
                        Platform = "Windows",
                        Command = "tasklist",
                        Arguments = new List<string> { "/v", "/fo", "csv" },
                        Description = "List all running processes with details",
                        ExpectedIndicators = new List<string> { "unusual process trees", "suspicious memory usage", "unknown executables" }
                    },
                    new MitreCommand
                    {
                        Platform = "macOS",
                        Command = "ps",
                        Arguments = new List<string> { "aux" },
                        Description = "List all running processes",
                        ExpectedIndicators = new List<string> { "suspicious process names", "unusual parent-child relationships", "memory anomalies" }
                    },
                    new MitreCommand
                    {
                        Platform = "Linux",
                        Command = "ps",
                        Arguments = new List<string> { "aux", "--forest" },
                        Description = "Show process tree",
                        ExpectedIndicators = new List<string> { "process hollowing indicators", "unusual memory patterns", "injection artifacts" }
                    }
                }
            },
            ["T1547"] = new MitreAttackTechnique
            {
                Id = "T1547",
                Name = "Boot or Logon Autostart Execution",
                Description = "Adversaries may configure system settings to automatically execute a program during system boot or logon.",
                Tactic = "Persistence",
                Platforms = new List<string> { "Windows", "Linux", "macOS" },
                IsImplemented = true,
                Commands = new List<MitreCommand>
                {
                    new MitreCommand
                    {
                        Platform = "Windows",
                        Command = "reg",
                        Arguments = new List<string> { "query", "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run", "/s" },
                        Description = "Query autostart registry entries",
                        ExpectedIndicators = new List<string> { "unknown executables", "suspicious locations", "encoded commands" }
                    },
                    new MitreCommand
                    {
                        Platform = "macOS",
                        Command = "find",
                        Arguments = new List<string> { "/Library/LaunchAgents", "/Library/LaunchDaemons", "~/Library/LaunchAgents", "-name", "*.plist" },
                        Description = "Find launch agents and daemons",
                        ExpectedIndicators = new List<string> { "unsigned plists", "unusual locations", "suspicious programs" }
                    },
                    new MitreCommand
                    {
                        Platform = "Linux",
                        Command = "find",
                        Arguments = new List<string> { "/etc", "~", "-name", "*.desktop", "-o", "-name", ".bashrc", "-o", "-name", ".profile" },
                        Description = "Find autostart configurations",
                        ExpectedIndicators = new List<string> { "modified startup files", "suspicious scripts", "unusual permissions" }
                    }
                }
            },
            ["T1543"] = new MitreAttackTechnique
            {
                Id = "T1543",
                Name = "Create or Modify System Process",
                Description = "Adversaries may create or modify system-level processes to repeatedly execute malicious payloads as part of persistence.",
                Tactic = "Persistence",
                Platforms = new List<string> { "Windows", "Linux", "macOS" },
                IsImplemented = true,
                Commands = new List<MitreCommand>
                {
                    new MitreCommand
                    {
                        Platform = "Windows",
                        Command = "sc",
                        Arguments = new List<string> { "query", "type=", "service", "state=", "all" },
                        Description = "Query all Windows services",
                        ExpectedIndicators = new List<string> { "unsigned services", "unusual service names", "suspicious binary paths" }
                    },
                    new MitreCommand
                    {
                        Platform = "macOS",
                        Command = "launchctl",
                        Arguments = new List<string> { "list" },
                        Description = "List system daemons",
                        ExpectedIndicators = new List<string> { "unsigned daemons", "suspicious locations", "unusual names" }
                    },
                    new MitreCommand
                    {
                        Platform = "Linux",
                        Command = "systemctl",
                        Arguments = new List<string> { "list-units", "--type=service", "--all" },
                        Description = "List all systemd services",
                        ExpectedIndicators = new List<string> { "suspicious service files", "unusual locations", "modified system services" }
                    }
                }
            },
            ["T1070"] = new MitreAttackTechnique
            {
                Id = "T1070",
                Name = "Indicator Removal on Host",
                Description = "Adversaries may delete or alter generated artifacts on a host system, including logs or captured files.",
                Tactic = "Defense Evasion",
                Platforms = new List<string> { "Windows", "Linux", "macOS" },
                IsImplemented = true,
                Commands = new List<MitreCommand>
                {
                    new MitreCommand
                    {
                        Platform = "Windows",
                        Command = "wevtutil",
                        Arguments = new List<string> { "el" },
                        Description = "List available event logs",
                        ExpectedIndicators = new List<string> { "cleared logs", "missing entries", "unusual log sizes" }
                    },
                    new MitreCommand
                    {
                        Platform = "macOS",
                        Command = "ls",
                        Arguments = new List<string> { "-la", "/var/log/" },
                        Description = "Check system logs",
                        ExpectedIndicators = new List<string> { "missing log files", "truncated logs", "unusual timestamps" }
                    },
                    new MitreCommand
                    {
                        Platform = "Linux",
                        Command = "ls",
                        Arguments = new List<string> { "-la", "/var/log/" },
                        Description = "Check system logs",
                        ExpectedIndicators = new List<string> { "cleared logs", "missing audit trails", "suspicious gaps" }
                    }
                }
            }
        };
    }
}
