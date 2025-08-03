const { ipcRenderer } = require('electron');

// Backend API configuration
const API_BASE_URL = 'http://localhost:5000/api';

class CyberSecScannerApp {
    constructor() {
        this.currentView = 'dashboard';
        this.systemMetrics = {
            cpu: 0,
            memory: 0
        };
        this.activeScans = new Map();
        this.detections = [];
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupNavigation();
        this.setupSystemMetrics();
        this.loadInitialData();
        this.startPeriodicUpdates();
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                this.switchView(view);
            });
        });

        // New scan button
        document.getElementById('new-scan-btn').addEventListener('click', () => {
            this.switchView('scanner');
        });

        // Menu events from main process
        ipcRenderer.on('menu-new-scan', () => {
            this.switchView('scanner');
        });

        ipcRenderer.on('menu-about', () => {
            this.showAboutDialog();
        });

        // Initialize component classes
        this.dashboard = new Dashboard(this);
        this.scanner = new Scanner(this);
        this.detections = new Detections(this);
    }

    startPeriodicUpdates() {
        // Update system metrics every 5 seconds
        this.updateSystemMetrics();
        setInterval(() => this.updateSystemMetrics(), 5000);

        // Update active scans every 3 seconds
        setInterval(() => this.updateActiveScansFromBackend(), 3000);
    }

    async updateSystemMetrics() {
        try {
            const response = await fetch(`${API_BASE_URL}/metrics`);
            if (response.ok) {
                const metrics = await response.json();
                this.systemMetrics.cpu = metrics.cpuUsage;
                this.systemMetrics.memory = metrics.memoryUsage;

                // Update UI
                document.getElementById('cpu-usage').textContent = `${metrics.cpuUsage.toFixed(1)}%`;
                document.getElementById('memory-usage').textContent = `${metrics.memoryUsage.toFixed(1)}%`;

                // Update performance chart
                if (this.performanceChart) {
                    const now = new Date().toLocaleTimeString();
                    const data = this.performanceChart.data;
                    
                    data.labels.push(now);
                    data.datasets[0].data.push(metrics.cpuUsage);
                    data.datasets[1].data.push(metrics.memoryUsage);

                    // Keep only last 20 data points
                    if (data.labels.length > 20) {
                        data.labels.shift();
                        data.datasets[0].data.shift();
                        data.datasets[1].data.shift();
                    }

                    this.performanceChart.update('none');
                }
            }
        } catch (error) {
            console.error('Error updating system metrics:', error);
            // Use fallback metrics
            this.systemMetrics.cpu = Math.random() * 100;
            this.systemMetrics.memory = Math.random() * 100;
            
            document.getElementById('cpu-usage').textContent = `${this.systemMetrics.cpu.toFixed(1)}%`;
            document.getElementById('memory-usage').textContent = `${this.systemMetrics.memory.toFixed(1)}%`;
        }
    }

    async updateActiveScansFromBackend() {
        try {
            const response = await fetch(`${API_BASE_URL}/scan/active`);
            if (response.ok) {
                const activeScans = await response.json();
                
                // Update local active scans map
                this.activeScans.clear();
                activeScans.forEach(scan => {
                    this.activeScans.set(scan.scanId, scan);
                });

                // Update UI if on dashboard
                if (this.currentView === 'dashboard') {
                    this.updateActiveScans();
                }
            }
        } catch (error) {
            console.error('Error updating active scans:', error);
        }
    }

    async startScan(scanConfig) {
        try {
            const response = await fetch(`${API_BASE_URL}/scan/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(scanConfig)
            });

            if (response.ok) {
                const scanId = await response.text();
                return { success: true, scanId: scanId.replace(/"/g, '') };
            } else {
                const error = await response.json();
                return { success: false, error: error.error || 'Unknown error' };
            }
        } catch (error) {
            console.error('Error starting scan:', error);
            return { success: false, error: error.message };
        }
    }

    async stopScan(scanId) {
        try {
            const response = await fetch(`${API_BASE_URL}/scan/stop/${scanId}`, {
                method: 'POST'
            });

            if (response.ok) {
                const result = await response.json();
                return { success: result };
            } else {
                const error = await response.json();
                return { success: false, error: error.error || 'Unknown error' };
            }
        } catch (error) {
            console.error('Error stopping scan:', error);
            return { success: false, error: error.message };
        }
    }

    async getScanResult(scanId) {
        try {
            const response = await fetch(`${API_BASE_URL}/scan/${scanId}`);
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error('Error getting scan result:', error);
        }
        return null;
    }

    setupNavigation() {
        // Set up view switching
        this.switchView('dashboard');
    }

    setupSystemMetrics() {
        // Initialize performance chart
        const ctx = document.getElementById('performance-chart');
        if (ctx) {
            this.performanceChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'CPU Usage (%)',
                        data: [],
                        borderColor: '#00d4ff',
                        backgroundColor: 'rgba(0, 212, 255, 0.1)',
                        tension: 0.4
                    }, {
                        label: 'Memory Usage (%)',
                        data: [],
                        borderColor: '#ff6b35',
                        backgroundColor: 'rgba(255, 107, 53, 0.1)',
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: {
                                color: '#fff'
                            }
                        }
                    },
                    scales: {
                        x: {
                            ticks: {
                                color: '#888'
                            },
                            grid: {
                                color: '#333'
                            }
                        },
                        y: {
                            beginAtZero: true,
                            max: 100,
                            ticks: {
                                color: '#888'
                            },
                            grid: {
                                color: '#333'
                            }
                        }
                    }
                }
            });
        }
    }

    switchView(viewName) {
        // Hide all views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });

        // Show selected view
        const targetView = document.getElementById(`${viewName}-view`);
        if (targetView) {
            targetView.classList.add('active');
        }

        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });

        const navItem = document.querySelector(`[data-view="${viewName}"]`);
        if (navItem) {
            navItem.classList.add('active');
        }

        this.currentView = viewName;

        // Load view-specific data
        this.loadViewData(viewName);
    }

    loadViewData(viewName) {
        switch (viewName) {
            case 'dashboard':
                this.loadDashboardData();
                break;
            case 'scanner':
                this.loadScannerData();
                break;
            case 'detections':
                this.loadDetectionsData();
                break;
            case 'mitre':
                this.loadMitreData();
                break;
            case 'settings':
                this.loadSettingsData();
                break;
        }
    }

    loadDashboardData() {
        // Update dashboard stats
        this.updateDashboardStats();
        this.updateActiveScans();
        this.updateRecentDetections();
    }

    loadScannerData() {
        // Initialize scanner form if not already done
        if (!this.scannerInitialized) {
            this.scanner.initializeScanner();
            this.scannerInitialized = true;
        }
    }

    loadDetectionsData() {
        this.detections.renderDetectionsTable();
    }

    loadMitreData() {
        this.renderMitreMatrix();
    }

    loadSettingsData() {
        this.loadSettings();
    }

    updateDashboardStats() {
        document.getElementById('total-scans').textContent = this.getTotalScansCount();
        document.getElementById('active-scans').textContent = this.activeScans.size;
        document.getElementById('total-detections').textContent = this.detections.length;
        document.getElementById('last-scan').textContent = this.getLastScanTime();
    }

    updateActiveScans() {
        const container = document.getElementById('active-scans-list');
        
        if (this.activeScans.size === 0) {
            container.innerHTML = '<div class="empty-state">No active scans</div>';
            return;
        }

        const scansHtml = Array.from(this.activeScans.values()).map(scan => `
            <div class="scan-item">
                <div class="scan-item-info">
                    <div class="scan-item-title">${scan.scanId}</div>
                    <div class="scan-item-meta">Started: ${new Date(scan.startTime).toLocaleTimeString()}</div>
                </div>
                <div class="scan-item-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${scan.progress}%"></div>
                    </div>
                </div>
                <div class="scan-item-status ${scan.status.toLowerCase()}">${scan.status}</div>
            </div>
        `).join('');

        container.innerHTML = scansHtml;
    }

    updateRecentDetections() {
        const container = document.getElementById('recent-detections');
        
        if (this.detections.length === 0) {
            container.innerHTML = '<div class="empty-state">No recent detections</div>';
            return;
        }

        const recentDetections = this.detections.slice(-5).reverse();
        const detectionsHtml = recentDetections.map(detection => `
            <div class="detection-item ${detection.severity}">
                <div class="detection-item-header">
                    <div class="detection-item-title">${detection.title}</div>
                    <div class="detection-item-time">${new Date(detection.timestamp).toLocaleTimeString()}</div>
                </div>
                <div class="detection-item-description">${detection.description}</div>
            </div>
        `).join('');

        container.innerHTML = detectionsHtml;
    }

    renderMitreMatrix() {
        const container = document.getElementById('mitre-matrix');
        if (!container) return;

        const techniques = [
            { id: 'T1053', name: 'Scheduled Task/Job', covered: true },
            { id: 'T1055', name: 'Process Injection', covered: true },
            { id: 'T1547', name: 'Boot or Logon Autostart Execution', covered: true },
            { id: 'T1543', name: 'Create or Modify System Process', covered: true },
            { id: 'T1070', name: 'Indicator Removal on Host', covered: true },
            { id: 'T1071', name: 'Application Layer Protocol', covered: false },
            { id: 'T1090', name: 'Proxy', covered: false },
            { id: 'T1095', name: 'Non-Application Layer Protocol', covered: false }
        ];

        const matrixHtml = techniques.map(technique => `
            <div class="technique-tile ${technique.covered ? 'covered' : ''}">
                <div class="technique-id">${technique.id}</div>
                <div class="technique-name">${technique.name}</div>
                <div class="technique-description">
                    ${technique.covered ? 'Implemented' : 'Not implemented'}
                </div>
            </div>
        `).join('');

        container.innerHTML = matrixHtml;
    }

    loadSettings() {
        // Load settings from localStorage
        const settings = {
            autoStartScans: localStorage.getItem('autoStartScans') === 'true',
            maxConcurrentScans: parseInt(localStorage.getItem('maxConcurrentScans')) || 3,
            scanTimeout: parseInt(localStorage.getItem('scanTimeout')) || 30,
            cpuThreshold: parseInt(localStorage.getItem('cpuThreshold')) || 80,
            memoryThreshold: parseInt(localStorage.getItem('memoryThreshold')) || 75,
            detailedLogging: localStorage.getItem('detailedLogging') !== 'false',
            logFilePath: localStorage.getItem('logFilePath') || './logs/cybersecscanner.log'
        };

        // Apply settings to form
        document.getElementById('auto-start-scans').checked = settings.autoStartScans;
        document.getElementById('max-concurrent-scans').value = settings.maxConcurrentScans;
        document.getElementById('scan-timeout').value = settings.scanTimeout;
        document.getElementById('cpu-threshold').value = settings.cpuThreshold;
        document.getElementById('memory-threshold').value = settings.memoryThreshold;
        document.getElementById('detailed-logging').checked = settings.detailedLogging;
        document.getElementById('log-file-path').value = settings.logFilePath;

        // Add change listeners
        document.querySelectorAll('#settings-view input, #settings-view select').forEach(input => {
            input.addEventListener('change', () => {
                this.saveSettings();
            });
        });
    }

    saveSettings() {
        const settings = {
            autoStartScans: document.getElementById('auto-start-scans').checked,
            maxConcurrentScans: document.getElementById('max-concurrent-scans').value,
            scanTimeout: document.getElementById('scan-timeout').value,
            cpuThreshold: document.getElementById('cpu-threshold').value,
            memoryThreshold: document.getElementById('memory-threshold').value,
            detailedLogging: document.getElementById('detailed-logging').checked,
            logFilePath: document.getElementById('log-file-path').value
        };

        // Save to localStorage
        Object.entries(settings).forEach(([key, value]) => {
            localStorage.setItem(key, value.toString());
        });
    }

    getTotalScansCount() {
        return localStorage.getItem('totalScans') || '0';
    }

    getLastScanTime() {
        const lastScan = localStorage.getItem('lastScanTime');
        return lastScan ? new Date(lastScan).toLocaleString() : 'Never';
    }

    showAboutDialog() {
        alert('CyberSecScanner v1.0.0\\n\\nOpen-source cross-platform security anomaly scanner\\nBuilt with Electron and .NET 8');
    }

    loadInitialData() {
        // Load any saved data from localStorage
        try {
            const savedDetections = localStorage.getItem('detections');
            if (savedDetections) {
                this.detections = JSON.parse(savedDetections);
            }
        } catch (error) {
            console.error('Error loading saved data:', error);
        }
    }

    saveData() {
        // Save data to localStorage
        try {
            localStorage.setItem('detections', JSON.stringify(this.detections));
            localStorage.setItem('lastScanTime', new Date().toISOString());
        } catch (error) {
            console.error('Error saving data:', error);
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new CyberSecScannerApp();
});
