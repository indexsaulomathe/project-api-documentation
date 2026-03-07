export enum AllowedMimeType {
  // Documents
  PDF = 'application/pdf',
  DOC = 'application/msword',
  DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  XLS = 'application/vnd.ms-excel',
  XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

  // Images
  JPEG = 'image/jpeg',
  PNG = 'image/png',
  WEBP = 'image/webp',
  GIF = 'image/gif',
}

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20 MB

export const ALLOWED_MIME_TYPES_REGEX = new RegExp(
  `^(${Object.values(AllowedMimeType)
    .map((t) => t.replace(/[.+]/g, '\\$&').replace(/\//g, '\\/'))
    .join('|')})$`,
);

export const ACCEPTED_TYPES_LABEL =
  'PDF, Word (.doc/.docx), Excel (.xls/.xlsx), JPEG, PNG, WebP, GIF — max 20 MB';
