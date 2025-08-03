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

REM Check if port 5000 is available
netstat -an | findstr ":5000" >nul
if not errorlevel 1 (
    echo ❌ Backend port 5000 is in use. Please stop the service or change the port.
    exit /b 1
)

echo ✅ Required ports are available

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

REM Start backend in background
echo 🔧 Starting .NET backend on http://localhost:5000...
start "CyberSecScanner Backend" /min dotnet run --urls "http://localhost:5000"

REM Wait for backend to be ready
echo ⏳ Waiting for backend to start...
:wait_backend
timeout /t 2 /nobreak >nul
curl -s -f "http://localhost:5000/health" >nul 2>nul
if errorlevel 1 (
    goto wait_backend
)

echo ✅ Backend API is running on http://localhost:5000

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
echo 📊 Backend API: http://localhost:5000
echo 🖥️  Frontend: Electron application
echo 📋 Health Check: http://localhost:5000/health
echo 📋 System Metrics: http://localhost:5000/api/system/metrics
echo.
echo Press any key to stop all services...
pause >nul

REM Cleanup
taskkill /f /im "dotnet.exe" /fi "WINDOWTITLE eq CyberSecScanner Backend*" >nul 2>nul
taskkill /f /im "node.exe" /fi "WINDOWTITLE eq CyberSecScanner Frontend*" >nul 2>nul

echo 🧹 Services stopped
