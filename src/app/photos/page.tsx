"use client"

import Link from 'next/link'
import Image from 'next/image'
import { useState, useCallback, useEffect } from 'react'
import { Dialog, DialogPanel } from '@headlessui/react'

// Temporary type and data for development
type Photo = {
  id: number;
  src: string;
  name: string;
  date: string;
  location: string;
  camera_name: string;
}

const photos: Photo[] = [
  {
    id: 1,
    src: '/photos/1.png',
    name: 'Photo 1',
    date: '2024-03-20',
    location: 'San Francisco, CA',
    camera_name: 'Sony A7III'
  },
  {
    id: 2,
    src: '/photos/2.png',
    name: 'Photo 2',
    date: '2024-03-21',
    location: 'San Francisco, CA',
    camera_name: 'Sony A7III'
  },
  {
    id: 3,
    src: '/photos/3.png',
    name: 'Photo 3',
    date: '2024-03-23',
    location: 'London, UK',
    camera_name: 'Sony A7III'
  },
  {
    id: 4,
    src: '/photos/4.png',
    name: 'Photo 4',
    date: '2024-03-24s',
    location: 'New York, NY',
    camera_name: 'Sony A7III'
  },
  {
    id: 5,
    src: '/photos/5.png',
    name: 'Photo 5',
    date: '2024-03-25',
    location: 'Newark, NJ',
    camera_name: 'Sony A7III'
  }
];

export default function Photos() {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

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
  }, [selectedPhotoIndex]);

  // Add keyboard event listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <main className="min-h-screen bg-white p-8">
      <div className="max-w-[75%] mx-auto">
        <Link href="/" className="text-[1.6rem] link-style mb-8 inline-block">&larr; back</Link>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 mt-8">
          {photos.map((photo, index) => (
            <div 
              key={photo.id} 
              className="aspect-square relative cursor-pointer"
              onClick={() => setSelectedPhotoIndex(index)}
            >
              <Image
                src={photo.src}
                alt={photo.name}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 75vw, (max-width: 768px) 37.5vw, (max-width: 1024px) 25vw, 18.75vw"
              />
            </div>
          ))}
        </div>
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
                  <Image
                    src={photos[selectedPhotoIndex].src}
                    alt={photos[selectedPhotoIndex].name}
                    fill
                    className="object-contain"
                    sizes="(max-width: 1536px) 100vw, 1536px"
                    priority
                  />
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
