import * as vscode from 'vscode';

export interface FlowStatusData {
    flow_name: string;
    active_sources: string[];
    updated_sources: string[];
    status: 'active' | 'idle' | 'error';
}

class FlowItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly status?: string,
        public readonly children?: FlowItem[]
    ) {
        super(label, collapsibleState);
        
        if (status) {
            this.iconPath = new vscode.ThemeIcon(
                status === 'active' ? 'pulse' :
                status === 'error' ? 'error' :
                'circle-outline'
            );
            
            this.description = status.charAt(0).toUpperCase() + status.slice(1);
        }
    }
}

export class FlowTreeDataProvider implements vscode.TreeDataProvider<FlowItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<FlowItem | undefined | null | void> = new vscode.EventEmitter<FlowItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<FlowItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private flows: Map<string, FlowStatusData> = new Map();

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    updateFlowStatus(data: FlowStatusData): void {
        this.flows.set(data.flow_name, data);
        this.refresh();
    }

    getTreeItem(element: FlowItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: FlowItem): Thenable<FlowItem[]> {
        if (!element) {
            // Root level - show all flows
            if (this.flows.size === 0) {
                return Promise.resolve([
                    new FlowItem('No active flows', vscode.TreeItemCollapsibleState.None)
                ]);
            }

            const flowItems: FlowItem[] = [];
            this.flows.forEach((flowData, flowName) => {
                const children = this.createFlowChildren(flowData);
                flowItems.push(
                    new FlowItem(
                        flowName,
                        vscode.TreeItemCollapsibleState.Expanded,
                        flowData.status,
                        children
                    )
                );
            });
            return Promise.resolve(flowItems);
        } else {
            // Return children if they exist
            return Promise.resolve(element.children || []);
        }
    }

    private createFlowChildren(flowData: FlowStatusData): FlowItem[] {
        const children: FlowItem[] = [];

        // Sources section
        if (flowData.active_sources.length > 0) {
            const sourceChildren = flowData.active_sources.map(source => 
                new FlowItem(source, vscode.TreeItemCollapsibleState.None)
            );
            children.push(
                new FlowItem(
                    'Sources',
                    vscode.TreeItemCollapsibleState.Expanded,
                    undefined,
                    sourceChildren
                )
            );
        }

        // Transformers section (placeholder)
        children.push(
            new FlowItem(
                'Transformers',
                vscode.TreeItemCollapsibleState.Collapsed,
                undefined,
                [new FlowItem('Transform 1', vscode.TreeItemCollapsibleState.None)]
            )
        );

        // Sink section (placeholder)
        children.push(
            new FlowItem(
                'Sinks',
                vscode.TreeItemCollapsibleState.Collapsed,
                undefined,
                [new FlowItem('Target DB', vscode.TreeItemCollapsibleState.None)]
            )
        );

        return children;
    }
}
