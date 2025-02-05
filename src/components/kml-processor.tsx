'use client';

import React, { useState, DragEvent } from 'react';
import { Upload, File, Check, AlertTriangle, Folder, Download } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

// Constants for folder names
const MV_POLE_NAMES = ['MV_Pole', 'MV_pole', 'mv_pole', 'mv pole', 'MV pole', 'MV Pole', 'MV_Poles', 'MV_poles', 'mv_poles', 'mv poles', 'MV poles', 'MV Poles'];
const LV_POLE_NAMES = ['LV_Pole', 'LV_pole', 'lv_pole', 'lv pole', 'LV pole', 'LV Pole', 'LV_Poles', 'LV_poles', 'lv_poles', 'lv poles', 'LV poles', 'LV Poles'];
const ADDITIONAL_POLE_NAMES = ['Additional_pole', 'ADDITIONAL POLE', 'ADDITIONAL POLES', 'Additional Pole', 'Additional_Pole', 'additional_pole', 'additional pole', 'Additional pole', 'Additional Poles', 'Additional_Poles', 'additional_poles', 'additional poles', 'Additional poles'];

const KMLProcessor = () => {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState({ status: '', message: '' });
  const [missingFolders, setMissingFolders] = useState<string[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [processedKMLContent, setProcessedKMLContent] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewFolders, setPreviewFolders] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);

  const processKML = async (kmlText: string): Promise<string> => {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(kmlText, "text/xml");
      const folders = xmlDoc.getElementsByTagName('Folder');
      const foundFolders = { mv: false, lv: false, additional: false };
      let nextIndex = 1;

      Array.from(folders).forEach((folder: Element) => {
        const folderName = folder.getElementsByTagName('name')[0]?.textContent?.trim() || "";
        if (MV_POLE_NAMES.includes(folderName)) {
          foundFolders.mv = true;
          nextIndex = renamePlacemarks(folder, nextIndex);
        } else if (LV_POLE_NAMES.includes(folderName)) {
          foundFolders.lv = true;
          nextIndex = renamePlacemarks(folder, nextIndex);
        } else if (ADDITIONAL_POLE_NAMES.includes(folderName)) {
          foundFolders.additional = true;
          nextIndex = renamePlacemarks(folder, nextIndex);
        }
      });

      const missing: string[] = [];
      if (!foundFolders.mv) missing.push("MV_Pole");
      if (!foundFolders.lv) missing.push("LV_Pole");
      if (!foundFolders.additional) missing.push("Additional Poles");

      setMissingFolders(missing);
      if (missing.length > 0) setShowConfirm(true);

      return new XMLSerializer().serializeToString(xmlDoc);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Error processing KML file: ${message}`);
    }
  };

  const renamePlacemarks = (folder: Element, startIndex: number): number => {
    const placemarks = folder.getElementsByTagName('Placemark');
    Array.from(placemarks).forEach((placemark, i) => {
      const nameElement = placemark.getElementsByTagName('name')[0];
      if (nameElement) nameElement.textContent = `P${startIndex + i}`;
    });
    return startIndex + placemarks.length;
  };

  const handleDragOver = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    validateAndSetFile(droppedFile);
  };

  const validateAndSetFile = (selectedFile: File) => {
    if (selectedFile.name.endsWith('.kmz')) {
      setResult({ status: 'error', message: 'KMZ files are not supported. Please convert to KML using Google Earth Pro.' });
      return;
    }
    
    if (selectedFile && selectedFile.name.endsWith('.kml')) {
      setFile(selectedFile);
      setResult({ status: '', message: '' });
      setShowConfirm(false);
      setMissingFolders([]);
      setProcessedKMLContent(null);
    } else {
      setResult({ status: 'error', message: 'Please select a valid KML file' });
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) validateAndSetFile(selectedFile);
  };

  const handlePreview = async () => {
    if (!file) return;

    try {
      const text = await file.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, "text/xml");
      const folders = Array.from(xmlDoc.getElementsByTagName('Folder'));
      const folderNames = folders.map(folder => 
        folder.getElementsByTagName('name')[0]?.textContent?.trim() || 'Unnamed Folder'
      );
      setPreviewFolders(folderNames);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Error previewing KML file';
        setResult({ status: 'error', message });
      setResult({ status: 'error', message });
    }
  };

  const handleProcess = async () => {
    if (!file) {
      setResult({ status: 'error', message: 'Please select a file first' });
      return;
    }

    setProcessing(true);
    setProgress(30);
    try {
      const text = await file.text();
      setProgress(60);
      const processedKML = await processKML(text);
      setProcessedKMLContent(processedKML);
      setProgress(100);
      
      if (missingFolders.length === 0) {
        setResult({ status: 'success', message: 'KML file processed successfully! Click download to get your file.' });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error previewing KML file';
      setResult({ status: 'error', message });
    }
    setProcessing(false);
    setTimeout(() => setProgress(0), 1000);
  };

  const handleConfirmProcess = () => {
    if (processedKMLContent) {
      downloadProcessedKML(processedKMLContent);
      setShowConfirm(false);
    }
  };

  const downloadProcessedKML = (content: string) => {
    const blob = new Blob([content], { type: 'application/vnd.google-earth.kml+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file?.name.replace('.kml', '_RENAMED.kml') || 'processed.kml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        <Card className="shadow-xl rounded-2xl">
          <CardHeader className="border-b border-gray-200">
            <CardTitle className="text-3xl font-bold text-center text-gray-800">
              KML Placemark Renamer
            </CardTitle>
            <CardDescription className="text-center text-gray-600">
              Upload your KML file to automatically rename placemarks in required folders
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* File Upload Section */}
            <div className="space-y-4">
              <label
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative cursor-pointer flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all ${
                  isDragging 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400 bg-white'
                }`}
              >
                <div className="text-center space-y-3">
                  <div className="flex justify-center">
                    {file ? (
                      <File className="h-12 w-12 text-blue-500" />
                    ) : (
                      <Upload className="h-12 w-12 text-gray-400" />
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    {file ? file.name : 'Drag & drop KML file or click to upload'}
                  </div>
                  <div className="text-xs text-red-500">
                    * KMZ files not supported. Convert to KML first.
                  </div>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept=".kml"
                  onChange={handleFileChange}
                />
              </label>

              {processing && <Progress value={progress} className="h-2" />}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  onClick={handleProcess}
                  disabled={!file || processing}
                  className="gap-2"
                  variant="default"
                >
                  {processing ? 'Processing...' : 'Process File'}
                </Button>

                {processedKMLContent && (
                  <Button
                    onClick={() => downloadProcessedKML(processedKMLContent)}
                    variant="default"
                    className="gap-2 bg-green-600 hover:bg-green-700"
                  >
                    <Download className="w-4 h-4" />
                    Download KML
                  </Button>
                )}

                {file && (
                  <Button
                    onClick={handlePreview}
                    variant="outline"
                    className="gap-2"
                  >
                    <Folder className="w-4 h-4" />
                    Preview Folders
                  </Button>
                )}
              </div>
            </div>

            {/* Preview Folders */}
            {previewFolders.length > 0 && (
              <Alert className="bg-white border border-gray-200">
                <AlertTitle className="font-semibold mb-2">Detected Folders</AlertTitle>
                <ul className="list-disc pl-5 space-y-1">
                  {previewFolders.map((folder, i) => (
                    <li key={i} className="text-sm text-gray-700">{folder}</li>
                  ))}
                </ul>
              </Alert>
            )}

            {/* Alerts Section */}
            {showConfirm && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-3">
                    <p>
                      Missing folders: {missingFolders.join(', ')}. Are you sure you want to proceed?
                    </p>
                    <div className="flex gap-3">
                      <Button onClick={handleConfirmProcess} size="sm">
                        Proceed Anyway
                      </Button>
                      <Button
                        onClick={() => setShowConfirm(false)}
                        variant="outline"
                        size="sm"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {result.status && (
              <Alert variant={result.status === 'success' ? 'default' : 'destructive'}>
                {result.status === 'success' ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                <AlertDescription>{result.message}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <div className="text-center text-sm text-gray-500">
          © Mesh, 2025. All rights reserved.
        </div>
      </div>
    </div>
  );
};

export default KMLProcessor;