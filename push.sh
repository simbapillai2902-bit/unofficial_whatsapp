#!/bin/bash
echo "Adding changes to git..."
git add .
echo "Committing changes..."
git commit -m "Auto update from local: $(date)"
echo "Pushing to GitHub..."
git push origin main
echo "Done! You can now pull these changes on your server."
