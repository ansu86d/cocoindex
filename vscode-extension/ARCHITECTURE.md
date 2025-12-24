# VS Code Extension Architecture

## Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    VS Code Extension Host                        │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                 Extension (extension.ts)                    │ │
│  │  - Activation/Deactivation                                 │ │
│  │  - Command Registration                                     │ │
│  │  - Configuration Management                                │ │
│  └──────┬───────────────────────┬──────────────────────────┬──┘ │
│         │                       │                          │    │
│         │                       │                          │    │
│  ┌──────▼──────────┐   ┌───────▼────────┐   ┌────────────▼───┐ │
│  │ PythonBridge    │   │ FlowTreeData   │   │ DashboardPanel │ │
│  │                 │   │ Provider       │   │                │ │
│  │ - Spawn Process │   │ - Tree View    │   │ - Webview      │ │
│  │ - Parse JSON    │   │ - Status Icons │   │ - Chart.js     │ │
│  │ - Event Emitter │   │ - Hierarchy    │   │ - Real-time    │ │
│  └──────┬──────────┘   └───────▲────────┘   └────────▲───────┘ │
│         │                      │                      │         │
│         │    flow_status       │        flow_metrics  │         │
│         │    ─────────────────>│        ─────────────>│         │
│         │                      │                      │         │
└─────────┼──────────────────────────────────────────────────────┘
          │
          │ stdio (JSON messages)
          │
┌─────────▼──────────────────────────────────────────────────────┐
│              Python Sidecar Process                             │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │        CocoIndexBridge (cocoindex_bridge.py)               │ │
│  │                                                            │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐ │ │
│  │  │   Flow       │  │   Metrics    │  │   Message       │ │ │
│  │  │   Discovery  │  │   Collection │  │   Sender        │ │ │
│  │  └──────┬───────┘  └──────┬───────┘  └─────────────────┘ │ │
│  │         │                 │                              │ │ │
│  │  ┌──────▼─────────────────▼──────────┐                  │ │ │
│  │  │    Flow Monitoring Loop           │                  │ │ │
│  │  │  - next_status_updates_async()    │                  │ │ │
│  │  │  - update_stats()                 │                  │ │ │
│  │  └───────────────┬───────────────────┘                  │ │ │
│  └────────────────────────────────────────────────────────────┘ │
└───────────────────┼────────────────────────────────────────────┘
                    │
                    │ CocoIndex Python API
                    │
┌───────────────────▼────────────────────────────────────────────┐
│                  CocoIndex Runtime                              │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              FlowLiveUpdater                               │ │
│  │                                                            │ │
│  │  next_status_updates_async()  ┌──────────────────────┐   │ │
│  │  ──────────────────────────────>  Status Updates API │   │ │
│  │                                └──────────────────────┘   │ │
│  │                                                            │ │
│  │  update_stats()               ┌──────────────────────┐   │ │
│  │  ──────────────────────────────>  Metrics/Stats API  │   │ │
│  │                                └──────────────────────┘   │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │          Flow Execution Engine                             │ │
│  │  - Source Monitoring                                       │ │
│  │  - Transformation Pipeline                                 │ │
│  │  - Target Synchronization                                  │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

## Message Flow

### 1. Startup Sequence

```
User                 Extension              Python Bridge        CocoIndex
  │                      │                         │                │
  │ "Start Monitoring"   │                         │                │
  ├─────────────────────>│                         │                │
  │                      │ spawn process           │                │
  │                      ├────────────────────────>│                │
  │                      │                         │ import library │
  │                      │                         ├───────────────>│
  │                      │                         │<───────────────┤
  │                      │     {"type":"log"}      │                │
  │                      │<────────────────────────┤                │
  │                      │                         │                │
  │<─────────────────────┤                         │                │
  │  "Monitoring started"│                         │                │
```

### 2. Status Update Flow

```
CocoIndex            Python Bridge           Extension           UI
    │                      │                      │              │
    │ status update        │                      │              │
    ├─────────────────────>│                      │              │
    │                      │ {"type":"flow_status"}│             │
    │                      ├─────────────────────>│              │
    │                      │                      │ update tree  │
    │                      │                      ├──────────────>│
    │                      │                      │              │
    │ metrics              │                      │              │
    ├─────────────────────>│                      │              │
    │                      │ {"type":"flow_metrics"}│            │
    │                      ├─────────────────────>│              │
    │                      │                      │ update chart │
    │                      │                      ├──────────────>│
```

### 3. Data Structures

#### Flow Status Message
```typescript
{
  type: 'flow_status',
  data: {
    flow_name: string,
    active_sources: string[],
    updated_sources: string[],
    status: 'active' | 'idle' | 'error'
  }
}
```

#### Flow Metrics Message
```typescript
{
  type: 'flow_metrics',
  data: {
    flow_name: string,
    throughput: number,      // items/sec
    latency_p50: number,     // ms
    latency_p99: number,     // ms
    freshness: number        // seconds
  }
}
```

## File Responsibilities

### TypeScript Files

- **extension.ts**: Main entry point, manages lifecycle
- **pythonBridge.ts**: Process manager, JSON parser, event emitter
- **flowTreeProvider.ts**: TreeDataProvider implementation
- **dashboardPanel.ts**: Webview with Chart.js visualizations

### Python Files

- **cocoindex_bridge.py**: Main sidecar process
  - Flow discovery
  - Status monitoring
  - Metrics collection
  - JSON message serialization

## Extension Points

### Adding New Commands

1. Register in `package.json` under `contributes.commands`
2. Implement in `extension.ts`
3. Add UI trigger (menu, keybinding, etc.)

### Adding New Metrics

1. Extend `FlowMetrics` dataclass in Python bridge
2. Update dashboard HTML to display new metric
3. Add chart if needed

### Supporting New Flow Types

1. Update flow discovery in Python bridge
2. Add specific monitoring logic
3. Update tree view to display new structure
