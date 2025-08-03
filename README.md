# CyberSecScanner

A comprehensive cybersecurity scanning application built with .NET 8 Web API backend and Electron frontend, featuring real-time system monitoring and MITRE ATT&CK technique detection.

## 🚀 Features

- **Real-time System Monitoring**: Live CPU, memory, disk, and network metrics
- **Security Scanning Engine**: Multi-threaded scanning with MITRE ATT&CK technique integration
- **Interactive Dashboard**: Modern Electron-based UI with Chart.js visualizations
- **RESTful API**: Clean architecture with CQRS pattern using MediatR
- **Background Workers**: Continuous monitoring and automated scan execution
- **Cross-platform**: Supports Windows, macOS, and Linux

## 🏗️ Architecture

```
┌───────────────────────────┐     HTTP REST      ┌─────────────────────────┐
│     Electron Frontend     │    (CORS Enabled)  │    .NET 8 Web API       │
│                           │ ←─────────────────→│                         │
│ ├─ Dashboard              │                    │ ├─ Controllers          │
│ ├─ Real-time Metrics      │                    │ ├─ MediatR CQRS         │  
│ ├─ Scan Management        │                    │ ├─ Background Services  │
│ ├─ Chart.js Visualizations│                    │ ├─ System Metrics       │
│ └─ HTTP API Client        │                    │ └─ Scan Engine          │
└───────────────────────────┘                    └─────────────────────────┘
```

## 📋 Prerequisites

- [.NET 8.0 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Node.js](https://nodejs.org/) (v16 or higher)
- [npm](https://www.npmjs.com/)

## 🚀 Quick Start

### Option 1: Automated Bootstrap (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd CyberSecScanner

# Make bootstrap script executable (macOS/Linux)
chmod +x bootstrap.sh

# Start the application
./bootstrap.sh

# For Windows users
bootstrap.bat
```

### Option 2: Manual Development Setup

```bash
# Terminal 1: Start Backend
cd backend
dotnet restore
dotnet run --urls "http://localhost:5000"

# Terminal 2: Start Frontend
cd frontend
npm install
npm start
```

## 🔗 API Endpoints

### Health & System
- `GET /health` - Application health check
- `GET /api/system/metrics` - Real-time system metrics

### Scanning
- `POST /api/scan/start` - Start a new security scan
- `GET /api/scan/{id}/result` - Get scan results
- `POST /api/scan/{id}/stop` - Stop a running scan
- `GET /api/scan/active` - List active scans

## 📊 API Examples

### Get System Metrics
```bash
curl http://localhost:5000/api/system/metrics
```

Response:
```json
{
  "timestamp": "2025-08-03T15:38:12Z",
  "cpuUsage": 45.2,
  "memoryUsage": 68.1,
  "diskUsage": 72.8,
  "networkActivity": 1024,
  "activeConnections": 23,
  "uptime": "02:15:30"
}
```

### Start a Scan
```bash
curl -X POST http://localhost:5000/api/scan/start \
  -H "Content-Type: application/json" \
  -d '{
    "type": "Processes",
    "techniques": ["T1055", "T1003"],
    "priority": "Normal"
  }'
```

Response:
```json
{
  "scanId": "48685a24-5633-4eb8-ab63-9d4bc42f71b6"
}
```

## 🔧 Project Structure

```
CyberSecScanner/
├── backend/                     # .NET 8 Web API
│   ├── Controllers/            # API Controllers
│   ├── Services/               # Business Logic Services
│   ├── Models/                 # Data Models
│   ├── Commands/               # CQRS Commands
│   ├── Queries/                # CQRS Queries
│   ├── Workers/                # Background Services
│   └── Program.cs              # Application Entry Point
├── frontend/                   # Electron Application
│   ├── src/                   # Source Files
│   │   ├── index.html         # Main UI
│   │   ├── styles.css         # Styling
│   │   └── app.js            # Application Logic
│   ├── main.js               # Electron Main Process
│   └── package.json          # Dependencies
├── bootstrap.sh              # macOS/Linux Startup Script
├── bootstrap.bat             # Windows Startup Script
└── README.md                 # This file
```

## 🧪 Testing

### Backend Unit Tests
```bash
cd backend
dotnet test
```

### Manual API Testing
```bash
# Health check
curl http://localhost:5000/health

# System metrics
curl http://localhost:5000/api/system/metrics

# Start a demo scan
curl -X POST http://localhost:5000/api/scan/start \
  -H "Content-Type: application/json" \
  -d '{"type": "Processes", "techniques": ["T1055"], "priority": "Normal"}'
```

## 🛠️ Development

### Backend Development
- Built with .NET 8 and ASP.NET Core
- Uses MediatR for CQRS pattern
- Serilog for structured logging
- Background services for continuous monitoring

### Frontend Development
- Electron for cross-platform desktop application
- Chart.js for real-time visualizations
- Modern HTML5/CSS3/JavaScript
- HTTP client for API communication

## 🔍 Features in Detail

### Real-time Monitoring
- **System Metrics**: CPU, memory, disk usage, network activity
- **Process Monitoring**: Active process tracking
- **Network Connections**: Real-time connection monitoring
- **Performance Counters**: Cross-platform performance data

### Security Scanning
- **MITRE ATT&CK Integration**: Detection techniques mapping
- **Multi-threaded Execution**: Concurrent scan processing
- **Configurable Priorities**: Normal, High, Critical scan priorities
- **Background Processing**: Non-blocking scan execution

### User Interface
- **Dashboard**: Real-time metrics visualization
- **Scan Management**: Start, stop, and monitor scans
- **Interactive Charts**: Live data visualization with Chart.js
- **Responsive Design**: Adapts to different screen sizes

## 📝 Logging

The application uses structured logging with Serilog:

```bash
# View backend logs (when using bootstrap)
tail -f /tmp/cybersec-backend.log

# View frontend logs
tail -f /tmp/cybersec-frontend.log
```

## 🐛 Troubleshooting

### Port Conflicts
If port 5000 is in use:
```bash
# Check what's using the port
lsof -i :5000

# Kill the conflicting process
kill -9 <PID>

# Or start on a different port
dotnet run --urls "http://localhost:5001"
```

### Dependency Issues
```bash
# Restore backend dependencies
cd backend && dotnet restore

# Reinstall frontend dependencies
cd frontend && rm -rf node_modules && npm install
```

### Permission Issues (macOS/Linux)
```bash
# Make bootstrap script executable
chmod +x bootstrap.sh

# Fix npm permission issues
sudo chown -R $(whoami) ~/.npm
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Related Documentation

- [.NET 8 Documentation](https://docs.microsoft.com/en-us/dotnet/)
- [Electron Documentation](https://www.electronjs.org/docs)
- [Chart.js Documentation](https://www.chartjs.org/docs/)
- [MITRE ATT&CK Framework](https://attack.mitre.org/)

## 📞 Support

For support, please open an issue in the GitHub repository or contact the development team.

---

**Built with ❤️ using .NET 8 and Electron**
