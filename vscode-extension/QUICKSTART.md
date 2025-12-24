# Quick Start Guide - CocoIndex VS Code Extension

Get started with monitoring CocoIndex flows in under 5 minutes!

## Prerequisites

- ✅ Node.js 18+ (`node --version`)
- ✅ Python 3.11+ (`python3 --version`)
- ✅ VS Code 1.85.0+ (`code --version`)
- ⚠️ CocoIndex (optional for mock mode): `pip install cocoindex`

## Installation Steps

### 1. Setup the Extension

```bash
cd vscode-extension
./setup.sh
```

This will:
- Install Node.js dependencies
- Compile TypeScript code
- Verify prerequisites

### 2. Launch in Development Mode

```bash
# Open the extension in VS Code
code .

# Press F5 to launch Extension Development Host
# A new VS Code window will open
```

### 3. Start Monitoring

In the new Extension Development Host window:

1. **Open Command Palette**: `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
2. **Type**: "CocoIndex: Start Monitoring"
3. **Press Enter**

You should see:
```
✓ CocoIndex monitoring started
```

### 4. View the Flows

Click the **CocoIndex icon** in the Activity Bar (left sidebar) to see:

```
CocoIndex
└── Active Flows
    ├── TextEmbedding [Active]
    │   ├── Sources
    │   │   ├── LocalFile:markdown_files
    │   │   └── LocalFile:docs
    │   ├── Transformers
    │   │   └── Transform 1
    │   └── Sinks
    │       └── Target DB
    ├── LiveUpdates [Active]
    └── CodeEmbedding [Idle]
```

### 5. Open the Dashboard

1. **Open Command Palette**: `Cmd+Shift+P` / `Ctrl+Shift+P`
2. **Type**: "CocoIndex: Show Dashboard"
3. **Press Enter**

You'll see real-time metrics:
- 📊 Throughput (items/sec)
- ⏱️ Latency P50/P99 (ms)
- 🕐 Freshness (seconds)
- 📈 Live updating charts

## Testing the Bridge

To verify the Python bridge is working:

```bash
cd vscode-extension
python3 test_bridge.py
```

Expected output:
```
Testing CocoIndex Python Bridge...
--------------------------------------------------

Receiving messages from bridge:

[1] Type: log
    INFO: CocoIndex Bridge started (mode: mock)

[2] Type: flow_status
    Flow: TextEmbedding
    Status: active
    Active Sources: ['LocalFile:markdown_files', 'LocalFile:docs']

[3] Type: flow_metrics
    Flow: TextEmbedding
    Throughput: 105.81 items/sec
    Latency P50: 27.24 ms
    Latency P99: 178.94 ms
    Freshness: 3.77 sec

...

✅ Test completed! Received 10 messages.
The bridge is working correctly.
```

## Configuration

Configure the extension via VS Code settings:

```json
{
  "cocoindex.pythonPath": "python3",
  "cocoindex.autoStart": false,
  "cocoindex.refreshInterval": 5000
}
```

### Settings Explained

| Setting | Default | Description |
|---------|---------|-------------|
| `pythonPath` | `"python3"` | Path to Python interpreter |
| `autoStart` | `false` | Auto-start monitoring on project open |
| `refreshInterval` | `5000` | Refresh rate in milliseconds |

## Using with Real CocoIndex Flows

If you have CocoIndex installed:

1. **Create a flow** (e.g., `my_flow.py`):

```python
import cocoindex
import datetime
from dotenv import load_dotenv

@cocoindex.flow_def(name="MyFlow")
def my_flow(flow_builder, data_scope):
    data_scope["docs"] = flow_builder.add_source(
        cocoindex.sources.LocalFile(path="data"),
        refresh_interval=datetime.timedelta(seconds=5)
    )
    
    collector = data_scope.add_collector()
    with data_scope["docs"].row() as doc:
        collector.collect(filename=doc["filename"], content=doc["content"])
    
    collector.export("docs_index", cocoindex.targets.Postgres(), 
                     primary_key_fields=["filename"])

if __name__ == "__main__":
    load_dotenv()
    cocoindex.init()
    my_flow.setup(report_to_stdout=True)
```

2. **Run the flow**:
```bash
python my_flow.py
```

3. **Start the extension** and see your real flow in the tree view!

## Commands Reference

| Command | Action |
|---------|--------|
| `CocoIndex: Start Monitoring` | Start the Python bridge and begin monitoring |
| `CocoIndex: Stop Monitoring` | Stop monitoring and close the bridge |
| `CocoIndex: Show Dashboard` | Open the metrics dashboard |
| `CocoIndex: Refresh Flows` | Manually refresh the flow tree view |

## Troubleshooting

### Extension Won't Start
```bash
# Reinstall dependencies
cd vscode-extension
npm install
npm run compile
```

### Python Bridge Fails
```bash
# Check Python version
python3 --version  # Should be 3.11+

# Test the bridge manually
python3 python-bridge/cocoindex_bridge.py
```

### No Flows Showing
- Ensure you've started monitoring via Command Palette
- Check the Output panel for errors (`View > Output`, select "CocoIndex")
- Try refreshing the flows view (click the refresh icon)

### Dashboard Not Updating
- Verify the Python bridge is running
- Open Developer Tools (`Help > Toggle Developer Tools`)
- Check for JavaScript errors in the console

## What's Next?

- 📖 Read the [README.md](README.md) for detailed features
- 🔧 See [INTEGRATION.md](INTEGRATION.md) for integration with your projects
- 🏗️ Check [ARCHITECTURE.md](ARCHITECTURE.md) for technical details
- 📊 Review [SUMMARY.md](SUMMARY.md) for project overview

## Mock Mode vs Real Mode

### Current: Mock Mode
The extension runs in **mock mode** by default, which:
- ✅ Works without CocoIndex installation
- ✅ Generates realistic test data
- ✅ Shows 3 sample flows
- ✅ Perfect for testing the extension

### Future: Real Mode
When connected to actual CocoIndex flows:
- Real-time status from `next_status_updates_async()`
- Actual metrics from running flows
- Live source change detection
- Production monitoring

## Support

- 🐛 Report issues on [GitHub](https://github.com/cocoindex-io/cocoindex/issues)
- 💬 Join [Discord](https://discord.com/invite/zpA9S2DR7s)
- 📚 Read [CocoIndex Docs](https://cocoindex.io/docs)

---

**Congratulations!** 🎉 You're now monitoring CocoIndex flows in VS Code!
