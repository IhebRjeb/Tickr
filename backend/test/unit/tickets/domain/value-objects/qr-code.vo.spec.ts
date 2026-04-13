/**
 * @file QR Code Value Object Unit Tests
 */

import { QRCodeVO } from '@modules/tickets/domain';

describe('QRCodeVO', () => {
  // ============================================
  // generate()
  // ============================================

  describe('generate()', () => {
    it('should generate a valid QR code in format v1-uuid-checksum', () => {
      const qr = QRCodeVO.generate();
      const parts = qr.value.split('-');

      // v1 + 5 UUID parts + checksum = 7 parts
      expect(parts).toHaveLength(7);
      expect(parts[0]).toBe('v1');
    });

    it('should generate globally unique codes', () => {
      const codes = new Set<string>();
      for (let i = 0; i < 100; i++) {
        codes.add(QRCodeVO.generate().value);
      }
      expect(codes.size).toBe(100);
    });

    it('should produce codes that pass fromString validation', () => {
      const qr = QRCodeVO.generate();
      expect(() => QRCodeVO.fromString(qr.value)).not.toThrow();
    });

    it('should have a 4-character hex checksum', () => {
      const qr = QRCodeVO.generate();
      const parts = qr.value.split('-');
      const checksum = parts[parts.length - 1];
      expect(checksum).toMatch(/^[0-9a-f]{4}$/);
    });
  });

  // ============================================
  // fromString()
  // ============================================

  describe('fromString()', () => {
    it('should accept a valid QR code string', () => {
      const generated = QRCodeVO.generate();
      const parsed = QRCodeVO.fromString(generated.value);
      expect(parsed.value).toBe(generated.value);
    });

    it('should reject a code with wrong version prefix', () => {
      const validCode = QRCodeVO.generate().value;
      const tampered = validCode.replace('v1-', 'v2-');
      expect(() => QRCodeVO.fromString(tampered)).toThrow();
    });

    it('should reject a code with corrupted checksum', () => {
      const validCode = QRCodeVO.generate().value;
      const parts = validCode.split('-');
      parts[parts.length - 1] = '0000'; // Replace checksum
      const tampered = parts.join('-');
      expect(() => QRCodeVO.fromString(tampered)).toThrow();
    });

    it('should reject an empty string', () => {
      expect(() => QRCodeVO.fromString('')).toThrow();
    });

    it('should reject a random string', () => {
      expect(() => QRCodeVO.fromString('not-a-qr-code')).toThrow();
    });

    it('should reject code with missing parts', () => {
      expect(() => QRCodeVO.fromString('v1-abc')).toThrow();
    });

    it('should reject code with invalid UUID section', () => {
      expect(() => QRCodeVO.fromString('v1-not-a-valid-uuid-aaaa')).toThrow();
    });
  });

  // ============================================
  // value getter
  // ============================================

  describe('value getter', () => {
    it('should return the full QR code string', () => {
      const qr = QRCodeVO.generate();
      expect(typeof qr.value).toBe('string');
      expect(qr.value.startsWith('v1-')).toBe(true);
    });
  });
});
