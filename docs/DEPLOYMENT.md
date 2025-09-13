# MinhMom Application Deployment Guide

This guide provides comprehensive instructions for deploying the MinhMom application, including both backend and frontend components.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Configuration](#configuration)
4. [Deployment Options](#deployment-options)
5. [Production Deployment](#production-deployment)
6. [Monitoring and Maintenance](#monitoring-and-maintenance)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software

- **Docker** (version 20.10 or higher)
- **Docker Compose** (version 2.0 or higher)
- **MongoDB** (version 4.4 or higher) - External service
- **Git** (for cloning the repository)

### System Requirements

- **CPU**: 2 cores minimum, 4 cores recommended
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 10GB free space minimum
- **Network**: Internet connection for pulling Docker images

## Architecture Overview

The MinhMom application consists of:

1. **Backend Service** (FastAPI)
   - REST API server
   - Image serving
   - Authentication
   - Database operations

2. **Frontend Service** (React + Vite)
   - User interface
   - API client
   - State management

3. **External MongoDB**
   - Database service (not containerized)
   - Accessible from multiple services

4. **Image Storage**
   - Local file system storage
   - Organized by posts and comments

## Configuration

### 1. Environment Variables

Copy the example environment file and configure it:

```bash
cp env.example .env
```

Edit `.env` with your configuration:

```env
# MongoDB Configuration
MONGODB_URI=mongodb://your-mongodb-host:27017
DB_NAME=minhmom

# Frontend Configuration
VITE_API_BASE_URL=http://localhost:8000
VITE_GROUP_ID=2847737995453663

# Production URLs (update these for production)
# VITE_API_BASE_URL=https://api.yourdomain.com
# VITE_GROUP_ID=your-actual-group-id
```

### 2. Backend Configuration

The backend uses `config.prod.yaml` for production settings:

```yaml
database:
  mongodb_uri: "mongodb://your-mongodb-host:27017"
  db_name: "minhmom"
  default_group_id: null

images:
  base_path: "/app/images"
  posts_dir: "posts"
  comments_dir: "comments"
  allowed_extensions: [".jpg", ".jpeg", ".png", ".gif", ".webp"]
  max_file_size_mb: 10

api:
  title: "MinhMom Backend"
  version: "0.1.0"
  cors_origins:
    - "https://your-frontend-domain.com"
    - "https://www.your-frontend-domain.com"
```

### 3. Frontend Configuration

The frontend configuration is managed through environment variables and the `src/config/app-config.ts` file.

## Deployment Options

### Option 1: Quick Deployment (Recommended)

Use the provided deployment scripts:

**Linux/macOS:**
```bash
chmod +x deploy.sh
./deploy.sh
```

**Windows:**
```cmd
deploy.bat
```

### Option 2: Manual Docker Compose

1. **Start the services:**
   ```bash
   docker-compose up -d
   ```

2. **Check status:**
   ```bash
   docker-compose ps
   ```

3. **View logs:**
   ```bash
   docker-compose logs -f
   ```

4. **Stop services:**
   ```bash
   docker-compose down
   ```

### Option 3: Individual Container Deployment

#### Backend Only

```bash
# Build backend image
docker build -t minhmom-backend ./backend

# Run backend container
docker run -d \
  --name minhmom-backend \
  -p 8000:8000 \
  -v $(pwd)/backend/images:/app/images \
  -v $(pwd)/backend/config.prod.yaml:/app/config.yaml \
  -e MONGODB_URI=mongodb://your-mongodb-host:27017 \
  minhmom-backend
```

#### Frontend Only

```bash
# Build frontend image
docker build -t minhmom-frontend ./mm-frontend

# Run frontend container
docker run -d \
  --name minhmom-frontend \
  -p 80:80 \
  -e VITE_API_BASE_URL=http://your-backend-host:8000 \
  -e VITE_GROUP_ID=your-group-id \
  minhmom-frontend
```

## Production Deployment

### 1. Server Setup

#### Ubuntu/Debian Server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout and login to apply docker group changes
```

#### CentOS/RHEL Server

```bash
# Update system
sudo yum update -y

# Install Docker
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo yum install -y docker-ce docker-ce-cli containerd.io
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. MongoDB Setup

#### Option A: MongoDB Atlas (Cloud)

1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Get connection string
4. Update `MONGODB_URI` in `.env`

#### Option B: Self-hosted MongoDB

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
```

### 3. Application Deployment

1. **Clone repository:**
   ```bash
   git clone <your-repository-url>
   cd application
   ```

2. **Configure environment:**
   ```bash
   cp env.example .env
   nano .env  # Edit with your production values
   ```

3. **Deploy application:**
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```

### 4. Reverse Proxy Setup (Optional)

#### Nginx Configuration

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 5. SSL Certificate (Optional)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com
```

## Monitoring and Maintenance

### Health Checks

The application includes built-in health checks:

- **Backend**: `http://localhost:8000/health`
- **Frontend**: `http://localhost/health`

### Log Management

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend

# View logs with timestamps
docker-compose logs -f -t
```

### Backup Strategy

1. **Database Backup:**
   ```bash
   # MongoDB backup
   mongodump --uri="mongodb://your-mongodb-host:27017" --db=minhmom --out=/backup/mongodb/
   ```

2. **Image Backup:**
   ```bash
   # Backup images directory
   tar -czf images-backup-$(date +%Y%m%d).tar.gz backend/images/
   ```

### Updates

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose up --build -d
```

## Troubleshooting

### Common Issues

#### 1. Port Already in Use

```bash
# Check what's using the port
sudo netstat -tulpn | grep :8000
sudo netstat -tulpn | grep :80

# Kill the process
sudo kill -9 <PID>
```

#### 2. MongoDB Connection Issues

- Verify MongoDB is running: `sudo systemctl status mongod`
- Check connection string format
- Ensure firewall allows MongoDB port (27017)
- Verify network connectivity

#### 3. Image Upload Issues

- Check directory permissions: `ls -la backend/images/`
- Verify disk space: `df -h`
- Check file size limits in configuration

#### 4. Frontend Not Loading

- Check if backend is running: `curl http://localhost:8000/health`
- Verify CORS configuration
- Check browser console for errors

### Debug Commands

```bash
# Check container status
docker-compose ps

# Check container logs
docker-compose logs backend
docker-compose logs frontend

# Execute commands in container
docker-compose exec backend bash
docker-compose exec frontend sh

# Check resource usage
docker stats

# Check network connectivity
docker-compose exec backend ping your-mongodb-host
```

### Performance Optimization

1. **Enable Gzip compression** (already configured in nginx.conf)
2. **Set up Redis caching** (optional)
3. **Use CDN for static assets** (optional)
4. **Optimize database queries**
5. **Implement database indexing**

## Security Considerations

1. **Firewall Configuration:**
   ```bash
   # Allow only necessary ports
   sudo ufw allow 22    # SSH
   sudo ufw allow 80    # HTTP
   sudo ufw allow 443   # HTTPS
   sudo ufw enable
   ```

2. **Environment Variables:**
   - Never commit `.env` files
   - Use strong passwords
   - Rotate secrets regularly

3. **Database Security:**
   - Enable authentication
   - Use SSL connections
   - Regular security updates

4. **Application Security:**
   - Keep Docker images updated
   - Regular security scans
   - Monitor logs for suspicious activity

## Support

For additional support or questions:

1. Check the troubleshooting section
2. Review application logs
3. Check GitHub issues
4. Contact the development team

---

**Note**: This deployment guide assumes basic knowledge of Docker, Linux system administration, and web application deployment. For production environments, consider additional security measures and monitoring solutions.
