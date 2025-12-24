# CocoIndex Sidecar Integration Guide

This guide explains how to integrate the Python sidecar with real CocoIndex flows.

## Architecture

The sidecar acts as a bridge between the CocoIndex Python API and the VS Code TypeScript extension:

```
CocoIndex Flow ──> Python Sidecar ──> JSON messages ──> VS Code Extension
                   (cocoindex API)     (via stdout)      (TypeScript)
```

## Current Implementation

The current `cocoindex_sidecar.py` is a **mock implementation** that generates sample data. This is useful for:
- Development and testing of the extension UI
- Understanding the expected message format
- Extension packaging and distribution

## Integrating with Real CocoIndex Flows

To connect the sidecar to real CocoIndex flows, you need to:

### 1. Import CocoIndex

Add the import at the top of `cocoindex_sidecar.py`:

```python
import cocoindex
```

### 2. Load Your Flow

Replace the mock implementation in the `monitor_flows()` method:

```python
async def monitor_flows(self) -> None:
    """Monitor real CocoIndex flows."""
    self.running = True
    
    # Import your flow definition
    from your_project.main import your_flow  # Replace with your actual flow
    
    # Create a live updater
    updater = cocoindex.FlowLiveUpdater(
        your_flow,
        cocoindex.FlowLiveUpdaterOptions(print_stats=False)
    )
    
    # Start the updater
    await updater.start_async()
    
    # Send initial flow structure (you'll need to introspect your flow)
    flows = self.extract_flow_structure(your_flow)
    self.send_flow_update(flows)
    
    try:
        while self.running:
            # Get status updates from CocoIndex
            updates = await updater.next_status_updates_async()
            
            # Send status update
            status = {
                'active_sources': updates.active_sources,
                'updated_sources': updates.updated_sources
            }
            self.send_status_update(status)
            
            # Get and send metrics (you'll need to implement this)
            metrics = self.extract_metrics(updater)
            self.send_metrics_update(metrics)
            
    except KeyboardInterrupt:
        self.running = False
    finally:
        updater.abort()
        await updater.wait_async()
```

### 3. Extract Flow Structure

You'll need to implement a method to extract the flow structure from your CocoIndex flow:

```python
def extract_flow_structure(self, flow: cocoindex.Flow) -> List[Dict[str, Any]]:
    """
    Extract the structure of a CocoIndex flow for visualization.
    
    This is flow-specific and depends on how you've structured your flow.
    You may need to inspect the flow's internal structure.
    """
    # Example implementation - adjust based on your flow structure
    return [
        {
            'label': flow.name,
            'status': 'active',
            'type': 'flow',
            'children': [
                # Extract sources, transformers, and sinks
                # This requires introspection of your specific flow
            ]
        }
    ]
```

### 4. Extract Metrics

Implement metrics extraction. If using Prometheus metrics:

```python
def extract_metrics(self, updater: cocoindex.FlowLiveUpdater) -> Dict[str, Any]:
    """
    Extract metrics from the flow updater.
    
    In a full implementation, you would:
    1. Query Prometheus metrics endpoint
    2. Parse the metrics
    3. Format them for the dashboard
    """
    stats = updater.update_stats()
    
    # Extract relevant metrics from stats
    # This is a simplified example
    return {
        'flowName': 'YourFlowName',
        'throughput': [stats.get('throughput', 0)],
        'latency': {
            'p50': [stats.get('latency_p50', 0)],
            'p99': [stats.get('latency_p99', 0)]
        },
        'freshness': [stats.get('freshness', 0)],
        'timestamps': [time.strftime('%H:%M:%S')]
    }
```

## Using Prometheus Metrics (Recommended)

For production use, it's recommended to use Prometheus metrics:

### 1. Start CocoIndex with Metrics Enabled

Ensure your CocoIndex server is exposing Prometheus metrics (usually on a specific port).

### 2. Poll Prometheus Endpoint

```python
import aiohttp

async def fetch_prometheus_metrics(self, url: str = 'http://localhost:9090/metrics'):
    """Fetch metrics from Prometheus endpoint."""
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            metrics_text = await response.text()
            return self.parse_prometheus_metrics(metrics_text)

def parse_prometheus_metrics(self, metrics_text: str) -> Dict[str, Any]:
    """Parse Prometheus metrics format."""
    # Parse the metrics text format
    # Extract relevant metrics for your dashboard
    # Return formatted metrics
    pass
```

## Message Format Reference

### Flow Update Message

```json
{
  "type": "flow_update",
  "payload": [
    {
      "label": "FlowName",
      "status": "active|error|idle",
      "type": "flow",
      "children": [
        {
          "label": "ComponentName",
          "status": "active|error|idle",
          "type": "source|transformer|sink",
          "throughput": 10.5,  // Optional
          "latency": 120       // Optional
        }
      ]
    }
  ],
  "timestamp": 1234567890.123
}
```

### Status Update Message

```json
{
  "type": "status_update",
  "payload": {
    "active_sources": ["source1", "source2"],
    "updated_sources": ["source1"]
  },
  "timestamp": 1234567890.123
}
```

### Metrics Update Message

```json
{
  "type": "metrics_update",
  "payload": {
    "flowName": "TextEmbeddingFlow",
    "throughput": [8.5, 9.0, 8.7],
    "latency": {
      "p50": [100, 105, 98],
      "p99": [250, 260, 245]
    },
    "freshness": [5, 6, 5],
    "timestamps": ["18:26:18", "18:26:23", "18:26:28"]
  },
  "timestamp": 1234567890.123
}
```

## Environment Setup

### Development Environment

```bash
# Install CocoIndex
pip install cocoindex

# Install any additional dependencies
pip install aiohttp  # If using Prometheus HTTP polling
```

### Production Deployment

For production use:

1. Package the sidecar with your flow application
2. Ensure the extension can locate the sidecar script
3. Configure connection settings (flow path, Prometheus endpoint, etc.)

## Configuration (Future Enhancement)

Future versions of the extension will support configuration via VS Code settings:

```json
{
  "cocoindex.sidecarPath": "/path/to/custom/sidecar.py",
  "cocoindex.flowModule": "myproject.flows",
  "cocoindex.flowName": "my_flow",
  "cocoindex.prometheusUrl": "http://localhost:9090/metrics"
}
```

## Troubleshooting

### Sidecar Not Starting

- Check that Python 3.8+ is installed
- Verify the sidecar script is executable: `chmod +x cocoindex_sidecar.py`
- Check the output channel in VS Code: View → Output → CocoIndex Bridge

### No Data Showing

- Ensure your CocoIndex flow is running
- Check that the sidecar is sending messages (check Output channel)
- Verify JSON message format matches the expected schema

### Performance Issues

- Adjust the polling interval in the sidecar
- Use Prometheus metrics instead of polling the API directly
- Limit the metrics history size

## Examples

See the `examples/` directory (coming soon) for complete examples of:
- Text embedding flow integration
- Multi-flow monitoring
- Custom metrics extraction
- Prometheus integration

## Contributing

To improve the sidecar integration:

1. Fork the repository
2. Make your changes
3. Test with real CocoIndex flows
4. Submit a pull request

## Support

- [CocoIndex Documentation](https://cocoindex.io/docs)
- [GitHub Issues](https://github.com/cocoindex-io/cocoindex/issues)
- [Discord Community](https://discord.com/invite/zpA9S2DR7s)
