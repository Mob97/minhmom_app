#!/bin/bash

# Quick Fix for Nginx SSL Certificate Error
# This script fixes the immediate nginx SSL certificate issue

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[FIX]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[FIX]${NC} $1"
}

print_error() {
    echo -e "${RED}[FIX]${NC} $1"
}

# Create SSL directory and certificates
fix_ssl_certificates() {
    print_status "Creating SSL directory and certificates..."

    # Create SSL directory
    mkdir -p ssl

    # Generate self-signed certificate
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout ssl/key.pem \
        -out ssl/cert.pem \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=minhmom.ddns.net"

    print_status "SSL certificates created ✓"
}

# Create certbot directories
create_certbot_dirs() {
    print_status "Creating certbot directories..."

    mkdir -p certbot/www
    mkdir -p certbot/conf

    print_status "Certbot directories created ✓"
}

# Stop current services
stop_services() {
    print_status "Stopping current services..."

    # Stop any running services
    docker-compose -f docker-compose.pi-https.yml down 2>/dev/null || true
    docker-compose -f docker-compose.pi.yml down 2>/dev/null || true

    print_status "Services stopped ✓"
}

# Start services with fixed configuration
start_services() {
    print_status "Starting services with fixed configuration..."

    # Start HTTPS services
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
    if curl -k -f https://localhost/health &> /dev/null; then
        print_status "Frontend is ready ✓"
    else
        print_warning "Frontend may not be ready yet"
    fi
}

# Show status
show_status() {
    print_status "Fix completed! 🎉"
    echo ""
    print_status "Your MinhMom app should now be accessible at:"
    echo "  Frontend: https://minhmom.ddns.net"
    echo "  Backend API: https://minhmom.ddns.net/api"
    echo "  API Documentation: https://minhmom.ddns.net/api/docs"
    echo ""
    print_status "Useful commands:"
    echo "  ./deploy-pi.sh status https    # Check status"
    echo "  ./deploy-pi.sh logs https      # View logs"
    echo "  ./deploy-pi.sh ssl-cert status # Check SSL certificate"
    echo ""
    print_warning "Note: Using self-signed certificates"
    print_warning "Browsers will show security warnings"
    print_warning "Run './deploy-pi.sh ssl-cert renew' to get Let's Encrypt certificates"
}

# Main function
main() {
    print_status "Fixing nginx SSL certificate error..."
    echo ""

    fix_ssl_certificates
    create_certbot_dirs
    stop_services
    start_services
    wait_for_services
    show_status
}

# Run main function
main "$@"
