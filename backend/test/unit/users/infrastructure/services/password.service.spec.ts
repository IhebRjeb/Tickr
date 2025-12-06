import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';

import { HashedPasswordVO } from '../../../../../src/modules/users/domain/value-objects/hashed-password.vo';
import { PasswordService } from '../../../../../src/modules/users/infrastructure/services/password.service';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('PasswordService', () => {
  let service: PasswordService;
  let _configService: jest.Mocked<ConfigService>;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockConfigService.get.mockReturnValue(10); // Default salt rounds

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PasswordService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<PasswordService>(PasswordService);
    _configService = module.get(ConfigService);
  });

  describe('constructor', () => {
    it('should use default salt rounds when not configured', () => {
      mockConfigService.get.mockReturnValue(10);

      expect(service.getSaltRounds()).toBe(10);
      expect(mockConfigService.get).toHaveBeenCalledWith('BCRYPT_ROUNDS', 10);
    });

    it('should use configured salt rounds', async () => {
      mockConfigService.get.mockReturnValue(12);

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PasswordService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      const customService = module.get<PasswordService>(PasswordService);
      expect(customService.getSaltRounds()).toBe(12);
    });
  });

  describe('hash', () => {
    it('should hash password with configured salt rounds', async () => {
      const password = 'MySecurePass123!';
      const expectedHash = '$2b$10$hashedpassword';
      (bcrypt.hash as jest.Mock).mockResolvedValue(expectedHash);

      const result = await service.hash(password);

      expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
      expect(result).toBe(expectedHash);
    });

    it('should use different salt rounds when configured', async () => {
      mockConfigService.get.mockReturnValue(12);
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$12$hash');

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PasswordService,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      const customService = module.get<PasswordService>(PasswordService);
      await customService.hash('password');

      expect(bcrypt.hash).toHaveBeenCalledWith('password', 12);
    });

    it('should handle empty password', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$10$emptyhash');

      const result = await service.hash('');

      expect(bcrypt.hash).toHaveBeenCalledWith('', 10);
      expect(result).toBe('$2b$10$emptyhash');
    });
  });

  describe('compare', () => {
    it('should return true for matching password', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.compare('password', '$2b$10$hash');

      expect(bcrypt.compare).toHaveBeenCalledWith('password', '$2b$10$hash');
      expect(result).toBe(true);
    });

    it('should return false for non-matching password', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.compare('wrongpassword', '$2b$10$hash');

      expect(bcrypt.compare).toHaveBeenCalledWith('wrongpassword', '$2b$10$hash');
      expect(result).toBe(false);
    });

    it('should handle empty plaintext', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.compare('', '$2b$10$hash');

      expect(bcrypt.compare).toHaveBeenCalledWith('', '$2b$10$hash');
      expect(result).toBe(false);
    });
  });

  describe('createHashedPassword', () => {
    it('should delegate to HashedPasswordVO.create', async () => {
      const password = 'SecurePass123!';
      const createSpy = jest.spyOn(HashedPasswordVO, 'create');
      const mockVO = { hash: '$2b$10$hash' } as HashedPasswordVO;
      createSpy.mockResolvedValue(mockVO);

      const result = await service.createHashedPassword(password);

      expect(createSpy).toHaveBeenCalledWith(password);
      expect(result).toBe(mockVO);

      createSpy.mockRestore();
    });
  });

  describe('verifyHashedPassword', () => {
    it('should delegate to HashedPasswordVO.compare', async () => {
      const plaintext = 'password';
      const mockVO = {
        compare: jest.fn().mockResolvedValue(true),
      } as unknown as HashedPasswordVO;

      const result = await service.verifyHashedPassword(plaintext, mockVO);

      expect(mockVO.compare).toHaveBeenCalledWith(plaintext);
      expect(result).toBe(true);
    });

    it('should return false for non-matching password', async () => {
      const mockVO = {
        compare: jest.fn().mockResolvedValue(false),
      } as unknown as HashedPasswordVO;

      const result = await service.verifyHashedPassword('wrong', mockVO);

      expect(result).toBe(false);
    });
  });

  describe('needsRehash', () => {
    it('should return false when hash rounds match configuration', () => {
      mockConfigService.get.mockReturnValue(10);

      const result = service.needsRehash('$2b$10$somehashvalue12345678901234567890123456789012345678901234');

      expect(result).toBe(false);
    });

    it('should return true when hash rounds differ from configuration', () => {
      mockConfigService.get.mockReturnValue(10);

      const result = service.needsRehash('$2b$08$somehashvalue12345678901234567890123456789012345678901234');

      expect(result).toBe(true);
    });

    it('should return true for invalid hash format', () => {
      const result = service.needsRehash('invalidhash');

      expect(result).toBe(true);
    });

    it('should handle $2a$ prefix', () => {
      const result = service.needsRehash('$2a$10$somehashvalue12345678901234567890123456789012345678901234');

      expect(result).toBe(false);
    });

    it('should handle $2y$ prefix', () => {
      const result = service.needsRehash('$2y$10$somehashvalue12345678901234567890123456789012345678901234');

      expect(result).toBe(false);
    });

    it('should return true for higher configured rounds', async () => {
      mockConfigService.get.mockReturnValue(12);

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PasswordService,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      const customService = module.get<PasswordService>(PasswordService);
      const result = customService.needsRehash('$2b$10$somehashvalue12345678901234567890123456789012345678901234');

      expect(result).toBe(true);
    });
  });

  describe('getSaltRounds', () => {
    it('should return configured salt rounds', () => {
      expect(service.getSaltRounds()).toBe(10);
    });
  });
});

describe('PasswordService Integration', () => {
  // Note: Integration tests with real bcrypt are skipped in unit test suite
  // They should be run separately with actual bcrypt module
  // Use `npm run test:integration` for these tests
  
  it.skip('should hash and verify password correctly', async () => {
    // This test requires real bcrypt, which is mocked in unit tests
  });

  it.skip('should produce different hashes for same password', async () => {
    // This test requires real bcrypt, which is mocked in unit tests
  });
});
