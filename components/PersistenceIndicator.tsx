import React from 'react';
import { Save, Check, AlertCircle } from 'lucide-react';

interface PersistenceIndicatorProps {
  status: {
    isActive: boolean;
    message: string;
    progress?: number;
  };
}

export function PersistenceIndicator({ status }: PersistenceIndicatorProps) {
  if (!status.isActive && !status.message) {
    return null;
  }

  return (
    <div className="fixed bottom-20 right-4 z-40 animate-in slide-in-from-bottom-2 fade-in duration-300">
      <div className="flex items-center space-x-3 p-4 bg-white rounded-lg shadow-lg border border-gray-200">
        {status.isActive ? (
          <>
            <div className="animate-spin">
              <Save className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{status.message}</p>
              {status.progress !== undefined && (
                <div className="mt-1 w-48 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${status.progress}%` }}
                  />
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <Check className="w-5 h-5 text-green-600" />
            <p className="text-sm font-medium text-gray-900">
              データをParquet形式で保存しました
            </p>
          </>
        )}
      </div>
    </div>
  );
}