using CyberSecScanner.Backend;
using CyberSecScanner.Backend.Services;
using Serilog;
using MediatR;
using System.Reflection;

var builder = WebApplication.CreateBuilder(args);

// Configure Serilog
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .WriteTo.File("logs/cybersecscanner-.txt", rollingInterval: RollingInterval.Day)
    .CreateLogger();

builder.Services.AddSerilog();

// Add MediatR
builder.Services.AddMediatR(Assembly.GetExecutingAssembly());

// Add services
builder.Services.AddSingleton<ISystemMetricsService, SystemMetricsService>();
builder.Services.AddSingleton<IScanEngine, ScanEngine>();

// Add worker service
builder.Services.AddHostedService<Worker>();

// Add API controllers
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// Configure CORS for Electron app
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline
app.UseCors();
app.UseRouting();
app.MapControllers();

// Health check endpoint
app.MapGet("/health", () => new { status = "healthy", timestamp = DateTime.UtcNow });

try
{
    // Check if port is specified via command line arguments
    var port = "5000";
    var url = $"http://localhost:{port}";
    
    if (args.Length > 0)
    {
        // Handle both formats: --urls=value and --urls value
        if (args[0].StartsWith("--urls="))
        {
            // Format: --urls=http://localhost:5001
            var urlsArg = args[0].Split('=')[1].Trim('"');
            url = urlsArg;
            
            // Extract port for logging
            if (urlsArg.Contains(':'))
            {
                port = urlsArg.Split(':').Last();
            }
        }
        else if (args[0] == "--urls" && args.Length > 1)
        {
            // Format: --urls http://localhost:5001
            var urlsArg = args[1].Trim('"');
            url = urlsArg;
            
            // Extract port for logging
            if (urlsArg.Contains(':'))
            {
                port = urlsArg.Split(':').Last();
            }
        }
    }
    
    Log.Information("Starting CyberSecScanner Backend on port {Port}", port);
    app.Run(url);
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}
