import * as vscode from 'vscode';
import { FlowTreeDataProvider } from './flowTreeProvider';
import { PythonBridge } from './pythonBridge';
import { DashboardPanel } from './dashboardPanel';

let pythonBridge: PythonBridge | undefined;
let flowTreeDataProvider: FlowTreeDataProvider | undefined;

export function activate(context: vscode.ExtensionContext) {
    console.log('CocoIndex Monitor extension is now active');

    // Initialize the flow tree data provider
    flowTreeDataProvider = new FlowTreeDataProvider();
    vscode.window.registerTreeDataProvider('cocoindexFlows', flowTreeDataProvider);

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('cocoindex.startMonitoring', async () => {
            await startMonitoring(context);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('cocoindex.stopMonitoring', () => {
            stopMonitoring();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('cocoindex.showDashboard', () => {
            DashboardPanel.createOrShow(context.extensionUri);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('cocoindex.refreshFlows', () => {
            flowTreeDataProvider?.refresh();
        })
    );

    // Auto-start if configured
    const config = vscode.workspace.getConfiguration('cocoindex');
    if (config.get('autoStart')) {
        startMonitoring(context);
    }
}

async function startMonitoring(context: vscode.ExtensionContext) {
    if (pythonBridge) {
        vscode.window.showInformationMessage('CocoIndex monitoring is already running');
        return;
    }

    const config = vscode.workspace.getConfiguration('cocoindex');
    const pythonPath = config.get<string>('pythonPath') || 'python3';

    pythonBridge = new PythonBridge(pythonPath, context.extensionPath);
    
    // Set up message handlers
    pythonBridge.on('flow_status', (data) => {
        flowTreeDataProvider?.updateFlowStatus(data);
        DashboardPanel.currentPanel?.updateFlowStatus(data);
    });

    pythonBridge.on('flow_metrics', (data) => {
        DashboardPanel.currentPanel?.updateMetrics(data);
    });

    pythonBridge.on('log', (data) => {
        console.log(`[CocoIndex Bridge] ${data.level}: ${data.message}`);
    });

    try {
        await pythonBridge.start();
        vscode.window.showInformationMessage('CocoIndex monitoring started');
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to start CocoIndex monitoring: ${error}`);
        pythonBridge = undefined;
    }
}

function stopMonitoring() {
    if (!pythonBridge) {
        vscode.window.showInformationMessage('CocoIndex monitoring is not running');
        return;
    }

    pythonBridge.stop();
    pythonBridge = undefined;
    vscode.window.showInformationMessage('CocoIndex monitoring stopped');
}

export function deactivate() {
    if (pythonBridge) {
        pythonBridge.stop();
    }
}
