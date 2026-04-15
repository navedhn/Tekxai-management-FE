import React from 'react';
import { Loader2, LoaderPinwheel } from 'lucide-react';
import { cn } from '@/utils/cn';

interface LoaderProps {
  size?: number;
  className?: string;
  containerClassName?: string;
  fullPage?: boolean;
}

const Loader: React.FC<LoaderProps> = ({
  size = 24,
  className,
  containerClassName,
  fullPage = true
}) => {
  const content = (
    <div className={cn('flex items-center justify-center', containerClassName)}>
      <LoaderPinwheel
        className={cn('animate-spin', className)}
        size={size}
        stroke="url(#gradient)"
      />

      <svg width="0" height="0">
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#005CDA" />
            <stop offset="100%" stopColor="#001F4A" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );

  if (fullPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white/60 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return content;
};

export default Loader;
