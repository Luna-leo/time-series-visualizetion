'use client';

import React from 'react';
import type { LoadProgress } from '../../types/performance';

interface ProgressBarProps {
  progress: number; // 0-100
  message?: string;
  className?: string;
  showPercentage?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  message = 'Loading...',
  className = '',
  showPercentage = true,
}) => {
  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <div className={`w-full ${className}`}>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
      <div className="text-center text-sm mt-1 text-gray-600">
        {message}
        {showPercentage && ` ${Math.round(clampedProgress)}%`}
      </div>
    </div>
  );
};

// Enhanced progress component with more details
export const DetailedProgress: React.FC<{
  progress: LoadProgress;
  className?: string;
}> = ({ progress, className = '' }) => {
  const percentage = (progress.current / progress.total) * 100;

  return (
    <div className={`w-full ${className}`}>
      <div className="flex justify-between text-sm text-gray-600 mb-1">
        <span>{progress.message || 'Processing...'}</span>
        <span>{progress.current} / {progress.total}</span>
      </div>
      <ProgressBar 
        progress={percentage} 
        showPercentage={false}
      />
    </div>
  );
};

// Loading overlay with progress
export const LoadingOverlay: React.FC<{
  progress?: number;
  message?: string;
  show: boolean;
}> = ({ progress, message = 'Loading...', show }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow-lg min-w-[300px]">
        <h3 className="text-lg font-semibold mb-4">{message}</h3>
        {progress !== undefined && (
          <ProgressBar progress={progress} message="" />
        )}
        {progress === undefined && (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        )}
      </div>
    </div>
  );
};