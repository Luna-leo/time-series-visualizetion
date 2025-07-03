import React, { useState, useEffect } from 'react';
import { useParquetData } from '../hooks/useParquetData';
import type { DuckDBManager } from '../lib/duckdb/duckdbManager';
import type { FileSystemManager } from '../lib/fileSystem/fileSystemManager';

interface DataQueryPanelProps {
  duckdbManager: DuckDBManager | null;
  fileSystemManager: FileSystemManager | null;
  onCreateChart: (data: any) => void;
}

export function DataQueryPanel({
  duckdbManager,
  fileSystemManager,
  onCreateChart,
}: DataQueryPanelProps) {
  const {
    isLoading,
    error,
    availableMachines,
    availableParameters,
    loadParametersForMachine,
    queryTimeSeries,
    getImportHistory,
  } = useParquetData({ duckdbManager, fileSystemManager });

  const [selectedMachine, setSelectedMachine] = useState<string>('');
  const [selectedParameters, setSelectedParameters] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [aggregationInterval, setAggregationInterval] = useState<string>('');
  const [importHistory, setImportHistory] = useState<any[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string>('');

  // Load parameters when machine is selected
  useEffect(() => {
    if (selectedMachine) {
      loadParametersForMachine(selectedMachine);
      getImportHistory(selectedMachine).then(setImportHistory);
    }
  }, [selectedMachine, loadParametersForMachine, getImportHistory]);

  const handleQuerySubmit = async () => {
    if (!selectedMachine || selectedParameters.length === 0 || !startDate || !endDate) {
      alert('Please fill in all required fields');
      return;
    }

    const result = await queryTimeSeries({
      machineId: selectedMachine,
      parameters: selectedParameters,
      startTime: new Date(startDate),
      endTime: new Date(endDate),
      interval: aggregationInterval || undefined,
    });

    if (result) {
      onCreateChart({
        title: `${selectedMachine} - ${selectedParameters.join(', ')}`,
        data: result.data,
        parameters: result.parameters,
        machineId: selectedMachine,
        queryStats: result.stats,
      });
    }
  };

  const handleParameterToggle = (parameter: string) => {
    setSelectedParameters(prev => {
      if (prev.includes(parameter)) {
        return prev.filter(p => p !== parameter);
      } else if (prev.length < 6) {
        return [...prev, parameter];
      }
      return prev;
    });
  };

  const handlePresetSelect = (preset: any) => {
    setSelectedPreset(preset.fileName);
    
    // Apply preset values
    if (preset.label) {
      // You can add label to the chart title or as metadata
    }
    
    if (preset.startTime) {
      const startDateTime = new Date(preset.startTime);
      setStartDate(startDateTime.toISOString().slice(0, 16));
    }
    
    if (preset.endTime) {
      const endDateTime = new Date(preset.endTime);
      setEndDate(endDateTime.toISOString().slice(0, 16));
    }
  };

  const machineParams = selectedMachine ? availableParameters.get(selectedMachine) || [] : [];

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">Query Stored Data</h3>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {/* Machine Selection */}
        <div>
          <label className="block text-sm font-medium mb-1">Machine</label>
          <select
            value={selectedMachine}
            onChange={(e) => setSelectedMachine(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            disabled={isLoading}
          >
            <option value="">Select a machine</option>
            {availableMachines.map(machine => (
              <option key={machine} value={machine}>{machine}</option>
            ))}
          </select>
        </div>

        {/* Search Presets / Import History */}
        {importHistory.length > 0 && (
          <div>
            <label className="block text-sm font-medium mb-1">Search Presets</label>
            <div className="max-h-32 overflow-y-auto border rounded p-2">
              {importHistory.map((history, idx) => (
                <div 
                  key={idx} 
                  className={`p-2 mb-1 rounded cursor-pointer hover:bg-gray-100 ${
                    selectedPreset === history.fileName ? 'bg-blue-100' : ''
                  }`}
                  onClick={() => handlePresetSelect(history)}
                >
                  <div className="text-sm font-medium">
                    {history.label || history.fileName}
                  </div>
                  <div className="text-xs text-gray-600">
                    {history.event && <span className="mr-2">Event: {history.event}</span>}
                    {history.detectedEncoding && <span className="mr-2">Encoding: {history.detectedEncoding}</span>}
                    {new Date(history.importedAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Parameter Selection */}
        {selectedMachine && (
          <div>
            <label className="block text-sm font-medium mb-1">
              Parameters (max 6, {selectedParameters.length} selected)
            </label>
            <div className="max-h-48 overflow-y-auto border rounded p-2">
              {machineParams.map(param => (
                <label key={param} className="flex items-center mb-1">
                  <input
                    type="checkbox"
                    checked={selectedParameters.includes(param)}
                    onChange={() => handleParameterToggle(param)}
                    disabled={!selectedParameters.includes(param) && selectedParameters.length >= 6}
                    className="mr-2"
                  />
                  <span className="text-sm">{param}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Start Date</label>
            <input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              disabled={isLoading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End Date</label>
            <input
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Aggregation Interval */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Aggregation Interval (optional)
          </label>
          <select
            value={aggregationInterval}
            onChange={(e) => setAggregationInterval(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            disabled={isLoading}
          >
            <option value="">No aggregation (raw data)</option>
            <option value="minute">1 minute</option>
            <option value="hour">1 hour</option>
            <option value="day">1 day</option>
            <option value="week">1 week</option>
            <option value="month">1 month</option>
          </select>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleQuerySubmit}
          disabled={isLoading || !selectedMachine || selectedParameters.length === 0}
          className="w-full py-2 px-4 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Querying...' : 'Create Chart from Query'}
        </button>
      </div>
    </div>
  );
}