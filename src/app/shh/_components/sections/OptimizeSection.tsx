'use client';

import { useState } from "react";
import { api } from "~/trpc/react";
import { ImageStatus } from "../../constants";
import Bluebird from 'bluebird';

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

const BATCH_SIZE = 10;

export function OptimizeSection() {
  const [optimizationStatus, setOptimizationStatus] = useState<OptimizationStatus>({});
  const [isOptimizing, setIsOptimizing] = useState(false);
  
  const { data: photos, isLoading, refetch } = api.photos.listPhotos.useQuery({
    status: ImageStatus.PENDING
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

  const optimizeImage = async (fullKey: string) => {
    setOptimizationStatus(prev => ({
      ...prev,
      [fullKey]: { status: 'optimizing' },
    }));
    await optimizeMutation.mutateAsync({ fullKey });
  };

  const optimizeAll = async () => {
    if (!photos || isOptimizing) return;
    setIsOptimizing(true);
    
    try {
      // Initialize all as pending
      const initialStatus: OptimizationStatus = {};
      photos.forEach(photo => {
        initialStatus[photo.fullKey] = { status: 'pending' };
      });
      setOptimizationStatus(initialStatus);

      // Process in batches using Bluebird
      await Bluebird.map(photos, async (photo) => {
        await optimizeImage(photo.fullKey);
      }, { concurrency: BATCH_SIZE });
    } finally {
      setIsOptimizing(false);
    }
  };

  const toMB = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)}MB`;
  };

  const toKB = (bytes: number) => {
    const kb = bytes / 1024;
    return `${kb.toFixed(2)}KB`;
  };

  return (
    <div className="text-[1.2rem] sm:text-[1.4rem] md:text-[1.4rem] space-y-8">
      <div className="max-w-[500px]">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => void refetch()}
              className="rounded-md bg-gray-100 px-3 py-1 hover:bg-gray-200"
              disabled={isLoading || isOptimizing}
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
            const status = optimizationStatus[photo.fullKey];
            
            return (
              <div key={photo.pk} className="text-xlg flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span>{STATUS_EMOJI[status?.status ?? 'pending']}</span>
                  <span>{photo.fullKey}</span>
                </div>
                {status?.status === 'completed' && status.sizes && (
                  <div className="ml-8 text-xlg text-gray-600">
                    Full: {toMB(status.sizes.fullSize)} →{' '}
                    Gallery: {toKB(status.sizes.gallerySize)},{' '}
                    Thumbnail: {toKB(status.sizes.thumbnailSize)}
                  </div>
                )}
                {status?.status === 'error' && (
                  <div className="ml-8 text-lg text-red-600">
                    Error: {status.error}
                  </div>
                )}
              </div>
            );
          })}

          {(photos?.length ?? 0) > 0 && (
            <button
              onClick={() => void optimizeAll()}
              className="mt-4 rounded-md bg-gray-100 px-3 py-1 hover:bg-gray-200 flex items-center gap-2 disabled:cursor-not-allowed disabled:hover:bg-gray-100"
              disabled={isOptimizing || isLoading}
            >
              <span>{isOptimizing ? STATUS_EMOJI.optimizing : STATUS_EMOJI.pending}</span>
              {isOptimizing ? 'optimizing...' : 'optimize all'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
