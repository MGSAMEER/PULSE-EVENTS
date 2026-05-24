# 🔧 FRONTEND_URL Fix - Verification Email Localhost Issue

## Issue
Verification emails are showing `localhost` URL instead of your production Vercel frontend URL.

**Root Cause:** `FRONTEND_URL` environment variable is NOT set in Render.

---

## Solution: Add FRONTEND_URL to Render

### Step 1: Get Your Vercel Frontend URL

Go to: https://vercel.com/dashboard

1. Select your project (likely named `pulse-events` or similar)
2. Copy the **Production URL** from the top
3. Example: `https://pulse-events.vercel.app`

**Keep this URL ready for Step 3**

---

### Step 2: Access Render Settings

1. Go to: https://dashboard.render.com
2. Select your backend service (Pulse Events backend)
3. Click **Settings** tab
4. Scroll to **Environment** section

---

### Step 3: Add FRONTEND_URL Variable

In the **Environment** section:

1. Click **Add Environment Variable**
2. **Key:** `FRONTEND_URL`
3. **Value:** `https://pulse-events.vercel.app` (your actual Vercel URL from Step 1)
4. **DO NOT** include trailing slash `/`
5. **DO NOT** use `http://`, only `https://`
6. Click **Save**

**Example:**
```
Key:   FRONTEND_URL
Value: https://pulse-events.vercel.app
```

---

### Step 4: Redeploy Backend

After saving the environment variable:

1. Render will show a **Deploy** button (or go to **Deploys** tab)
2. Click **Manual Deploy** or **Deploy Latest Commit**
3. Wait for deployment to complete (~2-3 minutes)
4. Check the deploy log for completion

---

### Step 5: Verify the Fix

#### Check Logs

After redeployment, check Render Live Logs for:

```
🔍 [sendVerificationEmail] RAW FRONTEND_URL from env: https://pulse-events.vercel.app
🔍 [sendVerificationEmail] NODE_ENV: production
✅ [sendVerificationEmail] Resolved Frontend URL: https://pulse-events.vercel.app
✅ [sendVerificationEmail] Verify URL: https://pulse-events.vercel.app/verify-email/{token}
```

**If you see these logs:** ✅ SUCCESS - `FRONTEND_URL` is set correctly

#### Problematic Logs (Before Fix)

```
🔍 [sendVerificationEmail] RAW FRONTEND_URL from env: undefined
⚠️ [sendVerificationEmail] FRONTEND_URL is NOT SET - using fallback localhost
✅ [sendVerificationEmail] Resolved Frontend URL: http://localhost:3000
```

---

### Step 6: Test End-to-End

1. Register a new user: https://pulse-events.vercel.app/register
2. Check your email inbox
3. Look for verification link - should be:
   ```
   https://pulse-events.vercel.app/verify-email/{token}
   ```
   NOT `http://localhost:3000/verify-email/{token}`
4. Click the link
5. Should see "Identity Verified" page
6. Log in should work

---

## 🚨 Quick Checklist

- [ ] Got Vercel frontend URL (e.g., `https://pulse-events.vercel.app`)
- [ ] Added `FRONTEND_URL` to Render environment
- [ ] Value is correct (production Vercel URL, no trailing slash, https only)
- [ ] Clicked Save
- [ ] Redeployed backend
- [ ] Deployment completed successfully
- [ ] Checked logs for diagnostic messages
- [ ] Tested registration → email → verification link

---

## 📍 Render Navigation (Quick Reference)

```
Dashboard → Select Backend Service → Settings → Environment
```

---

## ✅ Expected Result

After fix, verification emails will contain:

```
Click link: https://pulse-events.vercel.app/verify-email/{token}
```

NOT:

```
Click link: http://localhost:3000/verify-email/{token}
```

---

## 🆘 Troubleshooting

### Still seeing localhost after following steps?

1. **Check deployment status:** Did the redeploy actually complete?
2. **Clear browser cache:** Hard refresh (Ctrl+Shift+R)
3. **Register with new email:** Use a fresh email to test
4. **Check Render logs:** Look for the diagnostic logs above
5. **Verify env variable:** In Render Settings, is `FRONTEND_URL` visible and correct?

### Brevo still sending to localhost?

This is normal if you didn't save/redeploy yet. The backend is running the old code.

**Fix:** Redeploy and wait 2-3 minutes for new deployment to activate.

---

## 📝 Reference

- **Production Vercel URL:** https://pulse-events.vercel.app
- **Render Backend:** https://pulse-events.onrender.com
- **Backend API:** https://pulse-events.onrender.com/api

---

**Last Updated:** May 24, 2026
