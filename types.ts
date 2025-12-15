export interface CreationResult {
  success: boolean;
  id: string;
  viewerUrl: string;
  qrCode: string;
}

export interface UploadStatus {
  isLoading: boolean;
  error: string | null;
  progress: string;
}