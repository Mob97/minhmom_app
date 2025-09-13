#!/bin/bash

# MinhMom HTTPS Startup Script
# This script handles SSL certificate initialization and starts the HTTPS deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[HTTPS-START]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[HTTPS-START]${NC} $1"
}

print_error() {
    echo -e "${RED}[HTTPS-START]${NC} $1"
}

# Create necessary directories
create_directories() {
    print_status "Creating necessary directories..."

    mkdir -p ssl
    mkdir -p certbot/www
    mkdir -p certbot/conf

    print_status "Directories created ✓"
}

# Create self-signed certificates for initial setup
create_self_signed_certs() {
    print_status "Creating self-signed SSL certificates for initial setup..."

    # Generate self-signed certificate
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout ssl/key.pem \
        -out ssl/cert.pem \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=minhmom.ddns.net"

    print_status "Self-signed certificates created ✓"
}

# Start services
start_services() {
    print_status "Starting MinhMom application with HTTPS..."

    # Start the services
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
        print_warning "You can manually renew certificates later with:"
        print_warning "  ./deploy-pi.sh ssl-cert renew"
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
    print_status "HTTPS deployment completed!"
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

    # Check if using self-signed certificates
    if [ -f "ssl/cert.pem" ] && openssl x509 -in ssl/cert.pem -text -noout | grep -q "Organization"; then
        print_warning "Note: Using self-signed certificates"
        print_warning "Browsers will show security warnings"
        print_warning "Run './deploy-pi.sh ssl-cert renew' to get Let's Encrypt certificates"
    fi
}

# Main function
main() {
    print_status "Starting MinhMom HTTPS deployment process..."

    # Check if .env exists
    if [ ! -f .env ]; then
        print_error ".env file not found. Please create it first:"
        print_error "  cp env.minhmom-ddns.example .env"
        print_error "  nano .env"
        exit 1
    fi

    # Load environment variables
    source .env

    create_directories
    create_self_signed_certs
    start_services
    wait_for_services
    get_letsencrypt_certs
    show_status

    print_status "HTTPS deployment completed! 🎉"
}

# Run main function
main "$@"
