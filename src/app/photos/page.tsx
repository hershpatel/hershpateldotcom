"use client"

import Link from 'next/link'
import Image from 'next/image'
import { useState, useCallback, useEffect, useRef, Suspense } from 'react'
import { Dialog, DialogPanel } from '@headlessui/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { api } from "~/trpc/react"
import { ImageStatus } from '../shh/constants'

type Photo = {
  id: string;
  thumbnailSrc: string;
  gallerySrc: string;
  name: string;
  createdAt: Date;
  cameraModel: string | null;
}

type Tag = {
  pk: string;
  name: string;
}

function PhotosContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Set default URL parameters
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (!params.has('sort')) {
      params.set('sort', 'newest');
      router.replace(`/photos?${params.toString()}`);
    }
  }, [router, searchParams]);

  // Initialize state
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [loadedThumbnails, setLoadedThumbnails] = useState<Set<string>>(new Set());
  const [loadedGalleryImages, setLoadedGalleryImages] = useState<Set<string>>(new Set());
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const tagDropdownRef = useRef<HTMLDivElement>(null);

  // Get URL parameters
  const isRandom = searchParams.get('sort') === 'random';
  const isAscending = searchParams.get('sort') === 'oldest';
  const urlTags = searchParams.get('tags')?.split(',').filter(Boolean) ?? [];
  const photoId = searchParams.get('photo');

  // Fetch data
  const { data: tags = [] } = api.tags.list.useQuery(undefined, {
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Get selected tags from URL
  const selectedTags = urlTags
    .map(tagPk => tags.find(t => t.pk === tagPk))
    .filter((tag): tag is NonNullable<typeof tag> => tag !== undefined)
    .map(tag => ({ pk: tag.pk, name: tag.name }));

  const { data: dbPhotos = [], isLoading: isLoadingPhotos } = api.photos.listPhotosWithUrls.useQuery(
    {
      status: ImageStatus.READY, 
      random: isRandom,
      tagPks: selectedTags.map(tag => tag.pk),
      ascending: isAscending,
    },
    {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    }
  );

  // Redirect if photo ID doesn't exist
  useEffect(() => {
    if (!isLoadingPhotos && photoId && !dbPhotos.some(photo => photo.pk === photoId)) {
      router.replace('/photos');
    }
  }, [isLoadingPhotos, photoId, dbPhotos, router]);

  // Convert to Photo objects and find selected photo index
  const photos: Photo[] = dbPhotos
    .filter((photo): photo is typeof photo & { thumbnailUrl: string; galleryUrl: string } => 
      Boolean(photo.thumbnailUrl && photo.galleryUrl)
    )
    .map((dbPhoto) => {
      return {
        id: dbPhoto.pk,
        thumbnailSrc: dbPhoto.thumbnailUrl,
        gallerySrc: dbPhoto.galleryUrl,
        name: dbPhoto.fullKey.split('/').pop() ?? dbPhoto.fullKey,
        createdAt: dbPhoto.createdAt,
        cameraModel: dbPhoto.cameraModel,
      };
    });
  
  // Find the index of the selected photo
  const selectedPhotoIndex = photoId ? photos.findIndex(photo => photo.id === photoId) : null;

  // Update URL helper function
  const updateUrlParams = useCallback((updates: { sort?: string; tags?: string[]; photo?: string | null }) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (updates.sort !== undefined) {
      if (updates.sort) {
        params.set('sort', updates.sort);
      } else {
        params.delete('sort');
      }
    }
    
    if (updates.tags !== undefined) {
      if (updates.tags.length > 0) {
        params.set('tags', updates.tags.join(','));
      } else {
        params.delete('tags');
      }
    }

    if (updates.photo !== undefined) {
      if (updates.photo) {
        params.set('photo', updates.photo);
      } else {
        params.delete('photo');
      }
    }
    
    router.push(`/photos?${params.toString()}`);
  }, [searchParams, router]);

  // Tag handlers
  const handleTagSelect = (tag: Tag) => {
    if (!selectedTags.find(t => t.pk === tag.pk)) {
      const newTags = [...selectedTags, tag];
      updateUrlParams({ tags: newTags.map(t => t.pk), photo: null });
    }
  };

  const handleTagRemove = (tagPk: string) => {
    const newTags = selectedTags.filter(tag => tag.pk !== tagPk);
    updateUrlParams({ tags: newTags.map(t => t.pk), photo: null });
  };

  // Photo modal handlers
  const handlePhotoSelect = useCallback((index: number) => {
    const photo = photos[index];
    if (photo) {
      updateUrlParams({ photo: photo.id });
    }
  }, [photos, updateUrlParams]);

  const handleCloseModal = useCallback(() => {
    updateUrlParams({ photo: null });
  }, [updateUrlParams]);

  const handleNextPhoto = useCallback(() => {
    if (selectedPhotoIndex !== null && selectedPhotoIndex < photos.length - 1) {
      const nextPhoto = photos[selectedPhotoIndex + 1];
      if (nextPhoto) {
        updateUrlParams({ photo: nextPhoto.id });
      }
    }
  }, [selectedPhotoIndex, photos, updateUrlParams]);

  const handlePrevPhoto = useCallback(() => {
    if (selectedPhotoIndex !== null && selectedPhotoIndex > 0) {
      const prevPhoto = photos[selectedPhotoIndex - 1];
      if (prevPhoto) {
        updateUrlParams({ photo: prevPhoto.id });
      }
    }
  }, [selectedPhotoIndex, photos, updateUrlParams]);

  // Update keyboard and touch handlers
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (selectedPhotoIndex === null) return;
    
    if (e.key === 'ArrowRight' && selectedPhotoIndex < photos.length - 1) {
      handleNextPhoto();
    }
    if (e.key === 'ArrowLeft' && selectedPhotoIndex > 0) {
      handlePrevPhoto();
    }
    if (e.key === 'Escape') {
      handleCloseModal();
    }
  }, [selectedPhotoIndex, photos.length, handleNextPhoto, handlePrevPhoto, handleCloseModal]);

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (selectedPhotoIndex !== null) {
      if (isLeftSwipe && selectedPhotoIndex < photos.length - 1) {
        handleNextPhoto();
      }
      if (isRightSwipe && selectedPhotoIndex > 0) {
        handlePrevPhoto();
      }
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    // Only track touch for single finger gestures
    if (e.touches.length !== 1) return;
    
    const touch = e.targetTouches[0];
    if (touch) {
      setTouchStart(touch.clientX);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    // Only track touch for single finger gestures
    if (e.touches.length !== 1) return;
    
    const touch = e.targetTouches[0];
    if (touch) {
      setTouchEnd(touch.clientX);
    }
  };

  // Add keyboard event listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Handle click outside tag dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(event.target as Node)) {
        setIsTagDropdownOpen(false);
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isTagDropdownOpen) {
        setIsTagDropdownOpen(false);
      }
    };

    if (isTagDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isTagDropdownOpen]);

  return (
    <main className="min-h-screen bg-white p-8">
      <div className="max-w-[95%] sm:max-w-[85%] md:max-w-[75%] mx-auto">
        <div className="flex flex-col gap-8 mb-8">
          <Link href="/" className="text-[1.6rem] link-style inline-block">&larr; back</Link>

          {(isLoadingPhotos || tags.length > 0) && (
            <div className="flex flex-col gap-4">
              <div className="flex gap-4 items-center">
                <button 
                  onClick={() => updateUrlParams({ sort: 'newest' })}
                  className={`
                    text-[2.5rem] sm:text-[2.5rem] transition-all w-fit
                    ${!isRandom && !isAscending
                      ? 'translate-y-[1px] opacity-60 shadow-inner' 
                      : 'hover:opacity-80 drop-shadow-md'
                    }
                  `}
                  title="show newest first"
                >
                  ⬇️
                </button>

                <button 
                  onClick={() => updateUrlParams({ sort: 'oldest' })}
                  className={`
                    text-[2.5rem] sm:text-[2.5rem] transition-all w-fit
                    ${isAscending 
                      ? 'translate-y-[1px] opacity-60 shadow-inner' 
                      : 'hover:opacity-80 drop-shadow-md'
                    }
                  `}
                  title="show oldest first"
                >
                  ⬆️
                </button>

                <button 
                  onClick={() => updateUrlParams({ sort: isRandom ? '' : 'random' })}
                  className={`
                    text-[2.5rem] sm:text-[2.5rem] transition-all w-fit
                    ${isRandom 
                      ? 'translate-y-[1px] opacity-60 shadow-inner' 
                      : 'hover:opacity-80 drop-shadow-md'
                    }
                  `}
                  title="show in random order"
                >
                  🔀
                </button>

                <div className="relative" ref={tagDropdownRef}>
                  <button
                    onClick={() => setIsTagDropdownOpen(!isTagDropdownOpen)}
                    className={`
                      text-[2.5rem] sm:text-[2.5rem] transition-all w-fit
                      ${selectedTags.length === tags.length
                        ? 'translate-y-[1px] opacity-60 shadow-inner' 
                        : 'hover:opacity-80 drop-shadow-md'
                      }
                    `}
                    title="filter by tags"
                  >
                    🏷️
                  </button>
                  {isTagDropdownOpen && (
                    <div className="absolute z-10 mt-1 w-72 overflow-auto rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none text-[1.4rem]">
                      {tags.map((tag) => {
                        const isSelected = selectedTags.some(t => t.pk === tag.pk);
                        return (
                          <button
                            key={tag.pk}
                            className={`
                              w-full px-4 py-2 text-left
                              ${isSelected 
                                ? 'opacity-50 cursor-not-allowed'
                                : 'hover:bg-blue-500 hover:text-white'
                              }
                            `}
                            onClick={() => !isSelected && handleTagSelect(tag)}
                            disabled={isSelected}
                          >
                            {tag.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedTags.map((tag) => (
                    <span
                      key={tag.pk}
                      className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-[1.2rem] text-gray-700"
                    >
                      {tag.name}
                      <button
                        onClick={() => handleTagRemove(tag.pk)}
                        className="ml-1 rounded-full hover:bg-gray-200 p-1"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        
        {isLoadingPhotos ? (
          <div className="flex justify-center items-center min-h-[200px]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
          </div>
        ) : photos.length === 0 ? (
          <div className="flex items-center min-h-[200px] text-light text-[1.6rem]">
            {selectedTags.length > 0 
              ? `no photos with ${selectedTags.map(t => t.name).join(', ')}` 
              : 'no photos found'}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-8 mt-8">
            {photos.map((photo, index) => (
              <div 
                key={photo.id} 
                className="aspect-square relative cursor-pointer"
                onClick={() => handlePhotoSelect(index)}
              >
                {!loadedThumbnails.has(photo.id) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-600"></div>
                  </div>
                )}
                <Image
                  src={photo.gallerySrc}
                  alt={photo.name}
                  fill
                  className={`object-cover transition-opacity ${
                    loadedThumbnails.has(photo.id) ? 'opacity-100' : 'opacity-0'
                  }`}
                  sizes="(max-width: 640px) 75vw, (max-width: 768px) 37.5vw, (max-width: 1024px) 25vw, 18.75vw"
                  onLoad={() => setLoadedThumbnails(prev => new Set([...prev, photo.id]))}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog 
        open={selectedPhotoIndex !== null} 
        onClose={handleCloseModal}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/80" aria-hidden="true" />
        
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0" 
            onClick={handleCloseModal}
            onTouchEnd={(e) => {
              e.preventDefault();
              handleCloseModal();
            }}
          />
          <DialogPanel
            className="relative border-2 border-white/30"
            onTouchStart={(e) => {
              e.stopPropagation();
              handleTouchStart(e);
            }}
            onTouchMove={(e) => {
              e.stopPropagation();
              handleTouchMove(e);
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              handleTouchEnd();
            }}
          >
            {selectedPhotoIndex !== null && photos[selectedPhotoIndex] && (
              <div className="relative flex justify-center items-center">
                <div className="absolute -left-16 hidden sm:flex items-center h-full">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePrevPhoto();
                    }}
                    className="p-4 text-black bg-white/90 rounded-full hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={selectedPhotoIndex === 0}
                  >
                    ←
                  </button>
                </div>

                <div className="absolute -right-16 hidden sm:flex items-center h-full">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNextPhoto();
                    }}
                    className="p-4 text-black bg-white/90 rounded-full hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={selectedPhotoIndex === photos.length - 1}
                  >
                    →
                  </button>
                </div>
                <div className="max-w-[85vw] max-h-[98vh] relative">
                  {(() => {
                    const selectedPhoto = photos[selectedPhotoIndex];
                    if (!selectedPhoto) return null;
                    
                    return (
                      <>
                        {!loadedGalleryImages.has(selectedPhoto.id) && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-200"></div>
                          </div>
                        )}
                        <div className="relative" style={{ width: 'fit-content', height: 'fit-content' }}>
                          <Image
                            src={selectedPhoto.gallerySrc}
                            alt={selectedPhoto.name}
                            className={`max-w-[85vw] max-h-[95vh] w-auto h-auto ${
                              loadedGalleryImages.has(selectedPhoto.id) ? 'opacity-100' : 'opacity-0'
                            }`}
                            width={1920}
                            height={1080}
                            priority
                            onLoad={() => setLoadedGalleryImages(prev => new Set([...prev, selectedPhoto.id]))}
                          />
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm text-white p-2 text-center text-[.9rem]">
                          {(() => {
                            const photo = photos[selectedPhotoIndex];
                            if (!photo) return null;
                            
                            const date = new Date(photo.createdAt);
                            const monthYear = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                            
                            return (
                              <span>
                                {monthYear} {photo.cameraModel && `• ${photo.cameraModel}`}
                              </span>
                            );
                          })()}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
          </DialogPanel>
        </div>
      </Dialog>
    </main>
  )
}

function LoadingPhotos() {
  return (
    <main className="min-h-screen bg-white p-8">
      <div className="max-w-[75%] mx-auto">
        <div className="flex justify-center items-center min-h-[200px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
        </div>
      </div>
    </main>
  );
}

export default function Photos() {
  return (
    <Suspense fallback={<LoadingPhotos />}>
      <PhotosContent />
    </Suspense>
  );
}
