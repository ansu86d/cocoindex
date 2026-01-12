import * as vscode from 'vscode';

export class DashboardPanel {
    public static currentPanel: DashboardPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];
    private _metrics: Map<string, any> = new Map();

    public static createOrShow(extensionUri: vscode.Uri) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (DashboardPanel.currentPanel) {
            DashboardPanel.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'cocoindexDashboard',
            'CocoIndex Dashboard',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        DashboardPanel.currentPanel = new DashboardPanel(panel, extensionUri);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._panel.webview.html = this._getHtmlForWebview();

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    }

    public updateFlowStatus(data: any) {
        this._panel.webview.postMessage({
            command: 'updateFlowStatus',
            data: data
        });
    }

    public updateMetrics(data: any) {
        this._metrics.set(data.flow_name, data);
        this._panel.webview.postMessage({
            command: 'updateMetrics',
            data: data
        });
    }

    public dispose() {
        DashboardPanel.currentPanel = undefined;

        this._panel.dispose();

        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }

    private _getHtmlForWebview(): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CocoIndex Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
        }
        .dashboard-container {
            max-width: 1200px;
            margin: 0 auto;
        }
        h1 {
            color: var(--vscode-titleBar-activeForeground);
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .metric-card {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 20px;
        }
        .metric-title {
            font-size: 14px;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 10px;
        }
        .metric-value {
            font-size: 32px;
            font-weight: bold;
            color: var(--vscode-foreground);
        }
        .metric-unit {
            font-size: 14px;
            color: var(--vscode-descriptionForeground);
        }
        .chart-container {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
        }
        canvas {
            max-height: 300px;
        }
    </style>
</head>
<body>
    <div class="dashboard-container">
        <h1>CocoIndex Flow Dashboard</h1>
        
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-title">Throughput</div>
                <div class="metric-value" id="throughput">0</div>
                <div class="metric-unit">items/sec</div>
            </div>
            <div class="metric-card">
                <div class="metric-title">Latency P50</div>
                <div class="metric-value" id="latency-p50">0</div>
                <div class="metric-unit">ms</div>
            </div>
            <div class="metric-card">
                <div class="metric-title">Latency P99</div>
                <div class="metric-value" id="latency-p99">0</div>
                <div class="metric-unit">ms</div>
            </div>
            <div class="metric-card">
                <div class="metric-title">Freshness</div>
                <div class="metric-value" id="freshness">0</div>
                <div class="metric-unit">seconds</div>
            </div>
        </div>

        <div class="chart-container">
            <h2>Throughput Over Time</h2>
            <canvas id="throughputChart"></canvas>
        </div>

        <div class="chart-container">
            <h2>Latency Distribution</h2>
            <canvas id="latencyChart"></canvas>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
        // Initialize charts
        const throughputCtx = document.getElementById('throughputChart').getContext('2d');
        const throughputChart = new Chart(throughputCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Throughput (items/sec)',
                    data: [],
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });

        const latencyCtx = document.getElementById('latencyChart').getContext('2d');
        const latencyChart = new Chart(latencyCtx, {
            type: 'bar',
            data: {
                labels: ['P50', 'P99'],
                datasets: [{
                    label: 'Latency (ms)',
                    data: [0, 0],
                    backgroundColor: [
                        'rgba(54, 162, 235, 0.5)',
                        'rgba(255, 99, 132, 0.5)'
                    ],
                    borderColor: [
                        'rgb(54, 162, 235)',
                        'rgb(255, 99, 132)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });

        // Handle messages from the extension
        window.addEventListener('message', event => {
            const message = event.data;
            
            if (message.command === 'updateMetrics') {
                const metrics = message.data;
                
                // Update metric cards
                document.getElementById('throughput').textContent = metrics.throughput.toFixed(1);
                document.getElementById('latency-p50').textContent = metrics.latency_p50.toFixed(1);
                document.getElementById('latency-p99').textContent = metrics.latency_p99.toFixed(1);
                document.getElementById('freshness').textContent = metrics.freshness.toFixed(1);
                
                // Update throughput chart
                const now = new Date().toLocaleTimeString();
                throughputChart.data.labels.push(now);
                throughputChart.data.datasets[0].data.push(metrics.throughput);
                
                // Keep only last 20 data points
                if (throughputChart.data.labels.length > 20) {
                    throughputChart.data.labels.shift();
                    throughputChart.data.datasets[0].data.shift();
                }
                throughputChart.update();
                
                // Update latency chart
                latencyChart.data.datasets[0].data = [metrics.latency_p50, metrics.latency_p99];
                latencyChart.update();
            }
        });
    </script>
</body>
</html>`;
    }
}
