import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { z } from "zod";
import { env } from "~/env";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import sharp from "sharp";
import { images, imageTags, tags } from "~/server/db/schema";
import { ImageStatus } from "~/app/shh/constants";
import { eq, inArray } from "drizzle-orm";
import Bluebird from "bluebird";
import exifr from 'exifr';

// Image processing configuration
const IMAGE_OPTIMIZATION_CONFIG = {
  THUMBNAIL: {
    width: 400,
    height: 400,
    webp: {
      quality: 75,
      effort: 5
    }
  },
  GALLERY: {
    width: 2700,
    height: null,
    webp: {
      quality: 75,
      effort: 6
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
    maxAttempts: 3,
    retryMode: "standard"
  });
}
const s3Client = getS3Client();

interface ImageMetadata {
  Make?: string;
  Model?: string;
  DateTimeOriginal?: Date;
  FNumber?: number;
  ISO?: number;
  FocalLength?: number;
  ExposureTime?: number;
}

const extractMetadata = async (imageBuffer: Uint8Array): Promise<ImageMetadata> => {
  const metadata = await sharp(imageBuffer).metadata();

  if (!metadata.exif) {
    return {};
  }

  try {
    return await exifr.parse(imageBuffer, {
      pick: ['Make', 'Model', 'DateTimeOriginal', 'FNumber', 'ISO', 'FocalLength', 'ExposureTime']
    }) as ImageMetadata;
  } catch (exifError) {
    console.error('Error parsing EXIF data:', exifError);
    return {};
  }
};

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
      const urls = await Bluebird.map(input, async (file) => {
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
        status: ImageStatus.PENDING.toString(),
      })
      .onConflictDoUpdate({
        target: images.full_key,
        set: {
          original_created_at: new Date(),
          status: ImageStatus.PENDING.toString(),
          camera_make: undefined,
          camera_model: undefined,
          iso: undefined,
          focal_length: undefined,
          exposure_time: undefined,
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
    List photos with Cloudfront URLs
  */
  listPhotosWithUrls: publicProcedure
    .input(z.object({
      status: z.nativeEnum(ImageStatus).default(ImageStatus.READY),
      random: z.boolean().default(false),
      tagPks: z.array(z.string()).optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      ascending: z.boolean().default(false),
      includeTags: z.boolean().default(false),
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
      cameraModel: z.string().nullable(),
      tags: z.array(z.object({
        pk: z.string(),
        name: z.string(),
      })).optional(),
    })))
    .query(async ({ input, ctx }) => {
      try {
        // First get all photos
        const photos = await ctx.db.query.images.findMany({
          where: (images, { eq, and, exists, inArray, gte, lte }) => {
            const conditions = [eq(images.status, input.status)];
            
            if (input.tagPks && input.tagPks.length > 0) {
              conditions.push(
                exists(
                  ctx.db.select()
                    .from(imageTags)
                    .where(and(
                      eq(imageTags.image_pk, images.pk),
                      inArray(imageTags.tag_pk, input.tagPks)
                    ))
                )
              );
            }

            if (input.startDate) {
              conditions.push(gte(images.original_created_at, input.startDate));
            }
            if (input.endDate) {
              conditions.push(lte(images.original_created_at, input.endDate));
            }
            
            return and(...conditions);
          },
          columns: {
            pk: true,
            full_key: true,
            thumbnail_key: true,
            gallery_key: true,
            status: true,
            original_created_at: true,
            camera_model: true,
          },
          orderBy: input.random 
            ? (images, { sql }) => sql`random()` 
            : (images, { desc, asc }) => [input.ascending ? asc(images.original_created_at) : desc(images.original_created_at)],
        });

        const tagsByPhotoPk = new Map<string, Array<{ pk: string; name: string; }>>();
        
        if (input.includeTags) {
          // Then get tags for all photos in a single query
          const photoTags = await ctx.db.select({
            imagePk: imageTags.image_pk,
            tagPk: tags.pk,
            tagName: tags.name,
          })
          .from(imageTags)
          .innerJoin(tags, eq(tags.pk, imageTags.tag_pk))
          .where(inArray(imageTags.image_pk, photos.map(p => p.pk)));

          // Create a map of photo pk to tags for efficient lookup
          for (const { imagePk, tagPk, tagName } of photoTags) {
            if (!tagsByPhotoPk.has(imagePk)) {
              tagsByPhotoPk.set(imagePk, []);
            }
            tagsByPhotoPk.get(imagePk)?.push({ pk: tagPk, name: tagName });
          }
        }

        // Map photos with their tags
        const mappedPhotos = photos.map(photo => ({
          pk: photo.pk,
          fullKey: photo.full_key,
          thumbnailKey: photo.thumbnail_key,
          galleryKey: photo.gallery_key,
          status: photo.status as ImageStatus,
          createdAt: photo.original_created_at,
          thumbnailUrl: photo.thumbnail_key ? `${env.CLOUDFRONT_URL}/${photo.thumbnail_key}` : null,
          galleryUrl: photo.gallery_key ? `${env.CLOUDFRONT_URL}/${photo.gallery_key}` : null,
          fullUrl: `${env.CLOUDFRONT_URL}/${photo.full_key}`,
          cameraModel: photo.camera_model,
          ...(input.includeTags && { tags: tagsByPhotoPk.get(photo.pk) ?? [] }),
        }));
        return mappedPhotos;
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
        const metadata = await extractMetadata(imageBuffer);
        const s3Metadata = {
          make: metadata.Make ?? '',
          model: metadata.Model ?? '',
          originalCreatedAt: metadata.DateTimeOriginal ?? new Date(),
          iso: metadata.ISO?.toString() ?? '',
          focalLength: metadata.FocalLength?.toString() ?? '',
          exposureTime: metadata.ExposureTime?.toString() ?? '',
          fNumber: metadata.FNumber?.toString() ?? '',
        };

        // Generate thumbnail (low quality)
        const thumbnailWebp = await sharp(imageBuffer)
          .resize(IMAGE_OPTIMIZATION_CONFIG.THUMBNAIL.width, IMAGE_OPTIMIZATION_CONFIG.THUMBNAIL.height, { fit: 'inside', position: 'center' })
          .webp(IMAGE_OPTIMIZATION_CONFIG.THUMBNAIL.webp)
          .withMetadata()
          .toBuffer();
        const thumbnailKey = `thumbnail/${baseName}.webp`;

        // Generate gallery version (high quality)
        const galleryWebp = await sharp(imageBuffer)
          .resize(IMAGE_OPTIMIZATION_CONFIG.GALLERY.width, IMAGE_OPTIMIZATION_CONFIG.GALLERY.height, { fit: 'inside', position: 'center' })
          .webp(IMAGE_OPTIMIZATION_CONFIG.GALLERY.webp)
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
            ...s3Metadata,
            originalCreatedAt: s3Metadata.originalCreatedAt.toISOString(),
          },
        }));

        // Upload gallery version with metadata
        await s3Client.send(new PutObjectCommand({
          Bucket: bucketName,
          Key: galleryKey,
          Body: galleryWebp,
          ContentType: 'image/webp',
          Metadata: {
            ...s3Metadata,
            originalCreatedAt: s3Metadata.originalCreatedAt.toISOString(),
          },
        }));

        // Update existing record in database
        const [result] = await ctx.db
          .update(images)
          .set({
            thumbnail_key: thumbnailKey,
            gallery_key: galleryKey,
            camera_make: s3Metadata.make?.trim() || null,
            camera_model: s3Metadata.model?.trim() || null,
            original_created_at: s3Metadata.originalCreatedAt,
            iso: s3Metadata.iso?.trim() || null,
            focal_length: s3Metadata.focalLength?.toString() || null,
            exposure_time: s3Metadata.exposureTime?.toString() || null,
            f_number: s3Metadata.fNumber?.toString() || null,
            status: ImageStatus.READY.toString(),
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
        // Update status to error in database
        await ctx.db
          .update(images)
          .set({
            status: ImageStatus.ERROR.toString(),
          })
          .where(eq(images.full_key, input.fullKey));

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

  /*
    List all photos with their tags, without filtering
  */
  listAllPhotosWithTags: publicProcedure
    .input(z.object({
      status: z.nativeEnum(ImageStatus).default(ImageStatus.READY),
      random: z.boolean().default(false),
      ascending: z.boolean().default(false),
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
      cameraModel: z.string().nullable(),
      tags: z.array(z.object({
        pk: z.string(),
        name: z.string(),
      })),
    })))
    .query(async ({ input, ctx }) => {
      try {
        // Get all photos with just status filter
        const photos = await ctx.db.query.images.findMany({
          where: eq(images.status, input.status),
          columns: {
            pk: true,
            full_key: true,
            thumbnail_key: true,
            gallery_key: true,
            status: true,
            original_created_at: true,
            camera_model: true,
          },
          orderBy: input.random 
            ? (images, { sql }) => sql`random()` 
            : (images, { desc, asc }) => [input.ascending ? asc(images.original_created_at) : desc(images.original_created_at)],
        });

        // Get tags for all photos in a single query
        const photoTags = await ctx.db.select({
          imagePk: imageTags.image_pk,
          tagPk: tags.pk,
          tagName: tags.name,
        })
        .from(imageTags)
        .innerJoin(tags, eq(tags.pk, imageTags.tag_pk))
        .where(inArray(imageTags.image_pk, photos.map(p => p.pk)));

        // Create a map of photo pk to tags for efficient lookup
        const tagsByPhotoPk = new Map<string, Array<{ pk: string; name: string; }>>();
        for (const { imagePk, tagPk, tagName } of photoTags) {
          if (!tagsByPhotoPk.has(imagePk)) {
            tagsByPhotoPk.set(imagePk, []);
          }
          tagsByPhotoPk.get(imagePk)?.push({ pk: tagPk, name: tagName });
        }

        // Map photos with their tags
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
          cameraModel: photo.camera_model,
          tags: tagsByPhotoPk.get(photo.pk) ?? [],
        }));
      } catch (error) {
        console.error('Error listing all photos with tags:', error);
        throw new Error('Failed to list photos from database');
      }
    }),
});
