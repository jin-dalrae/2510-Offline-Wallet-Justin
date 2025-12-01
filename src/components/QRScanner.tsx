import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRScannerProps {
    onScan: (data: string) => void;
    onClose: () => void;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
    const [error, setError] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const qrRegionId = 'qr-reader';

    useEffect(() => {
        const html5QrCode = new Html5Qrcode(qrRegionId);
        scannerRef.current = html5QrCode;

        const config = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
        };

        html5QrCode
            .start(
                { facingMode: 'environment' },
                config,
                (decodedText) => {
                    // Success callback
                    onScan(decodedText);
                    handleClose();
                },
                () => {
                    // Error callback - ignore, this is called frequently
                }
            )
            .then(() => {
                setIsScanning(true);
            })
            .catch((err) => {
                setError('Failed to start camera: ' + err);
            });

        return () => {
            handleClose();
        };
    }, []);

    const handleClose = () => {
        if (scannerRef.current && isScanning) {
            scannerRef.current
                .stop()
                .then(() => {
                    scannerRef.current?.clear();
                })
                .catch((err) => {
                    console.error('Error stopping scanner:', err);
                });
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="card max-w-md w-full space-y-4 animate-slide-up">
                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold">Scan QR Code</h3>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-white text-2xl"
                    >
                        ×
                    </button>
                </div>

                <div
                    id={qrRegionId}
                    className="qr-scanner-overlay rounded-xl overflow-hidden"
                />

                {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                        {error}
                    </div>
                )}

                <p className="text-sm text-gray-400 text-center">
                    Position the QR code within the frame
                </p>
            </div>
        </div>
    );
}
