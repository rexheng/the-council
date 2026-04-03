#!/bin/bash
# The Council — One-command setup
# Usage: curl -fsSL https://raw.githubusercontent.com/rexheng/the-council/main/setup.sh | bash

set -e

echo ""
echo "  ╔══════════════════════════════════════╗"
echo "  ║         THE COUNCIL — Setup          ║"
echo "  ╚══════════════════════════════════════╝"
echo ""

# Check for API key
if [ -z "$ANTHROPIC_API_KEY" ]; then
  echo "  Enter your Anthropic API key:"
  echo "  (get one free at console.anthropic.com)"
  echo ""
  read -rp "  ANTHROPIC_API_KEY=" API_KEY
  echo ""
else
  API_KEY="$ANTHROPIC_API_KEY"
  echo "  Using ANTHROPIC_API_KEY from environment"
fi

if [ -z "$API_KEY" ]; then
  echo "  Error: API key required."
  exit 1
fi

# Clone if not already in the repo
if [ ! -f "mcp-server/package.json" ]; then
  echo "  Cloning the-council..."
  git clone --depth 1 https://github.com/rexheng/the-council.git
  cd the-council
else
  echo "  Already in the-council repo"
fi

# Install dependencies
echo "  Installing dependencies..."
cd mcp-server && npm install --silent && cd ..

# Create .env
echo "ANTHROPIC_API_KEY=$API_KEY" > .env
echo "  Created .env"

# Detect editor and create MCP config
REPO_DIR="$(pwd)"

# Cursor config
mkdir -p .cursor
cat > .cursor/mcp.json << EOF
{
  "mcpServers": {
    "the-council": {
      "command": "npx",
      "args": ["tsx", "mcp-server/src/index.ts"],
      "cwd": "$REPO_DIR",
      "env": {
        "ANTHROPIC_API_KEY": "$API_KEY"
      }
    }
  }
}
EOF
echo "  Created .cursor/mcp.json"

# Claude Code config
cat > .mcp.json << EOF
{
  "mcpServers": {
    "the-council": {
      "command": "npx",
      "args": ["tsx", "mcp-server/src/index.ts"],
      "cwd": "$REPO_DIR",
      "env": {
        "ANTHROPIC_API_KEY": "$API_KEY"
      }
    }
  }
}
EOF
echo "  Created .mcp.json"

echo ""
echo "  ✓ Setup complete!"
echo ""
echo "  Next steps:"
echo "  1. Open this folder in Cursor or Claude Code"
echo "  2. Ask: \"Use council_plan to plan: build me Cursor\""
echo "  3. Browser opens automatically with the Among Us sandbox"
echo ""
echo "  Repo: $REPO_DIR"
echo ""
