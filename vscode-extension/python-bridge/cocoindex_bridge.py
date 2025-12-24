#!/usr/bin/env python3
"""
CocoIndex Bridge - Python sidecar process for VS Code extension.
Provides real-time flow status updates and metrics from CocoIndex to the extension.
"""

import asyncio
import json
import sys
import argparse
from typing import Any, Dict, List
from dataclasses import dataclass, asdict


@dataclass
class FlowStatus:
    """Status of a CocoIndex flow."""
    flow_name: str
    active_sources: List[str]
    updated_sources: List[str]
    status: str  # 'active', 'idle', 'error'
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class FlowMetrics:
    """Metrics for a CocoIndex flow."""
    flow_name: str
    throughput: float  # items/sec
    latency_p50: float  # ms
    latency_p99: float  # ms
    freshness: float  # seconds since last update
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class CocoIndexBridge:
    """Bridge between CocoIndex Python API and VS Code extension."""
    
    def __init__(self):
        self.running = False
        self.flows: Dict[str, Any] = {}
        
    def send_message(self, message_type: str, data: Any):
        """Send a JSON message to the VS Code extension via stdout."""
        message = {
            'type': message_type,
            'data': data
        }
        print(json.dumps(message), flush=True)
        
    def log(self, level: str, message: str):
        """Log a message to the extension."""
        self.send_message('log', {'level': level, 'message': message})
        
    async def monitor_flow(self, flow_name: str):
        """
        Monitor a specific CocoIndex flow and send status updates.
        This uses the next_status_updates_async() API.
        """
        try:
            # Import cocoindex here to avoid startup errors if not installed
            import cocoindex
            
            self.log('info', f'Starting monitoring for flow: {flow_name}')
            
            # For now, this is a mock implementation
            # In a real scenario, we would load the actual flow and create a live updater
            
            # Mock flow status updates
            while self.running:
                # Simulate status update
                status = FlowStatus(
                    flow_name=flow_name,
                    active_sources=['source1', 'source2'],
                    updated_sources=['source1'],
                    status='active'
                )
                
                self.send_message('flow_status', status.to_dict())
                
                # Simulate metrics
                metrics = FlowMetrics(
                    flow_name=flow_name,
                    throughput=100.5,
                    latency_p50=25.3,
                    latency_p99=150.2,
                    freshness=2.5
                )
                
                self.send_message('flow_metrics', metrics.to_dict())
                
                await asyncio.sleep(5)
                
        except Exception as e:
            self.log('error', f'Error monitoring flow {flow_name}: {str(e)}')
            
    async def monitor_all_flows(self):
        """Monitor all active CocoIndex flows."""
        # This would discover and monitor all flows
        # For now, we'll just show a placeholder
        flows_to_monitor = ['example_flow']
        
        tasks = [self.monitor_flow(flow_name) for flow_name in flows_to_monitor]
        await asyncio.gather(*tasks)
        
    async def run(self):
        """Main run loop for the bridge."""
        self.running = True
        self.log('info', 'CocoIndex Bridge started')
        
        try:
            await self.monitor_all_flows()
        except asyncio.CancelledError:
            self.log('info', 'Bridge shutting down')
        except Exception as e:
            self.log('error', f'Bridge error: {str(e)}')
        finally:
            self.running = False
            
    def stop(self):
        """Stop the bridge."""
        self.running = False


async def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description='CocoIndex VS Code Bridge')
    parser.add_argument('--flow', type=str, help='Specific flow to monitor')
    args = parser.parse_args()
    
    bridge = CocoIndexBridge()
    
    try:
        await bridge.run()
    except KeyboardInterrupt:
        bridge.stop()


if __name__ == '__main__':
    asyncio.run(main())
