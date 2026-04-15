import { createHash } from 'crypto';

import { ValueObject } from '@shared/domain/value-object.base';

import { InvalidQRCodeException } from '../exceptions/invalid-qr-code.exception';

/**
 * QR Code Value Object
 *
 * Format: v1-{uuid_v4}-{checksum_4chars}
 * Checksum = md5(uuid).substring(0, 4)
 *
 * Globally unique, checksum-validated, immutable.
 */
export class QRCodeVO extends ValueObject<{ code: string }> {
  private constructor(code: string) {
    super({ code });
  }

  get value(): string {
    return this.props.code;
  }

  /**
   * Generate a new QR code with a random UUID and checksum
   */
  static generate(): QRCodeVO {
    const uuid = crypto.randomUUID();
    const checksum = QRCodeVO.calculateChecksum(uuid);
    const code = `v1-${uuid}-${checksum}`;
    return new QRCodeVO(code);
  }

  /**
   * Parse and validate an existing QR code string
   */
  static fromString(code: string): QRCodeVO {
    if (!QRCodeVO.isValid(code)) {
      throw InvalidQRCodeException.invalidFormat();
    }

    const uuid = QRCodeVO.extractUUID(code);
    const checksum = QRCodeVO.extractChecksum(code);

    if (QRCodeVO.calculateChecksum(uuid) !== checksum) {
      throw InvalidQRCodeException.invalidChecksum();
    }

    return new QRCodeVO(code);
  }

  /**
   * Validate QR code format and checksum
   */
  private static isValid(code: string): boolean {
    if (!code || typeof code !== 'string') return false;

    const parts = code.split('-');
    // v1 + 5 UUID parts + checksum = 7 parts
    if (parts.length !== 7) return false;
    if (parts[0] !== 'v1') return false;

    // Validate UUID portion (parts 1-5)
    const uuidParts = parts.slice(1, 6);
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const uuid = uuidParts.join('-');
    if (!uuidPattern.test(uuid)) return false;

    // Validate checksum portion (part 6)
    const checksumPattern = /^[0-9a-f]{4}$/i;
    if (!checksumPattern.test(parts[6])) return false;

    return true;
  }

  private static extractUUID(code: string): string {
    const parts = code.split('-');
    return parts.slice(1, 6).join('-');
  }

  private static extractChecksum(code: string): string {
    const parts = code.split('-');
    return parts[6];
  }

  private static calculateChecksum(uuid: string): string {
    return createHash('md5').update(uuid).digest('hex').substring(0, 4);
  }

  protected validate(props: { code: string }): void {
    if (!props.code || typeof props.code !== 'string') {
      throw InvalidQRCodeException.invalidFormat();
    }
  }
}
