// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { FlowTreeDataProvider } from './flowTreeDataProvider';
import { DashboardPanel } from './dashboardPanel';
import { CocoIndexBridge } from './cocoindexBridge';

let bridge: CocoIndexBridge | undefined;
let flowTreeDataProvider: FlowTreeDataProvider | undefined;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	console.log('CocoIndex Monitor extension is now active!');

	// Create the flow tree data provider
	flowTreeDataProvider = new FlowTreeDataProvider();
	
	// Register the tree view
	const treeView = vscode.window.createTreeView('cocoindexFlows', {
		treeDataProvider: flowTreeDataProvider,
		showCollapseAll: true
	});

	// Create the CocoIndex bridge
	bridge = new CocoIndexBridge(context.extensionPath);

	// Listen to bridge events
	bridge.onFlowUpdate((flows) => {
		flowTreeDataProvider?.updateFlows(flows);
	});

	bridge.onMetricsUpdate((metrics) => {
		DashboardPanel.currentPanel?.updateMetrics(metrics);
	});

	bridge.onStatusUpdate((status) => {
		// Log status updates
		console.log('Status update:', status);
		vscode.window.setStatusBarMessage(
			`CocoIndex: ${status.active_sources.length} active sources`, 
			3000
		);
	});

	// Register commands
	context.subscriptions.push(
		vscode.commands.registerCommand('cocoindex-monitor.refreshFlows', () => {
			flowTreeDataProvider?.refresh();
			vscode.window.showInformationMessage('Refreshing CocoIndex flows...');
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('cocoindex-monitor.showDashboard', () => {
			DashboardPanel.createOrShow(context.extensionUri);
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('cocoindex-monitor.startMonitoring', async () => {
			try {
				await bridge?.start();
				vscode.window.showInformationMessage('CocoIndex monitoring started');
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to start monitoring: ${error}`);
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('cocoindex-monitor.stopMonitoring', () => {
			bridge?.stop();
			vscode.window.showInformationMessage('CocoIndex monitoring stopped');
		})
	);

	context.subscriptions.push(treeView);
}

// This method is called when your extension is deactivated
export function deactivate() {
	bridge?.dispose();
}
