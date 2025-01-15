'use client';

import { useState } from 'react';
import Image from 'next/image';
import { api } from "~/trpc/react";
import { ImageStatus } from '../../constants';

export function DeleteSection() {
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

  // Query all photos
  const { data: photos = [], isLoading, refetch } = api.photos.listPhotosWithUrls.useQuery(
    { status: ImageStatus.READY },
    { refetchOnWindowFocus: false }
  );

  // Delete mutation
  const deleteMutation = api.photos.deletePhotos.useMutation({
    onSuccess: () => {
      setSelectedPhotos(new Set());
      void refetch();
    },
  });

  const handleImageSelect = (photo: typeof photos[number]) => {
    setSelectedPhotos(prev => {
      const next = new Set(prev);
      if (next.has(photo.pk)) {
        next.delete(photo.pk);
      } else {
        next.add(photo.pk);
      }
      return next;
    });
  };

  const handleDelete = async () => {
    if (selectedPhotos.size === 0) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedPhotos.size} photo${selectedPhotos.size === 1 ? '' : 's'}? This cannot be undone.`
    );
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await deleteMutation.mutateAsync(Array.from(selectedPhotos));
    } catch (error) {
      alert('Failed to delete photos. Please try again.');
      console.error('Delete error:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-600"></div>
      </div>
    );
  }

  return (
    <div className="text-[1.2rem] sm:text-[1.4rem] md:text-[1.4rem] space-y-8">
      <div className="flex justify-between items-center">
        <button
          onClick={handleDelete}
          disabled={isDeleting || selectedPhotos.size === 0}
          className="rounded-md bg-red-100 px-3 py-1 hover:bg-red-200 text-red-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isDeleting ? '🗑️ Deleting...' : `🗑️ ${selectedPhotos.size} selected`}
        </button>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-6 gap-4">
        {photos.map(photo => (
          <div
            key={photo.pk}
            className={`aspect-square relative cursor-pointer rounded-md overflow-hidden border-2 transition-all ${
              selectedPhotos.has(photo.pk)
                ? 'border-red-500 shadow-lg scale-95'
                : 'border-transparent hover:border-gray-300'
            }`}
            onClick={() => handleImageSelect(photo)}
          >
            {!loadedImages.has(photo.pk) && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-gray-600"></div>
              </div>
            )}
            <Image
              src={photo.thumbnailUrl ?? ''}
              alt={photo.fullKey.split('/').pop() ?? ''}
              fill
              className={`object-cover transition-opacity duration-300 ${
                loadedImages.has(photo.pk) ? 'opacity-100' : 'opacity-0'
              }`}
              sizes="100px"
              onLoad={() => setLoadedImages(prev => new Set([...prev, photo.pk]))}
            />
            {selectedPhotos.has(photo.pk) && (
              <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                <span className="text-2xl">✓</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {photos.length === 0 && (
        <div className="text-light text-center py-8">
          no photos found
        </div>
      )}
    </div>
  );
}
