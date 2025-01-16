
'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { api } from '~/trpc/react';
import { ImageType } from '../constants';
import Promise from 'bluebird';
interface UploadProgress {
    file: File;
    progress: number;
    status: 'waiting' | 'uploading' | 'completed' | 'error';
    error?: string;
  }
  
  const BATCH_SIZE = 10;

export default function UploadPage() {
    const [uploadQueue, setUploadQueue] = useState<UploadProgress[]>([]);
    const [isUploading, setIsUploading] = useState(false);
  
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
        'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
      },
      maxSize: 30 * 1024 * 1024, // 30MB
      maxFiles: 50,
    });
  
    const getUploadUrls = api.photos.getUploadUrls.useMutation();
    const createPhotoRecord = api.photos.createPhotoRecord.useMutation();
  
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
  
            // Create database record
            await createPhotoRecord.mutateAsync({
              photoName: item.file.name,
              fullKey: key,
            });
  
            // Update status to completed
            setUploadQueue(prev => prev.map(queueItem => 
              queueItem.file === item.file 
                ? { ...queueItem, status: 'completed' }
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
      switch (status) {
        case 'waiting':
          return '🔜';
        case 'uploading':
          return '🔄';
        case 'completed':
          return '✅';
        case 'error':
          return '❌';
      }
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
  
            <div className="space-y-3">
              {uploadQueue.map((item, index) => (
                <div key={item.file.name + index} className="flex items-center gap-2 py-2">
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
              ))}
            </div>
  
            <button
              onClick={startUpload}
              className="w-[100px] bg-black text-white py-2 rounded-lg hover:bg-gray-800 disabled:bg-gray-400"
              disabled={isUploading}
            >
              {isUploading ? 'uploading...' : 'upload'}
            </button>
          </div>
        )}
      </div>
    );
}
