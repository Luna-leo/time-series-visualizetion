import { useState, useEffect, useCallback } from 'react';
import { CHART_DIMENSIONS, GRID_CONFIGURATIONS } from '../constants/chartTheme';
import { LAYOUT_CONSTANTS, CHART_SPACING } from '../constants/layoutConstants';
import type { GridSize } from '../types/chart';

interface UseChartDimensionsOptions {
  gridSize?: GridSize;
  padding?: number;
  headerHeight?: number;
  hasProgressBar?: boolean;
}

// Grid-specific minimum sizes for better responsive behavior
const GRID_MIN_SIZES: Record<GridSize, { width: number; height: number }> = {
  '1x1': { width: 200, height: 150 },
  '2x2': { width: 120, height: 80 },  // Reduced from 100
  '3x3': { width: 80, height: 60 },   // Reduced from 70
  '4x4': { width: 60, height: 40 },   // Reduced from 50
};

export const useChartDimensions = (options: UseChartDimensionsOptions = {}) => {
  const {
    gridSize,
    padding = LAYOUT_CONSTANTS.container.padding,
    headerHeight,
    hasProgressBar = false,
  } = options;

  // Use measured height if available, otherwise fall back to constant
  const effectiveHeaderHeight = headerHeight !== undefined ? headerHeight : LAYOUT_CONSTANTS.header.height;

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
      const totalHeaderHeight = effectiveHeaderHeight + (hasProgressBar ? LAYOUT_CONSTANTS.progressBar.height : 0);
      const containerPadding = padding * 2;
      const width = window.innerWidth - containerPadding - CHART_SPACING.paddingAndBorder;
      const height = window.innerHeight - containerPadding - totalHeaderHeight - CHART_SPACING.paddingAndBorder;
      const minSize = GRID_MIN_SIZES[gridSize];
      return {
        width: Math.max(width, minSize.width),
        height: Math.max(height, minSize.height),
      };
    }

    const grid = GRID_CONFIGURATIONS[gridSize];
    const isDenseGrid = gridSize === '3x3' || gridSize === '4x4';
    const gap = isDenseGrid ? 4 : LAYOUT_CONSTANTS.chart.gap; // gap-1 = 4px, gap-2 = 8px
    const totalHeaderHeight = effectiveHeaderHeight + (hasProgressBar ? LAYOUT_CONSTANTS.progressBar.height : 0);
    const containerPadding = padding * 2; // padding is for one side, we need both sides
    
    const availableWidth = window.innerWidth - containerPadding - (grid.cols - 1) * gap;
    const availableHeight = window.innerHeight - containerPadding - totalHeaderHeight - (grid.rows - 1) * gap;
    
    const chartPaddingAndBorder = isDenseGrid 
      ? LAYOUT_CONSTANTS.chart.border // Only border for dense grids (no padding)
      : CHART_SPACING.paddingAndBorder; // Border + padding for regular grids
    
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
  }, [gridSize, padding, effectiveHeaderHeight, hasProgressBar]);

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