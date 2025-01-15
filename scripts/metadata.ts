/**
 * Write a metadata extractor script that will extract the metadata from the images and print it to the console.
 *
 * Read the images from the photos/ folder in this same directory.
 * 
 * Extract the metadata using the sharp library.
 * 
 * Print the metadata to the console.
 * 
 * Include instructions on how to run the script.
 */

/**
 * To run this script:
 * 1. Make sure you have images in the scripts/photos directory
 * 2. Run: npx tsx scripts/metadata.ts
 */

import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import exifr from 'exifr';

// ESM module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ImageMetadata {
  camera?: string;
  make?: string;
  model?: string;
  createdAt?: Date;
}

async function extractImageMetadata(imageBuffer: Buffer | Uint8Array): Promise<ImageMetadata> {
  const metadata = await sharp(imageBuffer).metadata();
  let result: ImageMetadata = {};

  if (metadata.exif) {
    try {
      const exifData = await exifr.parse(imageBuffer, {
        pick: ['Make', 'Model', 'DateTimeOriginal']
      });
      
      if (exifData) {
        if (exifData.Make) result.make = exifData.Make.trim();
        if (exifData.Model) result.model = exifData.Model.trim();
        if (exifData.Make && exifData.Model) {
          result.camera = `${exifData.Make} ${exifData.Model}`.trim();
        }
        if (exifData.DateTimeOriginal) {
          result.createdAt = exifData.DateTimeOriginal;
        }
      }
    } catch (exifError) {
      console.error('Error parsing EXIF data:', exifError);
    }
  }

  return result;
}

async function extractMetadata() {
  const photosDir = path.join(__dirname, 'photos');

  try {
    const files = await fs.readdir(photosDir);
    
    console.log(`Found ${files.length} files in ${photosDir}\n`);

    for (const file of files) {
      if (!file.match(/\.(jpg|jpeg|png|webp|gif|avif|heic)$/i)) {
        console.log(`Skipping ${file} - not a supported image file\n`);
        continue;
      }

      const filePath = path.join(photosDir, file);
      try {
        // First show the extracted metadata using our new function
        const imageBuffer = await fs.readFile(filePath);
        const extractedMeta = await extractImageMetadata(imageBuffer);
        console.log(`📸 Extracted Metadata for ${file}:`);
        console.log('----------------------------------------');
        if (extractedMeta.make) console.log(`Make:        ${extractedMeta.make}`);
        if (extractedMeta.model) console.log(`Model:       ${extractedMeta.model}`);
        if (extractedMeta.camera) console.log(`Camera:      ${extractedMeta.camera}`);
        if (extractedMeta.createdAt) console.log(`Created:     ${extractedMeta.createdAt.toISOString()}`);
        console.log('----------------------------------------\n');

        // Then show the full metadata for comparison
        const metadata = await sharp(filePath).metadata();
        console.log(`📸 Full Metadata for ${file}:`);
        console.log('----------------------------------------');
        console.log(`Format:      ${metadata.format}`);
        console.log(`Width:       ${metadata.width}px`);
        console.log(`Height:      ${metadata.height}px`);
        console.log(`Space:       ${metadata.space}`);
        console.log(`Channels:    ${metadata.channels}`);
        console.log(`Depth:       ${metadata.depth}`);
        console.log(`Density:     ${metadata.density}`);
        console.log(`Has Alpha:   ${metadata.hasAlpha}`);
        
        if (metadata.exif) {
          try {
            const exifData = await exifr.parse(filePath, {
              pick: ['Make', 'Model', 'Software', 'DateTimeOriginal', 
                    'FNumber', 'ISO', 'FocalLength', 'ExposureTime']
            });
            
            if (exifData) {
              console.log('\nEXIF Data:');
              if (exifData.Make) console.log(`Make:        ${exifData.Make}`);
              if (exifData.Model) console.log(`Model:       ${exifData.Model}`);
              if (exifData.Software) console.log(`Software:    ${exifData.Software}`);
              if (exifData.DateTimeOriginal) console.log(`Created:     ${exifData.DateTimeOriginal.toISOString()}`);
              if (exifData.FNumber) console.log(`F-Number:    f/${exifData.FNumber}`);
              if (exifData.ISO) console.log(`ISO:         ${exifData.ISO}`);
              if (exifData.FocalLength) console.log(`Focal Len:   ${exifData.FocalLength}mm`);
              if (exifData.ExposureTime) console.log(`Exposure:    1/${1/exifData.ExposureTime}s`);
            }
          } catch (exifError) {
            console.error('Error parsing EXIF data:', exifError);
          }
        }
        
        if (metadata.icc) console.log(`Has ICC:     true`);
        console.log('----------------------------------------\n');
      } catch (err) {
        console.error(`❌ Error reading metadata for ${file}:`, err);
      }
    }
  } catch (err) {
    console.error('❌ Error reading photos directory:', err);
    process.exit(1);
  }
}

// Run the extraction
extractMetadata().catch(err => {
  console.error('❌ Unhandled error:', err);
  process.exit(1);
});
