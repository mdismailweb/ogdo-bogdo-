# 🚀 Deploying Staff Portal to Render

This guide will help you deploy the Staff Portal to Render.com for production use.

## Prerequisites

1. **GitHub Repository**: Your code should be pushed to GitHub (✅ already done)
2. **Render Account**: Sign up at [render.com](https://render.com)
3. **Google Apps Script**: Backend should be deployed and accessible

## 📋 Deployment Steps

### 1. **Prepare Your Backend URL**

Update your Google Apps Script URL in `src/services/appScriptAPI.js`:

```javascript
const API_URL = 'https://script.google.com/macros/s/YOUR_ACTUAL_DEPLOYMENT_ID/exec';
```

### 2. **Create New Web Service on Render**

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New"** → **"Static Site"**
3. Connect your GitHub repository: `mdismailzzz02/Shifts-sync`
4. Configure the deployment:

   **Settings:**
   - **Name**: `staff-portal` (or your preferred name)
   - **Branch**: `main`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `build`

### 3. **Environment Variables** (Optional)

Add these environment variables in Render dashboard:

```
NODE_VERSION=18.17.0
GENERATE_SOURCEMAP=false
```

### 4. **Deploy**

1. Click **"Create Static Site"**
2. Render will automatically:
   - Install dependencies (`npm install`)
   - Build the project (`npm run build`)
   - Deploy to a live URL

## 🔧 Configuration Files

The repository includes these Render-specific files:

- **`render.yaml`**: Service configuration
- **`public/_redirects`**: SPA routing support
- **`.env.example`**: Environment variables template

## 🌐 Post-Deployment

### **Your Live URL**
After deployment, your app will be available at:
```
https://your-app-name.onrender.com
```

### **Test Your Deployment**
1. **Login Page**: Should load correctly
2. **API Connectivity**: Test login with valid credentials
3. **Responsive Design**: Check on mobile devices
4. **All Features**: Test admin dashboard, shift entry, AI features

## 🔄 Automatic Updates

- **Auto-Deploy**: Pushes to `main` branch trigger automatic redeployment
- **Build Time**: ~2-3 minutes for full rebuild
- **Zero Downtime**: Rolling deployments ensure continuous availability

## 🛠️ Troubleshooting

### **Build Fails**
```bash
# Check build locally first
npm install
npm run build
```

### **API Connection Issues**
1. Verify Google Apps Script URL is correct
2. Check CORS settings in Apps Script
3. Ensure Apps Script is published as web app

### **Routing Issues**
- `public/_redirects` file handles SPA routing
- All routes redirect to `index.html`

### **Performance Issues**
- Static assets are cached automatically
- Gzip compression enabled
- CDN distribution included

## 📊 Render Features

- **Free Tier Available**: Great for testing and small projects
- **Custom Domains**: Add your own domain
- **SSL Certificates**: Automatic HTTPS
- **Global CDN**: Fast worldwide delivery
- **Build Logs**: Detailed deployment information

## 🔒 Security

- **Headers**: Security headers automatically added
- **HTTPS**: Enforced by default
- **Environment Variables**: Securely stored
- **No Server Management**: Fully managed infrastructure

## 📈 Monitoring

Access deployment logs and metrics in your Render dashboard:
- Build logs
- Deploy history
- Performance metrics
- Custom domain setup

---

**🎉 Your Staff Portal is now live and ready for production use!**