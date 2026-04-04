import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

export const s3 = new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

export const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME!;

export async function uploadToS3(key: string, body: Buffer, mimeType: string): Promise<string> {
    await s3.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: body,
        ContentType: mimeType,
    }));
    return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}

export async function getFromS3AsBase64(key: string): Promise<string> {
    const response = await s3.send(new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
    }));
    const bytes = await response.Body?.transformToByteArray();
    if (!bytes) throw new Error(`Failed to read S3 object: ${key}`);
    return Buffer.from(bytes).toString('base64');
}

export async function getFromS3AsBuffer(key: string): Promise<Buffer> {
    const response = await s3.send(new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
    }));
    const bytes = await response.Body?.transformToByteArray();
    if (!bytes) throw new Error(`Failed to read S3 object: ${key}`);
    return Buffer.from(bytes);
}
