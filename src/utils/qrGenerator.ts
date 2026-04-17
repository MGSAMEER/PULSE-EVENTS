import crypto from 'crypto';

const QR_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';

export const generateQRData = (bookingId: string): string => {
  const data = `bookingId:${bookingId}`;
  const signature = crypto
    .createHmac('sha256', QR_SECRET)
    .update(data)
    .digest('hex');

  return `${data}|signature:${signature}`;
};

export const verifyQRData = (qrData: string): string | null => {
  const parts = qrData.split('|');
  if (parts.length !== 2) return null;

  const dataPart = parts[0];
  const sigPart = parts[1];

  if (!dataPart.startsWith('bookingId:') || !sigPart.startsWith('signature:')) {
    return null;
  }

  const bookingId = dataPart.replace('bookingId:', '');
  const providedSignature = sigPart.replace('signature:', '');

  const expectedSignature = crypto
    .createHmac('sha256', QR_SECRET)
    .update(dataPart)
    .digest('hex');

  if (providedSignature !== expectedSignature) {
    return null;
  }

  return bookingId;
};