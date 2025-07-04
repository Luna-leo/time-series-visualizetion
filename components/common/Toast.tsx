import React, { useEffect } from 'react';
import { X, Info, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose?: () => void;
}

export function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose?.();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const getIcon = () => {
    switch (type) {
      case 'info':
        return <Info className="w-5 h-5" />;
      case 'success':
        return <CheckCircle className="w-5 h-5" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5" />;
      case 'error':
        return <AlertCircle className="w-5 h-5" />;
    }
  };

  const getStyles = () => {
    switch (type) {
      case 'info':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'success':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-2 fade-in duration-300">
      <div className={`flex items-center space-x-3 p-4 rounded-lg border shadow-lg ${getStyles()}`}>
        <div className="flex-shrink-0">{getIcon()}</div>
        <div className="flex-1 pr-2">
          <p className="text-sm font-medium">{message}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="flex-shrink-0 ml-4 hover:opacity-70 transition-opacity"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}