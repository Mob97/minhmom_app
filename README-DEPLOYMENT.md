# MinhMom Application - Quick Deployment Guide

This is a quick start guide for deploying the MinhMom application. For detailed information, see [DEPLOYMENT.md](./DEPLOYMENT.md).

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose installed
- MongoDB running (external service)
- Git (to clone the repository)

### 1. Clone and Setup
```bash
git clone <your-repository-url>
cd application
cp env.example .env
```

### 2. Configure Environment
Edit `.env` file with your settings:
```env
# MongoDB Configuration
MONGODB_URI=mongodb://your-mongodb-host:27017
DB_NAME=minhmom

# Frontend Configuration
VITE_API_BASE_URL=http://localhost:8000
VITE_GROUP_ID=2847737995453663
```

### 3. Deploy
**Linux/macOS:**
```bash
chmod +x deploy.sh
./deploy.sh
```

**Windows:**
```cmd
deploy.bat
```

### 4. Access Application
- **Frontend**: http://localhost
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## 📁 Project Structure

```
application/
├── backend/                 # FastAPI backend
│   ├── Dockerfile          # Backend container config
│   ├── config.yaml         # Development config
│   ├── config.prod.yaml    # Production config
│   └── app/                # Application code
├── mm-frontend/            # React frontend
│   ├── Dockerfile          # Frontend container config
│   ├── nginx.conf          # Nginx configuration
│   └── src/
│       └── config/         # Frontend configuration
├── docker-compose.yml      # Multi-container setup
├── deploy.sh              # Linux/macOS deployment script
├── deploy.bat             # Windows deployment script
├── env.example            # Environment variables template
└── DEPLOYMENT.md          # Detailed deployment guide
```

## 🔧 Configuration

### Backend Configuration
The backend supports both YAML configuration files and environment variables:

**Environment Variables (Priority):**
- `MONGODB_URI`: MongoDB connection string
- `DB_NAME`: Database name
- `DEFAULT_GROUP_ID`: Default group ID
- `IMAGES_BASE_PATH`: Path for image storage
- `CORS_ORIGINS`: Comma-separated CORS origins
- `LOG_LEVEL`: Logging level

**YAML Configuration:**
- `config.yaml`: Development settings
- `config.prod.yaml`: Production settings

### Frontend Configuration
The frontend uses environment variables and a centralized config file:

**Environment Variables:**
- `VITE_API_BASE_URL`: Backend API URL
- `VITE_GROUP_ID`: Default group ID

**Config File:**
- `src/config/app-config.ts`: Centralized configuration

## 🐳 Docker Services

### Backend Service
- **Image**: Custom FastAPI application
- **Port**: 8000
- **Health Check**: `/health` endpoint
- **Volumes**: Image storage, configuration files

### Frontend Service
- **Image**: Nginx serving React app
- **Port**: 80
- **Health Check**: `/health` endpoint
- **Features**: Gzip compression, static asset caching

## 📊 Monitoring

### Health Checks
```bash
# Check backend health
curl http://localhost:8000/health

# Check frontend health
curl http://localhost/health
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Container Status
```bash
docker-compose ps
```

## 🔄 Common Operations

### Restart Application
```bash
# Using scripts
./deploy.sh restart    # Linux/macOS
deploy.bat restart     # Windows

# Using docker-compose
docker-compose restart
```

### Update Application
```bash
git pull origin main
docker-compose down
docker-compose up --build -d
```

### Stop Application
```bash
# Using scripts
./deploy.sh stop       # Linux/macOS
deploy.bat stop        # Windows

# Using docker-compose
docker-compose down
```

## 🛠️ Troubleshooting

### Port Already in Use
```bash
# Find process using port
sudo netstat -tulpn | grep :8000
sudo netstat -tulpn | grep :80

# Kill process
sudo kill -9 <PID>
```

### MongoDB Connection Issues
1. Verify MongoDB is running
2. Check connection string format
3. Ensure network connectivity
4. Check firewall settings

### Image Upload Issues
1. Check directory permissions
2. Verify disk space
3. Check file size limits

### Frontend Not Loading
1. Check backend health
2. Verify CORS configuration
3. Check browser console for errors

## 🔒 Security Notes

- Never commit `.env` files
- Use strong passwords for MongoDB
- Configure firewall rules
- Keep Docker images updated
- Monitor application logs

## 📚 Additional Resources

- [Detailed Deployment Guide](./DEPLOYMENT.md)
- [Docker Documentation](https://docs.docker.com/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)

## 🆘 Support

If you encounter issues:

1. Check the troubleshooting section
2. Review application logs
3. Check GitHub issues
4. Contact the development team

---

**Happy Deploying! 🎉**
