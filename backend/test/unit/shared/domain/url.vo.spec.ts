import { Url, InvalidUrlException } from '@shared/domain/value-objects/url.vo';

describe('Url Value Object', () => {
  describe('create', () => {
    it('should create valid HTTP URL', () => {
      const url = Url.create('http://example.com');

      expect(url.value).toBe('http://example.com');
      expect(url.protocol).toBe('http');
      expect(url.hostname).toBe('example.com');
    });

    it('should create valid HTTPS URL', () => {
      const url = Url.create('https://example.com');

      expect(url.value).toBe('https://example.com');
      expect(url.protocol).toBe('https');
      expect(url.isHttps).toBe(true);
    });

    it('should handle URLs with paths', () => {
      const url = Url.create('https://example.com/path/to/resource');

      expect(url.pathname).toBe('/path/to/resource');
    });

    it('should trim whitespace', () => {
      const url = Url.create('  https://example.com  ');

      expect(url.value).toBe('https://example.com');
    });

    it('should throw on invalid URL format', () => {
      expect(() => Url.create('not-a-url')).toThrow(InvalidUrlException);
      expect(() => Url.create('ftp://example.com')).toThrow(InvalidUrlException);
      expect(() => Url.create('')).toThrow(InvalidUrlException);
    });
  });

  describe('properties', () => {
    it('should correctly identify HTTPS', () => {
      const httpsUrl = Url.create('https://example.com');
      const httpUrl = Url.create('http://example.com');

      expect(httpsUrl.isHttps).toBe(true);
      expect(httpUrl.isHttps).toBe(false);
    });

    it('should extract hostname correctly', () => {
      const url = Url.create('https://subdomain.example.com/path');

      expect(url.hostname).toBe('subdomain.example.com');
    });

    it('should handle complex URLs', () => {
      const url = Url.create('https://www.example.com/path?query=1#hash');

      expect(url.hostname).toBe('www.example.com');
      expect(url.pathname).toBe('/path');
    });
  });

  describe('equals', () => {
    it('should return true for same URLs', () => {
      const url1 = Url.create('https://example.com');
      const url2 = Url.create('https://example.com');

      expect(url1.equals(url2)).toBe(true);
    });

    it('should return false for different URLs', () => {
      const url1 = Url.create('https://example1.com');
      const url2 = Url.create('https://example2.com');

      expect(url1.equals(url2)).toBe(false);
    });
  });
});
