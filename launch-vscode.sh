#!/bin/bash
echo "Starting VS Code with Proxy..."
code --proxy-server="http://127.0.0.1:8081" --ignore-certificate-errors .
