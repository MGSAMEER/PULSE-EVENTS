import PDFDocument from 'pdfkit';
import logger from './logger';

/**
 * Generates a premium ticket PDF with event details and an embedded QR code.
 * Uses PDFKit (pure Node.js, no Puppeteer/browser needed).
 *
 * @param booking  - Booking document (or populated booking)
 * @param event    - Event document (or the populated eventId)
 * @param qrImageBuffer - QR code as a PNG Buffer (from qrcode.toBuffer)
 */
export const generateTicketPDF = async (
  booking: any,
  event: any,
  qrImageBuffer: Buffer,
): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: [595.28, 420],      // Landscape A5-ish ticket shape
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageW = 595.28;
      const pageH = 420;
      const accent = '#B9375E';
      const dark   = '#0A0A0A';
      const muted  = '#888888';

      // ── Background ──
      doc.rect(0, 0, pageW, pageH).fill(dark);

      // ── Top accent bar ──
      const headerH = 80;
      const grad1 = doc.linearGradient(0, 0, pageW, 0);
      grad1.stop(0, accent).stop(1, '#7A1938');
      doc.rect(0, 0, pageW, headerH).fill(grad1);

      // ── Header text ──
      doc.fillColor('#FFFFFF')
         .fontSize(28)
         .font('Helvetica-Bold')
         .text('PULSE', 30, 20, { width: pageW - 60 });

      doc.fillColor('rgba(255,255,255,0.7)')
         .fontSize(9)
         .font('Helvetica')
         .text('EVENT TICKET — VERIFIED', 30, 54, { width: pageW - 60 });

      // ── Dashed divider ──
      doc.strokeColor(accent)
         .lineWidth(1)
         .dash(5, { space: 3 })
         .moveTo(30, headerH + 10)
         .lineTo(pageW - 30, headerH + 10)
         .stroke()
         .undash();

      // ── Event name ──
      const contentY = headerH + 30;
      const eventName = (event?.name || event?.title || 'Event').toUpperCase();
      doc.fillColor('#FFFFFF')
         .fontSize(22)
         .font('Helvetica-Bold')
         .text(eventName, 30, contentY, { width: 340 });

      // ── Details grid ──
      const detailsY = contentY + 60;
      const labelStyle = { color: accent, size: 8 };
      const valueStyle = { color: '#FFFFFF', size: 14 };

      const drawField = (label: string, value: string, x: number, y: number) => {
        doc.fillColor(accent).fontSize(8).font('Helvetica-Bold')
           .text(label.toUpperCase(), x, y);
        doc.fillColor('#FFFFFF').fontSize(13).font('Helvetica-Bold')
           .text(value, x, y + 14, { width: 200 });
      };

      // Date
      const eventDate = event?.date ? new Date(event.date) : new Date();
      const dateStr = eventDate.toLocaleDateString('en-IN', {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
      });
      const timeStr = eventDate.toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit'
      });
      drawField('Date & Time', `${dateStr} • ${timeStr}`, 30, detailsY);

      // Venue
      const venue = event?.venue || event?.location || 'TBA';
      drawField('Venue', venue, 30, detailsY + 50);

      // Tickets
      drawField('Tickets', `${booking.ticketsCount} × ₹${(booking.totalPrice / booking.ticketsCount).toFixed(0)}`, 30, detailsY + 100);

      // Total
      drawField('Total Paid', `₹${booking.totalPrice}`, 220, detailsY + 100);

      // Booking ID (small monospace)
      doc.fillColor(muted).fontSize(7).font('Helvetica')
         .text(`BOOKING ID: ${booking._id}`, 30, pageH - 30);

      // ── QR Code section (right side) ──
      const qrSize = 160;
      const qrX = pageW - qrSize - 40;
      const qrY = headerH + 30;

      // QR background card
      doc.roundedRect(qrX - 15, qrY - 10, qrSize + 30, qrSize + 55, 12)
         .fillOpacity(0.05).fill('#FFFFFF');
      doc.fillOpacity(1);

      // Embed the QR image
      doc.image(qrImageBuffer, qrX, qrY, { width: qrSize, height: qrSize });

      // QR caption
      doc.fillColor(muted).fontSize(7).font('Helvetica-Bold')
         .text('SCAN AT ENTRY GATE', qrX - 10, qrY + qrSize + 10, {
           width: qrSize + 20, align: 'center'
         });

      // ── Bottom accent bar ──
      doc.rect(0, pageH - 8, pageW, 8).fill(accent);

      doc.end();
    } catch (err: any) {
      logger.error(`PDF generation failed: ${err.message}`);
      reject(err);
    }
  });
};
