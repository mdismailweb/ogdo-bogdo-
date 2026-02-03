# 🚀 Staff Portal - AI-Powered Workforce Management System

[![React](https://img.shields.io/badge/React-19.1.0-blue.svg)](https://reactjs.org/)
[![Material-UI](https://img.shields.io/badge/Material--UI-7.2.0-green.svg)](https://mui.com/)
[![Google Apps Script](https://img.shields.io/badge/Backend-Google%20Apps%20Script-yellow.svg)](https://script.google.com/)
[![License](https://img.shields.io/badge/License-MIT-red.svg)](LICENSE)

A comprehensive, AI-powered workforce management system with real-time shift tracking, smart status calculation, and advanced analytics. Built with React.js frontend and Google Apps Script backend for a fully serverless experience.

## ✨ Key Features

### 🎯 Core Functionality
- **Real-time Shift Tracking** - Live status updates with timezone-aware calculations
- **Smart Status Detection** - Automatic DRAFT/OFFLINE/ACTIVE/COMPLETED status management
- **Multi-timezone Support** - Handles global workforce across different time zones
- **Responsive Design** - Works seamlessly on desktop, tablet, and mobile devices

### 🧠 AI-Powered Analytics
- **Shift Pattern Analysis** - Intelligent insights into workforce patterns
- **Anomaly Detection** - Automatic identification of unusual shift behaviors
- **Productivity Insights** - Data-driven employee performance metrics
- **Custom AI Queries** - Natural language analysis with confidence scoring
- **Smart Schedule Suggestions** - AI-recommended shift optimizations

### 👥 Staff Management
- **Complete CRUD Operations** - Add, edit, delete staff with form validation
- **Role-based Access Control** - Admin and Staff dashboards with appropriate permissions
- **Department Management** - Organize staff by departments and roles
- **Timezone Preferences** - Individual timezone settings for global teams

### 📊 Advanced Reporting
- **Multi-format Export** - CSV, JSON export with automatic conversion
- **Time Period Filtering** - Flexible date range selections
- **Real-time Status Sync** - Backend synchronization with conflict resolution
- **Comprehensive Logging** - Detailed audit trails and debugging information

## ⚡ Quick Start

### Prerequisites
- Node.js (v14 or higher)
- Google Account for Apps Script backend
- Modern web browser with JavaScript enabled

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/mdismailzzz02/Shifts-sync.git
   cd Shifts-sync
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure backend URL**
   Update the `API_URL` in `src/services/appScriptAPI.js`:
   ```javascript
   const API_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';
   ```

4. **Start development server**
   ```bash
   npm start
   ```

5. **Access the application**
   Open [http://localhost:3000](http://localhost:3000) in your browser

### Production Deployment

**Deploy to Render (Recommended):**
1. Fork this repository to your GitHub account
2. Sign up at [render.com](https://render.com)
3. Create a new Static Site from your GitHub repository
4. Use branch `main` with build command `npm install && npm run build`
5. Set publish directory to `build`

For detailed deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md)

## 📱 Usage

### For Employees
1. **Login** with credentials (e.g., john@example.com / password123)
2. **Track shifts** using the Shift Entry interface
3. **View history** in the dashboard
4. **Monitor status** with real-time updates

### For Administrators
1. **Access Admin Dashboard** with admin credentials
2. **Manage staff** - Add, edit, delete employees
3. **Monitor all shifts** - Real-time overview of workforce
4. **Generate reports** - Export data in multiple formats
5. **Use AI analytics** - Get intelligent insights and custom analysis

## 🔧 Key Technologies

- **React 19.1.0** - Modern JavaScript framework
- **Material-UI 7.2.0** - Component library and design system
- **Bootstrap 5.3.8** - Additional styling and responsive grid
- **Google Apps Script** - Serverless backend functions
- **Google Sheets** - Database with real-time collaboration

## 📄 License

This project is licensed under the MIT License.

## 📞 Support

For support, email mdismailzzz02@gmail.com or create an issue in the GitHub repository.

---

**Built with ❤️ by [mdismailzzz02](https://github.com/mdismailzzz02)**
