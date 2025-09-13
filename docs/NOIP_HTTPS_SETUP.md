# MinhMom App - No-IP Dynamic DNS HTTPS Setup Guide

This guide will help you deploy your MinhMom application with HTTPS using your free No-IP dynamic DNS domain `minhmom.ddns.net`.

## 🌐 **Prerequisites**

1. **No-IP Account** with domain `minhmom.ddns.net`
2. **Raspberry Pi** with internet access
3. **Router with port forwarding** (ports 80 and 443)
4. **MongoDB** (local or external)

## 📋 **Step-by-Step Setup**

### **Step 1: Configure No-IP Dynamic DNS**

1. **Log into your No-IP account** at https://www.noip.com
2. **Verify your domain** `minhmom.ddns.net` is active
3. **Note your No-IP credentials** (username/password) for automatic updates

### **Step 2: Router Configuration**

Configure port forwarding on your router:

```
External Port 80  → Internal IP (Pi) Port 80  → Protocol: TCP
External Port 443 → Internal IP (Pi) Port 443 → Protocol: TCP
```

**Important:** Use your Pi's local IP address (e.g., 192.168.1.100)

### **Step 3: Raspberry Pi Setup**

1. **Update your Pi:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Install required packages:**
   ```bash
   sudo apt install -y curl wget git vim
   ```

3. **Install Docker:**
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo usermod -aG docker $USER
   ```

4. **Install Docker Compose:**
   ```bash
   sudo apt install docker-compose -y
   ```

5. **Logout and login** to apply Docker group changes

### **Step 4: Application Configuration**

1. **Clone your repository:**
   ```bash
   git clone <your-repository-url>
   cd minhmom_app
   ```

2. **Create environment file:**
   ```bash
   cp env.minhmom-ddns.example .env
   nano .env
   ```

3. **Update `.env` with your settings:**
   ```env
   # No-IP Dynamic DNS Configuration
   SSL_DOMAIN=minhmom.ddns.net
   SSL_EMAIL=your-email@example.com
   SSL_MODE=letsencrypt

   # MongoDB Configuration
   MONGODB_URI=mongodb://your-mongodb-host:27017
   DB_NAME=minhmom

   # Frontend Configuration
   VITE_API_BASE_URL=https://minhmom.ddns.net/api
   VITE_GROUP_ID=2847737995453663
   ```

### **Step 5: Deploy with HTTPS**

1. **Make the script executable:**
   ```bash
   chmod +x deploy-pi.sh
   ```

2. **Deploy with HTTPS:**
   ```bash
   ./deploy-pi.sh deploy https
   ```

3. **Monitor the deployment:**
   ```bash
   ./deploy-pi.sh logs https
   ```

### **Step 6: Verify HTTPS Setup**

1. **Check if services are running:**
   ```bash
   ./deploy-pi.sh status https
   ```

2. **Test your domain:**
   ```bash
   curl -I https://minhmom.ddns.net
   ```

3. **Check SSL certificate:**
   ```bash
   ./deploy-pi.sh ssl-cert status
   ```

## 🔧 **Troubleshooting**

### **Common Issues and Solutions**

#### **1. Domain Not Resolving**

**Problem:** `minhmom.ddns.net` doesn't resolve to your Pi's IP

**Solutions:**
```bash
# Check if No-IP client is updating your IP
# Install No-IP client on your Pi
sudo apt install noip2

# Configure No-IP client
sudo noip2 -C

# Start No-IP client
sudo noip2

# Check status
sudo noip2 -S
```

#### **2. Let's Encrypt Certificate Issues**

**Problem:** SSL certificate creation fails

**Solutions:**
```bash
# Check if domain is accessible from internet
curl -I http://minhmom.ddns.net

# Test with staging environment first
docker-compose -f docker-compose.pi-https.yml run --rm certbot certbot certonly --staging --webroot --webroot-path=/var/www/certbot --email your-email@example.com --agree-tos --no-eff-email -d minhmom.ddns.net

# Check Let's Encrypt logs
docker-compose -f docker-compose.pi-https.yml logs certbot
```

#### **3. Port Forwarding Issues**

**Problem:** Can't access from outside your network

**Solutions:**
1. **Verify port forwarding** in your router settings
2. **Check firewall** on your Pi:
   ```bash
   sudo ufw status
   sudo ufw allow 80
   sudo ufw allow 443
   ```
3. **Test port accessibility:**
   ```bash
   # From external network
   telnet minhmom.ddns.net 80
   telnet minhmom.ddns.net 443
   ```

#### **4. CORS Issues**

**Problem:** Frontend can't connect to backend

**Solutions:**
1. **Update CORS origins** in backend config
2. **Check API URL** in frontend environment
3. **Verify HTTPS configuration**

## 📊 **Monitoring and Maintenance**

### **Daily Monitoring**

```bash
# Check application status
./deploy-pi.sh status https

# Check SSL certificate expiration
./deploy-pi.sh ssl-cert status

# View logs
./deploy-pi.sh logs https
```

### **SSL Certificate Renewal**

Let's Encrypt certificates expire every 90 days. The setup includes automatic renewal, but you can manually renew:

```bash
# Manual renewal
./deploy-pi.sh ssl-cert renew

# Check renewal status
./deploy-pi.sh ssl-cert status
```

### **No-IP IP Updates**

Ensure your No-IP client is running to keep your domain updated:

```bash
# Check No-IP client status
sudo noip2 -S

# Restart No-IP client if needed
sudo systemctl restart noip2
```

## 🚀 **Advanced Configuration**

### **Custom Nginx Configuration**

If you need custom nginx settings, you can modify `mm-frontend/nginx-https.conf`:

```nginx
# Add custom server blocks
server {
    listen 443 ssl http2;
    server_name minhmom.ddns.net;

    # Your custom configuration
}
```

### **Database Configuration**

For external MongoDB:

```env
MONGODB_URI=mongodb://username:password@your-mongodb-host:27017/minhmom
```

For local MongoDB on Pi:

```env
MONGODB_URI=mongodb://localhost:27017
```

### **Performance Optimization**

For better performance on Raspberry Pi:

```bash
# Increase swap space
sudo dphys-swapfile swapoff
echo 'CONF_SWAPSIZE=2048' | sudo tee /etc/dphys-swapfile
sudo dphys-swapfile setup
sudo dphys-swapfile swapon

# Optimize Docker
sudo nano /etc/docker/daemon.json
# Add:
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

## 🔒 **Security Considerations**

1. **Keep your Pi updated:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Use strong passwords** for all accounts

3. **Enable SSH key authentication:**
   ```bash
   ssh-keygen -t rsa -b 4096
   ssh-copy-id pi@your-pi-ip
   ```

4. **Configure firewall:**
   ```bash
   sudo ufw enable
   sudo ufw allow ssh
   sudo ufw allow 80
   sudo ufw allow 443
   ```

## 📱 **Access Your App**

Once everything is configured:

- **Frontend:** https://minhmom.ddns.net
- **Backend API:** https://minhmom.ddns.net/api
- **API Documentation:** https://minhmom.ddns.net/api/docs

## 🆘 **Getting Help**

If you encounter issues:

1. **Check logs:** `./deploy-pi.sh logs https`
2. **Verify domain:** `nslookup minhmom.ddns.net`
3. **Test connectivity:** `curl -I https://minhmom.ddns.net`
4. **Check SSL:** `./deploy-pi.sh ssl-cert status`

## 🎉 **Success!**

Your MinhMom application is now running with HTTPS on your No-IP dynamic DNS domain! The setup includes:

- ✅ Automatic SSL certificate management
- ✅ HTTP to HTTPS redirects
- ✅ Security headers
- ✅ Rate limiting
- ✅ CORS configuration
- ✅ Dynamic DNS support

Enjoy your secure, accessible MinhMom application! 🚀
