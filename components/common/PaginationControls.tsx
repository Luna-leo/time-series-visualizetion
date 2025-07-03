'use client';

import React from 'react';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onNext: () => void;
  onPrev: () => void;
  hasNext: boolean;
  hasPrev: boolean;
  disabled?: boolean;
}

export const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  onNext,
  onPrev,
  hasNext,
  hasPrev,
  disabled = false,
}) => {
  // Don't show pagination if there's only one page
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex items-center justify-center gap-4 mt-2">
      <button
        onClick={onPrev}
        disabled={!hasPrev || disabled}
        className={`px-3 py-1 rounded ${
          hasPrev && !disabled
            ? 'bg-blue-500 text-white hover:bg-blue-600'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
        aria-label="Previous page"
      >
        Previous
      </button>

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">
          Page {currentPage} of {totalPages}
        </span>
        
        {/* Optional: Direct page input */}
        <input
          type="number"
          min={1}
          max={totalPages}
          value={currentPage}
          onChange={(e) => {
            const page = parseInt(e.target.value, 10);
            if (!isNaN(page) && page >= 1 && page <= totalPages) {
              onPageChange(page);
            }
          }}
          disabled={disabled}
          className="w-16 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Go to page"
        />
      </div>

      <button
        onClick={onNext}
        disabled={!hasNext || disabled}
        className={`px-3 py-1 rounded ${
          hasNext && !disabled
            ? 'bg-blue-500 text-white hover:bg-blue-600'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
        aria-label="Next page"
      >
        Next
      </button>
    </div>
  );
};

// Optional: Page dots indicator for visual feedback
export const PageIndicator: React.FC<{
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  maxDots?: number;
}> = ({ currentPage, totalPages, onPageChange, maxDots = 7 }) => {
  if (totalPages <= 1) return null;

  const renderDots = () => {
    const dots = [];
    
    if (totalPages <= maxDots) {
      // Show all page dots
      for (let i = 1; i <= totalPages; i++) {
        dots.push(
          <button
            key={i}
            onClick={() => onPageChange(i)}
            className={`w-2 h-2 rounded-full mx-1 ${
              i === currentPage
                ? 'bg-blue-500'
                : 'bg-gray-300 hover:bg-gray-400'
            }`}
            aria-label={`Go to page ${i}`}
          />
        );
      }
    } else {
      // Show abbreviated dots with ellipsis
      const showEllipsisStart = currentPage > 3;
      const showEllipsisEnd = currentPage < totalPages - 2;
      
      dots.push(
        <button
          key={1}
          onClick={() => onPageChange(1)}
          className={`w-2 h-2 rounded-full mx-1 ${
            currentPage === 1 ? 'bg-blue-500' : 'bg-gray-300 hover:bg-gray-400'
          }`}
          aria-label="Go to page 1"
        />
      );
      
      if (showEllipsisStart) {
        dots.push(<span key="ellipsis-start" className="mx-1">...</span>);
      }
      
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        dots.push(
          <button
            key={i}
            onClick={() => onPageChange(i)}
            className={`w-2 h-2 rounded-full mx-1 ${
              i === currentPage
                ? 'bg-blue-500'
                : 'bg-gray-300 hover:bg-gray-400'
            }`}
            aria-label={`Go to page ${i}`}
          />
        );
      }
      
      if (showEllipsisEnd) {
        dots.push(<span key="ellipsis-end" className="mx-1">...</span>);
      }
      
      dots.push(
        <button
          key={totalPages}
          onClick={() => onPageChange(totalPages)}
          className={`w-2 h-2 rounded-full mx-1 ${
            currentPage === totalPages ? 'bg-blue-500' : 'bg-gray-300 hover:bg-gray-400'
          }`}
          aria-label={`Go to page ${totalPages}`}
        />
      );
    }
    
    return dots;
  };

  return (
    <div className="flex items-center justify-center mt-2">
      {renderDots()}
    </div>
  );
};