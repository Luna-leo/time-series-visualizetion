'use client';

import React, { useState, useMemo } from 'react';
import type { CSVParameter } from '../types/csv';

interface ParameterSelectorProps {
  parameters: CSVParameter[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  maxSelection?: number;
  className?: string;
}

export const ParameterSelector: React.FC<ParameterSelectorProps> = ({
  parameters,
  selectedIds,
  onSelectionChange,
  maxSelection = 6,
  className = '',
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredParameters = useMemo(() => {
    if (!searchTerm) return parameters;
    
    const term = searchTerm.toLowerCase();
    return parameters.filter(param => 
      param.id.toLowerCase().includes(term) ||
      param.name.toLowerCase().includes(term) ||
      param.unit.toLowerCase().includes(term)
    );
  }, [parameters, searchTerm]);

  const handleToggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter(sid => sid !== id));
    } else if (selectedIds.length < maxSelection) {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const handleSelectAll = () => {
    const newSelection = filteredParameters
      .slice(0, maxSelection)
      .map(p => p.id);
    onSelectionChange(newSelection);
  };

  const handleClearAll = () => {
    onSelectionChange([]);
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold mb-3">Parameters</h3>
        
        <input
          type="text"
          placeholder="Search parameters..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        
        <div className="mt-2 flex justify-between items-center text-sm">
          <span className="text-gray-600">
            {selectedIds.length} / {maxSelection} selected
          </span>
          <div className="space-x-2">
            <button
              onClick={handleSelectAll}
              className="text-blue-600 hover:text-blue-800"
              disabled={selectedIds.length === maxSelection}
            >
              Select All
            </button>
            <button
              onClick={handleClearAll}
              className="text-gray-600 hover:text-gray-800"
              disabled={selectedIds.length === 0}
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          {filteredParameters.length === 0 ? (
            <p className="text-center text-gray-500 mt-4">No parameters found</p>
          ) : (
            <div className="space-y-1">
              {filteredParameters.map(param => {
                const isSelected = selectedIds.includes(param.id);
                const isDisabled = !isSelected && selectedIds.length >= maxSelection;
                
                return (
                  <div
                    key={param.id}
                    className={`
                      p-3 rounded-md cursor-pointer transition-all
                      ${isSelected ? 'bg-blue-100 border-blue-300' : 'bg-gray-50 hover:bg-gray-100'}
                      ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
                      border
                    `}
                    onClick={() => !isDisabled && handleToggle(param.id)}
                  >
                    <div className="flex items-start">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        disabled={isDisabled}
                        className="mt-1 mr-3"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{param.id}</div>
                        <div className="text-sm text-gray-600">{param.name}</div>
                        {param.unit && (
                          <div className="text-xs text-gray-500 mt-1">Unit: {param.unit}</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="p-4 border-t bg-gray-50">
          <p className="text-sm font-medium mb-2">Selected Parameters:</p>
          <div className="flex flex-wrap gap-2">
            {selectedIds.map(id => {
              const param = parameters.find(p => p.id === id);
              return param ? (
                <span
                  key={id}
                  className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-blue-100 text-blue-800"
                >
                  {param.name} ({param.unit})
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggle(id);
                    }}
                    className="ml-1 hover:text-blue-900"
                  >
                    ×
                  </button>
                </span>
              ) : null;
            })}
          </div>
        </div>
      )}
    </div>
  );
};