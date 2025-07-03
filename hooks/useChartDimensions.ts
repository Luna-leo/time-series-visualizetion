import { useState, useEffect, useCallback } from 'react';
import { CHART_DIMENSIONS, GRID_CONFIGURATIONS } from '../constants/chartTheme';
import type { GridSize } from '../types/chart';

interface UseChartDimensionsOptions {
  gridSize?: GridSize;
  padding?: number;
  headerHeight?: number;
}

// Grid-specific minimum sizes for better responsive behavior
const GRID_MIN_SIZES: Record<GridSize, { width: number; height: number }> = {
  '1x1': { width: 200, height: 150 },
  '2x2': { width: 120, height: 100 },
  '3x3': { width: 80, height: 70 },
  '4x4': { width: 60, height: 50 },
};

export const useChartDimensions = (options: UseChartDimensionsOptions = {}) => {
  const {
    gridSize,
    padding = 16, // Match Tailwind p-4
    headerHeight = 120,
  } = options;

  const [dimensions, setDimensions] = useState(() => {
    if (typeof window === 'undefined') {
      return CHART_DIMENSIONS.default;
    }
    return calculateDimensions();
  });

  function calculateDimensions() {
    if (!gridSize) {
      return CHART_DIMENSIONS.default;
    }

    // For 1x1 grid, use larger dimensions
    if (gridSize === '1x1') {
      const containerPadding = padding * 2; // Account for both sides
      const chartPaddingAndBorder = 10; // border (2px) + padding (8px)
      const width = Math.min(window.innerWidth - containerPadding - chartPaddingAndBorder, 1200);
      const height = Math.min(window.innerHeight - containerPadding - headerHeight - chartPaddingAndBorder, 650);
      const minSize = GRID_MIN_SIZES[gridSize];
      return {
        width: Math.max(width, minSize.width),
        height: Math.max(height, minSize.height),
      };
    }

    const grid = GRID_CONFIGURATIONS[gridSize];
    // Account for container padding (16px * 2)
    const containerPadding = padding * 2;
    // Gap between charts (8px)
    const gap = 8;
    // Chart border (1px * 2) + padding (4px * 2) = 10px per chart
    const chartPaddingAndBorder = 10;
    
    const availableWidth = window.innerWidth - containerPadding - (grid.cols - 1) * gap;
    const availableHeight = window.innerHeight - containerPadding - headerHeight - (grid.rows - 1) * gap;
    
    const width = Math.floor(availableWidth / grid.cols) - chartPaddingAndBorder;
    const height = Math.floor(availableHeight / grid.rows) - chartPaddingAndBorder;

    const minSize = GRID_MIN_SIZES[gridSize];
    return {
      width: Math.max(width, minSize.width),
      height: Math.max(height, minSize.height),
    };
  }

  const updateDimensions = useCallback(() => {
    setDimensions(calculateDimensions());
  }, [gridSize, padding, headerHeight]);

  useEffect(() => {
    // Skip if no window object (SSR)
    if (typeof window === 'undefined') return;

    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, [updateDimensions]);

  return dimensions;
};

// Hook for single chart dimensions (no grid)
export const useSingleChartDimensions = (options: {
  maxWidth?: number;
  maxHeight?: number;
  padding?: number;
} = {}) => {
  const {
    maxWidth = 1200,
    maxHeight = 700,
    padding = 40,
  } = options;

  const [dimensions, setDimensions] = useState(() => {
    if (typeof window === 'undefined') {
      return CHART_DIMENSIONS.default;
    }
    return calculateSingleDimensions();
  });

  function calculateSingleDimensions() {
    const width = Math.min(window.innerWidth - padding, maxWidth);
    const height = Math.min(window.innerHeight - 140, maxHeight);

    return {
      width: Math.max(width, CHART_DIMENSIONS.minimum.width),
      height: Math.max(height, CHART_DIMENSIONS.minimum.height),
    };
  }

  const updateDimensions = useCallback(() => {
    setDimensions(calculateSingleDimensions());
  }, [maxWidth, maxHeight, padding]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, [updateDimensions]);

  return dimensions;
};