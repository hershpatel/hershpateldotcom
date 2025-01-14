import { S3Client, ListObjectsV2Command, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { z } from "zod";
import { env } from "~/env";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import sharp from "sharp";
import { images } from "~/server/db/schema";

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

export const photosRouter = createTRPCRouter({
  listPhotos: publicProcedure
    .input(z.object({
      prefix: z.string().optional(),
    }))
    .output(z.array(z.object({
      url: z.string(),
      key: z.string(),
      size: z.number().optional()
    })))
    .query(async ({ input }) => {
      
      try {
        const request = new ListObjectsV2Command({
          Bucket: bucketName,
          Prefix: input.prefix ?? "",
          MaxKeys: 1000,
        });
        
        const response = await s3Client.send(request);
        
        // Extract keys and prepend CloudFront URL
        const files = response.Contents?.map(obj => {
          const key = obj.Key;
          if (!key) return {url: "", key: "", size: 0};
          // Ensure the CloudFront URL doesn't end with a slash while the key doesn't start with one
          const cloudFrontUrl = env.CLOUDFRONT_URL.replace(/\/$/, "");
          const cleanKey = key.startsWith("/") ? key.slice(1) : key;
          console.log(cleanKey);
          console.log(`${cloudFrontUrl}/${cleanKey}`);
          return { url: `${cloudFrontUrl}/${cleanKey}`, key: cleanKey, size: obj.Size };
        }).filter(photo => photo.url !== "") ?? [];

        return files;
      } catch (error) {
        console.error('Error listing photos:', error);
        throw new Error('Failed to list photos from S3');
      }
    }),

  getUploadUrls: publicProcedure
    .input(z.array(z.object({
      filename: z.string(),
      contentType: z.string(),
      prefix: z.string().optional()
    })))
    .output(z.array(z.object({
      url: z.string(),
      key: z.string()
    })))
    .mutation(async ({ input }) => {
      try {
        const urls = await Promise.all(
          input.map(async (file) => {
            const prefix = file.prefix ? `${file.prefix}/` : '';
            const key = `${prefix}${file.filename}`;
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

  optimizeImage: publicProcedure
    .input(z.object({
      fullKey: z.string(),
    }))
    .output(z.object({
      thumbnailSize: z.number(),
      gallerySize: z.number(),
      fullSize: z.number(),
      pk: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Function to extract metadata from EXIF
        const extractMetadata = async (imageBuffer: Uint8Array) => {
          const metadata = await sharp(imageBuffer).metadata();
          let camera: string | undefined = undefined;
          let createdAt: Date | undefined = undefined;

          if (metadata.exif) {
            try {
              const exifStr = metadata.exif.toString('utf-8');
              
              // Extract camera info using exec()
              const makeRegex = /Make=([^\n]+)/;
              const modelRegex = /Model=([^\n]+)/;
              const makeExec = makeRegex.exec(exifStr);
              const modelExec = modelRegex.exec(exifStr);
              
              if (makeExec?.[1] && modelExec?.[1]) {
                camera = `${makeExec[1].trim()} ${modelExec[1].trim()}`;
              }
              
              // Extract creation date using exec()
              const dateRegex = /DateTime=([^\n]+)/;
              const dateExec = dateRegex.exec(exifStr);
              if (dateExec?.[1]) {
                const dateStr = dateExec[1].replace(/:/g, '-').slice(0, 10) + 
                              'T' + dateExec[1].slice(11) + 'Z';
                const parsedDate = new Date(dateStr);
                if (!isNaN(parsedDate.getTime())) {
                  createdAt = parsedDate;
                }
              }
            } catch (exifError) {
              console.error('Error parsing EXIF data:', exifError);
            }
          }

          return { camera, createdAt };
        };

        // Get the original image from S3
        const getCommand = new GetObjectCommand({
          Bucket: bucketName,
          Key: input.fullKey,
        });
        const originalImage = await s3Client.send(getCommand);
        if (!originalImage.Body) throw new Error("Failed to get original image");
        const baseName = input.fullKey.split('/').pop()?.split('.')[0] ?? 'untitled';

        // Get image metadata and EXIF data
        const imageBuffer = await originalImage.Body.transformToByteArray();
        const { camera, createdAt } = await extractMetadata(imageBuffer);

        // Generate thumbnail (low quality)
        const thumbnailWebp = await sharp(imageBuffer)
          .resize(300, 300, { fit: 'inside', position: 'center' })
          .webp({
            quality: 80,
            effort: 6
          })
          .withMetadata()
          .toBuffer();
        const thumbnailKey = `thumbnail/${baseName}.webp`;

        // Generate gallery version (high quality)
        const galleryWebp = await sharp(imageBuffer)
          .resize(2500, null, { fit: 'inside', position: 'center' })
          .webp({
            quality: 85,
            effort: 6
          })
          .withMetadata()
          .toBuffer();
        const galleryKey = `gallery/${baseName}.webp`;

        // Upload thumbnail with metadata
        await s3Client.send(new PutObjectCommand({
          Bucket: bucketName,
          Key: thumbnailKey,
          Body: thumbnailWebp,
          ContentType: 'image/webp',
          Metadata: {
            camera: camera ?? '',
            originalCreatedAt: createdAt?.toISOString() ?? '',
          },
        }));

        // Upload gallery version with metadata
        await s3Client.send(new PutObjectCommand({
          Bucket: bucketName,
          Key: galleryKey,
          Body: galleryWebp,
          ContentType: 'image/webp',
          Metadata: {
            camera: camera ?? '',
            originalCreatedAt: createdAt?.toISOString() ?? '',
          },
        }));

        // Store in database and get the generated pk
        const [result] = await ctx.db.insert(images)
          .values({
            full_key: input.fullKey,
            thumbnail_key: thumbnailKey,
            gallery_key: galleryKey,
            camera: camera ?? '',
            original_created_at: createdAt ?? new Date(),
          })
          .onConflictDoUpdate({
            target: images.full_key,
            set: {
              thumbnail_key: thumbnailKey,
              gallery_key: galleryKey,
              camera: camera ?? '',
              original_created_at: createdAt ?? new Date(),
            }
          })
          .returning({ pk: images.pk });

        if (!result) {
          throw new Error('Failed to insert image into database');
        }

        return {
          thumbnailSize: thumbnailWebp.length,
          gallerySize: galleryWebp.length,
          fullSize: imageBuffer.length,
          pk: result.pk,
        };
      } catch (error) {
        console.error('Error optimizing image:', error);
        if (error instanceof Error) {
          throw new Error(`Failed to optimize image: ${error.message}`);
        }
        throw new Error('Failed to optimize image: Unknown error');
      }
    }),
});
