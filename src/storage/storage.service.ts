import {
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private available = false;

  constructor(private readonly configService: ConfigService) {
    const endpoint = this.configService.getOrThrow<string>('MINIO_ENDPOINT');
    const port = this.configService.getOrThrow<number>('MINIO_PORT');
    const accessKeyId =
      this.configService.getOrThrow<string>('MINIO_ACCESS_KEY');
    const secretAccessKey =
      this.configService.getOrThrow<string>('MINIO_SECRET_KEY');
    const useSSL = this.configService.get<string>('MINIO_USE_SSL') === 'true';

    this.bucket =
      this.configService.get<string>('MINIO_BUCKET') ?? 'employee-documents';

    this.client = new S3Client({
      endpoint: `${useSSL ? 'https' : 'http'}://${endpoint}:${port}`,
      region: 'us-east-1',
      credentials: {
        accessKeyId: accessKeyId ?? '',
        secretAccessKey: secretAccessKey ?? '',
      },
      forcePathStyle: true, // required for MinIO
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.ensureBucketExists();
      this.available = true;
    } catch (err) {
      this.logger.error(
        `Storage unavailable at startup: ${(err as Error).message}`,
      );
    }
  }

  private async assertAvailable(): Promise<void> {
    if (!this.available) {
      try {
        await this.ensureBucketExists();
        this.available = true;
        this.logger.log('Storage reconnected successfully');
      } catch {
        throw new ServiceUnavailableException('Storage service is unavailable');
      }
    }
  }

  async upload(
    key: string,
    body: Buffer,
    contentType: string,
    originalName: string,
  ): Promise<string> {
    await this.assertAvailable();
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        ContentLength: body.length,
        ContentDisposition: `attachment; filename="${encodeURIComponent(originalName)}"`,
      }),
    );
    this.logger.log(`Uploaded file: ${key} (${body.length} bytes)`);
    return key;
  }

  async getSignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
    await this.assertAvailable();
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn },
    );
  }

  async delete(key: string): Promise<void> {
    await this.assertAvailable();
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    this.logger.log(`Deleted file: ${key}`);
  }

  buildKey(
    employeeId: string,
    documentTypeId: string,
    version: number,
    fileName: string,
  ): string {
    return `${employeeId}/${documentTypeId}/v${version}/${this.sanitizeFileName(fileName)}`;
  }

  /**
   * Strips characters unsafe for storage keys: allows letters, digits, dots,
   * hyphens and underscores; replaces everything else with underscores.
   * Also prevents path traversal by collapsing consecutive dots.
   */
  sanitizeFileName(name: string): string {
    return name
      .replace(/\.{2,}/g, '.')
      .replace(/[^a-zA-Z0-9.\-_]/g, '_')
      .substring(0, 200);
  }

  private async ensureBucketExists(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`Bucket "${this.bucket}" already exists`);
    } catch {
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`Bucket "${this.bucket}" created`);
    }
  }
}
