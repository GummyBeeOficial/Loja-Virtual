'use client';

import React, { useState, useEffect } from 'react';
import Image, { ImageProps } from 'next/image';
import { ShoppingBag, ImageOff } from 'lucide-react';

interface ProductImageProps extends Omit<ImageProps, 'onError'> {
  fallbackSrc?: string;
}

/**
 * Global ProductImage component with safety guard.
 * Prevents invalid or unconfigured external placeholder URLs (like via.placeholder.com)
 * from crashing the Next.js Image component.
 */
export default function ProductImage({ 
  src, 
  alt, 
  fallbackSrc,
  className,
  ...props 
}: ProductImageProps) {
  const [error, setError] = useState(false);

  // Function to validate if a URL is safe for next/image based on our config
  const isUrlSafe = (url: any): boolean => {
    if (!url || typeof url !== 'string' || url.trim() === '') return false;
    
    // Block known problematic placeholders that are NOT configured in next.config.ts
    const blockedDomains = [
      'via.placeholder.com',
      'placeholder.com',
      'placehold.it'
    ];
    
    // Ensure it's not a blocked domain
    const isBlocked = blockedDomains.some(domain => url.includes(domain));
    if (isBlocked) return false;

    // Basic URL check - must start with http, /, or data:
    return url.startsWith('http') || url.startsWith('/') || url.startsWith('data:');
  };

  // Reset error state when src changes
  useEffect(() => {
    const timer = setTimeout(() => setError(false), 0);
    return () => clearTimeout(timer);
  }, [src]);

  // Determine the source to use
  // If the primary src is unsafe, we try fallbackSrc if provided and safe
  let finalSrc: any = src;
  if (!isUrlSafe(finalSrc)) {
    finalSrc = isUrlSafe(fallbackSrc) ? fallbackSrc : null;
  }

  // If we have an error or no safe source, we don't show the image
  const shouldShowImage = finalSrc && !error;

  // Check if the domain is picsum.photos, unsplash or supabase to use unoptimized
  // This prevents server-side fetch failures (EAI_AGAIN) for these specific domains
  const isExternalPlaceholder = typeof finalSrc === 'string' && (
    finalSrc.includes('picsum.photos') ||
    finalSrc.includes('unsplash.com') ||
    finalSrc.includes('supabase.co')
  );

  // If width and height are not provided, default to fill
  const useFill = props.fill || (!props.width && !props.height);

  return (
    <div className={`relative w-full h-full overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center ${className || ''}`}>
      {shouldShowImage ? (
        <Image
          {...props}
          key={typeof finalSrc === 'string' ? finalSrc : undefined}
          src={finalSrc}
          alt={alt || 'Produto'}
          fill={useFill}
          unoptimized={isExternalPlaceholder || props.unoptimized}
          className={`object-cover transition-opacity duration-300 ${error ? 'opacity-0' : 'opacity-100'}`}
          onError={() => {
            setError(true);
          }}
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 text-gray-400 dark:text-gray-600 p-4">
          {error ? (
            <ImageOff className="opacity-50" size={24} />
          ) : (
            <ShoppingBag className="opacity-50" size={24} />
          )}
        </div>
      )}
    </div>
  );
}
