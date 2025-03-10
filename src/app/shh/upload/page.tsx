'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { api } from '~/trpc/react';
import { ImageType } from '../constants';
import Promise from 'bluebird';
interface UploadProgress {
    file: File;
    progress: number;
    status: 'waiting' | 'uploading' | 'creating' | 'optimizing' | 'completed' | 'error';
    error?: string;
    sizes?: {
      thumbnailSize: number;
      gallerySize: number;
      fullSize: number;
    };
  }
  
  const BATCH_SIZE = 5;

  const STATUS_EMOJI: Record<UploadProgress['status'], string> = {
    waiting: '🔜',
    uploading: '🔄',
    creating: '📝',
    optimizing: '⚡',
    completed: '✅',
    error: '❌',
  };

export default function UploadPage() {
    const [uploadQueue, setUploadQueue] = useState<UploadProgress[]>([]);
    const [isUploading, setIsUploading] = useState(false);
  
    const calculateOverallProgress = useCallback(() => {
        if (uploadQueue.length === 0) return 0;
        const completedFiles = uploadQueue.filter(item => item.status === 'completed').length;
        return (completedFiles / uploadQueue.length) * 100;
    }, [uploadQueue]);
  
    const onDrop = useCallback((acceptedFiles: File[]) => {
      const newFiles = acceptedFiles.map((file): UploadProgress => ({
        file,
        progress: 0,
        status: 'waiting'
      }));
      setUploadQueue(prev => [...prev, ...newFiles]);
    }, []);
  
    const removeFile = useCallback((index: number) => {
      setUploadQueue(prev => prev.filter((_, i) => i !== index));
    }, []);
  
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
      onDrop,
      multiple: true,
      accept: {
        'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp', '.heic', '.heif']
      },
      maxSize: 50 * 1024 * 1024, // 50MB
      maxFiles: 250,
    });
  
    const getUploadUrls = api.photos.getUploadUrls.useMutation();
    const createPhotoRecord = api.photos.createPhotoRecord.useMutation();
    const optimizeMutation = api.photos.optimizeImage.useMutation();
  
    const uploadBatch = async (batch: UploadProgress[]) => {
      try {
        // Get pre-signed URLs for the batch
        const urlsResponse = await getUploadUrls.mutateAsync(
          batch.map(item => ({
            filename: item.file.name,
            contentType: item.file.type,
            prefix: ImageType.FULL
          }))
        );
  
        // Using Bluebird's Promise.map with concurrency control
        await Promise.map(batch, async (item, index) => {
          const uploadUrl = urlsResponse[index]?.url;
          const key = urlsResponse[index]?.key;
          if (!uploadUrl || !key) {
            throw new Error('Failed to get upload URL');
          }
  
          try {
            // Update status to uploading
            setUploadQueue(prev => prev.map(queueItem => 
              queueItem.file === item.file 
                ? { ...queueItem, status: 'uploading' }
                : queueItem
            ));
  
            // Upload to S3 using pre-signed URL
            const response = await fetch(uploadUrl, {
              method: 'PUT',
              body: item.file,
              headers: {
                'Content-Type': item.file.type,
              }
            });
  
            if (!response.ok) {
              throw new Error(`Upload failed with status ${response.status}`);
            }

            // Update status to creating record
            setUploadQueue(prev => prev.map(queueItem => 
              queueItem.file === item.file 
                ? { ...queueItem, status: 'creating' }
                : queueItem
            ));
  
            // Create database record
            await createPhotoRecord.mutateAsync({
              photoName: item.file.name,
              fullKey: key,
            });

            // Update status to optimizing
            setUploadQueue(prev => prev.map(queueItem => 
              queueItem.file === item.file 
                ? { ...queueItem, status: 'optimizing' }
                : queueItem
            ));

            // Optimize the image
            const optimizeResult = await optimizeMutation.mutateAsync({
              fullKey: key,
            });
  
            // Update status to completed with sizes
            setUploadQueue(prev => prev.map(queueItem => 
              queueItem.file === item.file 
                ? { 
                    ...queueItem, 
                    status: 'completed',
                    sizes: {
                      thumbnailSize: optimizeResult.thumbnailSize,
                      gallerySize: optimizeResult.gallerySize,
                      fullSize: optimizeResult.fullSize,
                    }
                  }
                : queueItem
            ));
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Upload failed';
            setUploadQueue(prev => prev.map(queueItem => 
              queueItem.file === item.file 
                ? { ...queueItem, status: 'error', error: errorMessage }
                : queueItem
            ));
            throw error;
          }
        }, { concurrency: BATCH_SIZE });  // Control concurrent uploads
      } catch (error) {
        console.error('Batch upload failed:', error);
      }
    };
  
    const startUpload = async () => {
      if (isUploading) return;
      setIsUploading(true);
  
      try {
        // Filter out completed and error files
        const pendingFiles = uploadQueue.filter(item => 
          item.status === 'waiting' || (item.status === 'error' && item.progress === 0)
        );
  
        // Process in batches
        for (let i = 0; i < pendingFiles.length; i += BATCH_SIZE) {
          const batch = pendingFiles.slice(i, i + BATCH_SIZE);
          await uploadBatch(batch);
        }
      } finally {
        setIsUploading(false);
      }
    };
  
    const getStatusIndicator = (status: UploadProgress['status']) => {
      return STATUS_EMOJI[status];
    };

    const formatSize = (bytes: number) => {
      if (bytes > 1024 * 1024) {
        return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
      }
      return `${(bytes / 1024).toFixed(2)}KB`;
    };
  
    return (
      <div className="text-[1.2rem] sm:text-[1.4rem] md:text-[1.4rem] space-y-8">
        {/* Upload Zone */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
            ${isDragActive ? 'border-black bg-gray-50' : 'border-gray-300'}`}
        >
          <input {...getInputProps()} />
          <p>drop some photos</p>
          <p className="mt-4"></p>
          <p className="text-light">(jpg, png, gif, webp)</p>
        </div>
  
        {/* Upload Queue */}
        {uploadQueue.length > 0 && (
          <div className="space-y-4 max-w-[500px]">
            <h2 className="text-2xl font-bold">Upload Queue ({uploadQueue.length} files) &nbsp;
              <button
                onClick={() => setUploadQueue([])}
                className="!text-red-500 link-style hover:text-red-700"
                disabled={isUploading}
              >
                clear all
              </button>
            </h2>

            <button
              onClick={startUpload}
              className="w-[100px] bg-black text-white py-2 rounded-lg hover:bg-gray-800 disabled:bg-gray-400"
              disabled={isUploading}
            >
              {isUploading ? 'uploading...' : 'upload'}
            </button>

            {/* Add Progress Bar */}
            {uploadQueue.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="text-gray-600 w-12">
                  {Math.round(calculateOverallProgress())}%
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-black transition-all duration-300 ease-out"
                    style={{ width: `${calculateOverallProgress()}%` }}
                  />
                </div>
              </div>
            </div>
            )}
  
            <div className="space-y-3">
              {uploadQueue.map((item, index) => (
                <div key={item.file.name + index} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 py-2">
                    <button
                      onClick={() => removeFile(index)}
                      className="text-red-500 hover:text-red-700 disabled:text-gray-400 flex-shrink-0"
                      disabled={isUploading}
                    >
                      ×
                    </button>
                    |
                    <span className="text-lg flex-shrink-0">
                      {getStatusIndicator(item.status)}
                    </span>
                    <span className="truncate">{item.file.name}</span>
                  </div>
                  {item.status === 'completed' && item.sizes && (
                    <div className="ml-8 text-xlg text-gray-600">
                      full: {formatSize(item.sizes.fullSize)} →{' '}
                      gallery: {formatSize(item.sizes.gallerySize)},{' '}
                      thumbnail: {formatSize(item.sizes.thumbnailSize)}
                    </div>
                  )}
                  {item.status === 'error' && item.error && (
                    <div className="ml-8 text-sm text-red-600">
                      {item.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
}
