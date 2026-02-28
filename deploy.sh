#!/bin/bash

# Pastikan skrip berhenti jika ada error
set -e

echo "🚀 Memulai proses deployment..."

# 1. Tarik perubahan terbaru
echo "📥 Menarik kode terbaru dari Git..."
git pull origin main

# 2. Instal dependensi
echo "📦 Menginstal dependensi..."
npm install

# 3. Build aplikasi
echo "🏗️ Membangun aplikasi (Build)..."
npm run build

# Opsi A: Jika pakai Docker
if [ -f "docker-compose.yml" ]; then
    echo "🐳 Merestart container Docker..."
    docker compose up -d --build
fi

# Opsi B: Jika pakai PM2
if command -v pm2 &> /dev/null && [ -f "ecosystem.config.cjs" ]; then
    echo "🔄 Merestart aplikasi dengan PM2..."
    pm2 reload ecosystem.config.cjs --update-env
fi

echo "✅ Deployment selesai!"
