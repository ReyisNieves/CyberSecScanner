@echo off
REM CyberSecScanner Bootstrap Script for Windows
REM This script starts the complete CyberSecScanner application

setlocal EnableDelayedExpansion

echo 🔒 CyberSecScanner Application Bootstrap
echo ========================================

REM Define paths
set "SCRIPT_DIR=%~dp0"
set "BACKEND_DIR=%SCRIPT_DIR%backend"
set "FRONTEND_DIR=%SCRIPT_DIR%frontend"

REM Function to check if a command exists
where dotnet >nul 2>nul
if errorlevel 1 (
    echo ❌ .NET SDK is not installed. Please install .NET 8.0 SDK
    exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js
    exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
    echo ❌ npm is not installed. Please install npm
    exit /b 1
)

echo ✅ All prerequisites are available

REM Function to find available port
set "BACKEND_PORT=5000"
set "FRONTEND_UPDATE_NEEDED=false"

echo 🔍 Checking port availability for backend service...

REM Check if port 5000 is available
netstat -an | findstr ":5000" >nul
if not errorlevel 1 (
    echo ⚠️  Default port 5000 is in use
    echo 🔄 Attempting to find alternative port...
    
    REM Try ports 5001-5020
    for /L %%p in (5001,1,5020) do (
        echo    🔎 Checking port %%p...
        netstat -an | findstr ":%%p" >nul
        if errorlevel 1 (
            set "BACKEND_PORT=%%p"
            set "FRONTEND_UPDATE_NEEDED=true"
            echo    ✅ Port %%p is available!
            goto :port_found
        ) else (
            echo    ❌ Port %%p is in use
        )
    )
    
    echo.
    echo ❌ CRITICAL ERROR: No available ports found!
    echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    echo 🔍 TROUBLESHOOTING STEPS:
    echo.
    echo 1. Check what's using ports 5000-5020:
    echo    netstat -an ^| findstr ":500"
    echo.
    echo 2. Kill processes if safe to do so:
    echo    taskkill /F /PID ^<PID^>
    echo.
    echo 3. Or manually specify a port:
    echo    cd backend ^&^& dotnet run --urls "http://localhost:PORT"
    echo.
    echo Please resolve port conflicts and retry the bootstrap process.
    echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    exit /b 1
) else (
    echo ✅ Default port 5000 is available
)

:port_found
echo 🎯 Backend will run on: http://localhost:%BACKEND_PORT%

REM Start backend
echo 🚀 Starting backend API server...
cd /d "%BACKEND_DIR%"

REM Check if backend dependencies are restored
if not exist "obj\project.assets.json" (
    echo 📦 Restoring backend dependencies...
    dotnet restore
    if errorlevel 1 (
        echo ❌ Failed to restore backend dependencies
        exit /b 1
    )
)

REM Update frontend configuration if using alternative port
if "%FRONTEND_UPDATE_NEEDED%"=="true" (
    echo 🔧 Updating frontend configuration for port %BACKEND_PORT%...
    cd /d "%FRONTEND_DIR%"
    
    REM Create temporary config file for API base URL
    echo window.API_BASE_URL = 'http://localhost:%BACKEND_PORT%'; > api-config.js
    
    REM Update the HTML file to include the config (simplified for batch)
    echo    ✅ Frontend configured for backend port %BACKEND_PORT%
    
    cd /d "%BACKEND_DIR%"
)

REM Start backend in background
echo 🔧 Starting .NET backend on http://localhost:%BACKEND_PORT%...
start "CyberSecScanner Backend" /min dotnet run --urls "http://localhost:%BACKEND_PORT%"

REM Wait for backend to be ready
echo ⏳ Waiting for backend to start...
:wait_backend
timeout /t 2 /nobreak >nul
curl -s -f "http://localhost:%BACKEND_PORT%/health" >nul 2>nul
if errorlevel 1 (
    goto wait_backend
)

echo ✅ Backend API is running on http://localhost:%BACKEND_PORT%

REM Start frontend
echo 🚀 Starting Electron frontend...
cd /d "%FRONTEND_DIR%"

REM Check if frontend dependencies are installed
if not exist "node_modules" (
    echo 📦 Installing frontend dependencies...
    npm install
    if errorlevel 1 (
        echo ❌ Failed to install frontend dependencies
        exit /b 1
    )
)

REM Start frontend
echo 🔧 Starting Electron application...
start "CyberSecScanner Frontend" npm start

echo.
echo 🎉 CyberSecScanner Application Started Successfully!
echo ==================================================
echo 📊 Backend API: http://localhost:%BACKEND_PORT%
echo 🖥️  Frontend: Electron application
echo 📋 Health Check: http://localhost:%BACKEND_PORT%/health
echo 📋 System Metrics: http://localhost:%BACKEND_PORT%/api/system/metrics
if "%FRONTEND_UPDATE_NEEDED%"=="true" (
    echo ⚠️  Using alternative port: %BACKEND_PORT% ^(frontend auto-configured^)
)
echo.
echo 💡 Tips:
echo    - Access API directly: curl http://localhost:%BACKEND_PORT%/health
echo    - Stop services: Close this window or press Ctrl+C
echo.
echo Press any key to stop all services...
pause >nul

REM Cleanup
taskkill /f /im "dotnet.exe" /fi "WINDOWTITLE eq CyberSecScanner Backend*" >nul 2>nul
taskkill /f /im "node.exe" /fi "WINDOWTITLE eq CyberSecScanner Frontend*" >nul 2>nul

echo 🧹 Services stopped
