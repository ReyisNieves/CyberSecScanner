const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // IPC communication
    sendMessage: (channel, data) => {
        // Whitelist channels for security
        const validChannels = ['scan-file', 'scan-directory', 'get-system-metrics'];
        if (validChannels.includes(channel)) {
            ipcRenderer.send(channel, data);
        }
    },
    
    receiveMessage: (channel, func) => {
        const validChannels = ['scan-progress', 'scan-complete', 'system-metrics-update'];
        if (validChannels.includes(channel)) {
            ipcRenderer.on(channel, (event, ...args) => func(...args));
        }
    },
    
    // File system operations (limited and safe)
    loadConfig: () => {
        try {
            const configPath = path.join(__dirname, 'config.json');
            if (fs.existsSync(configPath)) {
                const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                return config;
            }
            return null;
        } catch (error) {
            console.warn('Could not load config:', error.message);
            return null;
        }
    },
    
    // Platform information
    platform: process.platform
});

// Expose a secure HTTP client for API calls
contextBridge.exposeInMainWorld('httpAPI', {
    get: async (url) => {
        try {
            const response = await fetch(url);
            return await response.json();
        } catch (error) {
            console.error('HTTP GET error:', error);
            throw error;
        }
    },
    
    post: async (url, data) => {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            return await response.json();
        } catch (error) {
            console.error('HTTP POST error:', error);
            throw error;
        }
    }
});
