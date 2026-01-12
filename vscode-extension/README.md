# CocoIndex Monitor - VS Code Extension

Monitor and visualize CocoIndex data flows in real-time directly from VS Code.

## Features

### 🌲 **Flow Tree View**
- View all active CocoIndex flows in a hierarchical tree structure
- See the data pipeline: Source → Transformers → Sink
- Real-time status indicators (Active, Idle, Error)
- Auto-refresh on status updates

### 📊 **Interactive Dashboard**
- Real-time metrics visualization with Chart.js
- Monitor key performance indicators:
  - **Throughput**: Items processed per second
  - **Latency P50/P99**: Processing latency distribution
  - **Freshness**: Time since last source update
- Live updating charts for historical data

### 🔄 **Real-Time Updates**
- Leverages CocoIndex's `next_status_updates_async()` API
- Python sidecar process for seamless integration
- JSON-based communication bridge

## Requirements

- **Python 3.11+** with CocoIndex installed (`pip install cocoindex`)
- **PostgreSQL** (required by CocoIndex for incremental processing)
- **VS Code 1.85.0+**

## Installation

### From Source

1. Clone the repository:
   ```bash
   cd vscode-extension
   npm install
   npm run compile
   ```

2. Press `F5` to launch the extension in development mode

### Configuration

Configure the extension through VS Code settings:

```json
{
  "cocoindex.pythonPath": "python3",
  "cocoindex.autoStart": false,
  "cocoindex.refreshInterval": 5000
}
```

- `pythonPath`: Path to Python interpreter with CocoIndex installed
- `autoStart`: Automatically start monitoring when opening a CocoIndex project
- `refreshInterval`: How often to refresh flow status (in milliseconds)

## Usage

### Starting Monitoring

1. Open the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
2. Run: **CocoIndex: Start Monitoring**
3. The extension will start the Python bridge and begin monitoring flows

### Viewing Flows

1. Click the CocoIndex icon in the Activity Bar (left sidebar)
2. The "Active Flows" view will show all running flows
3. Expand flows to see Sources, Transformers, and Sinks

### Dashboard

1. Open the Command Palette
2. Run: **CocoIndex: Show Dashboard**
3. View real-time metrics and charts

### Stopping Monitoring

1. Open the Command Palette
2. Run: **CocoIndex: Stop Monitoring**

## Architecture

### Components

```
┌─────────────────────────────────────┐
│        VS Code Extension            │
│  (TypeScript)                       │
│  ┌─────────────────────────────┐   │
│  │  Extension Host             │   │
│  │  - FlowTreeDataProvider     │   │
│  │  - DashboardPanel           │   │
│  │  - PythonBridge             │   │
│  └─────────────┬───────────────┘   │
└────────────────┼───────────────────┘
                 │ JSON via stdio
                 ▼
┌─────────────────────────────────────┐
│   Python Sidecar Process            │
│   (cocoindex_bridge.py)             │
│  ┌─────────────────────────────┐   │
│  │  - CocoIndex API Client     │   │
│  │  - next_status_updates()    │   │
│  │  - Metrics Collection       │   │
│  └─────────────┬───────────────┘   │
└────────────────┼───────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│        CocoIndex Runtime            │
│  - Flow Execution                   │
│  - Status Updates API               │
│  - Prometheus Metrics               │
└─────────────────────────────────────┘
```

### Communication Flow

1. **Extension** → **Python Bridge**: Commands via stdin
2. **Python Bridge** → **CocoIndex**: Uses `next_status_updates_async()` API
3. **Python Bridge** → **Extension**: Status updates and metrics via stdout (JSON)
4. **Extension** → **UI**: Updates tree view and dashboard

## Development

### Project Structure

```
vscode-extension/
├── src/
│   ├── extension.ts          # Main extension entry point
│   ├── pythonBridge.ts       # Python process manager
│   ├── flowTreeProvider.ts   # Tree view data provider
│   └── dashboardPanel.ts     # Webview dashboard
├── python-bridge/
│   └── cocoindex_bridge.py   # Python sidecar process
├── resources/
│   └── cocoindex-icon.svg    # Extension icon
├── package.json              # Extension manifest
└── tsconfig.json             # TypeScript config
```

### Building

```bash
npm run compile
```

### Packaging

```bash
npm run package
```

This creates a `.vsix` file that can be installed in VS Code.

## API Integration

### CocoIndex APIs Used

1. **Flow Status Updates**
   ```python
   async def next_status_updates_async() -> FlowUpdaterStatusUpdates
   ```
   Returns structured data about active flows, sources, and updates.

2. **Future: Prometheus Metrics**
   - Source change rate
   - Transformation latency (P50/P99)
   - Target write volume

3. **Future: Lineage Queries**
   - Query metadata store for Source ↔ Vector ID mapping

## Roadmap

- [x] Basic flow tree view
- [x] Real-time status updates
- [x] Dashboard with metrics visualization
- [x] Python-to-TypeScript bridge
- [ ] Prometheus metrics integration
- [ ] Lineage visualization
- [ ] Flow definition viewer
- [ ] Interactive flow map with data "pulsing"
- [ ] Error handling and diagnostics
- [ ] Multi-flow support
- [ ] Custom metrics configuration

## Troubleshooting

### Python Bridge Fails to Start

- Ensure Python 3.11+ is installed: `python3 --version`
- Verify CocoIndex is installed: `pip list | grep cocoindex`
- Check the configured Python path in settings

### No Flows Shown

- Make sure a CocoIndex flow is running
- Check that the Python bridge is connected (see Output panel)
- Try refreshing the flows view

### Dashboard Not Updating

- Verify the Python bridge is sending metrics
- Check the browser console in the webview (Developer: Toggle Developer Tools)

## Contributing

Contributions are welcome! Please see the main CocoIndex [contributing guide](https://cocoindex.io/docs/about/contributing).

## License

Apache 2.0 - See LICENSE file in the main repository.

## Links

- [CocoIndex Documentation](https://cocoindex.io/docs)
- [CocoIndex GitHub](https://github.com/cocoindex-io/cocoindex)
- [VS Code Extension API](https://code.visualstudio.com/api)
