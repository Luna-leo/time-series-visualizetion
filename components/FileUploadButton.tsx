import React, { useRef } from 'react';
import { Upload } from 'lucide-react';
import { Button } from './common/Button';

interface FileUploadButtonProps {
  onFileSelect: (files: FileList) => void;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
}

export function FileUploadButton({
  onFileSelect,
  accept = '.csv',
  multiple = false,
  disabled = false,
  className = ''
}: FileUploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelect(files);
      // Reset input to allow selecting the same file again
      e.target.value = '';
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />
      <Button
        onClick={handleClick}
        disabled={disabled}
        className={className}
      >
        <Upload className="w-4 h-4 mr-2" />
        {multiple ? 'ファイルを選択' : 'ファイルを選択'}
      </Button>
    </>
  );
}