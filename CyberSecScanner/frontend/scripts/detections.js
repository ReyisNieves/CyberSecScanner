class Detections {
    constructor(app) {
        this.app = app;
        this.filteredDetections = [];
        this.filters = {
            severity: '',
            technique: '',
            date: ''
        };
        this.sortBy = 'timestamp';
        this.sortOrder = 'desc';
    }

    initialize() {
        this.setupDetectionsView();
        this.setupFilters();
        this.renderDetectionsTable();
    }

    setupDetectionsView() {
        // Setup export button
        const exportButton = document.getElementById('export-detections-btn');
        if (exportButton) {
            exportButton.addEventListener('click', () => {
                this.exportDetections();
            });
        }
    }

    setupFilters() {
        // Severity filter
        const severityFilter = document.getElementById('severity-filter');
        if (severityFilter) {
            severityFilter.addEventListener('change', (e) => {
                this.filters.severity = e.target.value;
                this.applyFilters();
            });
        }

        // Technique filter
        const techniqueFilter = document.getElementById('technique-filter');
        if (techniqueFilter) {
            techniqueFilter.addEventListener('change', (e) => {
                this.filters.technique = e.target.value;
                this.applyFilters();
            });
            
            // Populate technique filter options
            this.populateTechniqueFilter();
        }

        // Date filter
        const dateFilter = document.getElementById('date-filter');
        if (dateFilter) {
            dateFilter.addEventListener('change', (e) => {
                this.filters.date = e.target.value;
                this.applyFilters();
            });
        }
    }

    populateTechniqueFilter() {
        const techniqueFilter = document.getElementById('technique-filter');
        if (!techniqueFilter) return;

        // Get unique techniques from detections
        const techniques = [...new Set(this.app.detections.map(d => d.technique).filter(Boolean))];
        
        // Clear existing options except the first one
        techniqueFilter.innerHTML = '<option value="">All Techniques</option>';
        
        // Add technique options
        techniques.sort().forEach(technique => {
            const option = document.createElement('option');
            option.value = technique;
            option.textContent = `${technique} - ${this.getTechniqueName(technique)}`;
            techniqueFilter.appendChild(option);
        });
    }

    getTechniqueName(technique) {
        const techniqueNames = {
            'T1053': 'Scheduled Task/Job',
            'T1055': 'Process Injection',
            'T1547': 'Boot or Logon Autostart Execution',
            'T1543': 'Create or Modify System Process',
            'T1070': 'Indicator Removal on Host',
            'T1071': 'Application Layer Protocol',
            'T1090': 'Proxy',
            'T1095': 'Non-Application Layer Protocol'
        };
        
        return techniqueNames[technique] || 'Unknown Technique';
    }

    applyFilters() {
        this.filteredDetections = this.app.detections.filter(detection => {
            // Severity filter
            if (this.filters.severity && detection.severity !== this.filters.severity) {
                return false;
            }

            // Technique filter
            if (this.filters.technique && detection.technique !== this.filters.technique) {
                return false;
            }

            // Date filter
            if (this.filters.date) {
                const detectionDate = new Date(detection.timestamp).toDateString();
                const filterDate = new Date(this.filters.date).toDateString();
                if (detectionDate !== filterDate) {
                    return false;
                }
            }

            return true;
        });

        this.sortDetections();
        this.renderDetectionsTable();
    }

    sortDetections() {
        this.filteredDetections.sort((a, b) => {
            let aValue = a[this.sortBy];
            let bValue = b[this.sortBy];

            // Handle timestamp sorting
            if (this.sortBy === 'timestamp') {
                aValue = new Date(aValue).getTime();
                bValue = new Date(bValue).getTime();
            }

            // Handle severity sorting
            if (this.sortBy === 'severity') {
                const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
                aValue = severityOrder[aValue] || 0;
                bValue = severityOrder[bValue] || 0;
            }

            if (this.sortOrder === 'asc') {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });
    }

    renderDetectionsTable() {
        const container = document.getElementById('detections-table');
        if (!container) return;

        const detectionsToShow = this.filteredDetections.length > 0 
            ? this.filteredDetections 
            : this.app.detections;

        if (detectionsToShow.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <span style="font-size: 48px; display: block; margin-bottom: 16px;">🔍</span>
                    <h3>No detections found</h3>
                    <p>Run a security scan to start detecting potential threats</p>
                </div>
            `;
            return;
        }

        const tableHtml = `
            <div class="detections-table-container">
                <div class="detections-table-header">
                    <div class="table-info">
                        <span class="results-count">${detectionsToShow.length} detection${detectionsToShow.length !== 1 ? 's' : ''}</span>
                        ${this.filteredDetections.length > 0 && this.filteredDetections.length !== this.app.detections.length ? 
                            `<span class="filter-info">(filtered from ${this.app.detections.length} total)</span>` : ''
                        }
                    </div>
                    <div class="table-controls">
                        <select id="sort-by" class="sort-select">
                            <option value="timestamp">Sort by Time</option>
                            <option value="severity">Sort by Severity</option>
                            <option value="technique">Sort by Technique</option>
                            <option value="title">Sort by Title</option>
                        </select>
                        <button id="sort-order" class="sort-order-btn" title="Toggle sort order">
                            ${this.sortOrder === 'desc' ? '↓' : '↑'}
                        </button>
                    </div>
                </div>
                <div class="detections-table-body">
                    ${detectionsToShow.map(detection => this.renderDetectionRow(detection)).join('')}
                </div>
            </div>
        `;

        container.innerHTML = tableHtml;

        // Setup table controls
        this.setupTableControls();
    }

    setupTableControls() {
        // Sort by dropdown
        const sortBySelect = document.getElementById('sort-by');
        if (sortBySelect) {
            sortBySelect.value = this.sortBy;
            sortBySelect.addEventListener('change', (e) => {
                this.sortBy = e.target.value;
                this.sortDetections();
                this.renderDetectionsTable();
            });
        }

        // Sort order button
        const sortOrderBtn = document.getElementById('sort-order');
        if (sortOrderBtn) {
            sortOrderBtn.addEventListener('click', () => {
                this.sortOrder = this.sortOrder === 'desc' ? 'asc' : 'desc';
                this.sortDetections();
                this.renderDetectionsTable();
            });
        }

        // Setup detection row click handlers
        document.querySelectorAll('.detection-row').forEach(row => {
            row.addEventListener('click', () => {
                const detectionId = row.dataset.detectionId;
                this.showDetectionDetails(detectionId);
            });
        });
    }

    renderDetectionRow(detection) {
        const timeAgo = this.getTimeAgo(detection.timestamp);
        const severityIcon = this.getSeverityIcon(detection.severity);
        const techniqueName = this.getTechniqueName(detection.technique);

        return `
            <div class="detection-row ${detection.severity}" data-detection-id="${detection.id}">
                <div class="detection-row-main">
                    <div class="detection-severity">
                        <span class="severity-icon">${severityIcon}</span>
                        <span class="severity-text">${detection.severity.toUpperCase()}</span>
                    </div>
                    <div class="detection-info">
                        <div class="detection-title">${detection.title}</div>
                        <div class="detection-description">${detection.description}</div>
                    </div>
                    <div class="detection-meta">
                        <div class="detection-technique">
                            <strong>${detection.technique}</strong><br>
                            <small>${techniqueName}</small>
                        </div>
                        <div class="detection-time">
                            <span class="time-ago">${timeAgo}</span><br>
                            <small>${new Date(detection.timestamp).toLocaleString()}</small>
                        </div>
                    </div>
                </div>
                <div class="detection-actions">
                    <button class="btn-action" title="View Details" onclick="app.detections.showDetectionDetails('${detection.id}')">
                        👁️
                    </button>
                    <button class="btn-action" title="Mark as Reviewed" onclick="app.detections.markAsReviewed('${detection.id}')">
                        ✓
                    </button>
                    <button class="btn-action" title="Export" onclick="app.detections.exportSingleDetection('${detection.id}')">
                        📁
                    </button>
                </div>
            </div>
        `;
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

    showDetectionDetails(detectionId) {
        const detection = this.app.detections.find(d => d.id === detectionId);
        if (!detection) return;

        const modal = this.createDetectionModal(detection);
        document.body.appendChild(modal);
    }

    createDetectionModal(detection) {
        const modal = document.createElement('div');
        modal.className = 'detection-modal-overlay';
        modal.innerHTML = `
            <div class="detection-modal">
                <div class="modal-header">
                    <h3>Detection Details</h3>
                    <button class="modal-close" onclick="this.closest('.detection-modal-overlay').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="detection-detail-grid">
                        <div class="detail-item">
                            <label>Title:</label>
                            <span>${detection.title}</span>
                        </div>
                        <div class="detail-item">
                            <label>Severity:</label>
                            <span class="severity-badge ${detection.severity}">
                                ${this.getSeverityIcon(detection.severity)} ${detection.severity.toUpperCase()}
                            </span>
                        </div>
                        <div class="detail-item">
                            <label>MITRE ATT&CK Technique:</label>
                            <span>${detection.technique} - ${this.getTechniqueName(detection.technique)}</span>
                        </div>
                        <div class="detail-item">
                            <label>Detected At:</label>
                            <span>${new Date(detection.timestamp).toLocaleString()}</span>
                        </div>
                        <div class="detail-item full-width">
                            <label>Description:</label>
                            <p>${detection.description}</p>
                        </div>
                        ${detection.details ? `
                            <div class="detail-item full-width">
                                <label>Additional Details:</label>
                                <pre class="details-pre">${JSON.stringify(detection.details, null, 2)}</pre>
                            </div>
                        ` : ''}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.detection-modal-overlay').remove()">Close</button>
                    <button class="btn btn-primary" onclick="app.detections.exportSingleDetection('${detection.id}')">Export</button>
                </div>
            </div>
        `;

        // Add modal styles
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;

        return modal;
    }

    markAsReviewed(detectionId) {
        const detection = this.app.detections.find(d => d.id === detectionId);
        if (!detection) return;

        detection.reviewed = true;
        detection.reviewedAt = new Date().toISOString();
        
        // Save to localStorage
        this.app.saveData();
        
        // Update display
        this.renderDetectionsTable();
        
        // Show notification
        this.showNotification('Detection marked as reviewed', 'success');
    }

    exportDetections() {
        const detectionsToExport = this.filteredDetections.length > 0 
            ? this.filteredDetections 
            : this.app.detections;

        if (detectionsToExport.length === 0) {
            this.showNotification('No detections to export', 'warning');
            return;
        }

        const exportData = {
            exportedAt: new Date().toISOString(),
            totalDetections: detectionsToExport.length,
            filters: this.filters,
            detections: detectionsToExport,
            summary: {
                severityBreakdown: this.getSeverityBreakdown(detectionsToExport),
                techniqueBreakdown: this.getTechniqueBreakdown(detectionsToExport),
                timeRange: this.getTimeRange(detectionsToExport)
            }
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
            type: 'application/json' 
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cybersecscanner-detections-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showNotification(`Exported ${detectionsToExport.length} detections`, 'success');
    }

    exportSingleDetection(detectionId) {
        const detection = this.app.detections.find(d => d.id === detectionId);
        if (!detection) return;

        const exportData = {
            exportedAt: new Date().toISOString(),
            detection: detection
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
            type: 'application/json' 
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cybersecscanner-detection-${detection.id}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showNotification('Detection exported', 'success');
    }

    getSeverityBreakdown(detections) {
        const breakdown = { critical: 0, high: 0, medium: 0, low: 0 };
        detections.forEach(detection => {
            if (breakdown.hasOwnProperty(detection.severity)) {
                breakdown[detection.severity]++;
            }
        });
        return breakdown;
    }

    getTechniqueBreakdown(detections) {
        const breakdown = {};
        detections.forEach(detection => {
            const technique = detection.technique || 'Unknown';
            breakdown[technique] = (breakdown[technique] || 0) + 1;
        });
        return breakdown;
    }

    getTimeRange(detections) {
        if (detections.length === 0) return null;

        const timestamps = detections.map(d => new Date(d.timestamp).getTime());
        const earliest = new Date(Math.min(...timestamps)).toISOString();
        const latest = new Date(Math.max(...timestamps)).toISOString();

        return { earliest, latest };
    }

    showNotification(message, type = 'info') {
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
            z-index: 10001;
            font-size: 14px;
            max-width: 300px;
            word-wrap: break-word;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);

        notification.addEventListener('click', () => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        });
    }

    refreshDetections() {
        this.populateTechniqueFilter();
        this.applyFilters();
    }
}

// Make Detections available globally
window.Detections = Detections;
