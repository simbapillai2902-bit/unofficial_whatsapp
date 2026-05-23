#!/bin/bash

echo "Pulling latest code from GitHub..."
git pull origin main

echo "Installing any new dependencies..."
npm install

echo "Checking for .env file..."
if [ ! -f .env ]; then
    echo "Warning: .env file not found. Copying .env.example..."
    cp .env.example .env
fi

echo "Restarting PM2 process..."
if pm2 describe whatsapp-unofficial > /dev/null; then
    pm2 restart whatsapp-unofficial
else
    echo "Process not found, starting new PM2 process..."
    pm2 start npm --name "whatsapp-unofficial" -- run start
fi

echo "Server updated and restarted successfully!"
