#!/usr/bin/env python3
"""
Test script to verify the CocoIndex bridge is working correctly.
This can be run independently to test the bridge without the VS Code extension.
"""

import subprocess
import json
import time
import sys


def test_bridge():
    """Test the Python bridge by capturing its output."""
    print("Testing CocoIndex Python Bridge...")
    print("-" * 50)
    
    # Start the bridge process
    process = subprocess.Popen(
        [sys.executable, 'python-bridge/cocoindex_bridge.py'],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        bufsize=1
    )
    
    try:
        # Read a few messages
        messages_received = 0
        start_time = time.time()
        timeout = 10  # seconds
        
        print("\nReceiving messages from bridge:\n")
        
        while messages_received < 10 and (time.time() - start_time) < timeout:
            line = process.stdout.readline()
            if line:
                try:
                    message = json.loads(line.strip())
                    messages_received += 1
                    
                    # Pretty print the message
                    msg_type = message.get('type', 'unknown')
                    data = message.get('data', {})
                    
                    print(f"[{messages_received}] Type: {msg_type}")
                    
                    if msg_type == 'log':
                        print(f"    {data.get('level', '').upper()}: {data.get('message', '')}")
                    elif msg_type == 'flow_status':
                        print(f"    Flow: {data.get('flow_name', '')}")
                        print(f"    Status: {data.get('status', '')}")
                        print(f"    Active Sources: {data.get('active_sources', [])}")
                    elif msg_type == 'flow_metrics':
                        print(f"    Flow: {data.get('flow_name', '')}")
                        print(f"    Throughput: {data.get('throughput', 0):.2f} items/sec")
                        print(f"    Latency P50: {data.get('latency_p50', 0):.2f} ms")
                        print(f"    Latency P99: {data.get('latency_p99', 0):.2f} ms")
                        print(f"    Freshness: {data.get('freshness', 0):.2f} sec")
                    
                    print()
                    
                except json.JSONDecodeError as e:
                    print(f"Error decoding JSON: {e}")
                    print(f"Raw line: {line}")
        
        print("-" * 50)
        print(f"\n✅ Test completed! Received {messages_received} messages.")
        print("The bridge is working correctly.")
        
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user.")
    finally:
        # Clean up
        process.terminate()
        try:
            process.wait(timeout=2)
        except subprocess.TimeoutExpired:
            process.kill()


if __name__ == '__main__':
    test_bridge()
