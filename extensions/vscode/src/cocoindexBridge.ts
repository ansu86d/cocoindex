import * as vscode from 'vscode';
import * as child_process from 'child_process';
import * as path from 'path';
import { FlowNode } from './flowTreeDataProvider';
import { DashboardMetrics } from './dashboardPanel';

export interface StatusUpdate {
    active_sources: string[];
    updated_sources: string[];
}

export class CocoIndexBridge {
    private pythonProcess: child_process.ChildProcess | null = null;
    private isRunning: boolean = false;
    private outputChannel: vscode.OutputChannel;

    constructor(private extensionPath: string) {
        this.outputChannel = vscode.window.createOutputChannel('CocoIndex Bridge');
    }

    async start(pythonScriptPath?: string): Promise<void> {
        if (this.isRunning) {
            this.outputChannel.appendLine('Bridge is already running');
            return;
        }

        // Use the provided script path or default to the sidecar script
        const scriptPath = pythonScriptPath || path.join(this.extensionPath, 'python', 'cocoindex_sidecar.py');
        
        try {
            this.outputChannel.appendLine(`Starting CocoIndex bridge with script: ${scriptPath}`);
            
            // Start the Python sidecar process
            this.pythonProcess = child_process.spawn('python3', [scriptPath], {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            this.isRunning = true;

            // Handle stdout (JSON messages from Python)
            this.pythonProcess.stdout?.on('data', (data) => {
                const message = data.toString().trim();
                this.outputChannel.appendLine(`Received: ${message}`);
                this.handleMessage(message);
            });

            // Handle stderr (errors and logs)
            this.pythonProcess.stderr?.on('data', (data) => {
                this.outputChannel.appendLine(`Error: ${data.toString()}`);
            });

            // Handle process exit
            this.pythonProcess.on('exit', (code) => {
                this.outputChannel.appendLine(`Python process exited with code ${code}`);
                this.isRunning = false;
                this.pythonProcess = null;
            });

            this.outputChannel.appendLine('Bridge started successfully');
        } catch (error) {
            this.outputChannel.appendLine(`Failed to start bridge: ${error}`);
            throw error;
        }
    }

    stop(): void {
        if (this.pythonProcess) {
            this.outputChannel.appendLine('Stopping CocoIndex bridge');
            this.pythonProcess.kill();
            this.pythonProcess = null;
            this.isRunning = false;
        }
    }

    private handleMessage(message: string): void {
        try {
            const data = JSON.parse(message);
            
            // Emit event based on message type
            if (data.type === 'status_update') {
                this._onStatusUpdate.fire(data.payload);
            } else if (data.type === 'flow_update') {
                this._onFlowUpdate.fire(data.payload);
            } else if (data.type === 'metrics_update') {
                this._onMetricsUpdate.fire(data.payload);
            }
        } catch (error) {
            this.outputChannel.appendLine(`Failed to parse message: ${error}`);
        }
    }

    // Event emitters
    private _onStatusUpdate = new vscode.EventEmitter<StatusUpdate>();
    public readonly onStatusUpdate = this._onStatusUpdate.event;

    private _onFlowUpdate = new vscode.EventEmitter<FlowNode[]>();
    public readonly onFlowUpdate = this._onFlowUpdate.event;

    private _onMetricsUpdate = new vscode.EventEmitter<DashboardMetrics>();
    public readonly onMetricsUpdate = this._onMetricsUpdate.event;

    dispose(): void {
        this.stop();
        this._onStatusUpdate.dispose();
        this._onFlowUpdate.dispose();
        this._onMetricsUpdate.dispose();
        this.outputChannel.dispose();
    }
}
