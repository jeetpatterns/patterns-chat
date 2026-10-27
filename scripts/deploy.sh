#!/usr/bin/env bash
set -e

# Define PS1 so ~/.bashrc does not fail with unbound variable
export PS1="${PS1:-}"

# Load environment & NVM paths for non-interactive SSH sessions
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
    \. "$NVM_DIR/nvm.sh"
fi
[ -s "$HOME/.profile" ] && source "$HOME/.profile" 2>/dev/null || true
[ -s "$HOME/.bashrc" ] && source "$HOME/.bashrc" 2>/dev/null || true
export PATH="$PATH:/usr/local/bin:/usr/bin:/bin:$HOME/.local/bin"

APP_DIR="/var/www/chat"
cd "$APP_DIR"

echo "=================================================="
echo "Patterns Chat: Starting Automated Deployment"
echo "Time: $(date)"
echo "App Directory: $APP_DIR"
echo "=================================================="

# 1. Update source code to latest commit on main
echo "[1/4] Pulling latest changes from git origin/main..."
git fetch origin main
git reset --hard origin/main

# 2. Build & Deploy Backend (Port 3006)
echo "[2/4] Deploying Backend..."
cd "$APP_DIR/backend"

# Ensure backend PORT=3006 is configured in .env
if [ -f .env ]; then
    if ! grep -q "^PORT=" .env; then
        echo "PORT=3006" >> .env
    else
        sed -i 's/^PORT=.*/PORT=3006/' .env
    fi
fi

echo "Installing backend dependencies..."
npm install --legacy-peer-deps --prefer-offline --no-audit

echo "Generating Prisma Client and syncing DB schema..."
npx prisma generate
npx prisma db push --skip-generate --accept-data-loss

echo "Building NestJS backend..."
npm run build

# 3. Build & Deploy Frontend (Port 3005)
echo "[3/4] Deploying Frontend..."
cd "$APP_DIR/frontend"

# Ensure frontend .env.production is present
if [ ! -f .env.production ]; then
    cat << 'EOF' > .env.production
NEXT_PUBLIC_API_URL=https://chat.kevindevops.online/api
NEXT_PUBLIC_SOCKET_URL=https://chat.kevindevops.online
EOF
fi

echo "Installing frontend dependencies..."
npm install --legacy-peer-deps --prefer-offline --no-audit

echo "Building Next.js frontend..."
npm run build

# 4. Start / Reload PM2 processes via ecosystem.config.cjs
echo "[4/4] Starting / Reloading PM2 processes via ecosystem.config.cjs..."
cd "$APP_DIR"
pm2 delete chat-frontend chat-backend 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save

echo "=================================================="
echo "Deployment Completed Successfully!"
echo "Backend: Port 3006 | Frontend: Port 3005"
echo "Health: https://chat.kevindevops.online"
echo "=================================================="
