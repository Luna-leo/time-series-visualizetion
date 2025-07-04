'use client';

import React from 'react';

interface ProgressDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  progress?: {
    current: number;
    total: number;
    memory?: number;
  };
  onCancel?: () => void;
}

export const ProgressDialog: React.FC<ProgressDialogProps> = ({
  isOpen,
  title,
  message,
  progress,
  onCancel
}) => {
  if (!isOpen) return null;

  const percentage = progress ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-96">
        <h2 className="text-xl font-semibold mb-4">{title}</h2>
        
        <p className="text-gray-600 mb-4">{message}</p>
        
        {progress && (
          <>
            <div className="mb-2">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Progress: {progress.current} / {progress.total}</span>
                <span>{percentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
            
            {progress.memory !== undefined && (
              <p className="text-sm text-gray-500 mb-4">
                Memory usage: {progress.memory} MB
              </p>
            )}
          </>
        )}
        
        {onCancel && (
          <div className="flex justify-end">
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};