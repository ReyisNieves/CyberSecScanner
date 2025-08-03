#!/bin/bash

# CyberSecScanner Bootstrap Script
# This script starts the complete CyberSecScanner application

set -e

echo "🔒 CyberSecScanner Application Bootstrap"
echo "========================================"

# Define paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if port is available
check_port() {
    local port=$1
    if lsof -i :$port >/dev/null 2>&1; then
        echo "⚠️  Port $port is already in use"
        return 1
    fi
    return 0
}

# Function to wait for service to be ready
wait_for_service() {
    local url=$1
    local timeout=${2:-30}
    local count=0
    
    echo "⏳ Waiting for service at $url to be ready..."
    
    while [ $count -lt $timeout ]; do
        if curl -s -f "$url" >/dev/null 2>&1; then
            echo "✅ Service is ready!"
            return 0
        fi
        sleep 1
        count=$((count + 1))
        echo -n "."
    done
    
    echo "❌ Service failed to start within $timeout seconds"
    return 1
}

# Check prerequisites
echo "🔍 Checking prerequisites..."

if ! command_exists "dotnet"; then
    echo "❌ .NET SDK is not installed. Please install .NET 8.0 SDK"
    exit 1
fi

if ! command_exists "node"; then
    echo "❌ Node.js is not installed. Please install Node.js"
    exit 1
fi

if ! command_exists "npm"; then
    echo "❌ npm is not installed. Please install npm"
    exit 1
fi

echo "✅ All prerequisites are available"

# Check ports
echo "🔍 Checking port availability..."

if ! check_port 5000; then
    echo "❌ Backend port 5000 is in use. Please stop the service or change the port."
    exit 1
fi

echo "✅ Required ports are available"

# Start backend
echo "🚀 Starting backend API server..."
cd "$BACKEND_DIR"

# Check if backend dependencies are restored
if [ ! -d "obj" ] || [ ! -f "obj/project.assets.json" ]; then
    echo "📦 Restoring backend dependencies..."
    dotnet restore
fi

# Start backend in background
echo "🔧 Starting .NET backend on http://localhost:5000..."
dotnet run --urls "http://localhost:5000" > /tmp/cybersec-backend.log 2>&1 &
BACKEND_PID=$!

# Function to cleanup on exit
cleanup() {
    echo "🧹 Cleaning up processes..."
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
}

# Set trap to cleanup on script exit
trap cleanup EXIT INT TERM

# Wait for backend to be ready
if ! wait_for_service "http://localhost:5000/health" 30; then
    echo "❌ Backend failed to start. Check logs:"
    tail -20 /tmp/cybersec-backend.log
    exit 1
fi

echo "✅ Backend API is running on http://localhost:5000"

# Start frontend
echo "🚀 Starting Electron frontend..."
cd "$FRONTEND_DIR"

# Check if frontend dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

# Start frontend
echo "🔧 Starting Electron application..."
npm start > /tmp/cybersec-frontend.log 2>&1 &
FRONTEND_PID=$!

echo "✅ Frontend application is starting..."

# Show status
echo ""
echo "🎉 CyberSecScanner Application Started Successfully!"
echo "=================================================="
echo "📊 Backend API: http://localhost:5000"
echo "🖥️  Frontend: Electron application"
echo "📋 Health Check: http://localhost:5000/health"
echo "📋 System Metrics: http://localhost:5000/api/system/metrics"
echo ""
echo "📝 Logs:"
echo "   Backend: /tmp/cybersec-backend.log"
echo "   Frontend: /tmp/cybersec-frontend.log"
echo ""
echo "Press Ctrl+C to stop all services"

# Keep script running and show real-time status
while true; do
    sleep 5
    
    # Check if backend is still running
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        echo "❌ Backend process has stopped unexpectedly"
        exit 1
    fi
    
    # Check if frontend is still running
    if ! kill -0 $FRONTEND_PID 2>/dev/null; then
        echo "❌ Frontend process has stopped unexpectedly"
        exit 1
    fi
    
    # Optional: Show a heartbeat
    echo "💓 Application running... (Backend PID: $BACKEND_PID, Frontend PID: $FRONTEND_PID)"
done
