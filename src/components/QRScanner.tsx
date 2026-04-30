import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Loader2, AlertCircle } from 'lucide-react';
import { Button } from './ui/LightUI';

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScan, onClose, isOpen }) => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    document.body.style.overflow = 'hidden';
    setIsInitializing(true);
    setError(null);

    let html5QrCode: Html5Qrcode | null = null;
    let isComponentMounted = true;

    const startScanner = async () => {
      try {
        html5QrCode = new Html5Qrcode("qr-reader", {
          verbose: false,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39
          ]
        });
        
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
               const minEdgePercentage = 0.7; // 70% of the screen
               const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
               const qrboxSize = Math.floor(minEdgeSize * minEdgePercentage);
               return {
                   width: qrboxSize,
                   height: qrboxSize
               };
            },
          },
          (decodedText) => {
            if (isComponentMounted) {
              if (html5QrCode?.isScanning) {
                html5QrCode.pause();
              }
              onScan(decodedText);
              onClose();
            }
          },
          (errorMessage) => {
            // Ignore normal frame errors
          }
        );

        if (isComponentMounted) {
          setIsInitializing(false);
        }
      } catch (err: any) {
        console.error("Camera extraction error", err);
        if (isComponentMounted) {
          setIsInitializing(false);
          let errMsg = err?.message || "Erreur inconnue";
          if (errMsg.includes("NotAllowedError") || errMsg.includes("Permission denied")) {
            errMsg = "Accès à la caméra refusé. Veuillez autoriser l'accès dans les paramètres de votre navigateur.";
          } else if (errMsg.includes("NotFoundError") || errMsg.includes("Requested device not found")) {
             errMsg = "Aucune caméra trouvée sur cet appareil.";
          }
          setError(errMsg);
        }
      }
    };

    const timer = setTimeout(() => {
      startScanner();
    }, 100);

    return () => {
      isComponentMounted = false;
      document.body.style.overflow = '';
      clearTimeout(timer);
      if (html5QrCode) {
        if (html5QrCode.isScanning) {
          html5QrCode.stop().catch(console.error).finally(() => {
            html5QrCode?.clear();
          });
        } else {
          html5QrCode.clear();
        }
      }
    };
  }, [isOpen, onClose, onScan]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed top-0 left-0 w-full h-[100dvh] z-[200] bg-black/90 backdrop-blur-sm flex items-center justify-center overflow-hidden">
      <div className="bg-white w-full h-[100dvh] md:h-auto md:max-h-[85dvh] max-w-md md:rounded-3xl flex flex-col relative shadow-2xl">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white shrink-0 z-10 relative">
          <h3 className="font-black text-gray-800 uppercase tracking-wider">Scanner un code</h3>
          <button 
            onClick={onClose}
            className="p-2 bg-gray-100 rounded-full text-gray-600 hover:bg-gray-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 flex flex-col bg-black relative justify-center items-center h-full">
          {error ? (
             <div className="flex flex-col items-center justify-center p-6 text-center z-10 bg-white m-6 rounded-2xl">
               <AlertCircle size={48} className="text-red-500 mb-4" />
               <p className="text-gray-800 font-bold mb-2">Erreur de caméra</p>
               <p className="text-sm text-gray-500">{error}</p>
             </div>
          ) : (
             <>
               {isInitializing && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-black">
                   <Loader2 className="animate-spin text-white mb-4" size={40} />
                   <p className="text-sm font-bold text-gray-400">Initialisation de la caméra...</p>
                 </div>
               )}
               
               <div id="qr-reader" className="w-full h-full [&_video]:object-cover [&_video]:w-full [&_video]:h-full"></div>

               {!isInitializing && !error && (
                 <div className="absolute bottom-8 left-0 right-0 text-center z-10 px-4">
                   <p className="text-xs font-bold text-gray-800 bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl shadow-lg inline-block border border-white/20">
                     Placez le code dans la zone claire
                   </p>
                 </div>
               )}
             </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

