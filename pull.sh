#!/bin/bash
echo "Pulling latest code from GitHub..."
git pull origin main

echo "Installing any new dependencies..."
npm install

echo "Restarting PM2 process..."
pm2 restart whatsapp-unofficial

echo "Server updated and restarted successfully!"
