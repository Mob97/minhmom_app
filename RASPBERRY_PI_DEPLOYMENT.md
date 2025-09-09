# MinhMom Application - Raspberry Pi Deployment Guide

Deploying your MinhMom application on a Raspberry Pi is an excellent choice for cost-effective, energy-efficient hosting. This guide covers everything you need to know.

## 🍓 **Why Raspberry Pi for MinhMom?**

### Advantages:
- **Low cost** - $35-75 for the Pi + accessories
- **Low power consumption** - ~5W vs 50W+ for traditional servers
- **Full control** - Complete ownership of your data and infrastructure
- **Perfect for small to medium applications** - Ideal for your use case
- **Learning opportunity** - Great for understanding deployment
- **Silent operation** - No noisy fans

### Considerations:
- **Limited resources** - Need to optimize for Pi's constraints
- **ARM architecture** - Some Docker images may need ARM versions
- **Network dependent** - Relies on stable internet connection

## 📋 **Hardware Requirements**

### Minimum Setup:
- **Raspberry Pi 4** (4GB RAM) - $55
- **32GB+ microSD card** (Class 10) - $10
- **Power supply** (5V 3A) - $10
- **Case with cooling** - $15
- **Ethernet cable** - $5

### Recommended Setup:
- **Raspberry Pi 4** (8GB RAM) - $75
- **64GB+ microSD card** (Class 10) - $15
- **Power supply** (5V 3A) - $10
- **Case with active cooling** - $25
- **Ethernet cable** - $5
- **External SSD** (optional, for better performance) - $30

**Total Cost: ~$100-160**

## 🚀 **Quick Start (30 minutes)**

### 1. Prepare Raspberry Pi OS

```bash
# Download Raspberry Pi Imager
# https://www.raspberrypi.org/downloads/

# Flash OS to microSD card with:
# - Enable SSH
# - Set username/password
# - Configure WiFi (optional)
# - Set hostname: minhmom-server
```

### 2. Initial Setup

```bash
# SSH into your Pi
ssh pi@minhmom-server.local
# or
ssh pi@<pi-ip-address>

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker pi

# Install Docker Compose
sudo apt install docker-compose -y

# Reboot to apply changes
sudo reboot
```

### 3. Deploy Application

```bash
# Clone your repository
git clone <your-repository-url>
cd application

# Configure environment
cp env.example .env
nano .env  # Edit with your settings

# Deploy
chmod +x deploy.sh
./deploy.sh
```

## 🔧 **Detailed Setup Guide**

### Step 1: Raspberry Pi OS Installation

1. **Download Raspberry Pi Imager**
   - Go to https://www.raspberrypi.org/downloads/
   - Download for your operating system

2. **Flash OS Image**
   - Insert microSD card
   - Open Raspberry Pi Imager
   - Choose "Raspberry Pi OS Lite (64-bit)" for better performance
   - Click gear icon for advanced options:
     - Enable SSH
     - Set username: `pi`
     - Set password
     - Configure WiFi (optional)
     - Set hostname: `minhmom-server`

3. **Boot and Connect**
   ```bash
   # Find Pi on network
   nmap -sn 192.168.1.0/24 | grep -B2 -A2 "Raspberry Pi"

   # SSH into Pi
   ssh pi@minhmom-server.local
   # or
   ssh pi@<pi-ip-address>
   ```

### Step 2: System Optimization

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget git vim htop

# Increase swap space (for better performance)
sudo dphys-swapfile swapoff
sudo nano /etc/dphys-swapfile
# Change CONF_SWAPSIZE=100 to CONF_SWAPSIZE=2048
sudo dphys-swapfile setup
sudo dphys-swapfile swapon

# Optimize for Docker
echo 'vm.max_map_count=262144' | sudo tee -a /etc/sysctl.conf
echo 'fs.file-max=65536' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Set up log rotation
sudo nano /etc/logrotate.d/docker
# Add:
# /var/lib/docker/containers/*/*.log {
#   rotate 7
#   daily
#   compress
#   size=1M
#   missingok
#   delaycompress
#   copytruncate
# }
```

### Step 3: Docker Installation

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker pi

# Install Docker Compose
sudo apt install docker-compose -y

# Verify installation
docker --version
docker-compose --version

# Test Docker
docker run hello-world
```

### Step 4: MongoDB Setup

#### Option A: External MongoDB (Recommended)
```bash
# Use MongoDB Atlas (cloud)
# Or install MongoDB on another server
# Update MONGODB_URI in .env file
```

#### Option B: Local MongoDB (for testing)
```bash
# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Configure MongoDB
sudo nano /etc/mongod.conf
# Set bindIp to 0.0.0.0 for external access
```

### Step 5: Application Deployment

```bash
# Clone repository
git clone <your-repository-url>
cd application

# Configure environment
cp env.example .env
nano .env

# Edit .env with your settings:
# MONGODB_URI=mongodb://localhost:27017
# VITE_API_BASE_URL=http://<pi-ip>:8000
# VITE_GROUP_ID=your-group-id

# Deploy application
chmod +x deploy.sh
./deploy.sh
```

## 🐳 **Docker Configuration for Raspberry Pi**

### Updated docker-compose.yml for Pi

```yaml
version: '3.8'

services:
  # Backend service
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.arm64  # ARM-specific Dockerfile
    container_name: minhmom-backend
    ports:
      - "8000:8000"
    volumes:
      - ./backend/images:/app/images
      - ./backend/config.prod.yaml:/app/config.yaml
    environment:
      - MONGODB_URI=${MONGODB_URI:-mongodb://localhost:27017}
      - DB_NAME=${DB_NAME:-minhmom}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - minhmom-network

  # Frontend service
  frontend:
    build:
      context: ./mm-frontend
      dockerfile: Dockerfile.arm64  # ARM-specific Dockerfile
    container_name: minhmom-frontend
    ports:
      - "80:80"
    environment:
      - VITE_API_BASE_URL=${VITE_API_BASE_URL:-http://localhost:8000}
      - VITE_GROUP_ID=${VITE_GROUP_ID:-2847737995453663}
    restart: unless-stopped
    depends_on:
      - backend
    networks:
      - minhmom-network

networks:
  minhmom-network:
    driver: bridge

volumes:
  images:
    driver: local
```

### ARM64 Dockerfiles

#### Backend Dockerfile.arm64
```dockerfile
# Use Python 3.11 slim image for ARM64
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create directory for images
RUN mkdir -p /app/images/posts /app/images/comments

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### Frontend Dockerfile.arm64
```dockerfile
# Multi-stage build for React app on ARM64
FROM node:18-alpine as build

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
```

## 🔧 **Performance Optimization for Pi**

### 1. System Optimizations

```bash
# Increase GPU memory split
sudo nano /boot/config.txt
# Add: gpu_mem=128

# Optimize for performance
sudo nano /boot/config.txt
# Add:
# arm_freq=1800
# over_voltage=2
# gpu_mem=128
# dtparam=sd_overclock=100

# Enable hardware acceleration
sudo nano /boot/config.txt
# Add: dtoverlay=vc4-kms-v3d
```

### 2. Docker Optimizations

```bash
# Limit Docker resources
sudo nano /etc/docker/daemon.json
# Add:
{
  "default-runtime": "runc",
  "runtimes": {
    "runc": {
      "path": "runc"
    }
  },
  "storage-driver": "overlay2",
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}

# Restart Docker
sudo systemctl restart docker
```

### 3. Application Optimizations

```bash
# Reduce image quality for faster loading
# Edit backend/config.prod.yaml
images:
  max_file_size_mb: 5  # Reduce from 10
  allowed_extensions: [".jpg", ".jpeg", ".png"]  # Remove .gif, .webp

# Enable gzip compression
# Already configured in nginx.conf
```

## 🌐 **Network Configuration**

### 1. Static IP Setup

```bash
# Configure static IP
sudo nano /etc/dhcpcd.conf
# Add:
# interface eth0
# static ip_address=192.168.1.100/24
# static routers=192.168.1.1
# static domain_name_servers=8.8.8.8 8.8.4.4

# Restart networking
sudo systemctl restart dhcpcd
```

### 2. Port Forwarding

Configure your router to forward ports:
- **Port 80** → Pi IP (for frontend)
- **Port 8000** → Pi IP (for backend API)
- **Port 22** → Pi IP (for SSH access)

### 3. Dynamic DNS (Optional)

```bash
# Install ddclient for dynamic DNS
sudo apt install ddclient -y

# Configure for your DNS provider
sudo nano /etc/ddclient.conf
```

## 📊 **Monitoring and Maintenance**

### 1. System Monitoring

```bash
# Install monitoring tools
sudo apt install htop iotop nethogs -y

# Check system resources
htop
df -h
free -h
```

### 2. Application Monitoring

```bash
# Check container status
docker-compose ps

# View logs
docker-compose logs -f

# Check application health
curl http://localhost:8000/health
curl http://localhost/health
```

### 3. Automated Backups

```bash
# Create backup script
nano backup.sh
# Add:
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/pi/backups"
mkdir -p $BACKUP_DIR

# Backup database
mongodump --uri="mongodb://localhost:27017" --db=minhmom --out=$BACKUP_DIR/mongodb_$DATE

# Backup images
tar -czf $BACKUP_DIR/images_$DATE.tar.gz backend/images/

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
find $BACKUP_DIR -name "mongodb_*" -mtime +7 -exec rm -rf {} \;

# Make executable
chmod +x backup.sh

# Add to crontab
crontab -e
# Add: 0 2 * * * /home/pi/application/backup.sh
```

## 🔒 **Security Configuration**

### 1. Firewall Setup

```bash
# Install UFW
sudo apt install ufw -y

# Configure firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 8000
sudo ufw enable
```

### 2. SSH Security

```bash
# Disable root login
sudo nano /etc/ssh/sshd_config
# Set: PermitRootLogin no

# Use key-based authentication
ssh-keygen -t rsa -b 4096
ssh-copy-id pi@minhmom-server

# Restart SSH
sudo systemctl restart ssh
```

### 3. Application Security

```bash
# Update environment variables
nano .env
# Use strong passwords and unique group IDs

# Regular updates
sudo apt update && sudo apt upgrade -y
docker-compose pull
docker-compose up -d
```

## 🚨 **Troubleshooting**

### Common Issues

1. **Out of Memory**
   ```bash
   # Check memory usage
   free -h

   # Increase swap
   sudo dphys-swapfile swapoff
   sudo nano /etc/dphys-swapfile
   # Increase CONF_SWAPSIZE
   sudo dphys-swapfile setup
   sudo dphys-swapfile swapon
   ```

2. **Slow Performance**
   ```bash
   # Check CPU temperature
   vcgencmd measure_temp

   # Check disk usage
   df -h

   # Optimize Docker
   docker system prune -a
   ```

3. **Network Issues**
   ```bash
   # Check network connectivity
   ping google.com

   # Check port status
   sudo netstat -tulpn | grep :80
   sudo netstat -tulpn | grep :8000
   ```

4. **Container Issues**
   ```bash
   # Check container logs
   docker-compose logs backend
   docker-compose logs frontend

   # Restart containers
   docker-compose restart
   ```

## 📈 **Scaling Considerations**

### When to Upgrade

- **RAM usage > 80%** consistently
- **CPU usage > 90%** consistently
- **Disk I/O** bottlenecks
- **Network** bandwidth limits

### Upgrade Options

1. **Raspberry Pi 5** (when available)
2. **External SSD** for better I/O
3. **More RAM** (8GB model)
4. **Load balancer** with multiple Pis

## 💡 **Pro Tips**

1. **Use external SSD** for better performance
2. **Enable GPU memory split** for better graphics
3. **Monitor temperature** to prevent throttling
4. **Regular backups** are essential
5. **Keep system updated** for security
6. **Use static IP** for reliable access
7. **Configure log rotation** to prevent disk full

## 🎯 **Final Checklist**

- [ ] Raspberry Pi 4 (4GB+ RAM) set up
- [ ] Raspberry Pi OS installed and configured
- [ ] Docker and Docker Compose installed
- [ ] MongoDB configured (external or local)
- [ ] Application deployed and running
- [ ] Network access configured
- [ ] Monitoring and backups set up
- [ ] Security measures implemented

Your MinhMom application is now running on a cost-effective, energy-efficient Raspberry Pi! 🍓✨
