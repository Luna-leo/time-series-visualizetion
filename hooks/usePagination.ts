import { useState, useCallback, useMemo, useEffect } from 'react';
import { GRID_CONFIGURATIONS, TOTAL_CHARTS } from '../constants/chartTheme';
import type { GridSize } from '../types/chart';

interface UsePaginationOptions {
  gridSize: GridSize;
  totalItems?: number;
}

export function usePagination({ gridSize, totalItems = TOTAL_CHARTS }: UsePaginationOptions) {
  const [currentPage, setCurrentPage] = useState(1);

  // Calculate items per page based on grid size
  const itemsPerPage = useMemo(() => {
    const config = GRID_CONFIGURATIONS[gridSize];
    return config.rows * config.cols;
  }, [gridSize]);

  // Calculate total pages
  const totalPages = useMemo(() => {
    return Math.ceil(totalItems / itemsPerPage);
  }, [totalItems, itemsPerPage]);

  // Reset to page 1 when grid size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [gridSize]);

  // Navigation functions
  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  }, [totalPages]);

  const nextPage = useCallback(() => {
    goToPage(currentPage + 1);
  }, [currentPage, goToPage]);

  const prevPage = useCallback(() => {
    goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  // Calculate which items to show on current page
  const paginatedRange = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
    return { startIndex, endIndex };
  }, [currentPage, itemsPerPage, totalItems]);

  // Get paginated items from an array
  const getPaginatedItems = useCallback(<T,>(items: T[]): T[] => {
    const { startIndex, endIndex } = paginatedRange;
    return items.slice(startIndex, endIndex);
  }, [paginatedRange]);

  return {
    currentPage,
    totalPages,
    itemsPerPage,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
    goToPage,
    nextPage,
    prevPage,
    paginatedRange,
    getPaginatedItems,
  };
}