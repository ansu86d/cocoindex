import * as vscode from 'vscode';

export interface DashboardMetrics {
    throughput: number[];
    latency: { p50: number[]; p99: number[] };
    freshness: number[];
    timestamps: string[];
    flowName: string;
}

export class DashboardPanel {
    public static currentPanel: DashboardPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionUri: vscode.Uri) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it
        if (DashboardPanel.currentPanel) {
            DashboardPanel.currentPanel._panel.reveal(column);
            return;
        }

        // Otherwise, create a new panel
        const panel = vscode.window.createWebviewPanel(
            'cocoindexDashboard',
            'CocoIndex Dashboard',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'node_modules')]
            }
        );

        DashboardPanel.currentPanel = new DashboardPanel(panel, extensionUri);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        // Set the webview's initial html content
        this._update();

        // Listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programmatically
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'alert':
                        vscode.window.showInformationMessage(message.text);
                        return;
                }
            },
            null,
            this._disposables
        );
    }

    public updateMetrics(metrics: DashboardMetrics) {
        // Send metrics to the webview
        this._panel.webview.postMessage({
            command: 'updateMetrics',
            metrics: metrics
        });
    }

    public dispose() {
        DashboardPanel.currentPanel = undefined;

        // Clean up our resources
        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _update() {
        const webview = this._panel.webview;
        this._panel.title = 'CocoIndex Dashboard';
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        // Get local path to Chart.js
        const chartJsPath = vscode.Uri.joinPath(this._extensionUri, 'node_modules', 'chart.js', 'dist', 'chart.umd.min.js');
        const chartJsUri = webview.asWebviewUri(chartJsPath);
        
        // Generate a nonce for inline scripts
        const nonce = getNonce();

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}' ${webview.cspSource}; style-src 'unsafe-inline' ${webview.cspSource};">
    <title>CocoIndex Dashboard</title>
    <script nonce="${nonce}" src="${chartJsUri}"></script>
    <style>
        body {
            padding: 20px;
            font-family: var(--vscode-font-family);
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
        }
        h1 {
            margin-bottom: 20px;
        }
        .metrics-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
        }
        .chart-container {
            background: var(--vscode-editor-inactiveSelectionBackground);
            padding: 15px;
            border-radius: 5px;
        }
        .metric-card {
            background: var(--vscode-editor-inactiveSelectionBackground);
            padding: 15px;
            border-radius: 5px;
        }
        .metric-value {
            font-size: 2em;
            font-weight: bold;
            margin: 10px 0;
        }
        .metric-label {
            font-size: 0.9em;
            opacity: 0.8;
        }
        canvas {
            max-height: 300px;
        }
        @media (max-width: 800px) {
            .metrics-container {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <h1>CocoIndex Flow Dashboard</h1>
    <div id="flowName">No flow selected</div>
    
    <div class="metrics-container">
        <div class="metric-card">
            <div class="metric-label">Current Throughput</div>
            <div class="metric-value" id="currentThroughput">--</div>
            <div class="metric-label">items/sec</div>
        </div>
        <div class="metric-card">
            <div class="metric-label">Average Latency (P50)</div>
            <div class="metric-value" id="currentLatency">--</div>
            <div class="metric-label">ms</div>
        </div>
        <div class="metric-card">
            <div class="metric-label">P99 Latency</div>
            <div class="metric-value" id="currentP99">--</div>
            <div class="metric-label">ms</div>
        </div>
        <div class="metric-card">
            <div class="metric-label">Freshness</div>
            <div class="metric-value" id="currentFreshness">--</div>
            <div class="metric-label">seconds ago</div>
        </div>
    </div>

    <div class="metrics-container">
        <div class="chart-container">
            <h3>Throughput Over Time</h3>
            <canvas id="throughputChart"></canvas>
        </div>
        <div class="chart-container">
            <h3>Latency Distribution</h3>
            <canvas id="latencyChart"></canvas>
        </div>
    </div>

    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        
        // Initialize charts
        const throughputCtx = document.getElementById('throughputChart').getContext('2d');
        const latencyCtx = document.getElementById('latencyChart').getContext('2d');
        
        const throughputChart = new Chart(throughputCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Throughput (items/sec)',
                    data: [],
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });

        const latencyChart = new Chart(latencyCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'P50 Latency (ms)',
                        data: [],
                        borderColor: 'rgb(54, 162, 235)',
                        tension: 0.1,
                        fill: false
                    },
                    {
                        label: 'P99 Latency (ms)',
                        data: [],
                        borderColor: 'rgb(255, 99, 132)',
                        tension: 0.1,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
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
                const metrics = message.metrics;
                
                // Update flow name
                document.getElementById('flowName').textContent = 'Flow: ' + metrics.flowName;
                
                // Update current metrics
                const latestIdx = metrics.throughput.length - 1;
                if (latestIdx >= 0) {
                    document.getElementById('currentThroughput').textContent = 
                        metrics.throughput[latestIdx].toFixed(2);
                    document.getElementById('currentLatency').textContent = 
                        metrics.latency.p50[latestIdx].toFixed(2);
                    document.getElementById('currentP99').textContent = 
                        metrics.latency.p99[latestIdx].toFixed(2);
                    document.getElementById('currentFreshness').textContent = 
                        metrics.freshness[latestIdx].toFixed(0);
                }
                
                // Update charts
                throughputChart.data.labels = metrics.timestamps;
                throughputChart.data.datasets[0].data = metrics.throughput;
                throughputChart.update();
                
                latencyChart.data.labels = metrics.timestamps;
                latencyChart.data.datasets[0].data = metrics.latency.p50;
                latencyChart.data.datasets[1].data = metrics.latency.p99;
                latencyChart.update();
            }
        });
    </script>
</body>
</html>`;
    }
}

function getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
