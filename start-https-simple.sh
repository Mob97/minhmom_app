#!/bin/bash

# Simple HTTPS Startup Script
# This script handles SSL certificates and starts the HTTPS deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[HTTPS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[HTTPS]${NC} $1"
}

print_error() {
    echo -e "${RED}[HTTPS]${NC} $1"
}

# Create directories and certificates
setup_ssl() {
    print_status "Setting up SSL certificates..."

    # Create directories
    mkdir -p ssl certbot/www certbot/conf

    # Set permissions
    chmod 755 ssl certbot certbot/www certbot/conf

    # Generate self-signed certificate if it doesn't exist
    if [ ! -f "ssl/cert.pem" ] || [ ! -f "ssl/key.pem" ]; then
        print_status "Generating self-signed SSL certificate..."
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout ssl/key.pem \
            -out ssl/cert.pem \
            -subj "/C=US/ST=State/L=City/O=Organization/CN=minhmom.ddns.net"

        # Set proper permissions
        chmod 644 ssl/cert.pem
        chmod 600 ssl/key.pem

        print_status "Self-signed certificate created ✓"
    else
        print_status "SSL certificates already exist ✓"
    fi
}

# Start services
start_services() {
    print_status "Starting MinhMom application..."

    # Stop any running services
    docker-compose -f docker-compose.pi-https.yml down 2>/dev/null || true

    # Start services
    docker-compose -f docker-compose.pi-https.yml up -d

    print_status "Services started ✓"
}

# Wait for services to be ready
wait_for_services() {
    print_status "Waiting for services to be ready..."

    # Wait for backend
    local max_attempts=30
    local attempt=0

    while [ $attempt -lt $max_attempts ]; do
        if curl -f http://localhost:8000/health &> /dev/null; then
            print_status "Backend is ready ✓"
            break
        fi
        print_warning "Waiting for backend... (attempt $((attempt + 1))/$max_attempts)"
        sleep 5
        attempt=$((attempt + 1))
    done

    if [ $attempt -eq $max_attempts ]; then
        print_error "Backend failed to start"
        docker-compose -f docker-compose.pi-https.yml logs backend
        exit 1
    fi

    # Wait for frontend
    sleep 5
    if curl -f http://localhost/health &> /dev/null; then
        print_status "Frontend is ready ✓"
    else
        print_warning "Frontend may not be ready yet"
    fi
}

# Try to get Let's Encrypt certificates
get_letsencrypt_certs() {
    print_status "Attempting to obtain Let's Encrypt certificates..."

    # Wait a bit for nginx to start
    sleep 10

    # Try to get certificates
    docker-compose -f docker-compose.pi-https.yml run --rm certbot certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email ${SSL_EMAIL:-admin@example.com} \
        --agree-tos \
        --no-eff-email \
        -d ${SSL_DOMAIN:-minhmom.ddns.net} || {
        print_warning "Failed to obtain Let's Encrypt certificates"
        print_warning "Using self-signed certificates for now"
        return 1
    }

    # Copy Let's Encrypt certificates to ssl directory
    if [ -f "certbot/conf/live/minhmom.ddns.net/fullchain.pem" ]; then
        print_status "Installing Let's Encrypt certificates..."
        cp certbot/conf/live/minhmom.ddns.net/fullchain.pem ssl/cert.pem
        cp certbot/conf/live/minhmom.ddns.net/privkey.pem ssl/key.pem

        # Restart nginx with new certificates
        docker-compose -f docker-compose.pi-https.yml restart frontend

        print_status "Let's Encrypt certificates installed ✓"
        return 0
    else
        print_warning "Let's Encrypt certificates not found"
        return 1
    fi
}

# Show final status
show_status() {
    print_status "HTTPS deployment completed! 🎉"
    echo ""
    print_status "Your MinhMom app is accessible at:"
    echo "  Frontend: https://minhmom.ddns.net"
    echo "  Backend API: https://minhmom.ddns.net/api"
    echo "  API Documentation: https://minhmom.ddns.net/api/docs"
    echo ""
    print_status "Useful commands:"
    echo "  ./deploy-pi.sh status https    # Check status"
    echo "  ./deploy-pi.sh logs https      # View logs"
    echo "  ./deploy-pi.sh ssl-cert status # Check SSL certificate"
    echo ""

    # Check certificate type
    if [ -f "ssl/cert.pem" ]; then
        if openssl x509 -in ssl/cert.pem -text -noout | grep -q "Let's Encrypt"; then
            print_status "Using Let's Encrypt certificates ✓"
        else
            print_warning "Using self-signed certificates"
            print_warning "Browsers will show security warnings"
            print_warning "Run './deploy-pi.sh ssl-cert renew' to get Let's Encrypt certificates"
        fi
    fi
}

# Main function
main() {
    print_status "Starting MinhMom HTTPS deployment..."
    echo ""

    # Check if .env exists
    if [ ! -f .env ]; then
        print_error ".env file not found. Please create it first:"
        print_error "  cp env.minhmom-ddns.example .env"
        print_error "  nano .env"
        exit 1
    fi

    # Load environment variables
    source .env

    setup_ssl
    start_services
    wait_for_services
    get_letsencrypt_certs
    show_status
}

# Run main function
main "$@"
