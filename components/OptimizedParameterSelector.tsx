import React, { useState, useMemo, useCallback } from 'react';
import { ParameterMetadata } from '@/types/dataReference';
import { Button } from './common/Button';
import { Input } from './common/Input';
import { ChevronDown, ChevronRight, Search, X } from 'lucide-react';

interface OptimizedParameterSelectorProps {
  parameters: ParameterMetadata[];
  onCreateChart: (selectedIds: string[], chartTitle?: string) => void;
  maxSelection?: number;
}

export function OptimizedParameterSelector({
  parameters,
  onCreateChart,
  maxSelection = 10
}: OptimizedParameterSelectorProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [chartTitle, setChartTitle] = useState('');

  // Group parameters by prefix (e.g., "PV_", "MV_", etc.)
  const groupedParameters = useMemo(() => {
    const groups: Record<string, ParameterMetadata[]> = {};
    
    parameters.forEach(param => {
      const prefix = param.name.split('_')[0] || 'その他';
      if (!groups[prefix]) {
        groups[prefix] = [];
      }
      groups[prefix].push(param);
    });
    
    return groups;
  }, [parameters]);

  // Filter parameters based on search
  const filteredGroups = useMemo(() => {
    if (!searchTerm) return groupedParameters;
    
    const filtered: Record<string, ParameterMetadata[]> = {};
    const searchLower = searchTerm.toLowerCase();
    
    Object.entries(groupedParameters).forEach(([group, params]) => {
      const filteredParams = params.filter(p => 
        p.name.toLowerCase().includes(searchLower) ||
        p.unit.toLowerCase().includes(searchLower)
      );
      
      if (filteredParams.length > 0) {
        filtered[group] = filteredParams;
      }
    });
    
    return filtered;
  }, [groupedParameters, searchTerm]);

  const handleToggleParameter = useCallback((id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else if (newSet.size < maxSelection) {
        newSet.add(id);
      }
      return newSet;
    });
  }, [maxSelection]);

  const handleToggleGroup = useCallback((group: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(group)) {
        newSet.delete(group);
      } else {
        newSet.add(group);
      }
      return newSet;
    });
  }, []);

  const handleCreateChart = useCallback(() => {
    if (selectedIds.size === 0) return;
    
    const title = chartTitle || 
      `Chart - ${Array.from(selectedIds).slice(0, 3).join(', ')}${selectedIds.size > 3 ? '...' : ''}`;
    
    onCreateChart(Array.from(selectedIds), title);
    
    // Reset selection
    setSelectedIds(new Set());
    setChartTitle('');
  }, [selectedIds, chartTitle, onCreateChart]);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const renderParameterItem = (param: ParameterMetadata) => {
    const isSelected = selectedIds.has(param.id);
    const stats = param.statistics;
    
    return (
      <div
        key={param.id}
        className={`p-3 border rounded-lg cursor-pointer transition-all ${
          isSelected 
            ? 'bg-blue-50 border-blue-500' 
            : 'hover:bg-gray-50 border-gray-200'
        }`}
        onClick={() => handleToggleParameter(param.id)}
      >
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h4 className="font-medium text-sm">{param.name}</h4>
            <p className="text-xs text-gray-600">{param.unit}</p>
            {stats && (
              <div className="mt-1 text-xs text-gray-500">
                範囲: {stats.min.toFixed(2)} ~ {stats.max.toFixed(2)}
              </div>
            )}
          </div>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => {}}
            className="mt-1"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        <h3 className="text-lg font-semibold">パラメータ選択</h3>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            type="text"
            placeholder="パラメータを検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        {/* Selection info */}
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">
            {selectedIds.size} / {maxSelection} 選択中
          </span>
          {selectedIds.size > 0 && (
            <button
              onClick={handleClearSelection}
              className="text-blue-600 hover:text-blue-700"
            >
              選択をクリア
            </button>
          )}
        </div>
      </div>

      {/* Parameter list */}
      <div className="flex-1 overflow-y-auto p-4">
        {Object.entries(filteredGroups).map(([group, params]) => (
          <div key={group} className="mb-4">
            <button
              onClick={() => handleToggleGroup(group)}
              className="flex items-center w-full text-left p-2 hover:bg-gray-50 rounded"
            >
              {expandedGroups.has(group) ? (
                <ChevronDown className="w-4 h-4 mr-2" />
              ) : (
                <ChevronRight className="w-4 h-4 mr-2" />
              )}
              <span className="font-medium">{group}</span>
              <span className="ml-2 text-sm text-gray-500">({params.length})</span>
            </button>
            
            {expandedGroups.has(group) && (
              <div className="mt-2 space-y-2 pl-6">
                {params.map(renderParameterItem)}
              </div>
            )}
          </div>
        ))}
        
        {Object.keys(filteredGroups).length === 0 && (
          <div className="text-center text-gray-500 py-8">
            パラメータが見つかりません
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 border-t space-y-3">
        <Input
          type="text"
          placeholder="チャートタイトル (オプション)"
          value={chartTitle}
          onChange={(e) => setChartTitle(e.target.value)}
        />
        
        <Button
          onClick={handleCreateChart}
          disabled={selectedIds.size === 0}
          className="w-full"
        >
          チャートを作成 ({selectedIds.size})
        </Button>
      </div>
    </div>
  );
}