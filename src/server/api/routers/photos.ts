import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { z } from "zod";
import { env } from "~/env";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import sharp from "sharp";
import { images } from "~/server/db/schema";
import { ImageStatus } from "~/app/shh/constants";
import { eq, inArray } from "drizzle-orm";
import Promise from "bluebird";

// Image processing configuration
const IMAGE_CONFIG = {
  THUMBNAIL: {
    width: 400,
    height: 400,
    webp: {
      quality: 80,
      effort: 4
    }
  },
  GALLERY: {
    width: 2700,
    height: null,
    webp: {
      quality: 80,
      effort: 4
    }
  }
} as const;

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
  /*
    Get upload URLs for a list of files
  */
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
      const urls = await Promise.map(input, async (file) => {
        const prefix = file.prefix ? `${file.prefix}/` : '';
        const key = `${prefix}${file.filename}`;
        const command = new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          ContentType: file.contentType
        });

        const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        return { url, key };
      }, { concurrency: 10 }); // Limit concurrent operations to 10

      return urls;
    } catch (error) {
      console.error('Error generating upload URLs:', error);
      throw new Error('Failed to generate upload URLs');
    }
  }),

  /*
    Create a photo record in the database
  */
  createPhotoRecord: publicProcedure
  .input(z.object({
    photoName: z.string(),
    fullKey: z.string(),
  }))
  .mutation(async ({ input, ctx }) => {
    const [result] = await ctx.db.insert(images)
      .values({
        photo_name: input.photoName,
        full_key: input.fullKey,
        original_created_at: new Date(),
        status: ImageStatus.PENDING,
      })
      .onConflictDoUpdate({
        target: images.full_key,
        set: {
          original_created_at: new Date(),
          status: ImageStatus.PENDING,
          camera: undefined,
          thumbnail_key: undefined,
          gallery_key: undefined,
        }
      })
      .returning({ pk: images.pk });

    if (!result) {
      throw new Error('Failed to insert image into database');
    }

    return result;
  }),

  /*
    List photos from the database
  */
  listPhotos: publicProcedure
    .input(z.object({
      status: z.nativeEnum(ImageStatus),
    }))
    .output(z.array(z.object({
      pk: z.string(),
      fullKey: z.string(),
      thumbnailKey: z.string().nullable(),
      galleryKey: z.string().nullable(),
      status: z.nativeEnum(ImageStatus),
      createdAt: z.date(),
    })))
    .query(async ({ input, ctx }) => {
      try {
        const photos = await ctx.db.query.images.findMany({
          where: (images, { eq }) => eq(images.status, input.status),
          columns: {
            pk: true,
            full_key: true,
            thumbnail_key: true,
            gallery_key: true,
            status: true,
            original_created_at: true,
          },
        });

        return photos.map(photo => ({
          pk: photo.pk,
          fullKey: photo.full_key,
          thumbnailKey: photo.thumbnail_key,
          galleryKey: photo.gallery_key,
          status: photo.status as ImageStatus,
          createdAt: photo.original_created_at,
        }));
      } catch (error) {
        console.error('Error listing photos:', error);
        throw new Error('Failed to list photos from database');
      }
    }),

  /*
    List photos with Cloudfront URLs
  */
  listPhotosWithUrls: publicProcedure
    .input(z.object({
      status: z.nativeEnum(ImageStatus),
    }))
    .output(z.array(z.object({
      pk: z.string(),
      fullKey: z.string(),
      thumbnailKey: z.string().nullable(),
      galleryKey: z.string().nullable(),
      status: z.nativeEnum(ImageStatus),
      createdAt: z.date(),
      thumbnailUrl: z.string().nullable(),
      galleryUrl: z.string().nullable(),
      fullUrl: z.string(),
    })))
    .query(async ({ input, ctx }) => {
      try {
        const photos = await ctx.db.query.images.findMany({
          where: (images, { eq }) => eq(images.status, input.status),
          columns: {
            pk: true,
            full_key: true,
            thumbnail_key: true,
            gallery_key: true,
            status: true,
            original_created_at: true,
          },
        });

        return photos.map(photo => ({
          pk: photo.pk,
          fullKey: photo.full_key,
          thumbnailKey: photo.thumbnail_key,
          galleryKey: photo.gallery_key,
          status: photo.status as ImageStatus,
          createdAt: photo.original_created_at,
          thumbnailUrl: photo.thumbnail_key ? `${env.CLOUDFRONT_URL}/${photo.thumbnail_key}` : null,
          galleryUrl: photo.gallery_key ? `${env.CLOUDFRONT_URL}/${photo.gallery_key}` : null,
          fullUrl: `${env.CLOUDFRONT_URL}/${photo.full_key}`,
        }));
      } catch (error) {
        console.error('Error listing photos with URLs:', error);
        throw new Error('Failed to list photos from database');
      }
    }),

  /*
    Optimize an image and store the results in the s3 & database
  */
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
          .resize(IMAGE_CONFIG.THUMBNAIL.width, IMAGE_CONFIG.THUMBNAIL.height, { fit: 'inside', position: 'center' })
          .webp(IMAGE_CONFIG.THUMBNAIL.webp)
          .withMetadata()
          .toBuffer();
        const thumbnailKey = `thumbnail/${baseName}.webp`;

        // Generate gallery version (high quality)
        const galleryWebp = await sharp(imageBuffer)
          .resize(IMAGE_CONFIG.GALLERY.width, IMAGE_CONFIG.GALLERY.height, { fit: 'inside', position: 'center' })
          .webp(IMAGE_CONFIG.GALLERY.webp)
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

        // Update existing record in database
        const [result] = await ctx.db
          .update(images)
          .set({
            thumbnail_key: thumbnailKey,
            gallery_key: galleryKey,
            camera: camera ?? '',
            original_created_at: createdAt ?? new Date(),
            status: ImageStatus.READY,
          })
          .where(eq(images.full_key, input.fullKey))
          .returning({ pk: images.pk });

        if (!result) {
          throw new Error('Failed to update image in database');
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

  /*
    Delete photos from S3 and database
  */
  deletePhotos: publicProcedure
    .input(z.array(z.string()))  // Array of PKs
    .mutation(async ({ input: pks, ctx }) => {
      try {
        // First get the photos from database to get their S3 keys
        const photosToDelete = await ctx.db.query.images.findMany({
          where: (images, { inArray }) => inArray(images.pk, pks),
          columns: {
            pk: true,
            full_key: true,
            thumbnail_key: true,
            gallery_key: true,
          },
        });

        // Collect all S3 keys to delete
        const objectsToDelete = photosToDelete.flatMap(photo => {
          const keys = [photo.full_key];
          if (photo.thumbnail_key) keys.push(photo.thumbnail_key);
          if (photo.gallery_key) keys.push(photo.gallery_key);
          return keys;
        });

        // Delete from S3
        if (objectsToDelete.length > 0) {
          await s3Client.send(new DeleteObjectsCommand({
            Bucket: bucketName,
            Delete: {
              Objects: objectsToDelete.map(Key => ({ Key })),
              Quiet: true
            }
          }));
        }

        // Delete from database using inArray
        await ctx.db.delete(images)
          .where(inArray(images.pk, pks));

        return { success: true };
      } catch (error) {
        console.error('Error deleting photos:', error);
        throw new Error('Failed to delete photos');
      }
    }),
});
