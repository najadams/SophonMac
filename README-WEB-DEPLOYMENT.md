# Web Deployment Guide - POS Application

This guide explains how to deploy the web version of the POS application with the frontend on Vercel/Netlify and the backend on Render.

## Prerequisites

- Git repository with the `web-deployment` branch
- Vercel or Netlify account for frontend hosting
- Render account for backend hosting

## Backend Deployment (Render)

### 1. Prepare Backend for Deployment

The backend has been modified to remove networking features and optimize for cloud deployment:
- Networking routes and WebSocket features disabled
- CORS configured for web deployment
- Environment variables support added

### 2. Deploy to Render

1. Connect your GitHub repository to Render
2. Create a new Web Service
3. Select the `web-deployment` branch
4. Set the root directory to `backend`
5. Configure environment variables:
   - `NODE_ENV=production`
   - `PORT=3003` (or let Render auto-assign)
   - `JWT_SECRET=your-secure-jwt-secret`
   - `FRONTEND_URL=https://your-frontend-domain.vercel.app`

### 3. Environment Variables

Copy `.env.example` to `.env` and update the values:
```bash
cp backend/.env.example backend/.env
```

## Frontend Deployment

### Option A: Vercel Deployment

1. Connect your GitHub repository to Vercel
2. Select the `web-deployment` branch
3. Set the root directory to `frontend`
4. Configure environment variables:
   - `REACT_APP_API_URL=https://your-backend-domain.onrender.com`
5. Deploy

### Option B: Netlify Deployment

1. Connect your GitHub repository to Netlify
2. Select the `web-deployment` branch
3. Set the base directory to `frontend`
4. Set the build command to `npm run build`
5. Set the publish directory to `dist`
6. Configure environment variables:
   - `REACT_APP_API_URL=https://your-backend-domain.onrender.com`
7. Deploy

## Configuration Files

### Backend
- `render.yaml` - Render deployment configuration
- `.env.example` - Environment variables template

### Frontend
- `vercel.json` - Vercel deployment configuration
- `netlify.toml` - Netlify deployment configuration
- `.env.example` - Environment variables template

## Key Changes Made

### Backend Changes
- Removed networking and synchronization features
- Simplified CORS configuration for web deployment
- Removed Electron-specific code paths
- Added health check endpoint support

### Frontend Changes
- Updated API base URL configuration for production
- Added environment variable support
- Removed Electron dependencies (if any)

## Testing Locally

Before deploying, test the configuration locally:

1. Set up environment variables:
   ```bash
   # Backend
   cd backend
   cp .env.example .env
   # Update .env with your values
   
   # Frontend
   cd ../frontend
   cp .env.example .env
   # Update .env with your backend URL
   ```

2. Start the backend:
   ```bash
   cd backend
   npm install
   npm start
   ```

3. Start the frontend:
   ```bash
   cd frontend
   npm install
   npm run build
   npm run preview
   ```

## Post-Deployment Steps

1. Update CORS settings in backend with actual frontend domain
2. Test all functionality in the deployed environment
3. Set up monitoring and logging
4. Configure custom domains (optional)

## Troubleshooting

- Ensure environment variables are properly set
- Check CORS configuration if API calls fail
- Verify build commands and output directories
- Check deployment logs for errors

## Features Disabled for Web Deployment

- Network discovery and synchronization
- Local network communication
- Electron-specific features
- mDNS broadcasting