'use client';

import { useState } from 'react';
import Image from 'next/image';
import Masonry from 'react-masonry-css';
import Lightbox from 'yet-another-react-lightbox';

type Aspect = 'tall' | 'wide' | 'square';

const aspects: Aspect[] = [
  'wide',
  'tall',
  'square',
  'tall',
  'wide',
  'square',
  'square',
  'wide',
  'tall',
  'square',
  'tall',
  'wide',
  'tall',
  'square',
  'wide',
  'tall',
  'square',
  'wide',
  'wide',
  'tall',
  'square',
  'tall',
  'wide',
  'square',
];

const photos = aspects.map((aspect, i) => ({
  src: '/images/workshops-hero.png',
  alt: `Workshop photo ${i + 1}`,
  aspect,
}));

const slides = photos.map((p) => ({ src: p.src }));

const breakpointColumns = {
  default: 4,
  1024: 3,
  640: 2,
};

export default function Gallery() {
  const [index, setIndex] = useState(-1);

  return (
    <main className="flex min-h-screen flex-col items-center lg:px-32">
      <div className="container pt-10 sm:pt-16 pb-24 space-y-10">
        {/* Header */}
        <div className="space-y-1">
          <h2 className="text-4xl font-extrabold scroll-m-20 tracking-tight lg:text-6xl">
            Gallery
          </h2>
          <p className="text-muted-foreground text-base">
            Moments from our workshops and events.
          </p>
        </div>

        {/* Masonry grid */}
        <Masonry
          breakpointCols={breakpointColumns}
          className="flex gap-2"
          columnClassName="flex flex-col gap-2"
        >
          {photos.map((photo, i) => (
            <div
              key={i}
              onClick={() => setIndex(i)}
              className="overflow-hidden rounded-lg group cursor-pointer"
            >
              <div
                className={[
                  'relative',
                  photo.aspect === 'tall'
                    ? 'aspect-[3/4]'
                    : photo.aspect === 'wide'
                      ? 'aspect-[4/3]'
                      : 'aspect-square',
                ].join(' ')}
              >
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  fill
                  loading="lazy"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
            </div>
          ))}
        </Masonry>

        <Lightbox
          open={index >= 0}
          index={index}
          slides={slides}
          close={() => setIndex(-1)}
        />
      </div>
    </main>
  );
}
