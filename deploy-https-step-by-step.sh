#!/bin/bash

# MinhMom HTTPS Step-by-Step Deployment
# This script deploys HTTPS in stages to avoid SSL certificate issues

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[HTTPS-DEPLOY]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[HTTPS-DEPLOY]${NC} $1"
}

print_error() {
    echo -e "${RED}[HTTPS-DEPLOY]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Step 1: Create necessary directories
create_directories() {
    print_step "1. Creating necessary directories..."

    mkdir -p ssl
    mkdir -p certbot/www
    mkdir -p certbot/conf

    print_status "Directories created ✓"
}

# Step 2: Create self-signed certificates
create_self_signed_certs() {
    print_step "2. Creating self-signed SSL certificates..."

    # Generate self-signed certificate
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout ssl/key.pem \
        -out ssl/cert.pem \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=minhmom.ddns.net"

    print_status "Self-signed certificates created ✓"
}

# Step 3: Start with HTTP only (for Let's Encrypt challenges)
start_http_only() {
    print_step "3. Starting HTTP-only deployment for Let's Encrypt challenges..."

    # Create a temporary docker-compose file for HTTP-only
    cat > docker-compose.temp.yml << EOF
version: '3.8'

services:
  # Backend service
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.arm64
    container_name: minhmom-backend
    volumes:
      - /home/minhbq/minhmom/images:/app/images
      - ./backend/config.prod.yaml:/app/config.yaml
    environment:
      - MONGODB_URI=\${MONGODB_URI:-mongodb://root:change-me@192.168.100.232:27017/}
      - DB_NAME=\${DB_NAME:-minhmom}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - minhmom-network

  # Frontend service (HTTP only for now)
  frontend:
    build:
      context: ./mm-frontend
      dockerfile: Dockerfile.arm64
    container_name: minhmom-frontend
    environment:
      - VITE_API_BASE_URL=\${VITE_API_BASE_URL:-http://minhmom.ddns.net/api}
      - VITE_GROUP_ID=\${VITE_GROUP_ID:-2847737995453663}
    volumes:
      - ./mm-frontend/nginx-startup.conf:/etc/nginx/nginx.conf:ro
      - ./certbot/www:/var/www/certbot:ro
    restart: unless-stopped
    depends_on:
      - backend
    ports:
      - "80:80"
    networks:
      - minhmom-network

networks:
  minhmom-network:
    driver: bridge
EOF

    # Start HTTP-only services
    docker-compose -f docker-compose.temp.yml up -d

    print_status "HTTP-only services started ✓"
}

# Step 4: Wait for services to be ready
wait_for_services() {
    print_step "4. Waiting for services to be ready..."

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
        docker-compose -f docker-compose.temp.yml logs backend
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

# Step 5: Get Let's Encrypt certificates
get_letsencrypt_certs() {
    print_step "5. Obtaining Let's Encrypt SSL certificates..."

    # Run certbot to get certificates
    docker run --rm \
        -v $(pwd)/certbot/www:/var/www/certbot \
        -v $(pwd)/certbot/conf:/etc/letsencrypt \
        certbot/certbot:latest \
        certonly --webroot \
        --webroot-path=/var/www/certbot \
        --email ${SSL_EMAIL:-admin@example.com} \
        --agree-tos \
        --no-eff-email \
        -d ${SSL_DOMAIN:-minhmom.ddns.net} || {
        print_warning "Failed to obtain Let's Encrypt certificates"
        print_warning "This might be due to:"
        print_warning "  - Domain not pointing to this server"
        print_warning "  - Port 80 not accessible from internet"
        print_warning "  - Let's Encrypt rate limits"
        print_warning "Continuing with self-signed certificates..."
        return 1
    }

    # Copy Let's Encrypt certificates to ssl directory
    if [ -f "certbot/conf/live/minhmom.ddns.net/fullchain.pem" ]; then
        print_status "Installing Let's Encrypt certificates..."
        cp certbot/conf/live/minhmom.ddns.net/fullchain.pem ssl/cert.pem
        cp certbot/conf/live/minhmom.ddns.net/privkey.pem ssl/key.pem
        print_status "Let's Encrypt certificates installed ✓"
        return 0
    else
        print_warning "Let's Encrypt certificates not found"
        return 1
    fi
}

# Step 6: Switch to HTTPS deployment
switch_to_https() {
    print_step "6. Switching to HTTPS deployment..."

    # Stop HTTP-only services
    docker-compose -f docker-compose.temp.yml down

    # Start HTTPS services
    docker-compose -f docker-compose.pi-https.yml up -d

    print_status "HTTPS services started ✓"
}

# Step 7: Verify HTTPS deployment
verify_https() {
    print_step "7. Verifying HTTPS deployment..."

    # Wait for services to start
    sleep 10

    # Check if services are running
    if docker-compose -f docker-compose.pi-https.yml ps | grep -q "Up"; then
        print_status "HTTPS services are running ✓"
    else
        print_error "HTTPS services are not running properly"
        docker-compose -f docker-compose.pi-https.yml logs
        exit 1
    fi

    # Test HTTPS endpoint
    if curl -k -f https://localhost/health &> /dev/null; then
        print_status "HTTPS endpoint is working ✓"
    else
        print_warning "HTTPS endpoint may not be ready yet"
    fi
}

# Cleanup
cleanup() {
    print_step "8. Cleaning up temporary files..."

    # Remove temporary docker-compose file
    rm -f docker-compose.temp.yml

    print_status "Cleanup completed ✓"
}

# Show final status
show_final_status() {
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
    print_status "Starting MinhMom HTTPS step-by-step deployment..."
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

    create_directories
    create_self_signed_certs
    start_http_only
    wait_for_services
    get_letsencrypt_certs
    switch_to_https
    verify_https
    cleanup
    show_final_status
}

# Run main function
main "$@"
