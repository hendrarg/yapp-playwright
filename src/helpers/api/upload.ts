import type { APIRequestContext } from '@playwright/test';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { apiUrl, getHeaders } from '@helpers/api/client';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');

type RequestHeaders = ReturnType<typeof getHeaders> & Record<string, string>;

export interface UploadFileOptions {
  filePath: string;
  filename?: string;
  filetype?: string;
  token?: string;
  headers?: RequestHeaders;
}

export interface UploadedFile {
  uploadId: string;
  key: string;
  filename: string;
  filetype: string;
  assetType: 'image' | 'video';
}

function fileTypeFromPath(filePath: string) {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? 'jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'mp4') return 'video/mp4';
  if (ext === 'jpg' || ext === 'jpeg' || ext === 'jfif') return 'image/jpeg';
  return 'image/jpeg';
}

function headersWithoutContentType(headers: RequestHeaders) {
  const { 'Content-Type': _contentType, ...rest } = headers;
  return rest;
}

export async function uploadFile(
  request: APIRequestContext,
  options: UploadFileOptions,
): Promise<UploadedFile> {
  const headers = options.headers ?? getHeaders(options.token);
  const filetype = options.filetype ?? fileTypeFromPath(options.filePath);
  const filename =
    options.filename ?? path.basename(options.filePath) ?? `${randomUUID()}.${filetype.split('/').pop()}`;

  const createRes = await request.post(apiUrl('/api/v1/file/upload/create'), {
    headers,
    data: { filename, filetype },
  });
  if (!createRes.ok()) {
    throw new Error(`Step 1 (create) failed: ${createRes.status()} ${await createRes.text()}`);
  }
  const createBody = await createRes.json();
  const uploadId = createBody.uploadId ?? createBody.data?.uploadId;
  const key = createBody.key ?? createBody.data?.key;

  const signRes = await request.get(
    apiUrl(
      `/api/v1/file/upload/sign?uploadId=${encodeURIComponent(uploadId)}&key=${encodeURIComponent(key)}&partNumber=1`,
    ),
    { headers: headersWithoutContentType(headers) },
  );
  if (!signRes.ok()) {
    throw new Error(`Step 2 (sign) failed: ${signRes.status()} ${await signRes.text()}`);
  }
  const signBody = await signRes.json();
  const presignedUrl = signBody.url ?? signBody.data?.url ?? signBody.presignedUrl;

  const resolvedPath = path.isAbsolute(options.filePath)
    ? options.filePath
    : path.resolve(PROJECT_ROOT, options.filePath);
  const fileBuffer = fs.readFileSync(resolvedPath);
  const putRes = await request.put(presignedUrl, {
    headers: { 'Content-Type': filetype },
    data: fileBuffer,
  });
  if (!putRes.ok()) {
    throw new Error(`Step 3 (S3 PUT) failed: ${putRes.status()}`);
  }
  const s3Headers = putRes.headers();

  const completeRes = await request.post(apiUrl('/api/v1/file/upload/complete'), {
    headers,
    data: {
      uploadId,
      key,
      parts: [
        {
          PartNumber: 1,
          ETag: s3Headers.etag,
          'x-amz-id-2': s3Headers['x-amz-id-2'],
          'x-amz-request-id': s3Headers['x-amz-request-id'],
          'x-amz-server-side-encryption': s3Headers['x-amz-server-side-encryption'],
          'content-length': String(fileBuffer.length),
        },
      ],
    },
  });
  if (!completeRes.ok()) {
    throw new Error(`Step 4 (complete) failed: ${completeRes.status()} ${await completeRes.text()}`);
  }

  return {
    uploadId,
    key,
    filename,
    filetype,
    assetType: filetype.startsWith('video/') ? 'video' : 'image',
  };
}
