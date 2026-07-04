import "server-only";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Cliente de storage S3-compatível (AWS S3 / Cloudflare R2).
 * Configuração 100% via env — se faltar, `storageEnabled()` retorna false e a
 * UI degrada graciosamente ("storage não configurado").
 *
 * Envs:
 *   S3_ENDPOINT, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET
 */
const endpoint = process.env.S3_ENDPOINT;
const region = process.env.S3_REGION ?? "auto";
const accessKeyId = process.env.S3_ACCESS_KEY_ID;
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
const bucket = process.env.S3_BUCKET;

export function storageEnabled(): boolean {
  return Boolean(endpoint && accessKeyId && secretAccessKey && bucket);
}

let cached: S3Client | undefined;
function client(): S3Client {
  if (!cached) {
    cached = new S3Client({
      region,
      endpoint,
      forcePathStyle: true, // R2/MinIO
      credentials: { accessKeyId: accessKeyId!, secretAccessKey: secretAccessKey! },
    });
  }
  return cached;
}

/** URL pré-assinada para o navegador fazer PUT direto no bucket (5 min). */
export function presignPut(key: string, contentType: string): Promise<string> {
  return getSignedUrl(
    client(),
    new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }),
    { expiresIn: 300 },
  );
}

/** URL pré-assinada de download (força download com o nome original). */
export function presignGet(key: string, fileName: string): Promise<string> {
  return getSignedUrl(
    client(),
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${encodeURIComponent(fileName)}"`,
    }),
    { expiresIn: 300 },
  );
}

export async function deleteObject(key: string): Promise<void> {
  await client().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
