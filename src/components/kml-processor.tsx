'use client';

import React, { useState, DragEvent } from 'react';
import { Upload, File, Check, AlertTriangle, Folder, Download, Sun, Moon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

const KMLProcessor = () => {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState({ status: '', message: '' });
  const [isDragging, setIsDragging] = useState(false);
  const [processedKMLContent, setProcessedKMLContent] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [availableFolders, setAvailableFolders] = useState<string[]>([]);
  const [selectedFolders, setSelectedFolders] = useState<string[]>([]);
  const [prefix, setPrefix] = useState('P');

  const processKML = async (kmlText: string): Promise<string> => {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(kmlText, "text/xml");
      const folders = xmlDoc.getElementsByTagName('Folder');
      let nextIndex = 1;

      Array.from(folders).forEach((folder: Element) => {
        const folderName = folder.getElementsByTagName('name')[0]?.textContent?.trim() || "";
        if (selectedFolders.includes(folderName)) {
          nextIndex = renamePlacemarks(folder, nextIndex, prefix);
        }
      });

      return new XMLSerializer().serializeToString(xmlDoc);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Error processing KML file: ${message}`);
    }
  };

  const renamePlacemarks = (folder: Element, startIndex: number, prefix: string): number => {
    const placemarks = folder.getElementsByTagName('Placemark');
    Array.from(placemarks).forEach((placemark, i) => {
      const nameElement = placemark.getElementsByTagName('name')[0];
      if (nameElement) nameElement.textContent = `${prefix}${startIndex + i}`;
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

  const handleDrop = async (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    await validateAndSetFile(droppedFile);
  };

  const validateAndSetFile = async (selectedFile: File) => {
    if (selectedFile.name.endsWith('.kmz')) {
      setResult({ status: 'error', message: 'KMZ files are not supported. Please convert to KML using Google Earth Pro.' });
      return;
    }
    
    if (selectedFile?.name.endsWith('.kml')) {
      try {
        const text = await selectedFile.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, "text/xml");
        const folders = Array.from(xmlDoc.getElementsByTagName('Folder'));
        const folderNames = folders.map(folder => 
          folder.getElementsByTagName('name')[0]?.textContent?.trim() || 'Unnamed Folder'
        );
        
        setFile(selectedFile);
        setAvailableFolders(folderNames);
        setSelectedFolders([]);
        setResult({ status: '', message: '' });
        setProcessedKMLContent(null);
      } catch {
        setResult({ status: 'error', message: 'Error parsing KML file' });
      }
    } else {
      setResult({ status: 'error', message: 'Please select a valid KML file' });
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) await validateAndSetFile(selectedFile);
  };

  const handleProcess = async () => {
    if (!file) {
      setResult({ status: 'error', message: 'Please select a file first' });
      return;
    }

    if (selectedFolders.length === 0) {
      setResult({ status: 'error', message: 'Please select at least one folder to process' });
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
      setResult({ status: 'success', message: 'KML file processed successfully! Click download to get your file.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error processing KML file';
      setResult({ status: 'error', message });
    }
    setProcessing(false);
    setTimeout(() => setProgress(0), 1000);
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
    <div className={`min-h-screen transition-colors duration-200 ${isDarkMode ? 'dark bg-gray-900' : 'bg-gradient-to-b from-gray-50 to-gray-100'} py-12 px-4`}>
      <div className="max-w-3xl mx-auto space-y-8 relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="absolute top-0 right-0"
        >
          {isDarkMode ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>

        <Card className="shadow-xl rounded-2xl dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="border-b dark:border-gray-700">
            <CardTitle className="text-3xl font-bold text-center dark:text-gray-100">
              KML Placemark Renamer
            </CardTitle>
            <CardDescription className="text-center dark:text-gray-400">
              Upload your KML file to rename placemarks in selected folders
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            <div className="space-y-4">
              <label
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative cursor-pointer flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all ${
                  isDragging 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                    : 'border-gray-300 hover:border-gray-400 bg-white dark:bg-gray-700 dark:border-gray-600 dark:hover:border-gray-500'
                }`}
              >
                <div className="text-center space-y-3">
                  <div className="flex justify-center">
                    {file ? (
                      <File className="h-12 w-12 text-blue-500 dark:text-blue-400" />
                    ) : (
                      <Upload className="h-12 w-12 text-gray-400 dark:text-gray-500" />
                    )}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    {file ? file.name : 'Drag & drop KML file or click to upload'}
                  </div>
                  <div className="text-xs text-red-500 dark:text-red-400">
                    * KMZ files not supported
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

              {availableFolders.length > 0 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="font-medium dark:text-gray-200">Detected Folders</h3>
                    <div className="flex flex-wrap gap-3">
                      {availableFolders.map((folder) => (
                        <div key={folder} className="flex items-center space-x-2">
                          <Checkbox
                            id={folder}
                            checked={selectedFolders.includes(folder)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedFolders([...selectedFolders, folder]);
                              } else {
                                setSelectedFolders(selectedFolders.filter(f => f !== folder));
                              }
                            }}
                          />
                          <Label htmlFor={folder} className="text-sm font-medium dark:text-gray-300">
                            <Folder className="inline h-4 w-4 mr-2" />
                            {folder}
                          </Label>
                        </div>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (selectedFolders.length === availableFolders.length) {
                          setSelectedFolders([]);
                        } else {
                          setSelectedFolders([...availableFolders]);
                        }
                      }}
                    >
                      {selectedFolders.length === availableFolders.length ? 'Unselect All' : 'Select All'}
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="prefix" className="dark:text-gray-200">Placemark Prefix</Label>
                    <Input
                      id="prefix"
                      value={prefix}
                      onChange={(e) => setPrefix(e.target.value)}
                      placeholder="Enter prefix (e.g., P)"
                      className="dark:bg-gray-700 dark:border-gray-600"
                    />
                  </div>
                </div>
              )}

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
              </div>
            </div>

            {result.status && (
              <Alert 
                variant={result.status === 'success' ? 'default' : 'destructive'}
                className="dark:border-gray-600"
              >
                {result.status === 'success' ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                <AlertDescription className="dark:text-gray-300">
                  {result.message}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          © Mesh, 2025. All rights reserved.
        </div>
      </div>
    </div>
  );
};

export default KMLProcessor;