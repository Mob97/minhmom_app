# 🚀 Quick Start: MinhMom App with No-IP HTTPS

## **Your Domain: `minhmom.ddns.net`**

### **Step 1: One-Command Setup**

```bash
# Run the automated setup script
chmod +x setup-noip-https.sh
./setup-noip-https.sh
```

### **Step 2: Manual Setup (Alternative)**

```bash
# 1. Configure environment
cp env.minhmom-ddns.example .env
nano .env

# 2. Update .env with your settings:
SSL_DOMAIN=minhmom.ddns.net
SSL_EMAIL=your-email@example.com
MONGODB_URI=mongodb://your-mongodb-host:27017
VITE_GROUP_ID=2847737995453663

# 3. Deploy with HTTPS
./deploy-pi.sh deploy https
```

### **Step 3: Router Configuration**

Forward these ports on your router:
- **Port 80** → Your Pi's IP (for HTTP redirects)
- **Port 443** → Your Pi's IP (for HTTPS)

### **Step 4: Access Your App**

- **Frontend:** https://minhmom.ddns.net
- **Backend API:** https://minhmom.ddns.net/api
- **API Docs:** https://minhmom.ddns.net/api/docs

## **🔧 Management Commands**

```bash
# Check status
./deploy-pi.sh status https

# View logs
./deploy-pi.sh logs https

# Check SSL certificate
./deploy-pi.sh ssl-cert status

# Restart app
./deploy-pi.sh restart https

# Stop app
./deploy-pi.sh stop
```

## **🔍 Troubleshooting**

### **Domain Not Working?**
```bash
# Check if No-IP is updating your IP
sudo noip2 -S

# Test domain resolution
nslookup minhmom.ddns.net
```

### **SSL Certificate Issues?**
```bash
# Check certificate status
./deploy-pi.sh ssl-cert status

# View certificate logs
docker-compose -f docker-compose.pi-https.yml logs certbot
```

### **Can't Access from Outside?**
1. Check router port forwarding (80, 443)
2. Check Pi firewall: `sudo ufw status`
3. Test ports: `telnet minhmom.ddns.net 443`

## **📱 Your App URLs**

Once deployed, access your MinhMom app at:
- **Main App:** https://minhmom.ddns.net
- **API:** https://minhmom.ddns.net/api
- **Docs:** https://minhmom.ddns.net/api/docs

## **🎉 Success!**

Your MinhMom app is now running with HTTPS on your No-IP domain! The setup includes:
- ✅ Automatic SSL certificates
- ✅ HTTP to HTTPS redirects
- ✅ Security headers
- ✅ Dynamic DNS updates
- ✅ Auto-renewal

Need help? Check the full guide: `docs/NOIP_HTTPS_SETUP.md`
