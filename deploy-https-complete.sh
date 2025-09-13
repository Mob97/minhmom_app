#!/bin/bash

# MinhMom Complete HTTPS Deployment Script
# This script handles everything needed for HTTPS deployment with No-IP dynamic DNS

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[HTTPS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[HTTPS]${NC} $1"
}

print_error() {
    echo -e "${RED}[HTTPS]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if running as root
check_root() {
    if [ "$EUID" -eq 0 ]; then
        print_error "Please don't run this script as root. Run as regular user."
        exit 1
    fi
}

# Check system requirements
check_system() {
    print_step "1. Checking system requirements..."

    # Check if running on Raspberry Pi
    if grep -q "Raspberry Pi" /proc/cpuinfo 2>/dev/null; then
        print_status "Raspberry Pi detected ✓"
    else
        print_warning "This script is optimized for Raspberry Pi"
    fi

    # Check available memory
    MEMORY=$(free -m | awk 'NR==2{printf "%.1f", $3/$2*100}')
    if (( $(echo "$MEMORY > 80" | bc -l) )); then
        print_warning "Memory usage is high: ${MEMORY}%"
        print_warning "Consider closing other applications"
    else
        print_status "Memory usage: ${MEMORY}%"
    fi

    # Check disk space
    DISK=$(df -h / | awk 'NR==2{print $5}' | sed 's/%//')
    if [ "$DISK" -gt 80 ]; then
        print_warning "Disk usage is high: ${DISK}%"
        print_warning "Consider cleaning up"
    else
        print_status "Disk usage: ${DISK}%"
    fi
}

# Check if Docker is installed
check_docker() {
    print_step "2. Checking Docker installation..."

    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Installing Docker..."
        curl -fsSL https://get.docker.com -o get-docker.sh
        sudo sh get-docker.sh
        sudo usermod -aG docker $USER
        print_warning "Please log out and log back in for Docker group changes to take effect"
        print_warning "Then run this script again"
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Installing Docker Compose..."
        sudo apt install docker-compose -y
    fi

    print_status "Docker is installed ✓"
}

# Check if .env file exists
check_env() {
    print_step "3. Checking environment configuration..."

    if [ ! -f .env ]; then
        print_warning ".env file not found. Creating from template..."
        cp env.minhmom-ddns.example .env
        print_warning "Please edit .env file with your configuration before running again."
        print_status "Important settings for HTTPS deployment:"
        print_status "  SSL_DOMAIN=minhmom.ddns.net"
        print_status "  SSL_EMAIL=your-email@example.com"
        print_status "  MONGODB_URI=mongodb://your-mongodb-host:27017"
        print_status "  VITE_GROUP_ID=your-facebook-group-id"
        exit 1
    fi

    # Load environment variables
    source .env

    print_status "Environment configuration loaded ✓"
}

# Create necessary directories and SSL certificates
setup_ssl() {
    print_step "4. Setting up SSL certificates..."

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
            -subj "/C=US/ST=State/L=City/O=Organization/CN=${SSL_DOMAIN:-minhmom.ddns.net}"

        # Set proper permissions
        chmod 644 ssl/cert.pem
        chmod 600 ssl/key.pem

        print_status "Self-signed certificate created ✓"
    else
        print_status "SSL certificates already exist ✓"
    fi
}

# Optimize system for Docker
optimize_system() {
    print_step "5. Optimizing system for Docker..."

    # Increase swap if needed
    if [ ! -f /etc/dphys-swapfile ]; then
        print_status "Setting up swap file..."
        sudo dphys-swapfile swapoff 2>/dev/null || true
        echo 'CONF_SWAPSIZE=2048' | sudo tee /etc/dphys-swapfile
        sudo dphys-swapfile setup
        sudo dphys-swapfile swapon
    fi

    # Optimize kernel parameters
    if ! grep -q "vm.max_map_count" /etc/sysctl.conf; then
        print_status "Optimizing kernel parameters..."
        echo 'vm.max_map_count=262144' | sudo tee -a /etc/sysctl.conf
        echo 'fs.file-max=65536' | sudo tee -a /etc/sysctl.conf
        sudo sysctl -p
    fi

    # Configure Docker for better performance
    if [ ! -f /etc/docker/daemon.json ]; then
        print_status "Configuring Docker for Raspberry Pi..."
        sudo tee /etc/docker/daemon.json > /dev/null <<EOF
{
  "default-runtime": "runc",
  "storage-driver": "overlay2",
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF
        sudo systemctl restart docker
    fi

    print_status "System optimization completed ✓"
}

# Start services
start_services() {
    print_step "6. Starting MinhMom application..."

    # Stop any running services
    docker-compose -f docker-compose.pi-https.yml down 2>/dev/null || true
    docker-compose -f docker-compose.pi.yml down 2>/dev/null || true

    # Start HTTPS services
    docker-compose -f docker-compose.pi-https.yml up -d

    print_status "Services started ✓"
}

# Wait for services to be ready
wait_for_services() {
    print_step "7. Waiting for services to be ready..."

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
    print_step "8. Attempting to obtain Let's Encrypt certificates..."

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
        print_warning "This might be due to:"
        print_warning "  - Domain not pointing to this server"
        print_warning "  - Port 80 not accessible from internet"
        print_warning "  - Let's Encrypt rate limits"
        print_warning "Using self-signed certificates for now"
        return 1
    }

    # Copy Let's Encrypt certificates to ssl directory
    if [ -f "certbot/conf/live/${SSL_DOMAIN:-minhmom.ddns.net}/fullchain.pem" ]; then
        print_status "Installing Let's Encrypt certificates..."
        cp certbot/conf/live/${SSL_DOMAIN:-minhmom.ddns.net}/fullchain.pem ssl/cert.pem
        cp certbot/conf/live/${SSL_DOMAIN:-minhmom.ddns.net}/privkey.pem ssl/key.pem

        # Restart nginx with new certificates
        docker-compose -f docker-compose.pi-https.yml restart frontend

        print_status "Let's Encrypt certificates installed ✓"
        return 0
    else
        print_warning "Let's Encrypt certificates not found"
        return 1
    fi
}

# Configure firewall
configure_firewall() {
    print_step "9. Configuring firewall..."

    # Install UFW if not installed
    if ! command -v ufw &> /dev/null; then
        sudo apt install ufw -y
    fi

    # Configure firewall
    sudo ufw --force enable
    sudo ufw allow ssh
    sudo ufw allow 80
    sudo ufw allow 443

    print_status "Firewall configured ✓"
}

# Show final status
show_final_status() {
    print_status "HTTPS deployment completed successfully! 🎉"
    echo ""
    print_status "Your MinhMom app is accessible at:"
    echo "  Frontend: https://${SSL_DOMAIN:-minhmom.ddns.net}"
    echo "  Backend API: https://${SSL_DOMAIN:-minhmom.ddns.net}/api"
    echo "  API Documentation: https://${SSL_DOMAIN:-minhmom.ddns.net}/api/docs"
    echo ""
    print_status "Useful commands:"
    echo "  ./deploy-pi.sh status https    # Check status"
    echo "  ./deploy-pi.sh logs https      # View logs"
    echo "  ./deploy-pi.sh ssl-cert status # Check SSL certificate"
    echo "  ./deploy-pi.sh restart https   # Restart application"
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

    # Show Pi information
    PI_IP=$(hostname -I | awk '{print $1}')
    print_status "Raspberry Pi Information:"
    echo "  IP Address: $PI_IP"
    echo "  Domain: ${SSL_DOMAIN:-minhmom.ddns.net}"
    if command -v vcgencmd &> /dev/null; then
        echo "  CPU Temperature: $(vcgencmd measure_temp)"
    fi
}

# Main function
main() {
    print_status "Starting MinhMom Complete HTTPS Deployment..."
    echo ""
    print_status "This script will:"
    print_status "  ✓ Check system requirements"
    print_status "  ✓ Install/configure Docker"
    print_status "  ✓ Set up SSL certificates"
    print_status "  ✓ Deploy the application"
    print_status "  ✓ Configure firewall"
    print_status "  ✓ Attempt to get Let's Encrypt certificates"
    echo ""

    check_root
    check_system
    check_docker
    check_env
    setup_ssl
    optimize_system
    start_services
    wait_for_services
    get_letsencrypt_certs
    configure_firewall
    show_final_status

    print_status "Deployment completed! 🚀"
}

# Run main function
main "$@"
