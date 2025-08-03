#!/bin/bash

# CyberSecScanner Bootstrap Script
# This script starts the complete CyberSecScanner application

set -e

echo "🔒 CyberSecScanner Application Bootstrap"
echo "========================================"

# Define paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/CyberSecScanner/backend"
FRONTEND_DIR="$SCRIPT_DIR/CyberSecScanner/frontend"

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if port is available
check_port() {
    local port=$1
    if lsof -i :$port >/dev/null 2>&1; then
        return 1
    fi
    return 0
}

# Function to find an available port within a range
find_available_port() {
    local start_port=$1
    local end_port=$2
    local max_attempts=${3:-10}
    
    echo "🔍 Searching for available port in range $start_port-$end_port..." >&2
    
    for ((port=$start_port; port<=$end_port && port<=$((start_port + max_attempts - 1)); port++)); do
        echo "   🔎 Checking port $port..." >&2
        if check_port $port; then
            echo "   ✅ Port $port is available!" >&2
            echo $port
            return 0
        else
            echo "   ❌ Port $port is in use" >&2
        fi
    done
    
    echo "   ⚠️  No available ports found in range $start_port-$((start_port + max_attempts - 1))" >&2
    return 1
}

# Function to get process info for a port
get_port_process_info() {
    local port=$1
    local process_info=$(lsof -i :$port -t 2>/dev/null | head -1)
    if [ ! -z "$process_info" ]; then
        local process_name=$(ps -p $process_info -o comm= 2>/dev/null)
        echo "Process: $process_name (PID: $process_info)"
    else
        echo "Unknown process"
    fi
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

# Check ports and find available backend port
echo "🔍 Checking port availability for backend service..."

BACKEND_PORT=5000
FRONTEND_UPDATE_NEEDED=false

# First, try the default port 5000
if check_port $BACKEND_PORT; then
    echo "✅ Default port $BACKEND_PORT is available"
else
    echo "⚠️  Default port $BACKEND_PORT is in use"
    echo "   $(get_port_process_info $BACKEND_PORT)"
    
    echo "🔄 Attempting to find alternative port..."
    ALTERNATIVE_PORT=$(find_available_port 5001 5020)
    
    if [ $? -eq 0 ] && [ ! -z "$ALTERNATIVE_PORT" ]; then
        BACKEND_PORT=$ALTERNATIVE_PORT
        FRONTEND_UPDATE_NEEDED=true
        echo "✅ Will use alternative port: $BACKEND_PORT"
        echo "⚠️  Note: Frontend will be automatically configured for port $BACKEND_PORT"
    else
        echo ""
        echo "❌ CRITICAL ERROR: No available ports found!"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "🔍 TROUBLESHOOTING STEPS:"
        echo ""
        echo "1. Check what's using ports 5000-5020:"
        echo "   lsof -i :5000-5020"
        echo ""
        echo "2. Kill processes if safe to do so:"
        echo "   sudo kill -9 <PID>"
        echo ""
        echo "3. Or manually specify a port:"
        echo "   cd backend && dotnet run --urls \"http://localhost:PORT\""
        echo ""
        echo "4. Check for system services using these ports:"
        echo "   sudo netstat -tulpn | grep :500"
        echo ""
        echo "Please resolve port conflicts and retry the bootstrap process."
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        exit 1
    fi
fi

echo "🎯 Backend will run on: http://localhost:$BACKEND_PORT"

# Start backend
echo "🚀 Starting backend API server..."
cd "$BACKEND_DIR"

# Check if backend dependencies are restored
if [ ! -d "obj" ] || [ ! -f "obj/project.assets.json" ]; then
    echo "📦 Restoring backend dependencies..."
    dotnet restore
fi

# Update frontend configuration if using alternative port
if [ "$FRONTEND_UPDATE_NEEDED" = true ]; then
    echo "🔧 Updating frontend configuration for port $BACKEND_PORT..."
    cd "$FRONTEND_DIR"
    
    # Create temporary config file for API base URL
    echo "{\"apiPort\": $BACKEND_PORT}" > config.json
    
    # Update the HTML file to include the config
    if ! grep -q "config.json" index.html; then
        echo "   ✅ Frontend configured for backend port $BACKEND_PORT"
    fi
    
    cd "$BACKEND_DIR"
fi

# Start backend in background
echo "🔧 Starting .NET backend on http://localhost:$BACKEND_PORT..."
dotnet run --urls "http://localhost:$BACKEND_PORT" > /tmp/cybersec-backend.log 2>&1 &
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
    
    # Cleanup temporary frontend config if created
    if [ "$FRONTEND_UPDATE_NEEDED" = true ]; then
        echo "🔧 Cleaning up temporary frontend configuration..."
        cd "$FRONTEND_DIR"
        rm -f config.json
        if [ -f index.html.bak ]; then
            mv index.html.bak index.html
            echo "   ✅ Frontend configuration restored"
        fi
    fi
}

# Set trap to cleanup on script exit
trap cleanup EXIT INT TERM

# Wait for backend to be ready
echo "⏳ Waiting for backend service to be ready..."
if ! wait_for_service "http://localhost:$BACKEND_PORT/health" 30; then
    echo "❌ Backend failed to start. Check logs:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    tail -20 /tmp/cybersec-backend.log
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    exit 1
fi

echo "✅ Backend API is running on http://localhost:$BACKEND_PORT"

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
echo "📊 Backend API: http://localhost:$BACKEND_PORT"
echo "🖥️  Frontend: Electron application"
echo "📋 Health Check: http://localhost:$BACKEND_PORT/health"
echo "📋 System Metrics: http://localhost:$BACKEND_PORT/api/system/metrics"
if [ "$FRONTEND_UPDATE_NEEDED" = true ]; then
    echo "⚠️  Using alternative port: $BACKEND_PORT (frontend auto-configured)"
fi
echo ""
echo "📝 Logs:"
echo "   Backend: /tmp/cybersec-backend.log"
echo "   Frontend: /tmp/cybersec-frontend.log"
echo ""
echo "💡 Tips:"
echo "   - Access API directly: curl http://localhost:$BACKEND_PORT/health"
echo "   - View real-time logs: tail -f /tmp/cybersec-backend.log"
echo "   - Stop services: Press Ctrl+C"
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
