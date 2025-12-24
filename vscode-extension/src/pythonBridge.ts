import * as child_process from 'child_process';
import * as path from 'path';
import { EventEmitter } from 'events';

export class PythonBridge extends EventEmitter {
    private process: child_process.ChildProcess | undefined;
    private pythonPath: string;
    private extensionPath: string;

    constructor(pythonPath: string, extensionPath: string) {
        super();
        this.pythonPath = pythonPath;
        this.extensionPath = extensionPath;
    }

    async start(): Promise<void> {
        return new Promise((resolve, reject) => {
            const bridgeScript = path.join(this.extensionPath, 'python-bridge', 'cocoindex_bridge.py');
            
            this.process = child_process.spawn(this.pythonPath, [bridgeScript], {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            if (!this.process.stdout || !this.process.stderr) {
                reject(new Error('Failed to create process streams'));
                return;
            }

            // Handle stdout (JSON messages)
            let buffer = '';
            this.process.stdout.on('data', (data) => {
                buffer += data.toString();
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.trim()) {
                        try {
                            const message = JSON.parse(line);
                            this.emit(message.type, message.data);
                        } catch (error) {
                            console.error('Failed to parse message:', line, error);
                        }
                    }
                }
            });

            // Handle stderr
            this.process.stderr.on('data', (data) => {
                console.error(`[Python Bridge Error]: ${data.toString()}`);
            });

            // Handle process exit
            this.process.on('exit', (code) => {
                console.log(`Python bridge exited with code ${code}`);
                this.emit('exit', code);
            });

            // Handle process errors
            this.process.on('error', (error) => {
                console.error('Python bridge error:', error);
                reject(error);
            });

            // Give the process a moment to start
            setTimeout(() => {
                if (this.process && !this.process.killed) {
                    resolve();
                } else {
                    reject(new Error('Process failed to start'));
                }
            }, 1000);
        });
    }

    stop(): void {
        if (this.process) {
            this.process.kill('SIGTERM');
            this.process = undefined;
        }
    }

    sendCommand(command: string, data?: any): void {
        if (this.process && this.process.stdin) {
            const message = JSON.stringify({ command, data });
            this.process.stdin.write(message + '\n');
        }
    }
}
