#!/bin/bash

# MinhMom App - No-IP Dynamic DNS HTTPS Setup Script
# This script helps configure your MinhMom app for HTTPS with minhmom.ddns.net

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_noip() {
    echo -e "${BLUE}[NO-IP]${NC} $1"
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
    print_status "Checking system requirements..."

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

# Install required packages
install_packages() {
    print_status "Installing required packages..."

    sudo apt update
    sudo apt install -y curl wget git vim bc

    # Install No-IP client
    print_status "Installing No-IP client..."
    sudo apt install -y noip2

    print_status "Packages installed ✓"
}

# Install Docker
install_docker() {
    print_status "Installing Docker..."

    if ! command -v docker &> /dev/null; then
        curl -fsSL https://get.docker.com -o get-docker.sh
        sudo sh get-docker.sh
        sudo usermod -aG docker $USER
        print_warning "Please log out and log back in for Docker group changes to take effect"
        print_warning "Then run this script again"
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        sudo apt install docker-compose -y
    fi

    print_status "Docker installed ✓"
}

# Configure No-IP client
configure_noip() {
    print_status "Configuring No-IP client..."

    print_noip "Please enter your No-IP credentials:"
    read -p "No-IP Username: " noip_username
    read -s -p "No-IP Password: " noip_password
    echo

    # Configure No-IP client
    echo "$noip_username" | sudo tee /etc/no-ip2.conf > /dev/null
    echo "$noip_password" | sudo tee -a /etc/no-ip2.conf > /dev/null
    echo "minhmom.ddns.net" | sudo tee -a /etc/no-ip2.conf > /dev/null

    # Start No-IP client
    sudo noip2 -C
    sudo systemctl enable noip2
    sudo systemctl start noip2

    print_status "No-IP client configured ✓"
}

# Configure environment
configure_environment() {
    print_status "Configuring environment..."

    if [ ! -f .env ]; then
        cp env.minhmom-ddns.example .env
        print_status "Created .env file from template"
    fi

    print_warning "Please edit .env file with your settings:"
    print_warning "  - SSL_EMAIL: Your email for Let's Encrypt"
    print_warning "  - MONGODB_URI: Your MongoDB connection string"
    print_warning "  - VITE_GROUP_ID: Your Facebook group ID"

    read -p "Press Enter when you've updated .env file..."

    print_status "Environment configured ✓"
}

# Configure firewall
configure_firewall() {
    print_status "Configuring firewall..."

    sudo ufw --force enable
    sudo ufw allow ssh
    sudo ufw allow 80
    sudo ufw allow 443

    print_status "Firewall configured ✓"
}

# Deploy application
deploy_application() {
    print_status "Deploying MinhMom application with HTTPS..."

    # Make deploy script executable
    chmod +x deploy-pi.sh

    # Deploy with HTTPS
    ./deploy-pi.sh deploy https

    print_status "Application deployed ✓"
}

# Verify deployment
verify_deployment() {
    print_status "Verifying deployment..."

    # Wait for services to start
    sleep 30

    # Check if services are running
    if ./deploy-pi.sh status https | grep -q "Up"; then
        print_status "Services are running ✓"
    else
        print_error "Services are not running properly"
        ./deploy-pi.sh logs https
        exit 1
    fi

    # Check SSL certificate
    if ./deploy-pi.sh ssl-cert status | grep -q "minhmom.ddns.net"; then
        print_status "SSL certificate is valid ✓"
    else
        print_warning "SSL certificate may not be ready yet"
        print_warning "Check again in a few minutes: ./deploy-pi.sh ssl-cert status"
    fi

    print_status "Deployment verified ✓"
}

# Show final instructions
show_final_instructions() {
    print_status "Setup completed successfully!"
    echo ""
    print_noip "Your MinhMom app is now accessible at:"
    echo "  Frontend: https://minhmom.ddns.net"
    echo "  Backend API: https://minhmom.ddns.net/api"
    echo "  API Documentation: https://minhmom.ddns.net/api/docs"
    echo ""
    print_status "Useful commands:"
    echo "  ./deploy-pi.sh status https    # Check status"
    echo "  ./deploy-pi.sh logs https      # View logs"
    echo "  ./deploy-pi.sh ssl-cert status # Check SSL certificate"
    echo "  ./deploy-pi.sh restart https   # Restart application"
    echo ""
    print_warning "Important notes:"
    echo "  - Make sure ports 80 and 443 are forwarded on your router"
    echo "  - Your No-IP client will automatically update your IP"
    echo "  - SSL certificates will auto-renew every 90 days"
    echo "  - Check logs if you encounter any issues"
}

# Main setup function
main() {
    print_status "Starting MinhMom No-IP HTTPS setup..."
    echo ""

    check_root
    check_system
    install_packages
    install_docker
    configure_noip
    configure_environment
    configure_firewall
    deploy_application
    verify_deployment
    show_final_instructions

    print_status "Setup completed! 🎉"
}

# Run main function
main "$@"
