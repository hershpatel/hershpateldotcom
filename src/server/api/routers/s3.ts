import { S3Client, ListObjectsV2Command, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { z } from "zod";
import { env } from "~/env";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

// Extract bucket name from ARN
// Format: arn:aws:s3:::bucket-name
const getBucketFromArn = (arn: string): string => {
    const bucketName = arn.split(":").pop();
    if (!bucketName) {
      throw new Error("Invalid bucket ARN format");
    }
    return bucketName;
  };
const bucketName = getBucketFromArn(env.HERSHEY_PHOTOS_S3_BUCKET);

function getS3Client() {
    const [, accessKey, secretKey] = env.HERSHEY_PHOTOS_IAM_USER.split("|");
    if (!accessKey || !secretKey) {
      throw new Error("Invalid IAM credentials format");
    }

  return new S3Client({
    region: "us-east-1",
    credentials: {
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
    },
  });
}
const s3Client = getS3Client();

export const s3Router = createTRPCRouter({
  listPhotos: publicProcedure
    .input(z.object({
      prefix: z.string().optional(),
    }))
    .output(z.array(z.string()))
    .query(async ({ input }) => {
      
      try {
        const request = new ListObjectsV2Command({
          Bucket: bucketName,
          Prefix: input.prefix,
          MaxKeys: 1000,
        });
        
        const response = await s3Client.send(request);
        
        // Extract keys and prepend CloudFront URL
        const files = response.Contents?.map(obj => {
          const key = obj.Key;
          if (!key) return "";
          // Ensure the CloudFront URL doesn't end with a slash while the key doesn't start with one
          const cloudFrontUrl = env.CLOUDFRONT_URL.replace(/\/$/, "");
          const cleanKey = key.startsWith("/") ? key.slice(1) : key;
          return `${cloudFrontUrl}/${cleanKey}`;
        }).filter(url => url !== "") ?? [];
        
        return files;
      } catch (error) {
        console.error('Error listing photos:', error);
        throw new Error('Failed to list photos from S3');
      }
    }),

  getUploadUrls: publicProcedure
    .input(z.array(z.object({
      filename: z.string(),
      contentType: z.string()
    })))
    .output(z.array(z.object({
      url: z.string(),
      key: z.string()
    })))
    .mutation(async ({ input }) => {
      try {
        const urls = await Promise.all(
          input.map(async (file) => {
            const key = file.filename;
            const command = new PutObjectCommand({
              Bucket: bucketName,
              Key: key,
              ContentType: file.contentType
            });

            const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
            return { url, key };
          })
        );

        return urls;
      } catch (error) {
        console.error('Error generating upload URLs:', error);
        throw new Error('Failed to generate upload URLs');
      }
    }),
});
