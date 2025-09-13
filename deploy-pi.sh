#!/bin/bash

# MinhMom Application Deployment Script for Raspberry Pi
# This script helps deploy the MinhMom application using Docker on Raspberry Pi

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

print_pi() {
    echo -e "${BLUE}[RASPBERRY PI]${NC} $1"
}

# Check if running on Raspberry Pi
check_pi() {
    if grep -q "Raspberry Pi" /proc/cpuinfo 2>/dev/null; then
        print_pi "Raspberry Pi detected ✓"
    else
        print_warning "This script is optimized for Raspberry Pi"
    fi
}

# Check system resources
check_resources() {
    print_status "Checking system resources..."

    # Check available memory
    MEMORY=$(free -m | awk 'NR==2{printf "%.1f", $3/$2*100}')
    if (( $(echo "$MEMORY > 80" | bc -l) )); then
        print_warning "Memory usage is high: ${MEMORY}%"
        print_warning "Consider increasing swap space or closing other applications"
    else
        print_status "Memory usage: ${MEMORY}%"
    fi

    # Check disk space
    DISK=$(df -h / | awk 'NR==2{print $5}' | sed 's/%//')
    if [ "$DISK" -gt 80 ]; then
        print_warning "Disk usage is high: ${DISK}%"
        print_warning "Consider cleaning up or using external storage"
    else
        print_status "Disk usage: ${DISK}%"
    fi

    # Check CPU temperature
    if command -v vcgencmd &> /dev/null; then
        TEMP=$(vcgencmd measure_temp | cut -d= -f2 | cut -d\' -f1)
        print_status "CPU temperature: ${TEMP}°C"
        if (( $(echo "$TEMP > 70" | bc -l) )); then
            print_warning "CPU temperature is high: ${TEMP}°C"
            print_warning "Consider improving cooling"
        fi
    fi
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Installing Docker..."
        curl -fsSL https://get.docker.com -o get-docker.sh
        sudo sh get-docker.sh
        sudo usermod -aG docker $USER
        print_warning "Please log out and log back in for Docker group changes to take effect"
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Installing Docker Compose..."
        sudo apt install docker-compose -y
    fi
}

# Check if .env file exists
check_env() {
    if [ ! -f .env ]; then
        print_warning ".env file not found. Creating from example..."
        cp env.example .env
        print_warning "Please edit .env file with your configuration before running again."
        print_status "Important settings for Raspberry Pi:"
        print_status "  MONGODB_URI=mongodb://localhost:27017  # or your external MongoDB"
        print_status "  VITE_API_BASE_URL=http://<pi-ip>:8000  # replace <pi-ip> with your Pi's IP"
        print_status "  SSL_DOMAIN=your-domain.com  # for HTTPS deployment"
        print_status "  SSL_EMAIL=admin@your-domain.com  # for Let's Encrypt"
        exit 1
    fi
}

# Optimize system for Docker
optimize_system() {
    print_status "Optimizing system for Docker on Raspberry Pi..."

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
}

# Build and start services
deploy() {
    local compose_file="docker-compose.pi.yml"
    local use_https=false

    # Check if HTTPS is requested
    if [ "$2" = "https" ] || [ "$2" = "--https" ]; then
        use_https=true
        print_status "HTTPS deployment mode enabled"
        print_status "Running complete HTTPS deployment script..."

        # Run the complete HTTPS deployment script
        if [ -f "deploy-https-complete.sh" ]; then
            chmod +x deploy-https-complete.sh
            ./deploy-https-complete.sh
            return 0
        else
            print_error "deploy-https-complete.sh not found"
            print_error "Please ensure the complete HTTPS deployment script is available"
            exit 1
        fi
    fi

    print_status "Starting MinhMom application deployment on Raspberry Pi..."

    # Stop existing containers
    print_status "Stopping existing containers..."
    docker-compose -f docker-compose.pi.yml down 2>/dev/null || true
    docker-compose -f docker-compose.pi-https.yml down 2>/dev/null || true

    # Build and start services
    print_status "Building and starting services..."
    docker-compose -f $compose_file up --build -d

    # Wait for services to be healthy
    print_status "Waiting for services to be ready..."
    sleep 15

    # Check service health
    print_status "Checking service health..."

    # Check backend health
    if curl -f http://localhost:8000/health &> /dev/null; then
        print_status "Backend is healthy ✓"
    else
        print_error "Backend health check failed"
        docker-compose -f $compose_file logs backend
        exit 1
    fi

    # Check frontend health
    if curl -f http://localhost/health &> /dev/null; then
        print_status "Frontend is healthy ✓"
    else
        print_error "Frontend health check failed"
        docker-compose -f $compose_file logs frontend
        exit 1
    fi

    # Get Pi's IP address
    PI_IP=$(hostname -I | awk '{print $1}')

    print_status "Deployment completed successfully!"
    print_pi "Frontend: http://$PI_IP"
    print_pi "Backend API: http://$PI_IP:8000"
    print_pi "API Documentation: http://$PI_IP:8000/docs"
    print_status "Access from other devices using the Pi's IP address"
}

# Stop services
stop() {
    print_status "Stopping MinhMom application..."
    docker-compose -f docker-compose.pi.yml down 2>/dev/null || true
    docker-compose -f docker-compose.pi-https.yml down 2>/dev/null || true
    print_status "Application stopped."
}

# Show logs
logs() {
    local compose_file="docker-compose.pi.yml"

    # Check if HTTPS is requested
    if [ "$2" = "https" ] || [ "$2" = "--https" ]; then
        compose_file="docker-compose.pi-https.yml"
    fi

    docker-compose -f $compose_file logs -f
}

# Show status
status() {
    local compose_file="docker-compose.pi.yml"

    # Check if HTTPS is requested
    if [ "$2" = "https" ] || [ "$2" = "--https" ]; then
        compose_file="docker-compose.pi-https.yml"
    fi

    docker-compose -f $compose_file ps
    echo ""
    print_status "System Resources:"
    free -h
    df -h /
    if command -v vcgencmd &> /dev/null; then
        print_status "CPU Temperature: $(vcgencmd measure_temp)"
    fi
}

# Show Pi information
pi_info() {
    print_pi "Raspberry Pi Information:"
    echo "Model: $(cat /proc/device-tree/model 2>/dev/null || echo 'Unknown')"
    echo "Architecture: $(uname -m)"
    echo "Kernel: $(uname -r)"
    echo "Uptime: $(uptime -p)"
    echo "IP Address: $(hostname -I | awk '{print $1}')"
    echo "Memory: $(free -h | awk 'NR==2{print $2}')"
    echo "Disk: $(df -h / | awk 'NR==2{print $2}')"
    if command -v vcgencmd &> /dev/null; then
        echo "CPU Temperature: $(vcgencmd measure_temp)"
        echo "CPU Frequency: $(vcgencmd measure_clock arm | cut -d= -f2) Hz"
    fi
}

# SSL certificate management
ssl_cert() {
    local action="${2:-status}"

    case "$action" in
        status)
            print_status "Checking SSL certificate status..."
            if [ -f "ssl/cert.pem" ]; then
                print_status "SSL certificate found:"
                openssl x509 -in ssl/cert.pem -text -noout | grep -E "(Subject:|Not Before:|Not After:|Issuer:)"
            else
                print_warning "No SSL certificate found"
            fi
            ;;
        renew)
            print_status "Renewing SSL certificate..."
            docker-compose -f docker-compose.pi-https.yml exec certbot certbot renew
            docker-compose -f docker-compose.pi-https.yml restart frontend
            print_status "SSL certificate renewed"
            ;;
        create)
            print_status "Creating SSL certificate..."
            if [ -z "$SSL_DOMAIN" ] || [ -z "$SSL_EMAIL" ]; then
                print_error "SSL_DOMAIN and SSL_EMAIL must be set in .env file"
                exit 1
            fi
            docker-compose -f docker-compose.pi-https.yml run --rm certbot certbot certonly --webroot --webroot-path=/var/www/certbot --email $SSL_EMAIL --agree-tos --no-eff-email -d $SSL_DOMAIN
            print_status "SSL certificate created"
            ;;
        *)
            echo "Usage: $0 ssl-cert {status|renew|create}"
            echo ""
            echo "SSL Certificate Commands:"
            echo "  status  - Show current certificate status"
            echo "  renew   - Renew existing certificate"
            echo "  create  - Create new certificate (requires SSL_DOMAIN and SSL_EMAIL in .env)"
            exit 1
            ;;
    esac
}

# Main script logic
case "${1:-deploy}" in
    deploy)
        check_pi
        check_resources
        check_docker
        check_env
        optimize_system
        deploy "$@"
        ;;
    stop)
        stop
        ;;
    logs)
        logs "$@"
        ;;
    status)
        status "$@"
        ;;
    restart)
        stop
        sleep 2
        check_pi
        check_docker
        check_env
        deploy "$@"
        ;;
    info)
        pi_info
        ;;
    ssl-cert)
        ssl_cert "$@"
        ;;
    *)
        echo "Usage: $0 {deploy|stop|logs|status|restart|info|ssl-cert} [https|--https]"
        echo ""
        echo "Commands:"
        echo "  deploy [https]   - Build and start the application (default: HTTP)"
        echo "  stop             - Stop the application"
        echo "  logs [https]     - Show application logs"
        echo "  status [https]   - Show container status and system resources"
        echo "  restart [https]  - Restart the application"
        echo "  info             - Show Raspberry Pi information"
        echo "  ssl-cert         - Manage SSL certificates"
        echo ""
        echo "HTTPS Options:"
        echo "  https, --https   - Enable HTTPS with Let's Encrypt SSL certificates"
        echo ""
        echo "Examples:"
        echo "  $0 deploy                    # Deploy with HTTP"
        echo "  $0 deploy https              # Deploy with HTTPS"
        echo "  $0 logs https                # View HTTPS deployment logs"
        echo "  $0 status https              # Check HTTPS deployment status"
        echo "  $0 ssl-cert status           # Check SSL certificate status"
        echo "  $0 ssl-cert renew            # Renew SSL certificate"
        exit 1
        ;;
esac

