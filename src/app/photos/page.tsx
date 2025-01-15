"use client"

import Link from 'next/link'
import Image from 'next/image'
import { useState, useCallback, useEffect, useRef } from 'react'
import { Dialog, DialogPanel } from '@headlessui/react'
import { api } from "~/trpc/react"
import { ImageStatus } from '../shh/constants'

type Photo = {
  id: string;
  thumbnailSrc: string;
  gallerySrc: string;
  name: string;
}

type Tag = {
  pk: string;
  name: string;
}

export default function Photos() {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [loadedThumbnails, setLoadedThumbnails] = useState<Set<string>>(new Set());
  const [loadedGalleryImages, setLoadedGalleryImages] = useState<Set<string>>(new Set());
  const [isRandom, setIsRandom] = useState(false);
  const [isAscending, setIsAscending] = useState(false);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const tagDropdownRef = useRef<HTMLDivElement>(null);

  // Fetch tags
  const { data: tags = [] } = api.tags.list.useQuery(undefined, {
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Fetch S3 photos
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

  // Convert to Photo objects
  const photos: Photo[] = dbPhotos
    .filter((photo): photo is typeof photo & { thumbnailUrl: string; galleryUrl: string } => 
      Boolean(photo.thumbnailUrl && photo.galleryUrl)
    )
    .map((photo) => ({
      id: photo.pk,
      thumbnailSrc: photo.thumbnailUrl,
      gallerySrc: photo.galleryUrl,
      name: photo.fullKey.split('/').pop() ?? photo.fullKey,
    }));

  const handleShuffle = useCallback(() => {
    setSelectedPhotoIndex(null);
    setIsRandom(prev => !prev);
    if (!isRandom) {
      setIsAscending(false);
    }
  }, [isRandom]);

  const handleAscending = useCallback(() => {
    setSelectedPhotoIndex(null);
    setIsAscending(prev => !prev);
    if (!isAscending) {
      setIsRandom(false);
    }
  }, [isAscending]);

  const handleDescending = useCallback(() => {
    setSelectedPhotoIndex(null);
    setIsRandom(false);
    setIsAscending(false);
  }, []);

  const handleTagSelect = (tag: Tag) => {
    if (!selectedTags.find(t => t.pk === tag.pk)) {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleTagRemove = (tagPk: string) => {
    setSelectedTags(selectedTags.filter(tag => tag.pk !== tagPk));
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.targetTouches[0];
    if (touch) {
      setTouchStart(touch.clientX);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.targetTouches[0];
    if (touch) {
      setTouchEnd(touch.clientX);
    }
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (selectedPhotoIndex !== null) {
      if (isLeftSwipe && selectedPhotoIndex < photos.length - 1) {
        setSelectedPhotoIndex(selectedPhotoIndex + 1);
      }
      if (isRightSwipe && selectedPhotoIndex > 0) {
        setSelectedPhotoIndex(selectedPhotoIndex - 1);
      }
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (selectedPhotoIndex === null) return;
    
    if (e.key === 'ArrowRight' && selectedPhotoIndex < photos.length - 1) {
      setSelectedPhotoIndex(selectedPhotoIndex + 1);
    }
    if (e.key === 'ArrowLeft' && selectedPhotoIndex > 0) {
      setSelectedPhotoIndex(selectedPhotoIndex - 1);
    }
    if (e.key === 'Escape') {
      setSelectedPhotoIndex(null);
    }
  }, [selectedPhotoIndex, photos.length]);

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
      <div className="max-w-[75%] mx-auto">
        <div className="flex flex-col gap-8 mb-8">
          <Link href="/" className="text-[1.6rem] link-style inline-block">&larr; back</Link>

          {(isLoadingPhotos || photos.length > 0) && (
            <div className="flex flex-col gap-4">
              <div className="flex gap-4 items-center">
                <button 
                  onClick={handleDescending}
                  className={`
                    text-[2rem] transition-all w-fit
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
                  onClick={handleAscending}
                  className={`
                    text-[2rem] transition-all w-fit
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
                  onClick={handleShuffle}
                  className={`
                    text-[2rem] transition-all w-fit
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
                      text-[2rem] transition-all w-fit
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
            no photos found
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-8 mt-8">
            {photos.map((photo, index) => (
              <div 
                key={photo.id} 
                className="aspect-square relative cursor-pointer"
                onClick={() => setSelectedPhotoIndex(index)}
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
        onClose={() => setSelectedPhotoIndex(null)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/80" aria-hidden="true" />
        
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel
            className="w-full max-w-6xl mx-auto px-16 relative"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {selectedPhotoIndex !== null && photos[selectedPhotoIndex] && (
              <div className="relative flex justify-center items-center">
                <div className="absolute inset-y-0 -left-16 flex items-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (selectedPhotoIndex > 0) {
                        setSelectedPhotoIndex(selectedPhotoIndex - 1);
                      }
                    }}
                    className="p-4 text-black bg-white/90 rounded-full hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={selectedPhotoIndex === 0}
                  >
                    ←
                  </button>
                </div>

                <div className="absolute inset-y-0 -right-16 flex items-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (selectedPhotoIndex < photos.length - 1) {
                        setSelectedPhotoIndex(selectedPhotoIndex + 1);
                      }
                    }}
                    className="p-4 text-black bg-white/90 rounded-full hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={selectedPhotoIndex === photos.length - 1}
                  >
                    →
                  </button>
                </div>
                <div className="w-[75vw] h-[85vh] relative">
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
                        <Image
                          src={selectedPhoto.gallerySrc}
                          alt={selectedPhoto.name}
                          fill
                          className={`object-contain ${
                            loadedGalleryImages.has(selectedPhoto.id) ? 'opacity-100' : 'opacity-0'
                          }`}
                          sizes="(max-width: 1536px) 100vw, 1536px"
                          priority
                          onLoad={() => setLoadedGalleryImages(prev => new Set([...prev, selectedPhoto.id]))}
                        />
                      </>
                    );
                  })()}
                </div>
                {/* <div className="absolute bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm p-4 text-[1.4rem] text-dark">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium">{photos[selectedPhotoIndex].location}</span>
                      <span className="mx-2">•</span>
                      <span>{photos[selectedPhotoIndex].date}</span>
                    </div>
                    <div>
                      <span className="text-light">{photos[selectedPhotoIndex].camera_name}</span>
                    </div>
                  </div>
                </div> */}
              </div>
            )}
          </DialogPanel>
        </div>
      </Dialog>
    </main>
  )
}
