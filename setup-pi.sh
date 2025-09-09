#!/bin/bash

# Raspberry Pi Setup Script for MinhMom Application
# Run this script on a fresh Raspberry Pi OS installation

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_pi() {
    echo -e "${BLUE}[RASPBERRY PI]${NC} $1"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_error "Please run this script as a regular user, not root"
    print_status "The script will ask for sudo password when needed"
    exit 1
fi

print_pi "Setting up Raspberry Pi for MinhMom Application..."

# Update system
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install essential packages
print_status "Installing essential packages..."
sudo apt install -y curl wget git vim htop iotop nethogs bc

# Install Docker
print_status "Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
rm get-docker.sh

# Install Docker Compose
print_status "Installing Docker Compose..."
sudo apt install docker-compose -y

# Optimize system for Docker
print_status "Optimizing system for Docker..."

# Increase swap space
print_status "Setting up swap file..."
sudo dphys-swapfile swapoff 2>/dev/null || true
echo 'CONF_SWAPSIZE=2048' | sudo tee /etc/dphys-swapfile
sudo dphys-swapfile setup
sudo dphys-swapfile swapon

# Optimize kernel parameters
print_status "Optimizing kernel parameters..."
echo 'vm.max_map_count=262144' | sudo tee -a /etc/sysctl.conf
echo 'fs.file-max=65536' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Configure Docker for better performance
print_status "Configuring Docker..."
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

# Restart Docker
sudo systemctl restart docker

# Set up log rotation
print_status "Setting up log rotation..."
sudo tee /etc/logrotate.d/docker > /dev/null <<EOF
/var/lib/docker/containers/*/*.log {
  rotate 7
  daily
  compress
  size=1M
  missingok
  delaycompress
  copytruncate
}
EOF

# Configure firewall
print_status "Configuring firewall..."
sudo apt install ufw -y
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 8000
sudo ufw --force enable

# Set up static hostname
print_status "Setting up hostname..."
sudo hostnamectl set-hostname minhmom-server

# Create application directory
print_status "Creating application directory..."
mkdir -p ~/minhmom-app
cd ~/minhmom-app

# Clone repository (if provided)
if [ ! -z "$1" ]; then
    print_status "Cloning repository: $1"
    git clone $1 .
else
    print_warning "No repository URL provided"
    print_status "Please clone your repository manually:"
    print_status "  git clone <your-repository-url> ."
fi

# Set up environment file
if [ ! -f .env ]; then
    print_status "Creating environment file..."
    cat > .env <<EOF
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017
DB_NAME=minhmom

# Frontend Configuration
VITE_API_BASE_URL=http://$(hostname -I | awk '{print $1}'):8000
VITE_GROUP_ID=2847737995453663

# Backend Configuration
IMAGES_BASE_PATH=/app/images
CORS_ORIGINS=http://$(hostname -I | awk '{print $1}'):80,http://$(hostname -I | awk '{print $1}'):3000
LOG_LEVEL=INFO
EOF
    print_warning "Please edit .env file with your actual configuration"
fi

# Make deployment script executable
if [ -f deploy-pi.sh ]; then
    chmod +x deploy-pi.sh
fi

# Test Docker installation
print_status "Testing Docker installation..."
docker --version
docker-compose --version
docker run hello-world

# Show system information
print_pi "Setup completed successfully!"
echo ""
print_status "System Information:"
echo "Hostname: $(hostname)"
echo "IP Address: $(hostname -I | awk '{print $1}')"
echo "Architecture: $(uname -m)"
echo "Memory: $(free -h | awk 'NR==2{print $2}')"
echo "Disk: $(df -h / | awk 'NR==2{print $2}')"
if command -v vcgencmd &> /dev/null; then
    echo "CPU Temperature: $(vcgencmd measure_temp)"
fi

echo ""
print_status "Next steps:"
print_status "1. Edit .env file with your configuration:"
print_status "   nano .env"
print_status "2. Deploy the application:"
print_status "   ./deploy-pi.sh"
print_status "3. Access the application:"
print_status "   Frontend: http://$(hostname -I | awk '{print $1}')"
print_status "   Backend: http://$(hostname -I | awk '{print $1}'):8000"

print_warning "Please reboot the system to ensure all changes take effect:"
print_warning "  sudo reboot"

