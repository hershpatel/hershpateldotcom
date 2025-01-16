'use client';

import { useState } from 'react';
import { api } from "~/trpc/react";
import { ImageStatus } from "../../constants";
import Image from 'next/image';

export function TagsSection() {
  const [newTagName, setNewTagName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [selectedTagPk, setSelectedTagPk] = useState<string | null>(null);
  const [selectedPhotosToAdd, setSelectedPhotosToAdd] = useState<Set<string>>(new Set());
  const [selectedPhotosToRemove, setSelectedPhotosToRemove] = useState<Set<string>>(new Set());
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [dateRange, setDateRange] = useState<{
    startDate: string | null;
    endDate: string | null;
  }>({
    startDate: null,
    endDate: null,
  });

  // Query all tags
  const { data: tags = [], isLoading: isLoadingTags, refetch: refetchTags } = api.tags.list.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  // Query photos based on date range
  const { data: photos = [], isLoading: isLoadingPhotos } = api.photos.listPhotosWithUrls.useQuery({
    status: ImageStatus.READY,
    startDate: dateRange.startDate ? new Date(dateRange.startDate) : undefined,
    endDate: dateRange.endDate ? new Date(dateRange.endDate) : undefined,
  }, {
    enabled: true,
    refetchOnWindowFocus: false,
  });

  // Query photos that have the selected tag
  const { data: photosWithTag = [], refetch: refetchPhotosWithTag } = api.tags.getPhotosWithTag.useQuery(
    { tagPk: selectedTagPk! },
    { enabled: !!selectedTagPk }
  );

  // Create tag mutation
  const createMutation = api.tags.create.useMutation({
    onSuccess: () => {
      setNewTagName('');
      void refetchTags();
    },
  });

  // Delete tag mutation
  const deleteMutation = api.tags.delete.useMutation({
    onSuccess: () => {
      void refetchTags();
      if (selectedTagPk) setSelectedTagPk(null);
    },
  });

  // Assign tags mutation
  const assignTagMutation = api.tags.assignTagToPhotos.useMutation({
    onSuccess: () => {
      setSelectedPhotosToAdd(new Set());
      void refetchPhotosWithTag();
    },
  });

  // Remove tags mutation
  const removeTagMutation = api.tags.removeTagFromPhotos.useMutation({
    onSuccess: () => {
      setSelectedPhotosToRemove(new Set());
      void refetchPhotosWithTag();
    },
  });

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;

    setIsCreating(true);
    try {
      await createMutation.mutateAsync({
        name: newTagName.trim(),
      });
    } catch (error) {
      alert('Failed to create tag. Please try again.');
      console.error('Create tag error:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteTag = async (pk: string, tagName: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete the tag "${tagName}"? This cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await deleteMutation.mutateAsync({ pk });
    } catch (error) {
      alert('Failed to delete tag. Please try again.');
      console.error('Delete tag error:', error);
    }
  };

  const handleAssignTag = async () => {
    if (!selectedTagPk || selectedPhotosToAdd.size === 0) return;

    try {
      await assignTagMutation.mutateAsync({
        tagPk: selectedTagPk,
        photoPks: Array.from(selectedPhotosToAdd),
      });
    } catch (error) {
      alert('Failed to assign tag to photos. Please try again.');
      console.error('Tag assign error:', error);
    }
  };

  const handleRemoveTag = async () => {
    if (!selectedTagPk || selectedPhotosToRemove.size === 0) return;

    try {
      await removeTagMutation.mutateAsync({
        tagPk: selectedTagPk,
        photoPks: Array.from(selectedPhotosToRemove),
      });
    } catch (error) {
      alert('Failed to remove tag from photos. Please try again.');
      console.error('Tag remove error:', error);
    }
  };

  // Filter photos that don't have the selected tag
  const photosWithoutTag = photos.filter(photo => !photosWithTag.includes(photo.pk));
  // Filter photos that have the selected tag
  const photosWithTagData = photos.filter(photo => photosWithTag.includes(photo.pk));

  return (
    <div className="space-y-12">
      {/* Create Tag Form */}
      <div className="space-y-4">
        <h3 className="text-xl font-medium">create new tag</h3>
        <form onSubmit={handleCreateTag} className="space-y-4">
          <div className="flex gap-2 items-center">
            <input
              type="text"
              placeholder="tag name"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              maxLength={50}
              className="w-64 px-4 py-2 text-lg border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isCreating}
            />
            <button
              type="submit"
              disabled={isCreating || !newTagName.trim()}
              className="px-6 py-2 text-white bg-blue-500 rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? 'creating...' : 'create tag'}
            </button>
          </div>
        </form>
      </div>

      {/* Tag Selection */}
      <div className="space-y-4">
        <h3 className="text-xl font-medium">select tag</h3>
        {isLoadingTags ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
          </div>
        ) : tags.length === 0 ? (
          <p className="text-gray-500 py-4 text-[1.2rem]">no tags found</p>
        ) : (
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-4 md:grid-cols-4">
            {tags.map((tag) => (
              <div
                key={tag.pk}
                onClick={() => setSelectedTagPk(tag.pk)}
                className={`p-4 border rounded-lg bg-white shadow-sm space-y-2 cursor-pointer transition-all ${
                  selectedTagPk === tag.pk ? 'ring-2 ring-blue-500 scale-[0.98]' : 'hover:border-gray-400'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">{tag.name}</h4>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDeleteTag(tag.pk, tag.name);
                    }}
                    className="text-red-500 hover:text-red-600 focus:outline-none"
                    title="Delete tag"
                  >
                    ❌
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedTagPk && (
        <>
          {/* Date Range Filter */}
          <div className="space-y-4">
            <h3 className="text-xl font-medium">date range</h3>
            <div className="flex gap-4 items-center">
              <input
                type="date"
                value={dateRange.startDate ?? ''}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value || null }))}
                className="px-4 py-2 border rounded"
              />
              <span>to</span>
              <input
                type="date"
                value={dateRange.endDate ?? ''}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value || null }))}
                className="px-4 py-2 border rounded"
              />
              <button
                onClick={() => setDateRange({ startDate: null, endDate: null })}
                className="px-4 py-2 text-light link-style focus:outline-none text-[2rem] opacity-50 hover:opacity-100"
                title="reset dates"
              >
                ↺
              </button>
            </div>
          </div>

          {/* Remove Tags Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-medium">remove tag</h3>
              {selectedPhotosToRemove.size > 0 && (
                <button
                  onClick={handleRemoveTag}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Remove tag from {selectedPhotosToRemove.size} photo{selectedPhotosToRemove.size === 1 ? '' : 's'}
                </button>
              )}
            </div>
            
            {isLoadingPhotos ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
              </div>
            ) : photosWithTagData.length === 0 ? (
              <p className="text-gray-500 py-4 text-[1.2rem]">no photos have this tag</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-6 gap-4">
                {photosWithTagData.map(photo => (
                  <div
                    key={photo.pk}
                    className={`aspect-square relative cursor-pointer rounded-md overflow-hidden border-2 transition-all ${
                      selectedPhotosToRemove.has(photo.pk)
                        ? 'border-red-500 shadow-lg scale-95'
                        : 'border-transparent hover:border-gray-300'
                    }`}
                    onClick={() => {
                      setSelectedPhotosToRemove(prev => {
                        const next = new Set(prev);
                        if (next.has(photo.pk)) {
                          next.delete(photo.pk);
                        } else {
                          next.add(photo.pk);
                        }
                        return next;
                      });
                    }}
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
                      sizes="(max-width: 640px) 50vw, (max-width: 768px) 25vw, 16.67vw"
                      onLoad={() => setLoadedImages(prev => new Set([...prev, photo.pk]))}
                    />
                    {selectedPhotosToRemove.has(photo.pk) && (
                      <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                        <span className="text-2xl">✓</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Assign Tags Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-medium">assign tag</h3>
              {selectedPhotosToAdd.size > 0 && (
                <button
                  onClick={handleAssignTag}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Add tag to {selectedPhotosToAdd.size} photo{selectedPhotosToAdd.size === 1 ? '' : 's'}
                </button>
              )}
            </div>
            
            {isLoadingPhotos ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
              </div>
            ) : photosWithoutTag.length === 0 ? (
              <p className="text-gray-500 py-4 text-[1.2rem]">no photos available to tag</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-6 gap-4">
                {photosWithoutTag.map(photo => (
                  <div
                    key={photo.pk}
                    className={`aspect-square relative cursor-pointer rounded-md overflow-hidden border-2 transition-all ${
                      selectedPhotosToAdd.has(photo.pk)
                        ? 'border-blue-500 shadow-lg scale-95'
                        : 'border-transparent hover:border-gray-300'
                    }`}
                    onClick={() => {
                      setSelectedPhotosToAdd(prev => {
                        const next = new Set(prev);
                        if (next.has(photo.pk)) {
                          next.delete(photo.pk);
                        } else {
                          next.add(photo.pk);
                        }
                        return next;
                      });
                    }}
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
                      sizes="(max-width: 640px) 50vw, (max-width: 768px) 25vw, 16.67vw"
                      onLoad={() => setLoadedImages(prev => new Set([...prev, photo.pk]))}
                    />
                    {selectedPhotosToAdd.has(photo.pk) && (
                      <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                        <span className="text-2xl">✓</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
