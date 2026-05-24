# Email Verification System - Production Setup

## ✅ Completed

- [x] Backend verification email sender (emailService.ts)
- [x] Backend verify endpoint (authController.ts + authRoutes.ts)
- [x] Frontend verify page (VerifyEmail.tsx)
- [x] Frontend verify route (App.tsx)
- [x] Comprehensive debug logging for Brevo API
- [x] All commits pushed to GitHub

---

## 📋 REMAINING TASK: Configure Render Environment Variables

### Step 1: Access Render Dashboard

1. Go to https://dashboard.render.com
2. Select your backend service: **pulse-events** (or similar name)
3. Click **Settings** tab

### Step 2: Add Frontend URL

In the **Environment** section, add:

```
FRONTEND_URL=https://pulse-events.vercel.app
```

**Where:**
- Replace `pulse-events.vercel.app` with YOUR actual frontend Vercel URL
- Keep the `https://` prefix
- Do NOT include trailing `/`

### Step 3: Verify Other Required Variables

Ensure these are already set:

```
BREVO_API_KEY=xkeysib-... (Your Brevo API key)
SENDER_EMAIL=noreply@pulse-events.com (Verified in Brevo)
NODE_ENV=production
JWT_SECRET=... (Your JWT secret)
MONGO_URI=... (Your MongoDB connection)
```

### Step 4: Redeploy

After adding `FRONTEND_URL`:

1. Click **Manual Deploy** (or push to GitHub to trigger auto-deploy)
2. Wait for deployment to complete (~2-3 minutes)
3. Render will restart with new environment variables

---

## 🧪 Testing the Verification System

### Test Flow (Local or Deployed)

#### Option A: Test on Vercel Frontend (Deployed)

```
1. Go to: https://pulse-events.vercel.app/register
2. Enter:
   - Name: Test User
   - Email: your-test-email@gmail.com
   - Password: TestPassword123!
3. Click Register
4. Check your email inbox for verification email
5. Click verification link in email
6. Should see "Identity Verified" page
7. Click "PROCEED TO AUTH"
8. Log in with same email + password
9. Should successfully log in (because email is verified)
```

#### Option B: Test Locally (Development)

```
1. Start backend: npm start (in backend folder)
2. Start frontend: npm start (in frontend folder)
3. Go to: http://localhost:3000/register
4. Register a user
5. Check Render/backend logs for debug output:
   📧 Triggering verification email for: user@example.com
   🚀 [sendViaBrevo] FUNCTION STARTED
   🔑 [sendViaBrevo] API KEY EXISTS: true
   📡 [sendViaBrevo] Sending POST request to: https://api.brevo.com/v3/smtp/email
   📬 [sendViaBrevo] Response status: 201
   ✅ [sendViaBrevo] Request succeeded (2xx status)
   ✅ [sendVerificationEmail] SUCCESS - Brevo accepted the email
   ✅ Email sent
6. Check email for Brevo verification email
7. Click link to verify
8. Log in should work
```

---

## 🔍 Debug Log Reference

When testing, check for these logs:

### ✅ Success Logs (Everything working)

```
📧 Triggering verification email for: user@example.com
🚀 [sendViaBrevo] FUNCTION STARTED
🔑 [sendViaBrevo] API KEY EXISTS: true (length: 32)
📡 [sendViaBrevo] Sending POST request to: https://api.brevo.com/v3/smtp/email
📬 [sendViaBrevo] Response status: 201 Created
✅ [sendViaBrevo] Request succeeded (2xx status)
✅ [sendVerificationEmail] SUCCESS - Brevo accepted the email
✅ Email sent
✅ Verification flow completed
```

### ❌ Failure Logs (Troubleshooting)

| Log | Problem | Fix |
|---|---|---|
| `🔑 API KEY EXISTS: false` | BREVO_API_KEY not set in Render | Add to Render env vars |
| `Response status: 401 Unauthorized` | Invalid/expired Brevo API key | Check Brevo account |
| `Response status: 400 Bad Request` | Bad email payload | Check sender email is verified in Brevo |
| `Response status: 429 Too Many Requests` | Rate limited | Wait or upgrade Brevo plan |
| `FETCH ERROR: ...` | Network error | Check Render backend logs |

---

## 📧 Email Verification URLs

**Development:**
```
http://localhost:3000/verify-email/{token}
```

**Production:**
```
https://pulse-events.vercel.app/verify-email/{token}
```

The backend will use `FRONTEND_URL` environment variable to construct these links.

---

## 🚀 Production Checklist

Before going live:

- [ ] `FRONTEND_URL` is set in Render environment variables
- [ ] `BREVO_API_KEY` is valid and has API quota remaining
- [ ] Sender email is verified in Brevo account
- [ ] Test registration → verification email → login works end-to-end
- [ ] Verification links expire properly (token handling in DB)
- [ ] Error messages are user-friendly

---

## 📚 Related Files

- Backend email service: `backend/src/utils/emailService.ts`
- Backend verify endpoint: `backend/src/controllers/authController.ts`
- Backend routes: `backend/src/routes/authRoutes.ts`
- Frontend verify component: `frontend/src/components/VerifyEmail.tsx`
- Frontend routes: `frontend/src/App.tsx`

---

## 🆘 Troubleshooting

### "Email not verified" error on login

**Cause:** User exists but `isVerified = false`

**Fix:**
1. Check that verification email was sent (check logs)
2. Ensure user clicked verification link
3. Check backend logs for verify endpoint errors

### "Invalid or expired verification token" error

**Cause:** Token doesn't match or user doesn't exist

**Fix:**
1. Use a fresh email to register
2. Click verification link within 24 hours (recommended)
3. Re-register if token expired

### Brevo API 400 Error

**Cause:** Sender email not verified in Brevo

**Fix:**
1. Log in to https://app.brevo.com
2. Go to Senders & Contacts → Senders
3. Verify the sender email or domain
4. Wait for verification email and confirm

---

**Last Updated:** May 24, 2026
**Status:** Production Ready ✅
