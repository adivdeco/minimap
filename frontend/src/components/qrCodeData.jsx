import { useState } from 'react';
import QRCode from "react-qr-code";
import { regenerateLibraryQR } from '../api/library';
import { toast } from 'react-toastify';

const PrintQrComponent = ({ library, onUpdate }) => {
    const [regenerating, setRegenerating] = useState(false);

    const downloadQR = () => {
        const svg = document.getElementById("LibraryQR");
        if (!svg) return;

        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const img = new Image();

        // Add minimal padding
        const padding = 20;
        const size = 256;

        img.onload = () => {
            canvas.width = size + (padding * 2);
            canvas.height = size + (padding * 2);

            // White background
            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw QR
            ctx.drawImage(img, padding, padding);

            // Title text
            ctx.font = "bold 16px Arial";
            ctx.fillStyle = "black";
            ctx.textAlign = "center";
            ctx.fillText(library.libraryName, canvas.width / 2, canvas.height - 5);

            const pngFile = canvas.toDataURL("image/png");

            const downloadLink = document.createElement("a");
            downloadLink.download = `${library.libraryName.replace(/\s+/g, '_')}_QR.png`;
            downloadLink.href = pngFile;
            downloadLink.click();
        };

        img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
    };

    const handleRegenerate = async () => {
        const isRegeneration = !!library.accessConfig?.qrCodeData;

        if (isRegeneration) {
            if (!confirm("WARNING: specific codes will stop working instantly! \n\nAre you sure you want to regenerate the QR code? You will need to print and replace the old one.")) {
                return;
            }
        }

        setRegenerating(true);
        try {
            const response = await regenerateLibraryQR(library._id);
            toast.success(isRegeneration ? "QR Code regenerated successfully" : "QR Code generated successfully");
            if (onUpdate) onUpdate(response.accessConfig);
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to regenerate QR");
        } finally {
            setRegenerating(false);
        }
    };

    if (!library) return null;

    if (!library.accessConfig?.qrCodeData) {
        return (
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl max-w-sm mx-auto text-center">
                <h3 className="text-xl font-bold text-white mb-4">
                    📋 Entry Pass QR
                </h3>
                <p className="text-slate-400 mb-6">
                    No QR code has been generated for this library yet.
                </p>
                <button
                    onClick={handleRegenerate}
                    disabled={regenerating}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                    {regenerating ? 'Generating...' : '✨ Generate QR Code'}
                </button>
            </div>
        );
    }

    return (
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl max-w-sm mx-auto">
            <h3 className="text-xl font-bold text-white mb-6 text-center border-b border-slate-700 pb-4">
                📋 Entry Pass QR
            </h3>

            <div className="bg-white p-4 rounded-xl mx-auto w-fit shadow-inner mb-6">
                <QRCode
                    id="LibraryQR"
                    value={library.accessConfig.qrCodeData}
                    size={200}
                    level="H"
                />
            </div>

            <p className="text-sm text-slate-400 text-center mb-6 px-2">
                Scan this code at the entrance to check-in/out.
                <br />
                <span className="text-xs text-slate-500 mt-1 block">Version: {library.accessConfig.qrVersion || 1}</span>
            </p>

            <div className="flex flex-col gap-3">
                <button
                    onClick={downloadQR}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                    <span>⬇️</span> Download for Print
                </button>

                <button
                    onClick={handleRegenerate}
                    disabled={regenerating}
                    className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/50 hover:border-red-500 font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                >
                    {regenerating ? 'Regenerating...' : '🔄 Regenerate Code'}
                </button>
            </div>
        </div>
    );
};

export default PrintQrComponent;