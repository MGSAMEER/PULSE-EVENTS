# Backend Startup Issues - Resolution Guide

## Issues Found and Fixed

### 1. ✅ **Dependency Conflict (FIXED)**
**Problem:** 
- `cloudinary@^2.9.0` and `multer-storage-cloudinary@4.0.0` have incompatible peer dependencies
- `multer-storage-cloudinary@4.0.0` requires `cloudinary@^1.21.0`

**Solution:**
- Downgraded `cloudinary` from `^2.9.0` to `^1.41.0` in `package.json`
- Run `npm install` to update dependencies

---

### 2. ⚠️ **Port Already in Use (MANUAL ACTION REQUIRED)**
**Problem:**
- Server tries to start on port 5000, but it's already in use by another process
- Error: `EADDRINUSE: address already in use :::5000`

**Solutions:**
#### Option A: Change Port (Recommended)
1. Edit `.env` file and change: `PORT=5001` (or any available port)
2. Update frontend API endpoint if hardcoded to port 5000

#### Option B: Kill Process Using Port 5000
```powershell
# Windows PowerShell
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Or kill node processes
Get-Process node | Stop-Process -Force
```

---

### 3. ⚠️ **Environment Variables Need Configuration**
**Problem:**
- `.env` file contains placeholder values that won't work in production

**Current `.env` Values:**
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/event-ticketing
JWT_SECRET=your-jwt-secret-key
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-key-secret
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-email-password
```

**Required Actions:**
- [ ] **MongoDB**: Ensure MongoDB is running on `localhost:27017` or update `MONGO_URI`
- [ ] **JWT_SECRET**: Change to a secure random string (at least 32 characters)
- [ ] **Razorpay Keys**: Get from Razorpay dashboard or use test keys
- [ ] **Email Credentials**: Configure Gmail with app password (2FA required)
- [ ] **ALLOWED_ORIGINS** (Optional): Add for CORS if needed

**Secure JWT Secret Generation:**
```powershell
# PowerShell - Generate random JWT secret
$secret = -join ((0..63) | ForEach-Object { [char][byte](Get-Random -Minimum 33 -Maximum 127) })
Write-Host $secret
```

---

### 4. ✅ **Missing Logs Directory (VERIFIED)**
**Status:** Logs directory exists at `d:\INTERNSHIP\TASK 1\backend\logs\`
- No action needed

---

## Startup Steps

### Step 1: Install Dependencies
```powershell
cd "d:\INTERNSHIP\TASK 1\backend"
npm install
```

### Step 2: Configure Environment Variables
1. Open `.env` file
2. Update all placeholder values with actual configuration
3. Ensure MongoDB is running

### Step 3: Choose Your Startup Method

#### Development Mode (with auto-reload)
```powershell
npm run dev
```

#### Production Build & Run
```powershell
npm run build
npm start
```

### Step 4: Verify Server is Running
- Check console for: `MongoDB connected`
- Check console for: `Server running on port XXXXX`
- Test health endpoint: `http://localhost:5000/api/health`

---

## Common Issues & Solutions

### Issue: "Cannot find module"
**Solution:**
```powershell
# Clear node_modules and reinstall
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

### Issue: MongoDB Connection Error
**Solution:**
- Verify MongoDB is running: `mongosh` or check MongoDB Compass
- Check `MONGO_URI` in `.env` is correct
- Format: `mongodb://localhost:27017/event-ticketing`

### Issue: Port Already in Use
**Solution:**
- Change `PORT` in `.env` to an available port
- Or kill process: `taskkill /IM node.exe /F`

### Issue: Email Service Not Working
**Solution:**
- Verify Gmail account has 2FA enabled
- Generate app password from Google Account settings
- Use app password in `.env` as `EMAIL_PASS`
- Current code uses: `service: 'gmail'`

### Issue: "EADDRINUSE" or "Address already in use"
**Solution:**
```powershell
# Find and kill process on port 5000
$process = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
if ($process) {
    Get-Process -Id $process.OwningProcess | Stop-Process -Force
}
```

---

## Verification Checklist

- [ ] npm install completes without dependency errors
- [ ] MongoDB connection succeeds
- [ ] Server starts without "EADDRINUSE" error
- [ ] Health check endpoint responds: `GET /api/health`
- [ ] All environment variables are configured
- [ ] Logs directory is writable
- [ ] No TypeScript compilation errors

---

## Next Steps

1. **Fix environment variables first** - this blocks actual startup
2. **Resolve port conflict** - choose port or kill existing process
3. **Test MongoDB connection** - ensure it's running and accessible
4. **Run `npm run dev`** - start development server
5. **Verify endpoints** - test health check and basic routes

---

## Quick Start Command

```powershell
cd "d:\INTERNSHIP\TASK 1\backend"
npm install
# Then configure .env values
npm run dev
```

Server will start on the port specified in `.env` (default: 5000)
