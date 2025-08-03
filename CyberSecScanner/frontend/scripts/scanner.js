class Scanner {
    constructor(app) {
        this.app = app;
        this.currentScan = null;
        this.scanHistory = [];
        this.scanStatusInterval = null;
    }

    initializeScanner() {
        this.setupScanForm();
        this.loadScanHistory();
    }

    setupScanForm() {
        const form = document.getElementById('scan-config-form');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.startScan();
        });

        const stopButton = document.getElementById('stop-scan-btn');
        if (stopButton) {
            stopButton.addEventListener('click', () => {
                this.stopScan();
            });
        }
    }

    async startScan() {
        try {
            const scanConfig = this.getScanConfiguration();
            
            // Validate configuration
            if (!this.validateScanConfig(scanConfig)) {
                return;
            }

            // Disable start button, enable stop button
            const startButton = document.querySelector('#scan-config-form button[type="submit"]');
            const stopButton = document.getElementById('stop-scan-btn');
            
            startButton.disabled = true;
            stopButton.disabled = false;

            // Convert frontend config to backend format
            const backendConfig = {
                type: this.mapScanType(scanConfig.type),
                techniques: scanConfig.techniques,
                priority: this.mapPriority(scanConfig.priority)
            };

            // Start scan via HTTP API
            const result = await this.app.startScan(backendConfig);
            
            if (result.success) {
                // Create local scan object for tracking
                const scan = {
                    id: result.scanId,
                    name: `${scanConfig.type} Scan`,
                    type: scanConfig.type,
                    techniques: scanConfig.techniques,
                    priority: scanConfig.priority,
                    status: 'starting',
                    progress: 0,
                    startTime: new Date().toISOString(),
                    detections: [],
                    results: []
                };

                this.currentScan = scan;
                this.app.activeScans.set(scan.id, scan);

                // Start monitoring scan progress
                this.startScanMonitoring(scan.id);
                
                this.showNotification('Scan started successfully', 'success');
            } else {
                this.handleScanError(null, result.error);
                this.resetScanButtons();
            }

        } catch (error) {
            console.error('Error starting scan:', error);
            this.showNotification('Failed to start scan: ' + error.message, 'error');
            this.resetScanButtons();
        }
    }

    startScanMonitoring(scanId) {
        this.scanStatusInterval = setInterval(async () => {
            try {
                const scanResult = await this.app.getScanResult(scanId);
                if (scanResult) {
                    this.updateScanFromBackend(scanResult);
                    
                    // Stop monitoring if scan is complete
                    if (scanResult.status === 'Completed' || 
                        scanResult.status === 'Failed' || 
                        scanResult.status === 'Cancelled') {
                        this.finalizeScan(scanResult);
                        clearInterval(this.scanStatusInterval);
                    }
                }
            } catch (error) {
                console.error('Error monitoring scan:', error);
            }
        }, 2000); // Check every 2 seconds
    }

    updateScanFromBackend(backendScan) {
        if (!this.currentScan || this.currentScan.id !== backendScan.scanId) {
            return;
        }

        // Update local scan object
        this.currentScan.status = backendScan.status.toLowerCase();
        this.currentScan.progress = backendScan.progress;
        this.currentScan.detections = backendScan.detections || [];
        
        // Update UI
        this.updateScanProgress(this.currentScan);
        this.updateScanResults(this.currentScan);
        
        // Update active scans in app
        this.app.activeScans.set(this.currentScan.id, this.currentScan);
        this.app.updateActiveScans();
    }

    mapScanType(frontendType) {
        const mapping = {
            'full': 0,         // Full
            'processes': 1,    // Processes
            'scheduled-tasks': 2, // ScheduledTasks
            'network': 3,      // Network
            'registry': 4,     // Registry
            'files': 5,        // Files
            'services': 6      // Services
        };
        return mapping[frontendType] || 0;
    }

    mapPriority(frontendPriority) {
        const mapping = {
            'low': 0,      // Low
            'normal': 1,   // Normal
            'high': 2,     // High
            'critical': 3  // Critical
        };
        return mapping[frontendPriority] || 1;
    }

    getScanConfiguration() {
        const scanType = document.getElementById('scan-type').value;
        const priority = document.getElementById('scan-priority').value;
        
        const techniqueCheckboxes = document.querySelectorAll('.technique-checkboxes input[type="checkbox"]:checked');
        const techniques = Array.from(techniqueCheckboxes).map(cb => cb.value);

        return {
            type: scanType,
            techniques,
            priority,
            timestamp: new Date().toISOString()
        };
    }

    validateScanConfig(config) {
        if (!config.type) {
            this.showNotification('Please select a scan type', 'warning');
            return false;
        }

        if (config.techniques.length === 0) {
            this.showNotification('Please select at least one MITRE ATT&CK technique', 'warning');
            return false;
        }

        return true;
    }

    async stopScan() {
        if (!this.currentScan) return;

        try {
            const result = await this.app.stopScan(this.currentScan.id);
            
            if (result.success) {
                this.currentScan.status = 'stopped';
                this.currentScan.endTime = new Date().toISOString();
                this.finalizeScan(this.currentScan);
                this.showNotification('Scan stopped successfully', 'info');
            } else {
                this.showNotification('Failed to stop scan: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('Error stopping scan:', error);
            this.showNotification('Failed to stop scan: ' + error.message, 'error');
        }
    }

    updateScanProgress(scan) {
        // Update active scans display
        this.app.updateActiveScans();
        
        // Update scan results
        this.updateScanResults(scan);
    }

    updateScanResults(scan) {
        const container = document.getElementById('scan-results');
        if (!container) return;

        if (!scan || scan.detections.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div style="margin-bottom: 10px;">
                        Progress: ${scan ? scan.progress : 0}%
                    </div>
                    <div>
                        ${scan && scan.status === 'running' ? 'Scanning...' : 'No detections found yet'}
                    </div>
                </div>`;
            return;
        }

        const resultsHtml = `
            <div class="scan-progress-info">
                <div>Progress: ${scan.progress}%</div>
                <div>Status: ${scan.status}</div>
                <div>Detections: ${scan.detections.length}</div>
            </div>
            ${scan.detections.map(detection => `
                <div class="scan-result-item ${detection.severity.toLowerCase()}">
                    <div class="scan-result-header">
                        <div class="scan-result-title">${detection.title}</div>
                        <div class="scan-result-technique">${detection.technique}</div>
                    </div>
                    <div class="scan-result-description">${detection.description}</div>
                </div>
            `).join('')}
        `;

        container.innerHTML = resultsHtml;
    }

    finalizeScan(scan) {
        // Clear monitoring interval
        if (this.scanStatusInterval) {
            clearInterval(this.scanStatusInterval);
            this.scanStatusInterval = null;
        }

        // Remove from active scans
        this.app.activeScans.delete(scan.scanId || scan.id);
        
        // Add to scan history
        const historyScan = {
            id: scan.scanId || scan.id,
            name: this.currentScan ? this.currentScan.name : 'Unknown Scan',
            type: this.currentScan ? this.currentScan.type : 'Unknown',
            startTime: scan.startTime,
            endTime: scan.endTime || new Date().toISOString(),
            status: scan.status,
            detections: scan.detections || [],
            progress: scan.progress || 100
        };
        
        this.scanHistory.push(historyScan);
        
        // Add detections to global detections list
        if (scan.detections && scan.detections.length > 0) {
            this.app.detections.push(...scan.detections);
        }

        // Reset UI
        this.resetScanButtons();

        // Reset current scan
        this.currentScan = null;

        // Update dashboard
        this.app.updateActiveScans();
        this.app.updateDashboardStats();
        this.app.updateRecentDetections();

        // Save data
        this.app.saveData();
        this.saveScanHistory();

        // Show completion notification
        const message = scan.status === 'Completed' 
            ? `Scan completed with ${scan.detections ? scan.detections.length : 0} detections`
            : `Scan ${scan.status.toLowerCase()}`;
        
        this.showNotification(message, scan.status === 'Completed' ? 'success' : 'info');
    }

    resetScanButtons() {
        const startButton = document.querySelector('#scan-config-form button[type="submit"]');
        const stopButton = document.getElementById('stop-scan-btn');
        
        if (startButton) startButton.disabled = false;
        if (stopButton) stopButton.disabled = true;
    }

    handleScanError(scan, error) {
        if (scan) {
            scan.status = 'error';
            scan.error = error;
            scan.endTime = new Date().toISOString();
            this.finalizeScan(scan);
        } else {
            this.resetScanButtons();
        }
        
        this.showNotification('Scan failed: ' + error, 'error');
    }

    loadScanHistory() {
        try {
            const saved = localStorage.getItem('scanHistory');
            if (saved) {
                this.scanHistory = JSON.parse(saved);
            }
        } catch (error) {
            console.error('Error loading scan history:', error);
        }
    }

    saveScanHistory() {
        try {
            localStorage.setItem('scanHistory', JSON.stringify(this.scanHistory));
            const totalScans = this.scanHistory.length;
            localStorage.setItem('totalScans', totalScans.toString());
        } catch (error) {
            console.error('Error saving scan history:', error);
        }
    }

    showNotification(message, type = 'info') {
        // Simple notification system - can be enhanced with a proper notification library
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background: ${type === 'error' ? '#ff4757' : type === 'warning' ? '#ffa502' : type === 'success' ? '#2ed573' : '#00d4ff'};
            color: white;
            border-radius: 6px;
            z-index: 10000;
            font-size: 14px;
            max-width: 300px;
            word-wrap: break-word;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        `;

        document.body.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);

        // Click to dismiss
        notification.addEventListener('click', () => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        });
    }

    exportScanResults(scanId) {
        const scan = this.scanHistory.find(s => s.id === scanId);
        if (!scan) return;

        const data = {
            scan: {
                id: scan.id,
                name: scan.name,
                type: scan.type,
                startTime: scan.startTime,
                endTime: scan.endTime,
                status: scan.status,
                techniques: scan.techniques
            },
            detections: scan.detections,
            summary: {
                totalDetections: scan.detections.length,
                severityBreakdown: this.getSeverityBreakdown(scan.detections)
            }
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `cybersecscanner-results-${scan.id}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
    }

    getSeverityBreakdown(detections) {
        const breakdown = { critical: 0, high: 0, medium: 0, low: 0 };
        detections.forEach(detection => {
            const severity = detection.severity.toLowerCase();
            if (breakdown.hasOwnProperty(severity)) {
                breakdown[severity]++;
            }
        });
        return breakdown;
    }
}

// Make Scanner available globally
window.Scanner = Scanner;
