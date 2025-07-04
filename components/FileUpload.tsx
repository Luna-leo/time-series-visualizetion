'use client';

import React, { useCallback, useState } from 'react';
import { MetadataInputDialog, type CSVMetadata } from './MetadataInputDialog';

interface FileUploadProps {
  onFileSelect: (file: File, metadata: CSVMetadata) => void;
  onMultipleFilesSelect?: (files: File[], metadata: CSVMetadata) => void;
  accept?: string;
  maxSize?: number; // in MB
  disabled?: boolean;
  multiple?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  onMultipleFilesSelect,
  accept = '.csv',
  maxSize = 50,
  disabled = false,
  multiple = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showMetadataDialog, setShowMetadataDialog] = useState(false);

  const validateFiles = useCallback((files: File[]): boolean => {
    setError(null);

    // Check if files are provided
    if (files.length === 0) {
      setError('No files selected');
      return false;
    }

    // Check file types
    const invalidFiles = files.filter(file => !file.name.toLowerCase().endsWith('.csv'));
    if (invalidFiles.length > 0) {
      setError(`Please upload only CSV files. Invalid files: ${invalidFiles.map(f => f.name).join(', ')}`);
      return false;
    }

    // Check file sizes
    const maxSizeBytes = maxSize * 1024 * 1024;
    const oversizedFiles = files.filter(file => file.size > maxSizeBytes);
    if (oversizedFiles.length > 0) {
      setError(`Files must be less than ${maxSize}MB. Oversized files: ${oversizedFiles.map(f => f.name).join(', ')}`);
      return false;
    }

    return true;
  }, [maxSize]);

  const handleFiles = useCallback((files: File[]) => {
    if (validateFiles(files)) {
      setSelectedFiles(files);
      setShowMetadataDialog(true);
    }
  }, [validateFiles]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      if (multiple && onMultipleFilesSelect) {
        handleFiles(files);
      } else {
        handleFiles([files[0]]);
      }
    }
  }, [multiple, onMultipleFilesSelect, handleFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      if (multiple && onMultipleFilesSelect) {
        handleFiles(Array.from(files));
      } else {
        handleFiles([files[0]]);
      }
    }
  }, [multiple, onMultipleFilesSelect, handleFiles]);

  const handleMetadataSubmit = useCallback((metadata: CSVMetadata) => {
    if (selectedFiles.length > 0) {
      if (multiple && onMultipleFilesSelect && selectedFiles.length > 1) {
        onMultipleFilesSelect(selectedFiles, metadata);
      } else {
        onFileSelect(selectedFiles[0], metadata);
      }
      setSelectedFiles([]);
      setShowMetadataDialog(false);
    }
  }, [selectedFiles, onFileSelect, onMultipleFilesSelect, multiple]);

  const handleMetadataCancel = useCallback(() => {
    setSelectedFiles([]);
    setShowMetadataDialog(false);
  }, []);

  const removeFile = useCallback((index: number) => {
    setSelectedFiles(prev => {
      const newFiles = prev.filter((_, i) => i !== index);
      if (newFiles.length === 0) {
        setShowMetadataDialog(false);
      }
      return newFiles;
    });
  }, []);

  return (
    <div className="w-full">
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8
          transition-all duration-200 cursor-pointer
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileInput}
          disabled={disabled}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
            aria-hidden="true"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          
          <p className="mt-2 text-sm text-gray-600">
            <span className="font-semibold">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {multiple ? 'Multiple CSV files' : 'CSV file'} up to {maxSize}MB each
          </p>
          
          {error && (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          )}
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-500">
        <p className="font-semibold mb-1">Expected CSV format:</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>Row 1: Parameter IDs (e.g., TEMP001, PRES001)</li>
          <li>Row 2: Parameter names (e.g., 温度, 圧力)</li>
          <li>Row 3: Units (e.g., °C, kPa)</li>
          <li>Row 4+: Data rows with timestamp in first column</li>
        </ul>
      </div>

      {showMetadataDialog && selectedFiles.length > 0 && (
        <MetadataInputDialog
          fileName={selectedFiles.length === 1 ? selectedFiles[0].name : `${selectedFiles.length} files`}
          files={selectedFiles}
          onSubmit={handleMetadataSubmit}
          onCancel={handleMetadataCancel}
          onRemoveFile={removeFile}
          multiple={selectedFiles.length > 1}
        />
      )}
    </div>
  );
};