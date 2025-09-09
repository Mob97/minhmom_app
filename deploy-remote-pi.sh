#!/bin/bash

# Remote Raspberry Pi Deployment Script for MinhMom Application
# This script deploys the application to a remote Raspberry Pi via SSH
# using credentials from .env file

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

# Load environment variables
load_env() {
    if [ ! -f .env ]; then
        print_error ".env file not found. Please create one with the following variables:"
        echo "PI_HOST=192.168.1.100"
        echo "PI_USER=pi"
        echo "PI_PASSWORD=your_password"
        echo "PI_PORT=22"
        echo "MONGODB_URI=mongodb://localhost:27017"
        echo "VITE_GROUP_ID=2847737995453663"
        exit 1
    fi

    # Load .env file
    export $(grep -v '^#' .env | xargs)

    # Set defaults
    PI_HOST=${PI_HOST:-"192.168.1.100"}
    PI_USER=${PI_USER:-"pi"}
    PI_PASSWORD=${PI_PASSWORD:-""}
    PI_PORT=${PI_PORT:-"22"}
    PI_APP_DIR=${PI_APP_DIR:-"~/minhmom-app"}

    if [ -z "$PI_PASSWORD" ]; then
        print_error "PI_PASSWORD not set in .env file"
        exit 1
    fi

    print_status "Loaded configuration:"
    print_status "  Host: $PI_HOST"
    print_status "  User: $PI_USER"
    print_status "  Port: $PI_PORT"
    print_status "  App Directory: $PI_APP_DIR"
}

# Check if required tools are installed
check_tools() {
    print_status "Checking required tools..."

    if ! command -v sshpass &> /dev/null; then
        print_error "sshpass is not installed. Installing..."
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            if command -v brew &> /dev/null; then
                brew install hudochenkov/sshpass/sshpass
            else
                print_error "Please install Homebrew first: https://brew.sh/"
                exit 1
            fi
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            # Linux
            sudo apt-get update && sudo apt-get install -y sshpass
        else
            print_error "Please install sshpass manually for your operating system"
            exit 1
        fi
    fi

    if ! command -v rsync &> /dev/null; then
        print_error "rsync is not installed. Please install it first."
        exit 1
    fi

    print_status "Required tools are available ✓"
}

# Test SSH connection
test_connection() {
    print_status "Testing SSH connection to $PI_USER@$PI_HOST:$PI_PORT..."

    if sshpass -p "$PI_PASSWORD" ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no -p "$PI_PORT" "$PI_USER@$PI_HOST" "echo 'SSH connection successful'"; then
        print_status "SSH connection successful ✓"
    else
        print_error "Failed to connect to Raspberry Pi. Please check:"
        print_error "  - IP address is correct"
        print_error "  - SSH is enabled on the Pi"
        print_error "  - Username and password are correct"
        print_error "  - Port is correct (default: 22)"
        exit 1
    fi
}

# Check if Pi is ready for deployment
check_pi_ready() {
    print_status "Checking if Raspberry Pi is ready for deployment..."

    # Check if Docker is installed
    if ! sshpass -p "$PI_PASSWORD" ssh -o StrictHostKeyChecking=no -p "$PI_PORT" "$PI_USER@$PI_HOST" "command -v docker" &> /dev/null; then
        print_warning "Docker is not installed on the Pi. Installing..."
        install_docker_on_pi
    else
        print_status "Docker is installed ✓"
    fi

    # Check if Docker Compose is installed
    if ! sshpass -p "$PI_PASSWORD" ssh -o StrictHostKeyChecking=no -p "$PI_PORT" "$PI_USER@$PI_HOST" "command -v docker-compose" &> /dev/null; then
        print_warning "Docker Compose is not installed on the Pi. Installing..."
        install_docker_compose_on_pi
    else
        print_status "Docker Compose is installed ✓"
    fi

    # Check if application directory exists
    if ! sshpass -p "$PI_PASSWORD" ssh -o StrictHostKeyChecking=no -p "$PI_PORT" "$PI_USER@$PI_HOST" "[ -d $PI_APP_DIR ]"; then
        print_status "Creating application directory on Pi..."
        sshpass -p "$PI_PASSWORD" ssh -o StrictHostKeyChecking=no -p "$PI_PORT" "$PI_USER@$PI_HOST" "mkdir -p $PI_APP_DIR"
    fi
}

# Install Docker on Pi
install_docker_on_pi() {
    print_status "Installing Docker on Raspberry Pi..."

    sshpass -p "$PI_PASSWORD" ssh -o StrictHostKeyChecking=no -p "$PI_PORT" "$PI_USER@$PI_HOST" << 'EOF'
        curl -fsSL https://get.docker.com -o get-docker.sh
        sudo sh get-docker.sh
        sudo usermod -aG docker $USER
        rm get-docker.sh
        echo "Docker installed successfully"
EOF

    print_status "Docker installation completed"
}

# Install Docker Compose on Pi
install_docker_compose_on_pi() {
    print_status "Installing Docker Compose on Raspberry Pi..."

    sshpass -p "$PI_PASSWORD" ssh -o StrictHostKeyChecking=no -p "$PI_PORT" "$PI_USER@$PI_HOST" << 'EOF'
        sudo apt update
        sudo apt install -y docker-compose
        echo "Docker Compose installed successfully"
EOF

    print_status "Docker Compose installation completed"
}

# Upload application files
upload_files() {
    print_status "Uploading application files to Raspberry Pi..."

    # Create a temporary directory for files to upload
    TEMP_DIR=$(mktemp -d)
    cp -r . "$TEMP_DIR/"

    # Remove unnecessary files
    rm -rf "$TEMP_DIR/.git"
    rm -rf "$TEMP_DIR/node_modules"
    rm -rf "$TEMP_DIR/backend/__pycache__"
    rm -rf "$TEMP_DIR/backend/app/__pycache__"
    rm -rf "$TEMP_DIR/backend/app/routers/__pycache__"
    rm -rf "$TEMP_DIR/backend/app/tests/__pycache__"

    # Upload files using rsync
    print_status "Syncing files to Pi..."
    sshpass -p "$PI_PASSWORD" rsync -avz --delete -e "ssh -o StrictHostKeyChecking=no -p $PI_PORT" "$TEMP_DIR/" "$PI_USER@$PI_HOST:$PI_APP_DIR/"

    # Clean up
    rm -rf "$TEMP_DIR"

    print_status "Files uploaded successfully ✓"
}

# Configure environment on Pi
configure_environment() {
    print_status "Configuring environment on Raspberry Pi..."

    # Get Pi's IP address for configuration
    PI_IP=$(sshpass -p "$PI_PASSWORD" ssh -o StrictHostKeyChecking=no -p "$PI_PORT" "$PI_USER@$PI_HOST" "hostname -I | awk '{print \$1}'")

    # Create .env file on Pi
    sshpass -p "$PI_PASSWORD" ssh -o StrictHostKeyChecking=no -p "$PI_PORT" "$PI_USER@$PI_HOST" << EOF
        cd $PI_APP_DIR
        cat > .env << 'ENVEOF'
# MongoDB Configuration
MONGODB_URI=${MONGODB_URI:-mongodb://localhost:27017}
DB_NAME=${DB_NAME:-minhmom}

# Frontend Configuration
VITE_API_BASE_URL=http://$PI_IP:8000
VITE_GROUP_ID=${VITE_GROUP_ID:-2847737995453663}

# Backend Configuration
IMAGES_BASE_PATH=/app/images
CORS_ORIGINS=http://$PI_IP:80,http://$PI_IP:3000,http://$PI_IP:5173
LOG_LEVEL=INFO

# Pi Configuration
PI_HOST=$PI_HOST
PI_USER=$PI_USER
PI_PASSWORD=$PI_PASSWORD
PI_PORT=$PI_PORT
PI_APP_DIR=$PI_APP_DIR
ENVEOF
        echo "Environment configured successfully"
EOF

    print_status "Environment configured ✓"
}

# Deploy application on Pi
deploy_on_pi() {
    print_status "Deploying application on Raspberry Pi..."

    sshpass -p "$PI_PASSWORD" ssh -o StrictHostKeyChecking=no -p "$PI_PORT" "$PI_USER@$PI_HOST" << 'EOF'
        cd ~/minhmom-app

        # Make deployment script executable
        chmod +x deploy-pi.sh

        # Stop existing containers
        docker-compose -f docker-compose.pi.yml down 2>/dev/null || true

        # Build and start services
        echo "Building and starting services..."
        docker-compose -f docker-compose.pi.yml up --build -d

        # Wait for services to be ready
        echo "Waiting for services to start..."
        sleep 15

        # Check if services are running
        if docker-compose -f docker-compose.pi.yml ps | grep -q "Up"; then
            echo "Application deployed successfully!"
        else
            echo "Deployment failed. Checking logs..."
            docker-compose -f docker-compose.pi.yml logs
            exit 1
        fi
EOF

    print_status "Application deployed on Raspberry Pi ✓"
}

# Check deployment status
check_deployment() {
    print_status "Checking deployment status..."

    # Get Pi's IP address
    PI_IP=$(sshpass -p "$PI_PASSWORD" ssh -o StrictHostKeyChecking=no -p "$PI_PORT" "$PI_USER@$PI_HOST" "hostname -I | awk '{print \$1}'")

    # Check backend health
    print_status "Checking backend health..."
    if sshpass -p "$PI_PASSWORD" ssh -o StrictHostKeyChecking=no -p "$PI_PORT" "$PI_USER@$PI_HOST" "curl -f http://localhost:8000/health" &> /dev/null; then
        print_status "Backend is healthy ✓"
    else
        print_warning "Backend health check failed"
    fi

    # Check frontend health
    print_status "Checking frontend health..."
    if sshpass -p "$PI_PASSWORD" ssh -o StrictHostKeyChecking=no -p "$PI_PORT" "$PI_USER@$PI_HOST" "curl -f http://localhost/health" &> /dev/null; then
        print_status "Frontend is healthy ✓"
    else
        print_warning "Frontend health check failed"
    fi

    # Show container status
    print_status "Container status:"
    sshpass -p "$PI_PASSWORD" ssh -o StrictHostKeyChecking=no -p "$PI_PORT" "$PI_USER@$PI_HOST" "cd $PI_APP_DIR && docker-compose -f docker-compose.pi.yml ps"

    print_status "Deployment completed!"
    print_pi "Frontend: http://$PI_IP"
    print_pi "Backend API: http://$PI_IP:8000"
    print_pi "API Documentation: http://$PI_IP:8000/docs"
}

# Show logs
show_logs() {
    print_status "Showing application logs..."
    sshpass -p "$PI_PASSWORD" ssh -o StrictHostKeyChecking=no -p "$PI_PORT" "$PI_USER@$PI_HOST" "cd $PI_APP_DIR && docker-compose -f docker-compose.pi.yml logs -f"
}

# Stop application
stop_application() {
    print_status "Stopping application on Raspberry Pi..."
    sshpass -p "$PI_PASSWORD" ssh -o StrictHostKeyChecking=no -p "$PI_PORT" "$PI_USER@$PI_HOST" "cd $PI_APP_DIR && docker-compose -f docker-compose.pi.yml down"
    print_status "Application stopped ✓"
}

# Restart application
restart_application() {
    print_status "Restarting application on Raspberry Pi..."
    sshpass -p "$PI_PASSWORD" ssh -o StrictHostKeyChecking=no -p "$PI_PORT" "$PI_USER@$PI_HOST" "cd $PI_APP_DIR && docker-compose -f docker-compose.pi.yml restart"
    print_status "Application restarted ✓"
}

# Update application
update_application() {
    print_status "Updating application on Raspberry Pi..."
    upload_files
    configure_environment
    deploy_on_pi
    check_deployment
}

# Main script logic
case "${1:-deploy}" in
    deploy)
        load_env
        check_tools
        test_connection
        check_pi_ready
        upload_files
        configure_environment
        deploy_on_pi
        check_deployment
        ;;
    logs)
        load_env
        show_logs
        ;;
    stop)
        load_env
        stop_application
        ;;
    restart)
        load_env
        restart_application
        ;;
    update)
        load_env
        update_application
        ;;
    status)
        load_env
        test_connection
        check_deployment
        ;;
    *)
        echo "Usage: $0 {deploy|logs|stop|restart|update|status}"
        echo ""
        echo "Commands:"
        echo "  deploy   - Deploy the application to Raspberry Pi (default)"
        echo "  logs     - Show application logs"
        echo "  stop     - Stop the application"
        echo "  restart  - Restart the application"
        echo "  update   - Update the application with latest code"
        echo "  status   - Check deployment status"
        echo ""
        echo "Required .env variables:"
        echo "  PI_HOST=192.168.1.100"
        echo "  PI_USER=pi"
        echo "  PI_PASSWORD=your_password"
        echo "  PI_PORT=22"
        echo "  MONGODB_URI=mongodb://localhost:27017"
        echo "  VITE_GROUP_ID=2847737995453663"
        exit 1
        ;;
esac

