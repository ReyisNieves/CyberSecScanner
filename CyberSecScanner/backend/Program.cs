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
builder.Services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(Assembly.GetExecutingAssembly()));

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
    Log.Information("Starting CyberSecScanner Backend on port 5000");
    app.Run("http://localhost:5000");
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}
