#!/bin/bash

# Manual SSL Fix for Raspberry Pi
# Run this directly on your Raspberry Pi

echo "🔧 Fixing SSL certificate issue..."

# Create directories with proper permissions
echo "Creating directories..."
mkdir -p ssl
mkdir -p certbot/www
mkdir -p certbot/conf

# Set permissions
chmod 755 ssl
chmod 755 certbot
chmod 755 certbot/www
chmod 755 certbot/conf

# Generate self-signed certificate
echo "Generating self-signed SSL certificate..."
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout ssl/key.pem \
    -out ssl/cert.pem \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=minhmom.ddns.net"

# Set proper permissions for certificates
chmod 644 ssl/cert.pem
chmod 600 ssl/key.pem

echo "✅ SSL certificates created successfully!"

# Stop any running services
echo "Stopping current services..."
docker-compose -f docker-compose.pi-https.yml down 2>/dev/null || true

# Start services
echo "Starting services with SSL certificates..."
docker-compose -f docker-compose.pi-https.yml up -d

echo "✅ Services started!"
echo ""
echo "Your MinhMom app should now be accessible at:"
echo "  Frontend: https://minhmom.ddns.net"
echo "  Backend API: https://minhmom.ddns.net/api"
echo "  API Documentation: https://minhmom.ddns.net/api/docs"
echo ""
echo "Note: Using self-signed certificates (browsers will show security warnings)"
echo "Run './deploy-pi.sh ssl-cert renew' to get Let's Encrypt certificates"
