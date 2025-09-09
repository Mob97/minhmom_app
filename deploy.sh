#!/bin/bash

# MinhMom Application Deployment Script
# This script helps deploy the MinhMom application using Docker

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
}

# Check if .env file exists
check_env() {
    if [ ! -f .env ]; then
        print_warning ".env file not found. Creating from example..."
        cp env.example .env
        print_warning "Please edit .env file with your configuration before running again."
        exit 1
    fi
}

# Build and start services
deploy() {
    print_status "Starting MinhMom application deployment..."

    # Stop existing containers
    print_status "Stopping existing containers..."
    docker-compose down

    # Build and start services
    print_status "Building and starting services..."
    docker-compose up --build -d

    # Wait for services to be healthy
    print_status "Waiting for services to be ready..."
    sleep 10

    # Check service health
    print_status "Checking service health..."

    # Check backend health
    if curl -f http://localhost:8000/health &> /dev/null; then
        print_status "Backend is healthy ✓"
    else
        print_error "Backend health check failed"
        docker-compose logs backend
        exit 1
    fi

    # Check frontend health
    if curl -f http://localhost/health &> /dev/null; then
        print_status "Frontend is healthy ✓"
    else
        print_error "Frontend health check failed"
        docker-compose logs frontend
        exit 1
    fi

    print_status "Deployment completed successfully!"
    print_status "Frontend: http://localhost"
    print_status "Backend API: http://localhost:8000"
    print_status "API Documentation: http://localhost:8000/docs"
}

# Stop services
stop() {
    print_status "Stopping MinhMom application..."
    docker-compose down
    print_status "Application stopped."
}

# Show logs
logs() {
    docker-compose logs -f
}

# Show status
status() {
    docker-compose ps
}

# Main script logic
case "${1:-deploy}" in
    deploy)
        check_docker
        check_env
        deploy
        ;;
    stop)
        stop
        ;;
    logs)
        logs
        ;;
    status)
        status
        ;;
    restart)
        stop
        sleep 2
        check_docker
        check_env
        deploy
        ;;
    *)
        echo "Usage: $0 {deploy|stop|logs|status|restart}"
        echo ""
        echo "Commands:"
        echo "  deploy   - Build and start the application (default)"
        echo "  stop     - Stop the application"
        echo "  logs     - Show application logs"
        echo "  status   - Show container status"
        echo "  restart  - Restart the application"
        exit 1
        ;;
esac
