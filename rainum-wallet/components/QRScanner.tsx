"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X, Camera } from "lucide-react";

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (address: string) => void;
}

export function QRScanner({ isOpen, onClose, onScan }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      // Cleanup scanner when modal closes
      if (scannerRef.current && isScanning) {
        scannerRef.current
          .stop()
          .then(() => {
            scannerRef.current?.clear();
            scannerRef.current = null;
            setIsScanning(false);
          })
          .catch((err) => console.error("Failed to stop scanner:", err));
      }
      return;
    }

    // Initialize scanner when modal opens
    const initScanner = async () => {
      try {
        setError(null);
        const scanner = new Html5Qrcode("qr-reader");
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" }, // Use back camera
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            // Successfully scanned
            scanner
              .stop()
              .then(() => {
                scanner.clear();
                scannerRef.current = null;
                setIsScanning(false);
                onScan(decodedText);
                onClose();
              })
              .catch((err) => console.error("Failed to stop after scan:", err));
          },
          (errorMessage) => {
            // Scanning error (can be ignored, happens frequently)
          }
        );

        setIsScanning(true);
      } catch (err: any) {
        console.error("Failed to start scanner:", err);
        setError(
          err.message || "Failed to access camera. Please check permissions."
        );
      }
    };

    initScanner();

    return () => {
      if (scannerRef.current && isScanning) {
        scannerRef.current
          .stop()
          .then(() => {
            scannerRef.current?.clear();
            scannerRef.current = null;
          })
          .catch((err) => console.error("Cleanup error:", err));
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-[#0019ff]" />
            <h3 className="text-lg font-bold text-gray-900">Scan QR Code</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {error ? (
          <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
            <p className="text-sm text-red-600">{error}</p>
            <p className="text-xs text-red-500 mt-2">
              Make sure you've granted camera permissions to your browser.
            </p>
          </div>
        ) : (
          <>
            <div
              id="qr-reader"
              className="rounded overflow-hidden border-2 border-gray-200"
            />
            <p className="text-sm text-gray-500 mt-4 text-center">
              Point your camera at a QR code containing a wallet address
            </p>
          </>
        )}

        <button
          onClick={onClose}
          className="mt-4 w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded font-medium text-gray-700 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
