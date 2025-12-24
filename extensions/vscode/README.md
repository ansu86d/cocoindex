# CocoIndex Monitor - VS Code Extension

Monitor and visualize CocoIndex data flows and statistics in real-time directly from VS Code.

## Features

### 🌳 Active Flows View (Sidebar)

The extension provides a tree view in the VS Code sidebar that displays:

- **Active flows** with their components (Sources → Transformers → Sinks)
- **Real-time status** indicators (Green for active, Red for errors, Gray for idle)
- **Performance metrics** showing throughput and latency for each component

![Flow Tree View](images/flow-tree-view.png)

### 📊 Dashboard (Webview)

Interactive dashboard with real-time charts showing:

- **Throughput Over Time**: Track items processed per second
- **Latency Distribution**: Monitor P50 and P99 latency metrics
- **Data Freshness**: Time since last source change was synced
- **Current Metrics**: Live display of current performance numbers

![Dashboard](images/dashboard.png)

### 🔄 Live Updates

The extension uses CocoIndex's `next_status_updates_async()` API to receive real-time updates about:

- Active data sources
- Flow status changes
- Performance statistics

## Requirements

- VS Code 1.107.0 or higher
- CocoIndex Python library installed
- Python 3.8 or higher
- Access to a running CocoIndex flow

## Installation

### From VSIX (Development)

1. Clone the CocoIndex repository
2. Navigate to the extension directory:
   ```bash
   cd extensions/vscode
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Build the extension:
   ```bash
   npm run compile
   ```
5. Press F5 in VS Code to launch the Extension Development Host

### From Marketplace (Coming Soon)

Search for "CocoIndex Monitor" in the VS Code Extensions marketplace.

## Usage

### Starting the Monitor

1. Open the CocoIndex sidebar by clicking the CocoIndex icon in the Activity Bar
2. Click the "Start Flow Monitoring" command or use the command palette (`Ctrl+Shift+P` / `Cmd+Shift+P`):
   ```
   CocoIndex: Start Flow Monitoring
   ```

### Viewing the Dashboard

- Click the graph icon (📊) in the Flow View toolbar, or
- Use the command palette: `CocoIndex: Show Dashboard`

### Refreshing Flows

- Click the refresh icon (🔄) in the Flow View toolbar, or
- Use the command palette: `CocoIndex: Refresh Flows`

## Architecture

The extension uses a **Python-to-TypeScript bridge** architecture:

```
┌─────────────────────┐
│   VS Code Extension │
│    (TypeScript)     │
└──────────┬──────────┘
           │ stdio
           │ (JSON messages)
           ▼
┌─────────────────────┐
│   Python Sidecar    │
│    cocoindex API    │
└──────────┬──────────┘
           │
           │ next_status_updates_async()
           ▼
┌─────────────────────┐
│  CocoIndex Engine   │
│   (Rust + Python)   │
└─────────────────────┘
```

### Communication Flow

1. **Extension activates** and spawns a Python sidecar process
2. **Sidecar connects** to CocoIndex flows using the Python API
3. **Updates stream** from CocoIndex via `next_status_updates_async()`
4. **JSON messages** are sent from Python to TypeScript via stdout
5. **UI updates** in real-time based on received data

## Configuration

Currently, the extension uses default settings. Future versions will support:

- Custom CocoIndex connection settings
- Dashboard refresh intervals
- Metric history limits

## Development

### Building

```bash
npm run compile
```

### Watching

```bash
npm run watch
```

### Packaging

```bash
npm run package
```

### Testing

The extension includes a mock Python sidecar that generates sample data for development and testing purposes. To test with a real CocoIndex flow:

1. Update the `cocoindex_sidecar.py` script to connect to your flow
2. Implement the real CocoIndex API calls in the `monitor_flows()` method

## Data Sources

The extension leverages CocoIndex's built-in monitoring capabilities:

### Prometheus Metrics (Future)

Future versions will support direct polling of Prometheus-compatible metrics:
- Source change rate
- Transformation latency (P50/P99)
- Target write volume

### Flow Status API

Currently uses:
- `next_status_updates_async()` for real-time flow updates
- Flow structure from CocoIndex flow definitions

### Metadata Store (Future)

Future versions will query the metadata store (PostgreSQL) for:
- Bidirectional lineage (Source ↔ Vector ID)
- Historical performance data

## Roadmap

- [ ] Direct Prometheus metrics integration
- [ ] Lineage visualization
- [ ] Flow performance history
- [ ] Multi-flow support
- [ ] Flow configuration editor
- [ ] Alert notifications for errors
- [ ] Custom dashboard layouts

## Contributing

Contributions are welcome! Please see the [main CocoIndex contributing guide](../../CONTRIBUTING.md).

## License

This extension is part of the CocoIndex project and is licensed under the Apache 2.0 License.

## Support

- [CocoIndex Documentation](https://cocoindex.io/docs)
- [GitHub Issues](https://github.com/cocoindex-io/cocoindex/issues)
- [Discord Community](https://discord.com/invite/zpA9S2DR7s)

## Acknowledgments

This extension follows the architectural recommendations from the CocoIndex community for building monitoring tools that leverage the native APIs rather than terminal output scraping.
