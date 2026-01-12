#!/bin/bash

# Quick start script for testing the VS Code extension

echo "=== CocoIndex VS Code Extension - Development Setup ==="
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ to continue."
    exit 1
fi
echo "✓ Node.js $(node --version) found"

# Check for Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 is not installed. Please install Python 3.11+ to continue."
    exit 1
fi
echo "✓ Python $(python3 --version) found"

# Check for CocoIndex
if ! python3 -c "import cocoindex" 2>/dev/null; then
    echo "⚠ CocoIndex not installed. The bridge will work in mock mode."
    echo "  To install: pip install cocoindex"
else
    echo "✓ CocoIndex installed"
fi

cd vscode-extension

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo ""
    echo "Installing dependencies..."
    npm install
fi

# Compile TypeScript
echo ""
echo "Compiling TypeScript..."
npm run compile

echo ""
echo "=== Setup Complete! ==="
echo ""
echo "To test the extension:"
echo "1. Open this folder in VS Code: code ."
echo "2. Press F5 to launch Extension Development Host"
echo "3. In the new window, run 'CocoIndex: Start Monitoring'"
echo ""
echo "Or package the extension:"
echo "  cd vscode-extension && npm run package"
echo ""
