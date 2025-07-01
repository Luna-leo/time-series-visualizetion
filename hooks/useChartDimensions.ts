import { useState, useEffect, useCallback } from 'react';
import { CHART_DIMENSIONS, GRID_CONFIGURATIONS } from '../constants/chartTheme';
import type { GridSize } from '../types/chart';

interface UseChartDimensionsOptions {
  gridSize?: GridSize;
  padding?: number;
  headerHeight?: number;
  minWidth?: number;
  minHeight?: number;
}

export const useChartDimensions = (options: UseChartDimensionsOptions = {}) => {
  const {
    gridSize,
    padding = 40,
    headerHeight = 180,
    minWidth = CHART_DIMENSIONS.minimum.width,
    minHeight = CHART_DIMENSIONS.minimum.height,
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

    const grid = GRID_CONFIGURATIONS[gridSize];
    const width = Math.floor((window.innerWidth - padding) / grid.cols) - 10;
    const height = Math.floor((window.innerHeight - headerHeight - padding) / grid.rows) - 10;

    return {
      width: Math.max(width, minWidth),
      height: Math.max(height, minHeight),
    };
  }

  const updateDimensions = useCallback(() => {
    setDimensions(calculateDimensions());
  }, [gridSize, padding, headerHeight, minWidth, minHeight]);

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