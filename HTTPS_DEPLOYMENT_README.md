# 🚀 MinhMom HTTPS Deployment - Complete Guide

## **Single Script Deployment**

Everything is now consolidated into one comprehensive script that handles all HTTPS deployment needs.

### **🚀 Quick Start**

```bash
# 1. Configure your environment
cp env.minhmom-ddns.example .env
nano .env

# 2. Deploy with HTTPS (one command does everything!)
./deploy-pi.sh deploy https
```

### **📋 What the Script Does**

The `deploy-https-complete.sh` script automatically:

1. ✅ **Checks system requirements** (Raspberry Pi, memory, disk space)
2. ✅ **Installs Docker** if not present
3. ✅ **Validates environment configuration**
4. ✅ **Creates SSL certificates** (self-signed initially)
5. ✅ **Optimizes system** for Docker on Raspberry Pi
6. ✅ **Deploys the application** with HTTPS support
7. ✅ **Waits for services** to be ready
8. ✅ **Attempts Let's Encrypt** certificate generation
9. ✅ **Configures firewall** (ports 80, 443)
10. ✅ **Shows final status** and access URLs

### **🔧 Environment Configuration**

Edit your `.env` file with these settings:

```env
# No-IP Dynamic DNS Configuration
SSL_DOMAIN=minhmom.ddns.net
SSL_EMAIL=your-email@example.com

# MongoDB Configuration
MONGODB_URI=mongodb://your-mongodb-host:27017
DB_NAME=minhmom

# Frontend Configuration
VITE_API_BASE_URL=https://minhmom.ddns.net/api
VITE_GROUP_ID=2847737995453663
```

### **📱 Access Your App**

After deployment, your MinhMom app will be accessible at:

- **Frontend:** https://minhmom.ddns.net
- **Backend API:** https://minhmom.ddns.net/api
- **API Documentation:** https://minhmom.ddns.net/api/docs

### **🔧 Management Commands**

```bash
# Check status
./deploy-pi.sh status https

# View logs
./deploy-pi.sh logs https

# Check SSL certificate
./deploy-pi.sh ssl-cert status

# Restart application
./deploy-pi.sh restart https

# Stop application
./deploy-pi.sh stop
```

### **🔍 Troubleshooting**

#### **Domain Not Working?**
```bash
# Check if domain resolves
nslookup minhmom.ddns.net

# Check if No-IP is updating your IP
sudo noip2 -S
```

#### **SSL Certificate Issues?**
```bash
# Check certificate status
./deploy-pi.sh ssl-cert status

# Renew certificates
./deploy-pi.sh ssl-cert renew
```

#### **Can't Access from Outside?**
1. Check router port forwarding (80, 443)
2. Check Pi firewall: `sudo ufw status`
3. Test ports: `telnet minhmom.ddns.net 443`

### **📊 Prerequisites**

1. **No-IP Account** with domain `minhmom.ddns.net`
2. **Raspberry Pi** with internet access
3. **Router Configuration** (port forwarding 80, 443)
4. **MongoDB** (local or external)

### **🎯 Router Setup**

Forward these ports on your router:
- **Port 80** → Your Pi's IP (for HTTP redirects and Let's Encrypt)
- **Port 443** → Your Pi's IP (for HTTPS)

### **🔒 Security Features**

- ✅ **Automatic SSL certificates** (Let's Encrypt)
- ✅ **HTTP to HTTPS redirects**
- ✅ **Security headers** (HSTS, CSP, etc.)
- ✅ **Rate limiting** on API endpoints
- ✅ **CORS configuration** for HTTPS
- ✅ **Firewall configuration**

### **📈 Performance Optimizations**

- ✅ **System optimization** for Raspberry Pi
- ✅ **Docker configuration** for better performance
- ✅ **Swap space management**
- ✅ **Log rotation** and cleanup

### **🆘 Getting Help**

If you encounter issues:

1. **Check logs:** `./deploy-pi.sh logs https`
2. **Verify domain:** `nslookup minhmom.ddns.net`
3. **Test connectivity:** `curl -I https://minhmom.ddns.net`
4. **Check SSL:** `./deploy-pi.sh ssl-cert status`

### **🎉 Success!**

Your MinhMom application is now running with full HTTPS support on your No-IP dynamic DNS domain! The setup includes everything needed for a secure, production-ready deployment.

## **Files Overview**

- `deploy-https-complete.sh` - Main HTTPS deployment script
- `deploy-pi.sh` - General deployment script (calls complete script for HTTPS)
- `docker-compose.pi-https.yml` - HTTPS Docker Compose configuration
- `mm-frontend/nginx-https-fixed.conf` - Nginx configuration for HTTPS
- `env.minhmom-ddns.example` - Environment configuration template

Everything is now consolidated and simplified! 🚀
