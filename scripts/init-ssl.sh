#!/bin/bash

# SSL Certificate Initialization Script
# This script handles the initial SSL certificate setup for HTTPS deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[SSL-INIT]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[SSL-INIT]${NC} $1"
}

print_error() {
    echo -e "${RED}[SSL-INIT]${NC} $1"
}

# Check if SSL certificates exist
check_ssl_certs() {
    if [ -f "/etc/nginx/ssl/cert.pem" ] && [ -f "/etc/nginx/ssl/key.pem" ]; then
        print_status "SSL certificates found ✓"
        return 0
    else
        print_warning "SSL certificates not found"
        return 1
    fi
}

# Create self-signed certificates for initial setup
create_self_signed_certs() {
    print_status "Creating self-signed SSL certificates for initial setup..."

    # Create SSL directory
    mkdir -p /etc/nginx/ssl

    # Generate self-signed certificate
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/nginx/ssl/key.pem \
        -out /etc/nginx/ssl/cert.pem \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=minhmom.ddns.net"

    print_status "Self-signed certificates created ✓"
}

# Wait for Let's Encrypt certificates
wait_for_letsencrypt() {
    print_status "Waiting for Let's Encrypt certificates..."

    local max_attempts=30
    local attempt=0

    while [ $attempt -lt $max_attempts ]; do
        if [ -f "/etc/letsencrypt/live/minhmom.ddns.net/fullchain.pem" ] && [ -f "/etc/letsencrypt/live/minhmom.ddns.net/privkey.pem" ]; then
            print_status "Let's Encrypt certificates found ✓"

            # Copy certificates to nginx ssl directory
            cp /etc/letsencrypt/live/minhmom.ddns.net/fullchain.pem /etc/nginx/ssl/cert.pem
            cp /etc/letsencrypt/live/minhmom.ddns.net/privkey.pem /etc/nginx/ssl/key.pem

            print_status "Let's Encrypt certificates installed ✓"
            return 0
        fi

        print_warning "Waiting for Let's Encrypt certificates... (attempt $((attempt + 1))/$max_attempts)"
        sleep 10
        attempt=$((attempt + 1))
    done

    print_error "Let's Encrypt certificates not found after $max_attempts attempts"
    return 1
}

# Main initialization
main() {
    print_status "Initializing SSL certificates..."

    # Check if certificates already exist
    if check_ssl_certs; then
        print_status "SSL certificates already configured ✓"
        exit 0
    fi

    # Create self-signed certificates for initial setup
    create_self_signed_certs

    # Start nginx with self-signed certificates
    print_status "Starting nginx with self-signed certificates..."
    nginx -g "daemon off;" &
    nginx_pid=$!

    # Wait a bit for nginx to start
    sleep 5

    # Try to get Let's Encrypt certificates
    print_status "Attempting to obtain Let's Encrypt certificates..."

    # Run certbot to get certificates
    certbot certonly --webroot --webroot-path=/var/www/certbot \
        --email ${SSL_EMAIL:-admin@example.com} \
        --agree-tos --no-eff-email \
        -d ${SSL_DOMAIN:-minhmom.ddns.net} || {
        print_warning "Failed to obtain Let's Encrypt certificates, using self-signed"
        print_warning "You can manually renew certificates later"
        exit 0
    }

    # Wait for certificates to be available
    if wait_for_letsencrypt; then
        print_status "Let's Encrypt certificates installed successfully ✓"

        # Reload nginx with new certificates
        print_status "Reloading nginx with Let's Encrypt certificates..."
        kill $nginx_pid
        nginx -g "daemon off;" &
    else
        print_warning "Using self-signed certificates"
    fi

    print_status "SSL initialization completed ✓"
}

# Run main function
main "$@"
