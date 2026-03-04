import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { StorageService } from './storage.service';
import { S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(),
  PutObjectCommand: jest.fn(),
  DeleteObjectCommand: jest.fn(),
  CreateBucketCommand: jest.fn(),
  HeadBucketCommand: jest.fn(),
  GetObjectCommand: jest.fn(),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

describe('StorageService', () => {
  let service: StorageService;
  let mockSend: jest.Mock;

  const mockConfigService = {
    getOrThrow: jest.fn((key: string): string => {
      const config: Record<string, string> = {
        MINIO_ENDPOINT: 'localhost',
        MINIO_PORT: '9000',
        MINIO_ACCESS_KEY: 'minioadmin',
        MINIO_SECRET_KEY: 'minioadmin',
      };
      return config[key];
    }),
    get: jest.fn((key: string): string | undefined => {
      const config: Record<string, string> = {
        MINIO_USE_SSL: 'false',
        MINIO_BUCKET: 'employee-documents',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    mockSend = jest.fn().mockResolvedValue({});
    (S3Client as jest.Mock).mockImplementation(() => ({ send: mockSend }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should only call HeadBucket when bucket already exists', async () => {
      mockSend.mockClear();
      mockSend.mockResolvedValueOnce({});

      await service.onModuleInit();

      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should call CreateBucket when HeadBucket throws', async () => {
      mockSend.mockClear();
      mockSend
        .mockRejectedValueOnce(new Error('NoSuchBucket'))
        .mockResolvedValueOnce({});

      await service.onModuleInit();

      expect(mockSend).toHaveBeenCalledTimes(2);
    });
  });

  describe('upload', () => {
    it('should send PutObjectCommand and return the key', async () => {
      const key = 'emp-1/doc-1/v1/file.pdf';
      const body = Buffer.from('pdf content');

      const result = await service.upload(key, body, 'application/pdf', 'file.pdf');

      expect(result).toBe(key);
      expect(mockSend).toHaveBeenCalledTimes(1);
    });
  });

  describe('getSignedDownloadUrl', () => {
    it('should return the signed URL from getSignedUrl', async () => {
      const expected = 'https://signed.url/file.pdf?token=abc';
      (getSignedUrl as jest.Mock).mockResolvedValue(expected);

      const url = await service.getSignedDownloadUrl('some/key');

      expect(url).toBe(expected);
    });

    it('should use default expiresIn of 3600', async () => {
      (getSignedUrl as jest.Mock).mockResolvedValue('https://signed.url/file');

      await service.getSignedDownloadUrl('some/key');

      expect(getSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        { expiresIn: 3600 },
      );
    });

    it('should forward custom expiresIn', async () => {
      (getSignedUrl as jest.Mock).mockResolvedValue('https://signed.url/file');

      await service.getSignedDownloadUrl('some/key', 7200);

      expect(getSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        { expiresIn: 7200 },
      );
    });
  });

  describe('delete', () => {
    it('should send DeleteObjectCommand for the given key', async () => {
      await service.delete('some/key/file.pdf');

      expect(mockSend).toHaveBeenCalledTimes(1);
    });
  });

  describe('buildKey', () => {
    it('should return the correct path format', () => {
      const key = service.buildKey('emp-uuid', 'doc-uuid', 3, 'contract.pdf');

      expect(key).toBe('emp-uuid/doc-uuid/v3/contract.pdf');
    });

    it('should include version prefix v', () => {
      const key = service.buildKey('e1', 'd1', 1, 'doc.png');

      expect(key).toContain('/v1/');
    });
  });
});
