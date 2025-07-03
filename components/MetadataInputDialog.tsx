import React, { useState } from 'react';

export interface CSVMetadata {
  plant: string;
  machineNo: string;
  label?: string;
  event?: string;
  startTime?: Date;
  endTime?: Date;
}

interface MetadataInputDialogProps {
  fileName: string;
  onSubmit: (metadata: CSVMetadata) => void;
  onCancel: () => void;
}

export const MetadataInputDialog: React.FC<MetadataInputDialogProps> = ({
  fileName,
  onSubmit,
  onCancel,
}) => {
  const [plant, setPlant] = useState('');
  const [machineNo, setMachineNo] = useState('');
  const [label, setLabel] = useState('');
  const [event, setEvent] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!plant.trim()) {
      newErrors.plant = 'Plant is required';
    }
    
    if (!machineNo.trim()) {
      newErrors.machineNo = 'Machine No is required';
    }
    
    if (startTime && endTime && new Date(startTime) > new Date(endTime)) {
      newErrors.dateRange = 'Start time must be before end time';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }
    
    const metadata: CSVMetadata = {
      plant: plant.trim(),
      machineNo: machineNo.trim(),
      label: label.trim() || undefined,
      event: event.trim() || undefined,
      startTime: startTime ? new Date(startTime) : undefined,
      endTime: endTime ? new Date(endTime) : undefined,
    };
    
    onSubmit(metadata);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-xl font-bold mb-4">CSV Import Metadata</h2>
        <p className="text-sm text-gray-600 mb-4">File: {fileName}</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Required Fields */}
          <div>
            <h3 className="font-semibold text-sm mb-2">Required Information</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Plant <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={plant}
                  onChange={(e) => setPlant(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md ${
                    errors.plant ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="e.g., PLANT01"
                />
                {errors.plant && (
                  <p className="text-red-500 text-xs mt-1">{errors.plant}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">
                  Machine No <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={machineNo}
                  onChange={(e) => setMachineNo(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md ${
                    errors.machineNo ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="e.g., MACHINE001"
                />
                {errors.machineNo && (
                  <p className="text-red-500 text-xs mt-1">{errors.machineNo}</p>
                )}
              </div>
            </div>
          </div>
          
          {/* Optional Fields for Search Presets */}
          <div>
            <h3 className="font-semibold text-sm mb-2">Search Preset (Optional)</h3>
            <p className="text-xs text-gray-500 mb-2">
              These fields can be used to create search presets for quick data access
            </p>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Label</label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g., Normal Operation"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Event</label>
                <input
                  type="text"
                  value={event}
                  onChange={(e) => setEvent(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g., Maintenance"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Start Time
                  </label>
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">
                    End Time
                  </label>
                  <input
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              {errors.dateRange && (
                <p className="text-red-500 text-xs">{errors.dateRange}</p>
              )}
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600"
            >
              Import
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};