'use client';

import React, { useRef, useEffect, useState } from 'react';

interface LazyChartProps {
  children: React.ReactNode;
  height: number;
  className?: string;
}

export const LazyChart: React.FC<LazyChartProps> = ({ children, height, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Once visible, disconnect observer to prevent re-observation
          observer.disconnect();
        }
      },
      {
        // Start loading when chart is 100px away from viewport
        rootMargin: '100px',
        threshold: 0.01,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className={`${className} ${!isVisible ? 'flex items-center justify-center' : ''}`}
      style={{ minHeight: isVisible ? 'auto' : height }}
    >
      {isVisible ? (
        children
      ) : (
        <div className="text-gray-400 text-sm">Loading chart...</div>
      )}
    </div>
  );
};