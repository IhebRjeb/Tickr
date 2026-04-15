import { DomainException } from '@shared/domain/domain-exception.base';

/**
 * Exception thrown when a QR code is invalid
 */
export class InvalidQRCodeException extends DomainException {
  constructor(message: string) {
    super(message, 'INVALID_QR_CODE');
  }

  static invalidFormat(): InvalidQRCodeException {
    return new InvalidQRCodeException(
      'QR code must follow format: v1-{uuid}-{checksum}',
    );
  }

  static invalidChecksum(): InvalidQRCodeException {
    return new InvalidQRCodeException(
      'QR code checksum validation failed',
    );
  }
}
