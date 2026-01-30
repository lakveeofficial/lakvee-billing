'use client';

import { useState, useRef, ChangeEvent } from 'react';
import { Loader2, Download, Upload } from 'lucide-react';

export default function CSVUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setMessage(null);
    }
  };

  const downloadTemplate = async () => {
    try {
      setMessage({ text: 'Downloading template...', type: 'success' });
      const response = await fetch('/api/upload', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to download template');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'invoice_upload_template.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      
      setMessage({ text: 'Template downloaded successfully', type: 'success' });
    } catch (error) {
      console.error('Error downloading template:', error);
      setMessage({ 
        text: 'Failed to download template. Please try again.', 
        type: 'error' 
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setMessage({ text: 'Please select a file', type: 'error' });
      return;
    }

    setIsUploading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const data = await response.json();
      
      if (!response.ok) {
        if (data.missingFields) {
          throw new Error(`Missing required fields: ${data.missingFields.join(', ')}`);
        }
        throw new Error(data.error || 'Failed to process CSV');
      }

      setMessage({ 
        text: `Successfully processed ${data.totalRecords} records`, 
        type: 'success' 
      });
      
      // Reset form
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // TODO: Refresh invoice list or redirect
      
    } catch (error: any) {
      console.error('Upload error:', error);
      setMessage({ 
        text: error.message || 'Error processing CSV file', 
        type: 'error' 
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Upload Invoices via CSV</h2>
        <p className="text-slate-600">
          Upload a CSV file with invoice data. Download the template below for the correct format.
        </p>
      </div>

      <div className="space-y-4">
        <button
          onClick={downloadTemplate}
          disabled={isUploading}
          className="flex items-center gap-2 px-4 py-2 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          Download CSV Template
        </button>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label 
              htmlFor="csv-upload" 
              className="block text-sm font-medium text-slate-700"
            >
              Select CSV File
            </label>
            <div className="flex items-center gap-4">
              <input
                id="csv-upload"
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="block w-full text-sm text-slate-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-primary file:text-primary-foreground
                  hover:file:bg-primary/90"
                disabled={isUploading}
              />
            </div>
            {file && (
              <p className="mt-1 text-sm text-slate-500">
                Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button 
              type="submit" 
              disabled={!file || isUploading}
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload File
                </>
              )}
            </button>
          </div>
        </form>

        {message && (
          <div 
            className={`p-4 rounded-md ${
              message.type === 'success' 
                ? 'bg-green-50 text-green-800' 
                : 'bg-red-50 text-red-800'
            }`}
          >
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
}
