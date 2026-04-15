import { Injectable, Logger } from '@nestjs/common';
import QRCode from 'qrcode';

/**
 * QR Code Service
 *
 * Generates QR code images from QR code strings for embedding in PDFs.
 * Uses the `qrcode` npm package for image rendering.
 *
 * The QR code format (v1-{uuid}-{checksum}) is defined by the domain
 * value object QRCodeVO — this service only handles image generation.
 */
@Injectable()
export class QRCodeService {
  private readonly logger = new Logger(QRCodeService.name);

  /**
   * Generate a QR code PNG image buffer from a QR code string
   *
   * @param qrCode - The QR code string (e.g., v1-uuid-checksum)
   * @returns PNG image buffer
   */
  async generateQRImage(qrCode: string): Promise<Buffer> {
    this.logger.debug(`Generating QR image for code: ${qrCode.substring(0, 10)}...`);

    const buffer = await QRCode.toBuffer(qrCode, {
      type: 'png',
      width: 300,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    this.logger.debug(`QR image generated: ${buffer.length} bytes`);
    return buffer;
  }

  /**
   * Generate a QR code as a data URL (base64-encoded PNG)
   *
   * @param qrCode - The QR code string
   * @returns Data URL string (data:image/png;base64,...)
   */
  async generateQRDataUrl(qrCode: string): Promise<string> {
    return QRCode.toDataURL(qrCode, {
      width: 300,
      margin: 2,
      errorCorrectionLevel: 'M',
    });
  }
}
