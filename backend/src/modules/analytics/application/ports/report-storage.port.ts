/**
 * Injection token for ReportStorageService
 */
export const REPORT_STORAGE = Symbol('REPORT_STORAGE');

/**
 * Report Storage Port
 *
 * Defines the contract for uploading and accessing analytics reports.
 * Implementation uses S3/LocalStack in infrastructure layer.
 */
export interface ReportStoragePort {
  upload(
    fileName: string,
    content: Buffer,
    contentType: string,
  ): Promise<string>;

  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;

  delete(key: string): Promise<void>;
}
