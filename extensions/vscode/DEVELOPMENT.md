# CocoIndex VS Code Extension - Developer Guide

This guide is for developers who want to contribute to or understand the CocoIndex VS Code extension.

## Prerequisites

- Node.js 20.x or higher
- npm 10.x or higher
- VS Code 1.107.0 or higher
- Python 3.8 or higher (for the sidecar)

## Project Structure

```
extensions/vscode/
├── src/                          # TypeScript source files
│   ├── extension.ts              # Main extension entry point
│   ├── flowTreeDataProvider.ts   # Tree view for flows
│   ├── dashboardPanel.ts         # Webview dashboard
│   ├── cocoindexBridge.ts        # Python-TypeScript bridge
│   └── test/                     # Tests
├── python/                       # Python sidecar scripts
│   └── cocoindex_sidecar.py      # Mock/real implementation
├── resources/                    # Icons and assets
│   └── cocoindex-icon.svg        # Extension icon
├── package.json                  # Extension manifest
├── tsconfig.json                 # TypeScript configuration
├── webpack.config.js             # Webpack bundler config
└── README.md                     # User documentation
```

## Getting Started

### 1. Install Dependencies

```bash
cd extensions/vscode
npm install
```

### 2. Compile the Extension

```bash
npm run compile
```

This will:
- Compile TypeScript to JavaScript
- Bundle with Webpack
- Output to `dist/extension.js`

### 3. Run in Development Mode

#### Option A: From VS Code

1. Open the CocoIndex repository in VS Code
2. Navigate to `extensions/vscode`
3. Press `F5` to launch the Extension Development Host
4. A new VS Code window will open with the extension loaded

#### Option B: Watch Mode

For automatic recompilation on file changes:

```bash
npm run watch
```

Then press `F5` to launch the Extension Development Host.

### 4. Test the Extension

1. In the Extension Development Host window:
   - Open the CocoIndex sidebar (click the CocoIndex icon in the Activity Bar)
   - Run the command "CocoIndex: Start Flow Monitoring" from the command palette
   - Click the dashboard icon to open the metrics dashboard

2. The extension will use the mock sidecar by default, which generates sample data

## Development Workflow

### Making Changes

1. Edit TypeScript files in `src/`
2. Run `npm run compile` or use watch mode (`npm run watch`)
3. Press `Ctrl+Shift+F5` to reload the Extension Development Host
4. Test your changes

### Adding New Features

#### Adding a New Command

1. Add the command to `package.json`:
```json
{
  "contributes": {
    "commands": [
      {
        "command": "cocoindex-monitor.myNewCommand",
        "title": "My New Command"
      }
    ]
  }
}
```

2. Register the command in `src/extension.ts`:
```typescript
context.subscriptions.push(
    vscode.commands.registerCommand('cocoindex-monitor.myNewCommand', () => {
        // Implementation
    })
);
```

#### Adding a New View

1. Define the view in `package.json`:
```json
{
  "contributes": {
    "views": {
      "cocoindex-explorer": [
        {
          "id": "myNewView",
          "name": "My New View"
        }
      ]
    }
  }
}
```

2. Create a new TreeDataProvider or WebviewProvider

### Testing the Python Sidecar

Run the sidecar directly to test JSON output:

```bash
cd extensions/vscode
python3 python/cocoindex_sidecar.py
```

You should see JSON messages output to stdout:
```json
{"type": "startup", "payload": {"status": "ready"}, "timestamp": 1234567890}
{"type": "flow_update", "payload": [...], "timestamp": 1234567890}
```

## Architecture Deep Dive

### Component Overview

```
┌─────────────────────────────────────────────────────────┐
│                    VS Code Extension                     │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Tree View  │  │   Dashboard  │  │   Commands   │  │
│  │  (Sidebar)   │  │  (Webview)   │  │              │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                  │                  │          │
│         └──────────────────┼──────────────────┘          │
│                            │                             │
│                   ┌────────▼────────┐                    │
│                   │ CocoIndexBridge │                    │
│                   │   (stdio comm)  │                    │
│                   └────────┬────────┘                    │
└────────────────────────────┼──────────────────────────────┘
                             │ JSON messages
                             │ via stdout/stdin
                    ┌────────▼────────┐
                    │ Python Sidecar  │
                    │  (subprocess)   │
                    └────────┬────────┘
                             │
                             │ CocoIndex API
                    ┌────────▼────────┐
                    │ CocoIndex Flow  │
                    │  (live updates) │
                    └─────────────────┘
```

### Data Flow

1. **Extension Activation**
   - VS Code activates the extension
   - Extension spawns Python sidecar subprocess
   - Sidecar connects to CocoIndex flow

2. **Status Updates**
   - CocoIndex emits flow updates via `next_status_updates_async()`
   - Sidecar formats as JSON and writes to stdout
   - Bridge reads stdout, parses JSON
   - Bridge emits TypeScript events
   - UI components update

3. **Metrics Updates**
   - Sidecar polls/receives metrics (Prometheus or API)
   - Formats as dashboard-compatible JSON
   - Bridge forwards to DashboardPanel
   - Chart.js renders updated charts

### Message Protocol

All messages follow this structure:

```typescript
interface Message {
    type: 'startup' | 'flow_update' | 'status_update' | 'metrics_update' | 'error' | 'shutdown';
    payload: any;
    timestamp: number;
}
```

See `INTEGRATION.md` for detailed message schemas.

## Building for Production

### Create a VSIX Package

```bash
npm install -g @vscode/vsce
npm run package
vsce package
```

This creates a `.vsix` file that can be installed in VS Code or published to the marketplace.

### Publishing to Marketplace

1. Create a publisher account on [VS Code Marketplace](https://marketplace.visualstudio.com/)
2. Get a Personal Access Token
3. Login:
```bash
vsce login <publisher-name>
```
4. Publish:
```bash
vsce publish
```

## Testing

### Unit Tests

Run the test suite:

```bash
npm test
```

### Manual Testing Checklist

- [ ] Extension activates without errors
- [ ] Tree view shows in sidebar
- [ ] Mock sidecar starts and sends messages
- [ ] Flow tree updates with mock data
- [ ] Dashboard opens and displays charts
- [ ] Charts update with new metrics
- [ ] Commands execute without errors
- [ ] Extension deactivates cleanly

### Testing with Real CocoIndex

1. Follow the `INTEGRATION.md` guide to connect to a real flow
2. Modify `python/cocoindex_sidecar.py` to use real CocoIndex API
3. Start your CocoIndex flow
4. Start the extension monitoring

## Debugging

### Extension Debugging

1. Set breakpoints in TypeScript files
2. Press `F5` to launch Extension Development Host
3. Breakpoints will hit in the main VS Code window

### Sidecar Debugging

Add debug output in the Python sidecar:

```python
import sys
sys.stderr.write(f"Debug: {debug_info}\n")
```

Check the "CocoIndex Bridge" output channel in VS Code:
- View → Output
- Select "CocoIndex Bridge" from dropdown

### Common Issues

**Extension not activating:**
- Check the activation events in `package.json`
- Look for errors in Developer Tools console (Help → Toggle Developer Tools)

**Sidecar not starting:**
- Check Python is in PATH
- Verify script permissions: `chmod +x python/cocoindex_sidecar.py`
- Check "CocoIndex Bridge" output channel for errors

**No data showing:**
- Ensure sidecar is sending messages (check output channel)
- Verify JSON format matches expected schema
- Check for JavaScript errors in Developer Tools console

## Code Style

- Follow the existing code style
- Use TypeScript strict mode
- Add JSDoc comments for public APIs
- Run linter: `npm run lint`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Ensure all tests pass
6. Submit a pull request

## Resources

- [VS Code Extension API](https://code.visualstudio.com/api)
- [VS Code Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)
- [TreeView API](https://code.visualstudio.com/api/extension-guides/tree-view)
- [Webview API](https://code.visualstudio.com/api/extension-guides/webview)
- [CocoIndex Documentation](https://cocoindex.io/docs)

## License

Apache 2.0 - See LICENSE file in the repository root.
