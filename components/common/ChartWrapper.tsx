'use client';

import React from 'react';

interface ChartWrapperProps {
  title?: string;
  loading?: boolean;
  error?: Error | string | null;
  loadingMessage?: string;
  className?: string;
  children: React.ReactNode;
}

export const ChartWrapper: React.FC<ChartWrapperProps> = ({
  title,
  loading = false,
  error = null,
  loadingMessage = 'Loading chart...',
  className = '',
  children,
}) => {
  if (loading) {
    return (
      <div className={`chart-wrapper flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="animate-pulse">
            <div className="h-8 w-48 bg-gray-200 rounded mb-4"></div>
            <div className="h-64 w-96 bg-gray-200 rounded"></div>
          </div>
          <p className="mt-2 text-sm text-gray-600">{loadingMessage}</p>
        </div>
      </div>
    );
  }

  if (error) {
    const errorMessage = typeof error === 'string' ? error : error.message;
    return (
      <div className={`chart-wrapper flex items-center justify-center ${className}`}>
        <div className="text-center p-4 border border-red-300 rounded bg-red-50">
          <svg className="w-12 h-12 mx-auto text-red-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-semibold text-red-700">Chart Error</h3>
          <p className="text-sm text-red-600 mt-1">{errorMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`chart-wrapper ${className}`}>
      {children}
    </div>
  );
};

// Chart skeleton component for loading states
export const ChartSkeleton: React.FC<{ width?: number; height?: number }> = ({ 
  width = 400, 
  height = 300 
}) => (
  <div className="animate-pulse">
    <div 
      className="bg-gray-200 rounded"
      style={{ width: `${width}px`, height: `${height}px` }}
    />
  </div>
);