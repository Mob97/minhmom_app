# Remote Raspberry Pi Deployment Guide

This guide shows you how to deploy your MinhMom application to a remote Raspberry Pi using SSH, without physically accessing the Pi.

## 🚀 **Quick Start (5 minutes)**

### 1. **Setup Environment File**
```bash
# Copy the example environment file
cp env.pi.example .env

# Edit with your Pi's details
nano .env
```

### 2. **Configure Pi Connection**
Edit `.env` with your Pi's details:
```env
# Raspberry Pi Connection Details
PI_HOST=192.168.1.100          # Your Pi's IP address
PI_USER=pi                     # SSH username
PI_PASSWORD=your_password      # SSH password
PI_PORT=22                     # SSH port (default: 22)

# Application Configuration
MONGODB_URI=mongodb://localhost:27017
VITE_GROUP_ID=2847737995453663
```

### 3. **Deploy Application**
```bash
# Linux/macOS
chmod +x deploy-remote-pi.sh
./deploy-remote-pi.sh

# Windows
deploy-remote-pi.bat
```

### 4. **Access Your Application**
- **Frontend**: http://192.168.1.100
- **Backend API**: http://192.168.1.100:8000
- **API Documentation**: http://192.168.1.100:8000/docs

## 📋 **Prerequisites**

### **On Your Local Machine:**
- **sshpass** - For password-based SSH authentication
- **rsync** - For efficient file synchronization
- **Git** - For version control

### **On Raspberry Pi:**
- **Raspberry Pi OS** (or compatible Linux)
- **SSH enabled** - `sudo systemctl enable ssh`
- **Internet connection** - For downloading Docker images

## 🔧 **Installation Requirements**

### **Linux/macOS:**
```bash
# Install sshpass
# Ubuntu/Debian
sudo apt-get install sshpass rsync

# macOS (with Homebrew)
brew install hudochenkov/sshpass/sshpass
brew install rsync

# CentOS/RHEL
sudo yum install sshpass rsync
```

### **Windows:**
```cmd
# Install via Chocolatey
choco install sshpass rsync

# Or download manually:
# sshpass: https://sourceforge.net/projects/sshpass/
# rsync: https://rsync.samba.org/download.html
```

## 📁 **File Structure**

```
application/
├── deploy-remote-pi.sh      # Linux/macOS deployment script
├── deploy-remote-pi.bat     # Windows deployment script
├── env.pi.example           # Environment variables template
├── docker-compose.pi.yml    # Pi-specific Docker Compose
├── backend/
│   └── Dockerfile.arm64     # ARM64 Dockerfile for backend
├── mm-frontend/
│   └── Dockerfile.arm64     # ARM64 Dockerfile for frontend
└── REMOTE_PI_DEPLOYMENT.md  # This guide
```

## 🛠️ **Script Commands**

### **Deploy Application**
```bash
# Full deployment (default)
./deploy-remote-pi.sh deploy

# Or simply
./deploy-remote-pi.sh
```

### **Manage Application**
```bash
# View logs
./deploy-remote-pi.sh logs

# Stop application
./deploy-remote-pi.sh stop

# Restart application
./deploy-remote-pi.sh restart

# Update application
./deploy-remote-pi.sh update

# Check status
./deploy-remote-pi.sh status
```

## 🔍 **What the Script Does**

### **1. Environment Setup**
- Loads configuration from `.env` file
- Validates required tools (sshpass, rsync)
- Tests SSH connection to Pi

### **2. Pi Preparation**
- Installs Docker if not present
- Installs Docker Compose if not present
- Creates application directory
- Optimizes system for Docker

### **3. File Upload**
- Syncs application files to Pi
- Excludes unnecessary files (node_modules, __pycache__, .git)
- Uses rsync for efficient transfer

### **4. Configuration**
- Creates `.env` file on Pi with correct IP addresses
- Configures CORS origins for Pi's IP
- Sets up environment variables

### **5. Deployment**
- Builds ARM64 Docker images
- Starts application containers
- Performs health checks
- Shows access URLs

## 🌐 **Network Configuration**

### **Port Requirements**
- **Port 22** - SSH access
- **Port 80** - Frontend (HTTP)
- **Port 8000** - Backend API

### **Firewall Setup**
```bash
# On Raspberry Pi
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 8000
sudo ufw enable
```

### **Router Configuration**
Configure port forwarding on your router:
- **Port 80** → Pi IP (for frontend)
- **Port 8000** → Pi IP (for backend API)

## 🔒 **Security Considerations**

### **SSH Security**
```bash
# On Raspberry Pi, configure SSH
sudo nano /etc/ssh/sshd_config

# Recommended settings:
PermitRootLogin no
PasswordAuthentication yes
PubkeyAuthentication yes
```

### **Application Security**
- Use strong passwords in `.env`
- Regularly update Pi's OS
- Monitor application logs
- Use HTTPS in production

## 📊 **Monitoring and Maintenance**

### **Check Application Status**
```bash
# View container status
./deploy-remote-pi.sh status

# View logs
./deploy-remote-pi.sh logs

# Check Pi resources
sshpass -p "password" ssh pi@192.168.1.100 "htop"
```

### **Update Application**
```bash
# Update with latest code
./deploy-remote-pi.sh update

# Or manually
git pull origin main
./deploy-remote-pi.sh deploy
```

### **Backup Strategy**
```bash
# Backup database
sshpass -p "password" ssh pi@192.168.1.100 "mongodump --db=minhmom --out=~/backup/"

# Backup images
sshpass -p "password" ssh pi@192.168.1.100 "tar -czf ~/backup/images.tar.gz ~/minhmom-app/backend/images/"
```

## 🚨 **Troubleshooting**

### **Common Issues**

#### **1. SSH Connection Failed**
```bash
# Check Pi's IP address
ping 192.168.1.100

# Check SSH service
sshpass -p "password" ssh pi@192.168.1.100 "sudo systemctl status ssh"

# Enable SSH if needed
sshpass -p "password" ssh pi@192.168.1.100 "sudo systemctl enable ssh"
```

#### **2. Docker Installation Failed**
```bash
# Check Pi's architecture
sshpass -p "password" ssh pi@192.168.1.100 "uname -m"

# Check available memory
sshpass -p "password" ssh pi@192.168.1.100 "free -h"

# Check disk space
sshpass -p "password" ssh pi@192.168.1.100 "df -h"
```

#### **3. Application Won't Start**
```bash
# Check container logs
./deploy-remote-pi.sh logs

# Check Pi resources
sshpass -p "password" ssh pi@192.168.1.100 "docker stats"

# Restart application
./deploy-remote-pi.sh restart
```

#### **4. Can't Access from Other Devices**
```bash
# Check Pi's IP address
sshpass -p "password" ssh pi@192.168.1.100 "hostname -I"

# Check if services are running
sshpass -p "password" ssh pi@192.168.1.100 "netstat -tulpn | grep :80"
sshpass -p "password" ssh pi@192.168.1.100 "netstat -tulpn | grep :8000"

# Check firewall
sshpass -p "password" ssh pi@192.168.1.100 "sudo ufw status"
```

### **Debug Commands**
```bash
# Test SSH connection
sshpass -p "password" ssh pi@192.168.1.100 "echo 'SSH working'"

# Check Pi system info
sshpass -p "password" ssh pi@192.168.1.100 "uname -a && free -h && df -h"

# Check Docker status
sshpass -p "password" ssh pi@192.168.1.100 "docker --version && docker-compose --version"

# Check application directory
sshpass -p "password" ssh pi@192.168.1.100 "ls -la ~/minhmom-app/"
```

## 💡 **Pro Tips**

### **1. Use SSH Keys (Optional)**
```bash
# Generate SSH key
ssh-keygen -t rsa -b 4096

# Copy to Pi
ssh-copy-id pi@192.168.1.100

# Update script to use key instead of password
```

### **2. Set Static IP**
```bash
# On Raspberry Pi
sudo nano /etc/dhcpcd.conf

# Add:
# interface eth0
# static ip_address=192.168.1.100/24
# static routers=192.168.1.1
# static domain_name_servers=8.8.8.8 8.8.4.4
```

### **3. Enable Wake on LAN**
```bash
# For remote power management
sudo nano /boot/config.txt
# Add: dtoverlay=w1-gpio
```

### **4. Use External Storage**
```bash
# Mount external USB drive for better performance
sudo mkdir /mnt/usb
sudo mount /dev/sda1 /mnt/usb
# Update docker-compose.yml to use /mnt/usb/images
```

## 📈 **Performance Optimization**

### **Pi Optimization**
```bash
# Increase GPU memory
sudo nano /boot/config.txt
# Add: gpu_mem=128

# Overclock (optional)
# Add: arm_freq=1800
# Add: over_voltage=2
```

### **Docker Optimization**
```bash
# Limit container resources
# Edit docker-compose.pi.yml to add:
# deploy:
#   resources:
#     limits:
#       memory: 1G
#       cpus: '0.5'
```

## 🎯 **Production Deployment**

### **For Production Use:**
1. **Use HTTPS** - Set up SSL certificates
2. **Domain name** - Configure DNS pointing to your Pi
3. **Monitoring** - Set up proper monitoring and alerting
4. **Backups** - Implement automated backup strategy
5. **Updates** - Set up automated security updates
6. **Firewall** - Configure proper firewall rules

### **Example Production Setup:**
```bash
# Install Nginx reverse proxy
sudo apt install nginx

# Configure SSL with Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com

# Set up monitoring
sudo apt install htop iotop nethogs
```

## 🆘 **Support**

If you encounter issues:

1. **Check the troubleshooting section** above
2. **Review application logs** using `./deploy-remote-pi.sh logs`
3. **Verify Pi connectivity** and resources
4. **Check Docker status** on the Pi
5. **Contact support** with specific error messages

---

**Happy Remote Deploying! 🍓✨**

Your MinhMom application can now be deployed to any Raspberry Pi on your network with just a few commands!
