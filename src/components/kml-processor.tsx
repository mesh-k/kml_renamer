'use client';

import React, { useState } from 'react';
import { Upload, File, Check, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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

  const processKML = async (kmlText: string): Promise<string> => {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(kmlText, "text/xml");

      // Find folders
      const folders = xmlDoc.getElementsByTagName('Folder');
      const foundFolders = {
        mv: false,
        lv: false,
        additional: false
      };

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

      // Check missing folders
      const missing: string[] = [];
      if (!foundFolders.mv) missing.push("MV_Pole");
      if (!foundFolders.lv) missing.push("LV_Pole");
      if (!foundFolders.additional) missing.push("Additional Poles");

      setMissingFolders(missing);
      if (missing.length > 0) {
        setShowConfirm(true);
      }

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
      if (nameElement) {
        nameElement.textContent = `P${startIndex + i}`;
      }
    });
    return startIndex + placemarks.length;
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
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

  const handleProcess = async () => {
    if (!file) {
      setResult({ status: 'error', message: 'Please select a file first' });
      return;
    }

    setProcessing(true);
    try {
      const text = await file.text();
      const processedKML = await processKML(text);
      setProcessedKMLContent(processedKML);

      if (missingFolders.length === 0) {
        downloadProcessedKML(processedKML);
        setResult({ status: 'success', message: 'KML file processed successfully!' });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      setResult({ status: 'error', message });
    }
    setProcessing(false);
  };

  const handleConfirmProcess = () => {
    if (processedKMLContent) {
      downloadProcessedKML(processedKMLContent);
      setResult({ status: 'success', message: 'KML file processed successfully!' });
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
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">KML Placemark Renamer</CardTitle>
            <CardDescription className="text-center">
              Upload your KML file to rename placemarks in MV Pole, LV Pole, and Additional Poles folders
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex justify-center">
                <label className="relative cursor-pointer bg-white rounded-lg border-2 border-dashed border-gray-300 p-12 text-center hover:border-gray-400 focus:outline-none">
                  <div className="space-y-2">
                    <div className="flex justify-center">
                      {file ? <File className="h-12 w-12 text-gray-400" /> : <Upload className="h-12 w-12 text-gray-400" />}
                    </div>
                    <div className="text-sm text-gray-600">
                      {file ? file.name : "Click to upload or drag and drop"}
                    </div>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept=".kml"
                    onChange={handleFileChange}
                  />
                </label>
              </div>

              {showConfirm && (
                <Alert variant="destructive" className="mt-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p>The following folders are missing: {missingFolders.join(', ')}</p>
                      <div className="flex space-x-4">
                        <Button onClick={handleConfirmProcess} variant="outline">
                          Process Anyway
                        </Button>
                        <Button onClick={() => setShowConfirm(false)} variant="ghost">
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

              <div className="flex justify-center">
                <Button
                  onClick={handleProcess}
                  disabled={!file || processing}
                  className="w-full max-w-xs"
                >
                  {processing ? 'Processing...' : 'Process KML File'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default KMLProcessor;