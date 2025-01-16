'use client';

import { useState } from 'react';
import Image from 'next/image';
import { api } from "~/trpc/react";
import { ImageStatus } from '../../constants';

export function DeleteSection() {
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [dateRange, setDateRange] = useState<{ start?: string; end?: string }>({});

  // Query all tags
  const { data: tags = [] } = api.tags.list.useQuery(undefined, {
    refetchOnWindowFocus: false
  });

  // Query all photos with tags
  const { data: allPhotos = [], isLoading, refetch } = api.photos.listAllPhotosWithTags.useQuery(
    { status: ImageStatus.READY },
    { refetchOnWindowFocus: false }
  );

  // Filter photos client-side
  const filteredPhotos = allPhotos.filter(photo => {
    // Filter by tags
    if (selectedTags.size > 0) {
      const photoHasSelectedTag = photo.tags.some(tag => selectedTags.has(tag.pk));
      if (!photoHasSelectedTag) return false;
    }

    // Filter by date range
    if (dateRange.start) {
      const photoDate = new Date(photo.createdAt);
      if (photoDate < new Date(dateRange.start)) return false;
    }
    if (dateRange.end) {
      const photoDate = new Date(photo.createdAt);
      if (photoDate > new Date(dateRange.end)) return false;
    }

    return true;
  });

  // Get selected photos data for the deletion preview
  const selectedPhotoData = allPhotos.filter(photo => selectedPhotos.has(photo.pk));

  // Delete mutation
  const deleteMutation = api.photos.deletePhotos.useMutation({
    onSuccess: () => {
      setSelectedPhotos(new Set());
      void refetch();
    },
  });

  const handleTagToggle = (tagPk: string) => {
    setSelectedTags(prev => {
      const next = new Set(prev);
      if (next.has(tagPk)) {
        next.delete(tagPk);
      } else {
        next.add(tagPk);
      }
      return next;
    });
  };

  const handleDateChange = (type: 'start' | 'end', value: string) => {
    setDateRange(prev => ({
      ...prev,
      [type]: value || undefined
    }));
  };

  const clearFilters = () => {
    setSelectedTags(new Set());
    setDateRange({});
  };

  const handleImageSelect = (photo: typeof allPhotos[number]) => {
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

  return (
    <div className="text-[1.2rem] sm:text-[1.4rem] md:text-[1.4rem] space-y-8">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <button
            onClick={handleDelete}
            disabled={isDeleting || selectedPhotos.size === 0}
            className="rounded-md bg-red-100 px-4 py-2 hover:bg-red-200 text-red-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
          >
            {isDeleting ? '🗑️ Deleting...' : `🗑️ ${selectedPhotos.size} selected`}
          </button>
          {/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing */}
          {(selectedTags.size > 0 || dateRange.start || dateRange.end) && (
            <button
              onClick={clearFilters}
              className="text-base text-gray-500 hover:text-gray-700"
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="flex flex-col gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="space-y-2">
            <div className="text-base font-medium text-gray-700">Filter by tags:</div>
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => (
                <button
                  key={tag.pk}
                  onClick={() => handleTagToggle(tag.pk)}
                  className={`text-base px-3 py-1.5 rounded-full transition-colors ${
                    selectedTags.has(tag.pk)
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-base font-medium text-gray-700">Filter by date:</div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-base text-gray-600">From:</label>
                <input
                  type="date"
                  value={dateRange.start ?? ''}
                  onChange={(e) => handleDateChange('start', e.target.value)}
                  className="text-base rounded-md border border-gray-300 px-3 py-1.5"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-base text-gray-600">To:</label>
                <input
                  type="date"
                  value={dateRange.end ?? ''}
                  onChange={(e) => handleDateChange('end', e.target.value)}
                  className="text-base rounded-md border border-gray-300 px-3 py-1.5"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedPhotos.size > 0 && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="text-base font-medium text-gray-700">Selected for deletion:</div>
            <button
              onClick={() => setSelectedPhotos(new Set())}
              className="text-base text-red-600 hover:text-red-700"
            >
              Clear selection
            </button>
          </div>
          <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-8 gap-2 p-4 bg-red-50 rounded-lg">
            {selectedPhotoData.map(photo => (
              <div
                key={photo.pk}
                className="flex flex-col gap-1"
              >
                <div
                  className="aspect-square relative cursor-pointer rounded-md overflow-hidden border-2 border-red-300 hover:border-red-400"
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
                    sizes="80px"
                    onLoad={() => setLoadedImages(prev => new Set([...prev, photo.pk]))}
                  />
                  <div className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                    ×
                  </div>
                </div>
                <div className="text-sm text-gray-600 truncate text-center">
                  {photo.fullKey.split('/').pop()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center min-h-[200px]">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-600"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-6 gap-4">
            {filteredPhotos.map(photo => (
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

          {filteredPhotos.length === 0 && (
            <div className="text-light text-center py-8">
              no photos found
            </div>
          )}
        </>
      )}
    </div>
  );
}
