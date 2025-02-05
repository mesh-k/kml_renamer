'use client';

import React, { useState } from 'react';
import { Upload, Check, AlertTriangle, Folder, Download, Sun, Moon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import JSZip from 'jszip';

const KMLProcessor = () => {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState({ status: '', message: '' });
  const [isDragging, setIsDragging] = useState(false);
  const [processedContent, setProcessedContent] = useState<{ kml: string; zip?: JSZip } | null>(null);
  const [progress, setProgress] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [availableFolders, setAvailableFolders] = useState<string[]>([]);
  const [selectedFolders, setSelectedFolders] = useState<string[]>([]);
  const [prefix, setPrefix] = useState('P');

  const processKML = async (kmlText: string): Promise<string> => {
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
  };

  const renamePlacemarks = (folder: Element, startIndex: number, prefix: string): number => {
    const placemarks = folder.getElementsByTagName('Placemark');
    Array.from(placemarks).forEach((placemark, i) => {
      const nameElement = placemark.getElementsByTagName('name')[0];
      if (nameElement) nameElement.textContent = `${prefix}${startIndex + i}`;
    });
    return startIndex + placemarks.length;
  };

  const handleFileProcessing = async (file: File) => {
    if (file.name.endsWith('.kmz')) {
      const zip = new JSZip();
      const loadedZip = await zip.loadAsync(file);
      const kmlFile = loadedZip.file(/\.kml$/i)[0];
      if (!kmlFile) throw new Error('No KML file found in KMZ archive');
      return { content: await kmlFile.async('text'), zip: loadedZip };
    }
    return { content: await file.text(), zip: undefined };
  };

  const validateAndSetFile = async (selectedFile: File) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { content, zip } = await handleFileProcessing(selectedFile);
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(content, "text/xml");
      const folders = Array.from(xmlDoc.getElementsByTagName('Folder'));
      const folderNames = folders.map(folder => 
        folder.getElementsByTagName('name')[0]?.textContent?.trim() || 'Unnamed Folder'
      );
      
      setFile(selectedFile);
      setAvailableFolders(folderNames);
      setSelectedFolders([]);
      setResult({ status: '', message: '' });
      setProcessedContent(null);
    } catch (error) {
      setResult({ status: 'error', message: error instanceof Error ? error.message : 'Invalid file format' });
    }
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
      const { content, zip } = await handleFileProcessing(file);
      setProgress(60);
      const processedKML = await processKML(content);
      setProgress(90);
      setProcessedContent({ kml: processedKML, zip });
      setResult({ status: 'success', message: 'File processed successfully! Click download to get your file.' });
    } catch (error) {
      setResult({ status: 'error', message: error instanceof Error ? error.message : 'Processing failed' });
    }
    setProcessing(false);
    setTimeout(() => setProgress(0), 1000);
  };

  const downloadFile = async () => {
    if (!processedContent || !file) return;

    if (file.name.endsWith('.kmz') && processedContent.zip) {
      const newZip = processedContent.zip;
      newZip.file('doc.kml', processedContent.kml);
      const content = await newZip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name.replace(/\.kmz$/i, '_RENAMED.kmz');
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const blob = new Blob([processedContent.kml], { type: 'application/vnd.google-earth.kml+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name.replace(/\.kml$/i, '_RENAMED.kml');
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Drag and drop handlers remain the same
  // UI components updated with enhanced styling

  return (
    <div className={`min-h-screen font-sans antialiased ${
      isDarkMode 
        ? 'bg-zinc-950'
        : 'bg-zinc-50'
    } py-6 px-4 transition-all duration-500`}>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Theme Toggle */}
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="rounded-full w-8 h-8 transition-all duration-300"
          >
            {isDarkMode ? (
              <Sun className="h-4 w-4 text-zinc-400" />
            ) : (
              <Moon className="h-4 w-4 text-zinc-600" />
            )}
          </Button>
        </div>
  
        {/* Main Card */}
        <Card className={`shadow-lg rounded-3xl border transition-all duration-300 ${
          isDarkMode 
            ? 'bg-zinc-900 border-zinc-800'
            : 'bg-white border-zinc-100 shadow-xl'
        }`}>
          <CardHeader className="space-y-2 px-6 pt-6 pb-4">
            <div className={`text-3xl font-bold text-center ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>
              KMZ/KML Placemark Renamer
            </div>
            <CardDescription className="text-center text-base text-zinc-500 dark:text-zinc-300">
              Upload your KMZ or KML file to rename placemarks in selected folders
            </CardDescription>
          </CardHeader>
  
          <CardContent className="p-6 space-y-6">
            {/* File Upload Area */}
            <div className="relative">
              <label
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                onDrop={async (e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const droppedFile = e.dataTransfer.files[0];
                  if (droppedFile) await validateAndSetFile(droppedFile);
                }}
                className={`group relative cursor-pointer flex flex-col items-center justify-center rounded-2xl border border-dashed p-8 transition-all duration-300 ${
                  isDragging 
                    ? 'border-zinc-400 bg-zinc-200 dark:border-zinc-400 dark:bg-zinc-800' 
                    : 'border-zinc-200 dark:border-zinc-600 hover:border-zinc-300 dark:hover:border-zinc-500'
                } ${isDarkMode ? 'bg-zinc-800' : 'bg-zinc-100'}`}
              >
                <div className="text-center space-y-3">
                  <div className="flex justify-center">
                    <Upload className={`h-8 w-8 transition-transform duration-300 group-hover:scale-110 ${
                      isDragging ? 'text-zinc-600 dark:text-zinc-300' : 'text-zinc-400 dark:text-zinc-300'
                    }`} />
                  </div>
                  <div>
                    <p className="text-base font-medium text-zinc-700 dark:text-zinc-300 py-4">
                      {file ? file.name : 'Drag & drop KMZ/KML file or click to upload'}
                    </p>
                  </div>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept=".kml,.kmz"
                  onChange={async (e) => {
                    const selectedFile = e.target.files?.[0];
                    if (selectedFile) await validateAndSetFile(selectedFile);
                  }}
                />
              </label>
  
              {/* Progress Bar */}
              {processing && (
                <div className="mt-4">
                  <Progress value={progress} className="h-1">
                    <div 
                      className="h-full bg-zinc-600 dark:bg-zinc-400 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }} 
                    />
                  </Progress>
                </div>
              )}
            </div>
  
            {/* Folder Selection */}
            {availableFolders.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className={`text-base font-medium ${isDarkMode ? 'text-[#dcdcdc]' : 'text-zinc-700'}`}>
                    Available Folders
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedFolders(
                      selectedFolders.length === availableFolders.length ? [] : availableFolders
                    )}
                    className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-[#dcdcdc] dark:hover:text-[#dcdcdc]/90"
                  >
                    {selectedFolders.length === availableFolders.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>
  
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2">
                  {availableFolders.map((folder) => (
                    <div
                      key={folder}
                      className={`flex items-center space-x-3 p-2 rounded-lg transition-colors duration-200 ${
                        isDarkMode ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'
                      }`}
                    >
                      <Checkbox
                        id={folder}
                        checked={selectedFolders.includes(folder)}
                        onCheckedChange={(checked) => {
                          setSelectedFolders(
                            checked 
                              ? [...selectedFolders, folder]
                              : selectedFolders.filter(f => f !== folder)
                          );
                        }}
                        className="border-zinc-300 dark:border-white data-[state=checked]:bg-emerald-600 dark:data-[state=checked]:bg-emerald-500"
                      />
                      <Label
                        htmlFor={folder}
                        className={`flex items-center text-sm font-medium cursor-pointer truncate ${
                          isDarkMode ? 'text-[#dcdcdc]' : 'text-zinc-700'
                        }`}
                      >
                        <Folder className={`h-3 w-3 mr-2 flex-shrink-0 ${isDarkMode ? 'text-[#dcdcdc]' : 'text-zinc-500'}`} />
                        <span className="truncate">{folder}</span>
                      </Label>
                    </div>
                  ))}
                </div>
  
                <div className="space-y-2">
                  <Label htmlFor="prefix" className={`text-base font-medium ${isDarkMode ? 'text-[#dcdcdc]' : 'text-zinc-900'}`}>
                    Naming Prefix
                  </Label>
                  <Input
                    id="prefix"
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value)}
                    placeholder="Enter prefix (e.g., P)"
                    className="h-9 text-sm dark:bg-zinc-800 dark:border-zinc-700 dark:text-[#dcdcdc]"
                  />
                </div>
  
                {/* Action Buttons */}
                <Button
                  onClick={handleProcess}
                  disabled={!file || processing}
                  className={`w-full h-10 rounded-xl transition-all duration-300 ${
                    processing 
                      ? 'bg-zinc-400'
                      : 'bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-200 dark:hover:bg-zinc-300 dark:text-zinc-800'
                  }`}
                >
                  {processing ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      <span className="text-base">Processing...</span>
                    </div>
                  ) : (
                    'Process File'
                  )}
                </Button>
  
                {processedContent && (
                  <Button
                    onClick={downloadFile}
                    className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700 transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    <span className="text-base">Download {file?.name?.endsWith('.kmz') ? 'KMZ' : 'KML'}</span>
                  </Button>
                )}
              </div>
            )}
  
            {/* Status Messages */}
            {result.status && (
              <Alert 
                variant={result.status === 'success' ? 'default' : 'destructive'}
                className={`transition-all duration-300 ${
                  result.status === 'success' 
                    ? 'bg-zinc-50 dark:bg-zinc-800/50' 
                    : 'bg-red-50 dark:bg-red-900/20'
                }`}
              >
                {result.status === 'success' ? (
                  <Check className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                )}
                <AlertDescription className="ml-2 text-sm text-zinc-600 dark:text-zinc-300">
                  {result.message}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
  
        {/* Footer */}
        <div className="text-center text-sm text-zinc-500 dark:text-zinc-400 py-4">
          © {new Date().getFullYear()} Mesh. All rights reserved.
        </div>
      </div>
    </div>
  );
};

export default KMLProcessor;