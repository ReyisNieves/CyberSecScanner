class Dashboard {
    constructor(app) {
        this.app = app;
        this.metricsHistory = [];
        this.updateInterval = null;
    }

    initialize() {
        this.setupRealTimeUpdates();
        this.loadDashboardData();
    }

    setupRealTimeUpdates() {
        // Update dashboard every 5 seconds
        this.updateInterval = setInterval(() => {
            this.updateDashboardMetrics();
        }, 5000);
    }

    loadDashboardData() {
        this.updateDashboardStats();
        this.updateSystemPerformance();
        this.updateActiveScansDisplay();
        this.updateRecentDetectionsDisplay();
    }

    updateDashboardStats() {
        const stats = this.calculateDashboardStats();
        
        // Update stat values with animation
        this.animateStatValue('total-scans', stats.totalScans);
        this.animateStatValue('active-scans', stats.activeScans);
        this.animateStatValue('total-detections', stats.totalDetections);
        
        // Update last scan time
        const lastScanElement = document.getElementById('last-scan');
        if (lastScanElement) {
            lastScanElement.textContent = stats.lastScan;
        }
    }

    calculateDashboardStats() {
        const totalScans = this.app.scanner ? this.app.scanner.scanHistory.length : 0;
        const activeScans = this.app.activeScans.size;
        const totalDetections = this.app.detections.length;
        
        let lastScan = 'Never';
        if (this.app.scanner && this.app.scanner.scanHistory.length > 0) {
            const lastScanData = this.app.scanner.scanHistory[this.app.scanner.scanHistory.length - 1];
            lastScan = new Date(lastScanData.endTime || lastScanData.startTime).toLocaleString();
        }

        return {
            totalScans,
            activeScans,
            totalDetections,
            lastScan
        };
    }

    animateStatValue(elementId, targetValue) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const currentValue = parseInt(element.textContent) || 0;
        const difference = targetValue - currentValue;
        
        if (difference === 0) return;

        const steps = 10;
        const stepValue = difference / steps;
        let currentStep = 0;

        const animation = setInterval(() => {
            currentStep++;
            const newValue = Math.round(currentValue + (stepValue * currentStep));
            element.textContent = newValue;

            if (currentStep >= steps) {
                element.textContent = targetValue;
                clearInterval(animation);
            }
        }, 50);
    }

    updateSystemPerformance() {
        // Update performance metrics in the chart
        if (this.app.performanceChart) {
            const now = new Date();
            const timeLabel = now.toLocaleTimeString();
            
            // Get current system metrics
            const cpu = this.app.systemMetrics.cpu;
            const memory = this.app.systemMetrics.memory;
            
            // Store metrics history
            this.metricsHistory.push({
                timestamp: now,
                cpu,
                memory
            });

            // Keep only last 50 entries
            if (this.metricsHistory.length > 50) {
                this.metricsHistory.shift();
            }
        }
    }

    updateActiveScansDisplay() {
        const container = document.getElementById('active-scans-list');
        if (!container) return;

        if (this.app.activeScans.size === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <span style="font-size: 24px; display: block; margin-bottom: 8px;">🔍</span>
                    No active scans
                </div>
            `;
            return;
        }

        const scansHtml = Array.from(this.app.activeScans.values()).map(scan => {
            const duration = this.calculateScanDuration(scan.startTime);
            const progressColor = this.getProgressColor(scan.progress);
            
            return `
                <div class="scan-item" data-scan-id="${scan.id}">
                    <div class="scan-item-info">
                        <div class="scan-item-title">${scan.name}</div>
                        <div class="scan-item-meta">
                            Duration: ${duration} • 
                            Detections: ${scan.detections ? scan.detections.length : 0}
                        </div>
                    </div>
                    <div class="scan-item-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${scan.progress}%; background-color: ${progressColor}"></div>
                        </div>
                        <div class="progress-text">${Math.round(scan.progress)}%</div>
                    </div>
                    <div class="scan-item-status ${scan.status}">
                        ${this.getStatusIcon(scan.status)} ${scan.status}
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = scansHtml;
    }

    updateRecentDetectionsDisplay() {
        const container = document.getElementById('recent-detections');
        if (!container) return;

        if (this.app.detections.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <span style="font-size: 24px; display: block; margin-bottom: 8px;">🛡️</span>
                    No recent detections
                </div>
            `;
            return;
        }

        // Get recent detections (last 5)
        const recentDetections = this.app.detections
            .slice(-5)
            .reverse()
            .map(detection => {
                const timeAgo = this.getTimeAgo(detection.timestamp);
                const severityIcon = this.getSeverityIcon(detection.severity);
                
                return `
                    <div class="detection-item ${detection.severity}" data-detection-id="${detection.id}">
                        <div class="detection-item-header">
                            <div class="detection-item-title">
                                ${severityIcon} ${detection.title}
                            </div>
                            <div class="detection-item-time">${timeAgo}</div>
                        </div>
                        <div class="detection-item-description">${detection.description}</div>
                        <div class="detection-item-technique">
                            Technique: ${detection.technique || 'Unknown'}
                        </div>
                    </div>
                `;
            }).join('');

        container.innerHTML = recentDetections;
    }

    calculateScanDuration(startTime) {
        const start = new Date(startTime);
        const now = new Date();
        const diffMs = now - start;
        
        const minutes = Math.floor(diffMs / 60000);
        const seconds = Math.floor((diffMs % 60000) / 1000);
        
        if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        } else {
            return `${seconds}s`;
        }
    }

    getProgressColor(progress) {
        if (progress < 25) return '#00d4ff';
        if (progress < 50) return '#2ed573';
        if (progress < 75) return '#ffa502';
        return '#ff6b35';
    }

    getStatusIcon(status) {
        const icons = {
            running: '▶️',
            completed: '✅',
            stopped: '⏹️',
            error: '❌',
            starting: '🔄'
        };
        return icons[status] || '❓';
    }

    getSeverityIcon(severity) {
        const icons = {
            critical: '🔴',
            high: '🟠',
            medium: '🟡',
            low: '🟢'
        };
        return icons[severity] || '⚪';
    }

    getTimeAgo(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diffMs = now - time;
        
        const minutes = Math.floor(diffMs / 60000);
        const hours = Math.floor(diffMs / 3600000);
        const days = Math.floor(diffMs / 86400000);
        
        if (days > 0) {
            return `${days}d ago`;
        } else if (hours > 0) {
            return `${hours}h ago`;
        } else if (minutes > 0) {
            return `${minutes}m ago`;
        } else {
            return 'Just now';
        }
    }

    updateDashboardMetrics() {
        this.updateDashboardStats();
        this.updateActiveScansDisplay();
        this.updateRecentDetectionsDisplay();
    }

    generateDashboardReport() {
        const stats = this.calculateDashboardStats();
        const severityBreakdown = this.getSeverityBreakdown();
        const techniqueBreakdown = this.getTechniqueBreakdown();
        
        const report = {
            generatedAt: new Date().toISOString(),
            summary: stats,
            detections: {
                total: this.app.detections.length,
                severityBreakdown,
                techniqueBreakdown
            },
            scans: {
                total: stats.totalScans,
                active: stats.activeScans,
                completionRate: this.calculateCompletionRate()
            },
            systemMetrics: {
                averageCpu: this.calculateAverageMetric('cpu'),
                averageMemory: this.calculateAverageMetric('memory'),
                peakCpu: this.calculatePeakMetric('cpu'),
                peakMemory: this.calculatePeakMetric('memory')
            }
        };

        return report;
    }

    getSeverityBreakdown() {
        const breakdown = { critical: 0, high: 0, medium: 0, low: 0 };
        this.app.detections.forEach(detection => {
            if (breakdown.hasOwnProperty(detection.severity)) {
                breakdown[detection.severity]++;
            }
        });
        return breakdown;
    }

    getTechniqueBreakdown() {
        const breakdown = {};
        this.app.detections.forEach(detection => {
            const technique = detection.technique || 'Unknown';
            breakdown[technique] = (breakdown[technique] || 0) + 1;
        });
        return breakdown;
    }

    calculateCompletionRate() {
        if (!this.app.scanner || this.app.scanner.scanHistory.length === 0) {
            return 100;
        }

        const completed = this.app.scanner.scanHistory.filter(scan => 
            scan.status === 'completed'
        ).length;
        
        return Math.round((completed / this.app.scanner.scanHistory.length) * 100);
    }

    calculateAverageMetric(metricType) {
        if (this.metricsHistory.length === 0) return 0;
        
        const total = this.metricsHistory.reduce((sum, metric) => 
            sum + metric[metricType], 0
        );
        
        return Math.round(total / this.metricsHistory.length);
    }

    calculatePeakMetric(metricType) {
        if (this.metricsHistory.length === 0) return 0;
        
        return Math.max(...this.metricsHistory.map(metric => metric[metricType]));
    }

    exportDashboardReport() {
        const report = this.generateDashboardReport();
        const blob = new Blob([JSON.stringify(report, null, 2)], { 
            type: 'application/json' 
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cybersecscanner-dashboard-report-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }
}

// Make Dashboard available globally
window.Dashboard = Dashboard;
