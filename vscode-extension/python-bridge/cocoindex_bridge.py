#!/usr/bin/env python3
"""
Enhanced CocoIndex Bridge with real flow integration example.

This version shows how to integrate with actual CocoIndex flows when available.
"""

import asyncio
import json
import sys
import argparse
import os
from typing import Any, Dict, List, Optional
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
    
    def __init__(self, use_real_flows: bool = False):
        self.running = False
        self.flows: Dict[str, Any] = {}
        self.use_real_flows = use_real_flows
        self.cocoindex_available = False
        
        # Try to import cocoindex
        try:
            import cocoindex
            self.cocoindex_available = True
            self.log('info', 'CocoIndex library found')
        except ImportError:
            self.log('warning', 'CocoIndex library not found - using mock mode')
        
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
        
    async def monitor_real_flow(self, flow_def):
        """
        Monitor an actual CocoIndex flow using the live updater.
        
        Example integration with next_status_updates_async():
        
        updater = cocoindex.FlowLiveUpdater(
            flow_def, 
            cocoindex.FlowLiveUpdaterOptions(print_stats=True)
        )
        await updater.start_async()
        
        while self.running:
            try:
                updates = await updater.next_status_updates_async()
                status = FlowStatus(
                    flow_name=flow_def.name,
                    active_sources=updates.active_sources,
                    updated_sources=updates.updated_sources,
                    status='active' if updates.active_sources else 'idle'
                )
                self.send_message('flow_status', status.to_dict())
                
                # Get metrics from update_stats()
                update_info = updater.update_stats()
                # TODO: Parse update_info to extract metrics
                
            except Exception as e:
                self.log('error', f'Error in flow monitoring: {str(e)}')
                break
        """
        pass
        
    async def monitor_flow_mock(self, flow_name: str):
        """
        Monitor a flow in mock mode (when CocoIndex is not available).
        """
        import random
        
        self.log('info', f'Starting mock monitoring for flow: {flow_name}')
        
        iteration = 0
        while self.running:
            iteration += 1
            
            # Simulate varying status
            statuses = ['active', 'active', 'active', 'idle']
            status = statuses[iteration % len(statuses)]
            
            # Simulate status update
            flow_status = FlowStatus(
                flow_name=flow_name,
                active_sources=['LocalFile:markdown_files', 'LocalFile:docs'],
                updated_sources=['LocalFile:markdown_files'] if status == 'active' else [],
                status=status
            )
            
            self.send_message('flow_status', flow_status.to_dict())
            
            # Simulate metrics with some variation
            base_throughput = 100.0
            throughput = base_throughput + random.uniform(-20, 30)
            
            metrics = FlowMetrics(
                flow_name=flow_name,
                throughput=max(0, throughput),
                latency_p50=25.0 + random.uniform(-5, 10),
                latency_p99=150.0 + random.uniform(-20, 40),
                freshness=random.uniform(0.5, 5.0)
            )
            
            self.send_message('flow_metrics', metrics.to_dict())
            
            await asyncio.sleep(5)
                
    async def discover_flows(self) -> List[str]:
        """
        Discover available CocoIndex flows.
        
        In a real implementation, this would:
        1. Scan for Python files with @cocoindex.flow_def decorator
        2. Load flow definitions from a registry
        3. Query running flows from a CocoIndex server
        """
        # For now, return mock flows
        return ['TextEmbedding', 'LiveUpdates', 'CodeEmbedding']
        
    async def monitor_all_flows(self):
        """Monitor all active CocoIndex flows."""
        flows = await self.discover_flows()
        self.log('info', f'Discovered {len(flows)} flows: {", ".join(flows)}')
        
        if self.use_real_flows and self.cocoindex_available:
            # TODO: Implement real flow monitoring
            self.log('warning', 'Real flow monitoring not yet implemented, using mock mode')
            tasks = [self.monitor_flow_mock(flow) for flow in flows]
        else:
            tasks = [self.monitor_flow_mock(flow) for flow in flows]
            
        await asyncio.gather(*tasks)
        
    async def run(self):
        """Main run loop for the bridge."""
        self.running = True
        self.log('info', f'CocoIndex Bridge started (mode: {"real" if self.use_real_flows else "mock"})')
        
        try:
            await self.monitor_all_flows()
        except asyncio.CancelledError:
            self.log('info', 'Bridge shutting down gracefully')
        except Exception as e:
            self.log('error', f'Bridge error: {str(e)}')
            import traceback
            self.log('error', traceback.format_exc())
        finally:
            self.running = False
            
    def stop(self):
        """Stop the bridge."""
        self.running = False


async def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description='CocoIndex VS Code Bridge')
    parser.add_argument('--flow', type=str, help='Specific flow to monitor')
    parser.add_argument('--real', action='store_true', help='Use real CocoIndex flows instead of mock')
    args = parser.parse_args()
    
    bridge = CocoIndexBridge(use_real_flows=args.real)
    
    try:
        await bridge.run()
    except KeyboardInterrupt:
        bridge.log('info', 'Received keyboard interrupt')
        bridge.stop()


if __name__ == '__main__':
    asyncio.run(main())
