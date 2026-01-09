#!/bin/bash
set -e

# Change directory to the script's location
cd "$(dirname "$0")"

# Check for Python 3
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: Python 3 could not be found."
    echo "Please install Python 3 and try again."
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔌 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
if [ -f "requirements.txt" ]; then
    echo "⬇️  Installing dependencies..."
    pip install -r requirements.txt | grep -v 'already satisfied' || true
else
    echo "⚠️  Warning: requirements.txt not found."
fi

# Check for .env file
if [ ! -f ".env" ]; then
    echo "📝 .env file not found."
    read -p "🔑 Please enter your DeepSeek Auth Token: " token
    echo "DEEPSEEK_AUTH_TOKEN=\"$token\"" > .env
    echo "✅ .env file created."
else
    echo "✅ .env file found."
fi

# Run the example script
echo "🚀 Starting DeepSeek4Free..."
python3 example.py
