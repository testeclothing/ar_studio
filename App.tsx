import React, { useState } from 'react';
import { FileUpload } from './components/FileUpload';
import { CreationResult, UploadStatus } from './types';
import { Loader2, ArrowRight, Smartphone, CheckCircle } from 'lucide-react';

const App: React.FC = () => {
  const [targetFile, setTargetFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>({ isLoading: false, error: null, progress: '' });
  const [result, setResult] = useState<CreationResult | null>(null);

  const handleSubmit = async () => {
    if (!targetFile || !videoFile) return;

    setStatus({ isLoading: true, error: null, progress: 'Uploading and processing...' });
    setResult(null);

    const formData = new FormData();
    formData.append('target', targetFile);
    formData.append('video', videoFile);

    try {
      const response = await fetch('/api/create', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create experience');
      }

      setResult(data as CreationResult);
      setStatus({ isLoading: false, error: null, progress: '' });
    } catch (err: any) {
      setStatus({ isLoading: false, error: err.message, progress: '' });
    }
  };

  const reset = () => {
    setTargetFile(null);
    setVideoFile(null);
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight sm:text-5xl">
            WebAR Studio
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Create instant Image Tracking AR experiences. No code required.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Progress Bar (Fake) */}
          {status.isLoading && (
            <div className="h-1 w-full bg-gray-100">
              <div className="h-full bg-indigo-600 animate-pulse w-2/3"></div>
            </div>
          )}

          <div className="p-8">
            {!result ? (
              <>
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <FileUpload 
                      label="1. Target Image" 
                      accept="image/*" 
                      file={targetFile} 
                      setFile={setTargetFile} 
                      icon="image"
                    />
                    <FileUpload 
                      label="2. Overlay Video" 
                      accept="video/mp4,video/webm" 
                      file={videoFile} 
                      setFile={setVideoFile} 
                      icon="video"
                    />
                  </div>
                </div>

                {status.error && (
                  <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    <strong>Error:</strong> {status.error}
                  </div>
                )}

                <div className="mt-8">
                  <button
                    onClick={handleSubmit}
                    disabled={!targetFile || !videoFile || status.isLoading}
                    className={`w-full flex items-center justify-center py-4 px-8 rounded-xl text-lg font-bold text-white transition-all transform hover:scale-[1.02] ${
                      !targetFile || !videoFile || status.isLoading
                        ? 'bg-gray-300 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg hover:shadow-indigo-500/30'
                    }`}
                  >
                    {status.isLoading ? (
                      <>
                        <Loader2 className="animate-spin mr-2" />
                        Compiling AR Targets...
                      </>
                    ) : (
                      <>
                        Generate AR Experience
                        <ArrowRight className="ml-2" />
                      </>
                    )}
                  </button>
                  <p className="text-center text-xs text-gray-400 mt-4">
                    Note: Compilation can take 30-60 seconds depending on image complexity.
                  </p>
                </div>
              </>
            ) : (
              <div className="text-center py-8 animate-fade-in">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Success!</h2>
                <p className="text-gray-600 mb-8">Your AR experience is ready to view.</p>

                <div className="bg-gray-50 p-8 rounded-2xl border border-gray-200 inline-block">
                  <img 
                    src={result.qrCode} 
                    alt="Scan to view" 
                    className="w-64 h-64 mx-auto mb-4 rounded-lg shadow-sm mix-blend-multiply" 
                  />
                  <div className="flex items-center justify-center space-x-2 text-sm text-gray-500 mb-6">
                    <Smartphone size={16} />
                    <span>Scan with your camera</span>
                  </div>
                  
                  <a 
                    href={result.viewerUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-flex items-center px-6 py-3 border border-gray-300 shadow-sm text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Open Viewer Link
                  </a>
                </div>

                <div className="mt-12">
                  <button
                    onClick={reset}
                    className="text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    Create another experience
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;