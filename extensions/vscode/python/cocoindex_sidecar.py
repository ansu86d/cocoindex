#!/usr/bin/env python3
"""
CocoIndex Sidecar Script for VS Code Extension

This script acts as a bridge between the CocoIndex Python API and the VS Code extension.
It listens to flow status updates using the CocoIndex API and outputs JSON messages to stdout
for the TypeScript extension to consume.
"""

import asyncio
import json
import sys
import time
from typing import Any, Dict, List


class CocoIndexSidecar:
    """
    Sidecar process that monitors CocoIndex flows and outputs status updates.
    """

    def __init__(self):
        self.running = False
        
    def send_message(self, message_type: str, payload: Any) -> None:
        """Send a JSON message to stdout for the extension to receive."""
        message = {
            'type': message_type,
            'payload': payload,
            'timestamp': time.time()
        }
        # Use sys.stdout.write for more reliable IPC communication
        sys.stdout.write(json.dumps(message) + '\n')
        sys.stdout.flush()
        
    def send_flow_update(self, flows: List[Dict[str, Any]]) -> None:
        """Send flow structure update."""
        self.send_message('flow_update', flows)
        
    def send_status_update(self, status: Dict[str, Any]) -> None:
        """Send status update from the live updater."""
        self.send_message('status_update', status)
        
    def send_metrics_update(self, metrics: Dict[str, Any]) -> None:
        """Send metrics update for the dashboard."""
        self.send_message('metrics_update', metrics)

    async def monitor_flows(self) -> None:
        """
        Main monitoring loop.
        
        In a real implementation, this would:
        1. Import cocoindex library
        2. Connect to running flows
        3. Use next_status_updates_async() to get updates
        4. Transform updates to JSON and send to extension
        
        For now, this is a mock implementation for demonstration.
        """
        self.running = True
        
        # Mock flow data - in production, this would come from CocoIndex
        mock_flows = [
            {
                'label': 'TextEmbeddingFlow',
                'status': 'active',
                'type': 'flow',
                'children': [
                    {
                        'label': 'LocalFile Source',
                        'status': 'active',
                        'type': 'source',
                        'throughput': 10.5
                    },
                    {
                        'label': 'SplitRecursively',
                        'status': 'active',
                        'type': 'transformer',
                        'latency': 50
                    },
                    {
                        'label': 'SentenceTransformer',
                        'status': 'active',
                        'type': 'transformer',
                        'latency': 120
                    },
                    {
                        'label': 'Postgres Sink',
                        'status': 'active',
                        'type': 'sink',
                        'throughput': 8.2
                    }
                ]
            }
        ]
        
        # Send initial flow structure
        self.send_flow_update(mock_flows)
        
        iteration = 0
        while self.running:
            # Mock status update
            status = {
                'active_sources': ['LocalFile Source'],
                'updated_sources': ['LocalFile Source'] if iteration % 3 == 0 else []
            }
            self.send_status_update(status)
            
            # Mock metrics update
            metrics = {
                'flowName': 'TextEmbeddingFlow',
                'throughput': [8.5 + (iteration % 10) * 0.5],
                'latency': {
                    'p50': [100 + (iteration % 20) * 2],
                    'p99': [250 + (iteration % 15) * 5]
                },
                'freshness': [5 + (iteration % 30)],
                'timestamps': [time.strftime('%H:%M:%S')]
            }
            self.send_metrics_update(metrics)
            
            # Wait before next update
            await asyncio.sleep(5)
            iteration += 1

    async def run(self) -> None:
        """Run the sidecar process."""
        try:
            # Send startup message
            self.send_message('startup', {'status': 'ready'})
            
            # Start monitoring
            await self.monitor_flows()
            
        except KeyboardInterrupt:
            self.running = False
            self.send_message('shutdown', {'status': 'stopped'})
        except Exception as e:
            self.send_message('error', {'message': str(e)})
            raise


async def main():
    """Main entry point."""
    sidecar = CocoIndexSidecar()
    await sidecar.run()


if __name__ == '__main__':
    asyncio.run(main())
