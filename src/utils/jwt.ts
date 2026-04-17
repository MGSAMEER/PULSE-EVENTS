import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('FATAL: JWT_SECRET environment variable is missing in production!');
}

const finalSecret = JWT_SECRET || 'dev-unsafe-secret';

export const generateToken = (payload: object): string => {
  return jwt.sign(payload, finalSecret, { 
    expiresIn: '7d',
    issuer: 'pulse-platform',
    audience: 'pulse-users'
  });
};

export const verifyToken = (token: string): any => {
  return jwt.verify(token, finalSecret, {
    issuer: 'pulse-platform',
    audience: 'pulse-users'
  });
};