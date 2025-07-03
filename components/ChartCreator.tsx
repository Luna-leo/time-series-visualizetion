'use client';

import React, { useState } from 'react';
import { ParameterSelector } from './ParameterSelector';
import type { CSVParameter, ChartConfiguration } from '../types/csv';

interface ChartCreatorProps {
  parameters: CSVParameter[];
  onCreateChart: (config: ChartConfiguration) => void;
  onCancel: () => void;
}

export const ChartCreator: React.FC<ChartCreatorProps> = ({
  parameters,
  onCreateChart,
  onCancel,
}) => {
  const [selectedParameterIds, setSelectedParameterIds] = useState<string[]>([]);
  const [chartTitle, setChartTitle] = useState('');

  const handleCreate = () => {
    if (selectedParameterIds.length === 0) return;

    const config: ChartConfiguration = {
      id: `chart-${Date.now()}`,
      title: chartTitle || generateDefaultTitle(),
      parameterIds: selectedParameterIds,
    };

    onCreateChart(config);
  };

  const generateDefaultTitle = () => {
    const selectedParams = parameters.filter(p => selectedParameterIds.includes(p.id));
    if (selectedParams.length === 1) {
      return selectedParams[0].name;
    } else if (selectedParams.length <= 3) {
      return selectedParams.map(p => p.name).join(' / ');
    } else {
      return `${selectedParams[0].name} + ${selectedParams.length - 1} others`;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex flex-col">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold">Create New Chart</h2>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="w-1/2 border-r">
            <ParameterSelector
              parameters={parameters}
              selectedIds={selectedParameterIds}
              onSelectionChange={setSelectedParameterIds}
              maxSelection={6}
            />
          </div>

          <div className="w-1/2 p-6">
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chart Title
              </label>
              <input
                type="text"
                value={chartTitle}
                onChange={(e) => setChartTitle(e.target.value)}
                placeholder={generateDefaultTitle()}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {selectedParameterIds.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Preview</h3>
                <div className="p-4 bg-gray-50 rounded-md">
                  <p className="font-medium mb-2">{chartTitle || generateDefaultTitle()}</p>
                  <p className="text-sm text-gray-600">
                    {selectedParameterIds.length} parameter{selectedParameterIds.length > 1 ? 's' : ''} selected
                  </p>
                  <ul className="mt-2 space-y-1">
                    {selectedParameterIds.map(id => {
                      const param = parameters.find(p => p.id === id);
                      return param ? (
                        <li key={id} className="text-sm">
                          • {param.name} ({param.unit})
                        </li>
                      ) : null;
                    })}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={selectedParameterIds.length === 0}
            className={`px-4 py-2 rounded-md ${
              selectedParameterIds.length > 0
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Create Chart
          </button>
        </div>
      </div>
    </div>
  );
};