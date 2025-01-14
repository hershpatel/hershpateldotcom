'use client';

import { useState } from "react";
import { api } from "~/trpc/react";

type OptimizationStatus = Record<string, {
  status: 'pending' | 'optimizing' | 'completed' | 'error';
  sizes?: {
    thumbnailSize: number;
    gallerySize: number;
    fullSize: number;
  };
  error?: string;
}>;

const STATUS_EMOJI: Record<OptimizationStatus[string]['status'], string> = {
  pending: '⚡',
  optimizing: '⏳',
  completed: '✅',
  error: '❌',
} as const;

export function OptimizeSection() {
  const [optimizationStatus, setOptimizationStatus] = useState<OptimizationStatus>({});
  
  const { data: photos, isLoading, refetch } = api.photos.listPhotos.useQuery({
    prefix: "to-optimize"
  });

  const optimizeMutation = api.photos.optimizeImage.useMutation({
    onSuccess: (data, variables) => {
      setOptimizationStatus(prev => ({
        ...prev,
        [variables.fullKey]: {
          status: 'completed',
          sizes: {
            thumbnailSize: data.thumbnailSize,
            gallerySize: data.gallerySize,
            fullSize: data.fullSize,
          },
        },
      }));
      void refetch();
    },
    onError: (error, variables) => {
      setOptimizationStatus(prev => ({
        ...prev,
        [variables.fullKey]: {
          status: 'error',
          error: error.message,
        },
      }));
    },
  });

  const optimizeImage = (key: string) => {
    setOptimizationStatus(prev => ({
      ...prev,
      [key]: { status: 'optimizing' },
    }));
    return optimizeMutation.mutate({ fullKey: key });
  };

  const optimizeAll = async () => {
    if (!photos) return;
    
    // Initialize all as pending
    const initialStatus: OptimizationStatus = {};
    photos.forEach(photo => {
      initialStatus[photo.key] = { status: 'pending' };
    });
    setOptimizationStatus(initialStatus);

    // Process each image sequentially to avoid overwhelming the server
    for (const photo of photos) {
      optimizeImage(photo.key);
    }
  };

  const formatSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)}MB`;
  };

  return (
    <div className="text-[1.2rem] sm:text-[1.4rem] md:text-[1.4rem] space-y-8">
      <div className="max-w-[500px]">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => void refetch()}
              className="rounded-md bg-gray-100 px-3 py-1 hover:bg-gray-200"
              disabled={isLoading}
            >
              refresh
            </button>
            <span className="text-2xl font-bold">
              {isLoading 
                ? "🔄" 
                : `${photos?.length ?? 0} images to optimize`}
            </span>
          </div>
          
          {photos?.map((photo) => {
            const status = optimizationStatus[photo.key];
            const isDisabled = status?.status === 'optimizing' || status?.status === 'completed';
            const size = photo.size ?? 0; // Default to 0 if size is undefined
            
            return (
              <div key={photo.key} className="text-xlg flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => void optimizeImage(photo.key)}
                    className={`rounded-md bg-gray-100 px-2 hover:bg-gray-200 ${isDisabled ? 'cursor-default hover:bg-gray-100' : ''}`}
                    disabled={isDisabled || optimizeMutation.isPending}
                    title={status?.status === 'completed' ? 'Already optimized' : undefined}
                  >
                    {STATUS_EMOJI[status?.status ?? 'pending']}
                  </button>
                  <span>{photo.key}</span>
                  <span className="text-gray-500">({formatSize(size)})</span>
                </div>
                {status?.status === 'completed' && status.sizes && (
                  <div className="ml-8 text-sm text-gray-600">
                    Full: {formatSize(status.sizes.fullSize)} →{' '}
                    Gallery: {formatSize(status.sizes.gallerySize)},{' '}
                    Thumbnail: {formatSize(status.sizes.thumbnailSize)}
                  </div>
                )}
                {status?.status === 'error' && (
                  <div className="ml-8 text-sm text-red-600">
                    Error: {status.error}
                  </div>
                )}
              </div>
            );
          })}

          {(photos?.length ?? 0) > 0 && !Object.values(optimizationStatus).every(s => s.status === 'completed') && (
            <button
              onClick={() => void optimizeAll()}
              className="mt-4 rounded-md bg-gray-100 px-3 py-1 hover:bg-gray-200 flex items-center gap-2 cursor-default disabled:hover:bg-gray-100"
              disabled={Object.values(optimizationStatus).some(s => s.status === 'optimizing') || optimizeMutation.isPending}
            >
              <span>{STATUS_EMOJI.pending}</span> optimize all
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
