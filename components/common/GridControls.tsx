'use client';

import React from 'react';
import type { GridSize, DataDensity } from '../../types/chart';

interface GridControlsProps {
  gridSize: GridSize;
  onGridSizeChange: (size: GridSize) => void;
  dataDensity: DataDensity;
  onDensityChange: (density: DataDensity) => void;
  disabled?: boolean;
  className?: string;
}

export const GridControls: React.FC<GridControlsProps> = ({
  gridSize,
  onGridSizeChange,
  dataDensity,
  onDensityChange,
  disabled = false,
  className = '',
}) => {
  const gridSizes: GridSize[] = ['1x1', '2x2', '3x3', '4x4'];
  const densities: DataDensity[] = ['full', 'medium', 'low'];

  return (
    <div className={`flex justify-center items-center gap-4 ${className}`}>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">Grid Size:</span>
        {gridSizes.map(size => (
          <button
            key={size}
            onClick={() => onGridSizeChange(size)}
            disabled={disabled}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              gridSize === size 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 hover:bg-gray-300'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {size}
          </button>
        ))}
      </div>
      
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">Density:</span>
        {densities.map(density => (
          <button
            key={density}
            onClick={() => onDensityChange(density)}
            disabled={disabled}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              dataDensity === density 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 hover:bg-gray-300'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {density}
          </button>
        ))}
      </div>
    </div>
  );
};

// Simplified controls for just grid size
export const GridSizeSelector: React.FC<{
  gridSize: GridSize;
  onChange: (size: GridSize) => void;
  disabled?: boolean;
}> = ({ gridSize, onChange, disabled = false }) => {
  const gridSizes: GridSize[] = ['1x1', '2x2', '3x3', '4x4'];

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-semibold">Grid Size:</span>
      {gridSizes.map(size => (
        <button
          key={size}
          onClick={() => onChange(size)}
          disabled={disabled}
          className={`px-3 py-1 text-sm rounded transition-colors ${
            gridSize === size 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-200 hover:bg-gray-300'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {size}
        </button>
      ))}
    </div>
  );
};

// Simplified controls for just data density
export const DataDensitySelector: React.FC<{
  density: DataDensity;
  onChange: (density: DataDensity) => void;
  disabled?: boolean;
}> = ({ density, onChange, disabled = false }) => {
  const densities: DataDensity[] = ['full', 'medium', 'low'];

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-semibold">Density:</span>
      {densities.map(d => (
        <button
          key={d}
          onClick={() => onChange(d)}
          disabled={disabled}
          className={`px-3 py-1 text-sm rounded transition-colors ${
            density === d 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-200 hover:bg-gray-300'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {d}
        </button>
      ))}
    </div>
  );
};