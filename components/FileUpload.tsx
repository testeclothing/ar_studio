import React, { useRef } from 'react';
import { Upload, X, FileVideo, Image as ImageIcon } from 'lucide-react';

interface FileUploadProps {
  label: string;
  accept: string;
  file: File | null;
  setFile: (file: File | null) => void;
  icon?: 'image' | 'video';
}

export const FileUpload: React.FC<FileUploadProps> = ({ label, accept, file, setFile, icon }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 transition-colors ${
          file ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-indigo-400 bg-white'
        }`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <input
          type="file"
          ref={inputRef}
          className="hidden"
          accept={accept}
          onChange={handleChange}
        />
        
        {file ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg text-green-600">
                {icon === 'video' ? <FileVideo size={24} /> : <ImageIcon size={24} />}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 truncate max-w-[200px]">{file.name}</p>
                <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>
            <button
              onClick={() => setFile(null)}
              className="p-1 hover:bg-red-100 text-gray-400 hover:text-red-500 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        ) : (
          <div 
            className="text-center cursor-pointer"
            onClick={() => inputRef.current?.click()}
          >
            <div className="mx-auto h-12 w-12 text-gray-400 mb-3 flex items-center justify-center bg-gray-50 rounded-full">
              <Upload size={24} />
            </div>
            <p className="text-sm text-gray-600">
              <span className="font-semibold text-indigo-600 hover:text-indigo-500">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {accept === 'image/*' ? 'JPG, PNG (Max 10MB)' : 'MP4, WebM (Max 50MB)'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};