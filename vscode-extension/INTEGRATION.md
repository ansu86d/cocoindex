# CocoIndex VS Code Extension - Integration Guide

This guide shows how to integrate the VS Code extension with your CocoIndex projects.

## Quick Start

### 1. Install the Extension

From the extension directory:
```bash
cd vscode-extension
npm install
npm run compile
```

### 2. Launch Development Mode

Open the `vscode-extension` folder in VS Code and press `F5` to launch the Extension Development Host.

### 3. Start Monitoring

In the Extension Development Host window:
1. Open the Command Palette (`Cmd+Shift+P` or `Ctrl+Shift+P`)
2. Run: `CocoIndex: Start Monitoring`
3. Click the CocoIndex icon in the Activity Bar to see flows

## Using with Real CocoIndex Flows

### Example: Monitoring a Live Updates Flow

```python
# my_flow.py
import datetime
import cocoindex
from dotenv import load_dotenv


@cocoindex.flow_def(name="LiveUpdates")
def live_update_flow(
    flow_builder: cocoindex.FlowBuilder, 
    data_scope: cocoindex.DataScope
) -> None:
    # Source: local files
    data_scope["documents"] = flow_builder.add_source(
        cocoindex.sources.LocalFile(path="data"),
        refresh_interval=datetime.timedelta(seconds=5),
    )

    # Collector
    collector = data_scope.add_collector()
    with data_scope["documents"].row() as doc:
        collector.collect(
            filename=doc["filename"],
            content=doc["content"],
        )

    # Target: Postgres
    collector.export(
        "documents_index",
        cocoindex.targets.Postgres(),
        primary_key_fields=["filename"],
    )


def main() -> None:
    # Setup the flow
    live_update_flow.setup(report_to_stdout=True)

    # Start the live updater
    with cocoindex.FlowLiveUpdater(
        live_update_flow, 
        cocoindex.FlowLiveUpdaterOptions(print_stats=True)
    ) as updater:
        print("Waiting for updates...")
        try:
            updater.wait()
        except KeyboardInterrupt:
            print("Stopping...")


if __name__ == "__main__":
    load_dotenv()
    cocoindex.init()
    main()
```

### Integration Workflow

1. **Run your CocoIndex flow** in one terminal:
   ```bash
   python my_flow.py
   ```

2. **Open VS Code** with the extension installed

3. **Start the extension** using the Command Palette

4. **View the flow** in the sidebar:
   - Flow name: "LiveUpdates"
   - Sources: LocalFile:data
   - Status: Active/Idle
   - Real-time updates as files change

## Architecture Overview

```
┌────────────────────────────────────────────┐
│         VS Code Extension                  │
│  ┌──────────────────────────────────────┐ │
│  │  UI Layer                             │ │
│  │  - Tree View (Flow Hierarchy)        │ │
│  │  - Webview Dashboard (Charts)        │ │
│  └──────────────┬───────────────────────┘ │
│                 │                          │
│  ┌──────────────▼───────────────────────┐ │
│  │  Python Bridge                        │ │
│  │  - Process Manager                    │ │
│  │  - JSON Message Handler               │ │
│  └──────────────┬───────────────────────┘ │
└─────────────────┼────────────────────────┘
                  │ stdio (JSON)
                  ▼
┌─────────────────────────────────────────────┐
│   Python Sidecar (cocoindex_bridge.py)      │
│  ┌──────────────────────────────────────┐  │
│  │  CocoIndex Integration                │  │
│  │  - Flow Discovery                     │  │
│  │  - Status Updates (async)             │  │
│  │  - Metrics Collection                 │  │
│  └──────────────┬───────────────────────┘  │
└─────────────────┼──────────────────────────┘
                  │ CocoIndex Python API
                  ▼
┌─────────────────────────────────────────────┐
│         CocoIndex Runtime                   │
│  - next_status_updates_async()              │
│  - FlowLiveUpdater                          │
│  - Metrics/Stats                            │
└─────────────────────────────────────────────┘
```

## API Integration Points

### 1. Flow Status Updates

The bridge uses the `next_status_updates_async()` API:

```python
# In cocoindex_bridge.py
async def monitor_real_flow(self, flow_def):
    updater = cocoindex.FlowLiveUpdater(
        flow_def, 
        cocoindex.FlowLiveUpdaterOptions(print_stats=True)
    )
    await updater.start_async()
    
    while self.running:
        updates = await updater.next_status_updates_async()
        
        status = FlowStatus(
            flow_name=flow_def.name,
            active_sources=updates.active_sources,
            updated_sources=updates.updated_sources,
            status='active' if updates.active_sources else 'idle'
        )
        
        self.send_message('flow_status', status.to_dict())
```

### 2. Metrics Collection

```python
# Get update statistics
update_info = updater.update_stats()

# Extract metrics (to be implemented)
metrics = FlowMetrics(
    flow_name=flow_def.name,
    throughput=calculate_throughput(update_info),
    latency_p50=get_latency_p50(update_info),
    latency_p99=get_latency_p99(update_info),
    freshness=calculate_freshness(update_info)
)

self.send_message('flow_metrics', metrics.to_dict())
```

### 3. Future: Prometheus Integration

```python
# Planned: Query Prometheus metrics endpoint
async def get_prometheus_metrics(self, flow_name: str):
    """
    Query Prometheus metrics for a flow:
    - cocoindex_source_change_rate
    - cocoindex_transformation_latency_p50
    - cocoindex_transformation_latency_p99
    - cocoindex_target_write_volume
    """
    pass
```

## Current Implementation Status

### ✅ Implemented
- Basic extension structure
- Tree view for flows
- Dashboard with Chart.js
- Python bridge with JSON communication
- Mock data for testing
- Configuration options

### 🚧 In Progress
- Real flow integration
- Prometheus metrics
- Error handling improvements

### 📋 Planned
- Lineage visualization
- Flow definition viewer
- Interactive flow map
- Multi-flow support
- Custom metrics configuration

## Mock Mode vs Real Mode

### Mock Mode (Default)
The extension currently runs in mock mode, simulating flows:
```bash
python3 python-bridge/cocoindex_bridge.py
```

This generates fake data for:
- 3 sample flows (TextEmbedding, LiveUpdates, CodeEmbedding)
- Random throughput/latency metrics
- Simulated source updates

### Real Mode (Future)
To use real CocoIndex flows:
```bash
python3 python-bridge/cocoindex_bridge.py --real
```

This will:
- Discover actual flow definitions
- Connect to running FlowLiveUpdaters
- Report real metrics from CocoIndex

## Troubleshooting

### Extension Won't Start
- Check Node.js is installed: `node --version`
- Reinstall dependencies: `cd vscode-extension && npm install`
- Recompile: `npm run compile`

### Python Bridge Fails
- Verify Python 3.11+: `python3 --version`
- Check bridge script: `python3 python-bridge/cocoindex_bridge.py --help`
- Review extension output panel for errors

### No Data in Dashboard
- Ensure monitoring is started via Command Palette
- Check Python bridge is running (see Output panel)
- Verify WebView is receiving messages (F12 Developer Tools)

## Development Workflow

1. **Make changes** to TypeScript files in `src/`
2. **Compile**: `npm run compile`
3. **Test**: Press `F5` in VS Code
4. **Debug**: Use Chrome DevTools for WebView, VS Code debugger for extension

## Contributing

To enhance the extension:

1. **Add new commands** in `package.json` and `extension.ts`
2. **Extend the tree view** in `flowTreeProvider.ts`
3. **Update the dashboard** in `dashboardPanel.ts`
4. **Enhance the bridge** in `python-bridge/cocoindex_bridge.py`

## Resources

- [VS Code Extension API](https://code.visualstudio.com/api)
- [CocoIndex Documentation](https://cocoindex.io/docs)
- [Chart.js Documentation](https://www.chartjs.org/)
- [TreeView API](https://code.visualstudio.com/api/extension-guides/tree-view)
- [Webview API](https://code.visualstudio.com/api/extension-guides/webview)
