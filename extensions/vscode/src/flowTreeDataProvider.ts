import * as vscode from 'vscode';

export interface FlowNode {
    label: string;
    status: 'active' | 'error' | 'idle';
    type: 'source' | 'transformer' | 'sink' | 'flow';
    children?: FlowNode[];
    throughput?: number;
    latency?: number;
}

export class FlowTreeItem extends vscode.TreeItem {
    constructor(
        public readonly node: FlowNode,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(node.label, collapsibleState);
        
        this.tooltip = this.getTooltip();
        this.iconPath = this.getIcon();
        this.contextValue = node.type;
        
        if (node.throughput !== undefined) {
            this.description = `${node.throughput} items/sec`;
        }
    }

    private getTooltip(): string {
        let tooltip = `${this.node.label} (${this.node.type})`;
        if (this.node.throughput !== undefined) {
            tooltip += `\nThroughput: ${this.node.throughput} items/sec`;
        }
        if (this.node.latency !== undefined) {
            tooltip += `\nLatency: ${this.node.latency}ms`;
        }
        return tooltip;
    }

    private getIcon(): vscode.ThemeIcon {
        // Status-based coloring
        if (this.node.status === 'active') {
            return new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('testing.iconPassed'));
        } else if (this.node.status === 'error') {
            return new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('testing.iconFailed'));
        } else {
            return new vscode.ThemeIcon('circle-outline');
        }
    }
}

export class FlowTreeDataProvider implements vscode.TreeDataProvider<FlowNode> {
    private _onDidChangeTreeData: vscode.EventEmitter<FlowNode | undefined | null | void> = new vscode.EventEmitter<FlowNode | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<FlowNode | undefined | null | void> = this._onDidChangeTreeData.event;

    private flows: FlowNode[] = [];

    constructor() {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    updateFlows(flows: FlowNode[]): void {
        this.flows = flows;
        this.refresh();
    }

    getTreeItem(element: FlowNode): vscode.TreeItem {
        const collapsibleState = element.children && element.children.length > 0
            ? vscode.TreeItemCollapsibleState.Expanded
            : vscode.TreeItemCollapsibleState.None;
        return new FlowTreeItem(element, collapsibleState);
    }

    getChildren(element?: FlowNode): Thenable<FlowNode[]> {
        if (!element) {
            // Root level - return all flows
            return Promise.resolve(this.flows);
        } else {
            // Return children of the flow node
            return Promise.resolve(element.children || []);
        }
    }

    getParent(element: FlowNode): vscode.ProviderResult<FlowNode> {
        // Simple implementation - can be enhanced if needed
        return null;
    }
}
