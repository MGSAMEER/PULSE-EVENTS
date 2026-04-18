import { RequestHandler } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User from '../models/User';
import { generateToken } from '../utils/jwt';
import { ApiResponseUtil } from '../utils/response';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';
import { sendVerificationEmail, sendPasswordResetEmail } from '../utils/emailService';
import OrganizerRequest from '../models/OrganizerRequest';
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleLogin: RequestHandler = async (req, res) => {
  try {
    const { credential } = req.body;
    
    if (!credential) {
        throw new AppError('Neural link credential missing', 400);
    }

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      throw new AppError('Invalid neural authentication payload', 400);
    }

    const { email, name, picture, sub } = payload;
    const normalizedEmail = email.toLowerCase();

    let user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      // Provision fresh identity
      user = new User({
        name: name || email.split('@')[0],
        email,
        googleId: sub,
        avatar: picture,
        isVerified: true, // Google accounts are verified
        role: 'USER'
      });
      await user.save();
      logger.info(`New user provisioned via Google: ${email}`);
    } else {
      // Unify accounts if not already linked
      if (!user.googleId) {
        user.googleId = sub;
        if (picture && !user.avatar) user.avatar = picture;
        await user.save();
        logger.info(`Linked existing account to Google: ${email}`);
      }
    }

    const jwtToken = generateToken({ id: user._id });
    
    return ApiResponseUtil.success(res, 'Authentication successful via Google', {
      token: jwtToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role.toUpperCase()
      }
    });
  } catch (error: any) {
    logger.error('Google Auth Error:', error);
    if (error instanceof AppError) throw error;
    throw new AppError('Google authentication protocol failure', 500);
  }
};

export const register: RequestHandler = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const normalizedEmail = email.toLowerCase();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      throw new AppError('Identity conflict: Terminal already registered', 400);
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Force role to 'user' to prevent unauthorized privilege escalation via req.body
    const user = new User({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role: 'USER', 
      isVerified: false,
      verificationToken,
    });

    await user.save();
    logger.info(`User registered: ${email} [${user.role}]. Verification token generated.`);

    const verificationLink = `http://localhost:3000/verify-email/${verificationToken}`;
    await sendVerificationEmail(email, verificationLink);

    return ApiResponseUtil.success(res, 'Registration successful. Please verify your email to continue.', { 
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role 
      } 
    }, 201);
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    logger.error('Registration Error:', error);
    throw new AppError('Neural link initialization failure', 500);
  }
};

export const verifyEmail: RequestHandler = async (req, res) => {
  try {
    const { token } = req.params;
    const user = await User.findOne({ verificationToken: token });

    if (!user) {
      throw new AppError('Invalid or expired verification token', 400);
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    logger.info(`User verified: ${user.email}`);
    return ApiResponseUtil.success(res, 'Email successfully verified. You may now authenticate.', {});
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error('Verification Error:', error);
    throw new AppError('Verification system failure', 500);
  }
};

export const login: RequestHandler = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase();

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      logger.warn(`Authentication failed: User ${email} not found from ${req.ip}`);
      throw new AppError('Authentication failed: Invalid credentials', 401);
    }

    if (!user.password) {
      logger.warn(`Authentication failed: User ${email} has no password set (OAuth account?)`);
      throw new AppError('Authentication failed: Please use your social provider or reset password', 401);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      logger.warn(`Authentication failed: Incorrect password for ${email} from ${req.ip}`);
      throw new AppError('Authentication failed: Invalid credentials', 401);
    }

    if (!user.isVerified) {
      logger.warn(`Authentication blocked: User ${email} not verified from ${req.ip}`);
      throw new AppError('Authentication failed: Email not verified', 403);
    }

    const token = generateToken({ id: user._id });
    logger.info(`User logged in: ${email}`);

    return ApiResponseUtil.success(res, 'Access granted', { 
      token, 
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role.toUpperCase() 
      } 
    });
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    logger.error('Login Error:', error);
    throw new AppError('Authentication system failure', 500);
  }
};

export const getMe: RequestHandler = async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const user = await User.findById(userId).select('-password');
    if (!user) throw new AppError('User not found', 404);

    const request = await OrganizerRequest.findOne({ userId });

    return ApiResponseUtil.success(res, 'User profile retrieved', { 
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role.toUpperCase(),
        organizerRequestStatus: request?.status || null
      } 
    });
  } catch (error) {
    logger.error('Get Me Error:', error);
    throw new AppError('Failed to retrieve user pulse', 500);
  }
};

export const forgotPassword: RequestHandler = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      // Returning success even if user doesn't exist prevents email enumeration attacks
      return ApiResponseUtil.success(res, 'If your email is registered, a password reset link has been sent.', {});
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = await bcrypt.hash(resetToken, 12);
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour expiration
    await user.save();
    logger.info(`Password reset requested: ${user.email}`);

    const resetLink = `http://localhost:3000/reset-password/${resetToken}?email=${encodeURIComponent(email)}`;
    await sendPasswordResetEmail(email, resetLink);

    return ApiResponseUtil.success(res, 'If your email is registered, a password reset link has been sent.', {});
  } catch (error) {
    logger.error('Forgot Password Error:', error);
    throw new AppError('Password reset initialization failure', 500);
  }
};

export const resetPassword: RequestHandler = async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;
    const user = await User.findOne({ 
      email, 
      resetPasswordExpires: { $gt: new Date() } 
    });

    if (!user || !user.resetPasswordToken) {
      throw new AppError('Invalid or expired password reset token', 400);
    }

    const isValidToken = await bcrypt.compare(token, user.resetPasswordToken);
    if (!isValidToken) {
      throw new AppError('Invalid or expired password reset token', 400);
    }

    user.password = await bcrypt.hash(newPassword, 12);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    logger.info(`Password reset successful: ${user.email}`);
    return ApiResponseUtil.success(res, 'Password successfully reset. You may now authenticate.', {});
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error('Reset Password Error:', error);
    throw new AppError('Password reset operational failure', 500);
  }
};

export const requestOrganizer: RequestHandler = async (req, res) => {
  try {
    const { reason, businessDetails } = req.body;
    const userId = (req as any).user.id;

    const user = await User.findById(userId);
    if (user?.role === 'ORGANIZER' || user?.role === 'ADMIN') {
      throw new AppError('Already holds elevated permissions', 400);
    }

    // Check for existing request
    const existingRequest = await OrganizerRequest.findOne({ userId });
    if (existingRequest) {
      throw new AppError('A request is already pending review', 400);
    }

    const newRequest = new OrganizerRequest({
      userId,
      reason,
      businessDetails
    });

    await newRequest.save();

    return ApiResponseUtil.success(res, 'Request submitted. Awaiting administrative review.');
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    logger.error('Organizer Request Error:', error);
    throw new AppError('Failed to transmit request pulse', 500);
  }
};

export const getOrganizerRequests: RequestHandler = async (req, res) => {
  try {
    const requests = await OrganizerRequest.find().populate('userId', 'name email');
    return ApiResponseUtil.success(res, 'Requests retrieved', requests);
  } catch (error) {
    logger.error('Get Organizer Requests Error:', error);
    throw new AppError('Failed to retrieve request bank', 500);
  }
};

export const approveOrganizerRequest: RequestHandler = async (req, res) => {
  try {
    const { requestId, action } = req.body; // action: 'APPROVED' or 'REJECTED'
    const request = await OrganizerRequest.findById(requestId);
    if (!request) throw new AppError('Request not found', 404);

    if (action === 'APPROVED') {
      const user = await User.findById(request.userId);
      if (user) {
        user.role = 'ORGANIZER';
        await user.save();
      }
      request.status = 'APPROVED';
    } else if (action === 'REJECTED') {
      request.status = 'REJECTED';
    } else {
      throw new AppError('Invalid action protocol', 400);
    }

    await request.save();
    return ApiResponseUtil.success(res, `Request ${action.toLowerCase()} successfully`);
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    logger.error('Approve Organizer Request Error:', error);
    throw new AppError('Failed to finalize request status', 500);
  }
};