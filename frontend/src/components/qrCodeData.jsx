import { useState } from 'react';
import QRCode from "react-qr-code";
import { regenerateLibraryQR } from '../api/library';
import { toast } from 'react-toastify';

const PrintQrComponent = ({ library, onUpdate }) => {
    const [regenerating, setRegenerating] = useState(false);

    // Modern Color Palette (Deep Emerald & Gold)
    const BRAND = {
        primary: "#064E3B",    // Deep Emerald
        secondary: "#065F46",  // Medium Emerald
        accent: "#D97706",     // Amber/Gold
        textMain: "#111827",   // Dark Gray
        textMuted: "#6B7280",  // Gray
        bgLight: "#FDFCFB"     // Off-white/Cream
    };

    const downloadQR = () => {
        const svg = document.getElementById("LibraryQR");
        if (!svg) return;

        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const img = new Image();

        // High Res A4 Ratio (Approx 300 DPI)
        canvas.width = 2480;
        canvas.height = 3508;

        img.onload = () => {
            // 1. Background (Premium Cream Texture)
            ctx.fillStyle = BRAND.bgLight;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Subtle Background Grid Pattern for "Tech" feel
            ctx.strokeStyle = "rgba(6, 78, 59, 0.03)"; // Very faint primary color
            ctx.lineWidth = 2;
            for (let x = 0; x < canvas.width; x += 100) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
            }
            for (let y = 0; y < canvas.height; y += 100) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
            }

            // 2. Side Accent Bar
            ctx.fillStyle = BRAND.primary;
            ctx.fillRect(0, 0, 100, canvas.height);

            // 3. Top Header Section (Deep Emerald)
            ctx.fillStyle = BRAND.primary;
            ctx.fillRect(100, 0, canvas.width - 100, 700);

            // Decorative Geometric Accent in Header
            ctx.fillStyle = BRAND.secondary; // Lighter emerald
            ctx.beginPath();
            ctx.moveTo(canvas.width, 0);
            ctx.lineTo(canvas.width - 800, 0);
            ctx.lineTo(canvas.width, 700);
            ctx.fill();

            // 4. Header Text Logic
            ctx.textAlign = "left";
            ctx.fillStyle = "#FFFFFF";

            // "Logo" / System Tag
            ctx.font = "bold 45px 'Inter', sans-serif";
            ctx.letterSpacing = "6px";
            if (ctx.letterSpacing !== undefined) ctx.letterSpacing = "6px";
            ctx.fillStyle = BRAND.accent; // Gold
            ctx.fillText("SMART ACCESS SYSTEM", 220, 180);
            if (ctx.letterSpacing !== undefined) ctx.letterSpacing = "0px";

            // Main Title (Library Name)
            ctx.fillStyle = "#FFFFFF";
            ctx.font = "900 130px 'Inter', sans-serif";
            const name = (library.libraryName || 'The Library').toUpperCase();
            ctx.fillText(name, 215, 340, canvas.width - 500);

            // Address Subtitle
            ctx.font = "400 55px 'Inter', sans-serif";
            ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
            const addressText = [library.address, library.city, library.state].filter(Boolean).join(" • ");
            ctx.fillText(addressText || "Member Access Point", 220, 450);

            // Divider Line in Header
            ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
            ctx.fillRect(220, 530, 600, 4);

            // 5. The QR "Floating" Card Background
            const cardWidth = 1400;
            const cardHeight = 1750;
            const cardX = (canvas.width - cardWidth) / 2 + 50; // Offset slightly right due to sidebar
            const cardY = 900;

            // Massive Drop Shadow for 3D effect
            ctx.shadowColor = "rgba(6, 78, 59, 0.15)";
            ctx.shadowBlur = 100;
            ctx.shadowOffsetY = 50;

            // White Card Form
            ctx.fillStyle = "#FFFFFF";
            if (ctx.roundRect) {
                // Outer card
                ctx.beginPath();
                ctx.roundRect(cardX, cardY, cardWidth, cardHeight, 80);
                ctx.fill();
            } else {
                ctx.fillRect(cardX, cardY, cardWidth, cardHeight);
            }

            // Clear shadow for internal drawing
            ctx.shadowColor = "transparent";
            ctx.shadowBlur = 0;
            ctx.shadowOffsetY = 0;

            // Inner styling border on the card
            ctx.strokeStyle = "rgba(6, 78, 59, 0.05)";
            ctx.lineWidth = 4;
            if (ctx.roundRect) {
                ctx.beginPath();
                ctx.roundRect(cardX + 40, cardY + 40, cardWidth - 80, cardHeight - 80, 50);
                ctx.stroke();
            }

            // 6. Draw the QR Code
            // Centered cleanly inside the top half of the card
            const qrSize = 900;
            const qrX = cardX + (cardWidth - qrSize) / 2;
            const qrY = cardY + 150;
            ctx.drawImage(img, qrX, qrY, qrSize, qrSize);

            // 7. Call To Action on Card
            ctx.textAlign = "center";
            ctx.fillStyle = BRAND.primary;
            ctx.font = "900 90px 'Inter', sans-serif";
            ctx.fillText("SCAN TO ENTER", cardX + (cardWidth / 2), qrY + qrSize + 220);

            // Underline beneath "SCAN TO ENTER"
            ctx.fillStyle = BRAND.accent;
            ctx.fillRect(cardX + (cardWidth / 2) - 150, qrY + qrSize + 280, 300, 12);

            // Subtext on card
            ctx.fillStyle = BRAND.textMuted;
            ctx.font = "500 45px 'Inter', sans-serif";
            ctx.fillText("Hold your phone camera up to the screen", cardX + (cardWidth / 2), qrY + qrSize + 400);

            // 8. Visual Instructions (Grid Style) Below the Card
            const stepsY = cardY + cardHeight + 250;

            const drawInstruction = (x, y, num, title, desc) => {
                ctx.textAlign = "left";

                // Number Circle
                ctx.fillStyle = BRAND.secondary;
                ctx.beginPath();
                ctx.arc(x, y + 20, 50, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = "#FFFFFF";
                ctx.font = "bold 50px 'Inter', sans-serif";
                ctx.textAlign = "center";
                ctx.fillText(num, x, y + 38);

                // Text
                ctx.textAlign = "left";
                ctx.fillStyle = BRAND.textMain;
                ctx.font = "bold 65px 'Inter', sans-serif";
                ctx.fillText(title, x + 90, y + 20);

                ctx.fillStyle = BRAND.textMuted;
                ctx.font = "400 45px 'Inter', sans-serif";
                ctx.fillText(desc, x + 90, y + 90);
            };

            // Two-column layout for instructions
            drawInstruction(canvas.width / 2 - 700, stepsY, "1", "Open Camera", "Use your phone's built-in camera app.");
            drawInstruction(canvas.width / 2 + 100, stepsY, "2", "Tap Link", "Follow the pop-up link to securely log in.");

            // 9. Fine Print Footer
            ctx.textAlign = "center";
            ctx.fillStyle = "#9CA3AF"; // Gray 400
            ctx.font = "500 35px 'Inter', sans-serif";
            const year = new Date().getFullYear();
            ctx.fillText(`System Auth ID: ${library._id} • Generative Access Protocol • © ${year}`, (canvas.width / 2) + 50, canvas.height - 120);

            // Trigger Download
            const pngFile = canvas.toDataURL("image/png", 1.0);
            const downloadLink = document.createElement("a");
            downloadLink.download = `Premium_Pass_${library.libraryName?.replace(/\s+/g, '_')}.png`;
            downloadLink.href = pngFile;
            downloadLink.click();
        };

        img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
    };

    const handleRegenerate = async () => {
        if (library.accessConfig?.qrCodeData && !window.confirm("Warning: Existing physical posters will be invalidated immediately. Continue?")) return;
        setRegenerating(true);
        try {
            const response = await regenerateLibraryQR(library._id);
            toast.success("Security keys updated.");
            if (onUpdate) onUpdate(response.accessConfig);
        } catch (error) {
            toast.error("Update failed.");
        } finally {
            setRegenerating(false);
        }
    };

    return (
        <div className="bg-[#0B0F1A] p-1 rounded-3xl bg-gradient-to-b from-emerald-900/20 to-transparent">
            <div className="bg-[#111827] p-8 rounded-[1.4rem] border border-white/5 shadow-2xl  mx-auto overflow-hidden relative">
                {/* Decorative background element */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl"></div>

                <div className="relative z-10">
                    <div className="flex justify-between items-center mb-8">
                        <div className="h-2 w-12 bg-emerald-500 rounded-full"></div>
                        <span className="text-[10px] uppercase tracking-[0.2em] text-emerald-500 font-bold">Secure Access</span>
                    </div>

                    {/* <h3 className="text-2xl font-light text-white mb-2">
                        Entry <span className="font-bold text-emerald-400">Portal</span>
                    </h3> */}
                    {/* <p className="text-slate-400 text-xs mb-8">Library Management System v2.0</p> */}

                    <div className="bg-white p-6 rounded-2xl mx-auto w-fit shadow-[0_20px_50px_rgba(0,0,0,0.3)] mb-8 transform transition hover:scale-105 duration-500">
                        <QRCode
                            id="LibraryQR"
                            value={library.accessConfig?.qrCodeData || "PREVIEW"}
                            size={180}
                            level="H"
                            fgColor="#064E3B"
                        />
                    </div>

                    <div className="space-y-4">
                        <button
                            onClick={downloadQR}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 px-4 rounded-xl transition-all shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-3 active:scale-[0.98]"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                            Print High-Res Poster
                        </button>

                        <button
                            onClick={handleRegenerate}
                            disabled={regenerating}
                            className="w-full bg-transparent hover:bg-white/5 text-slate-400 hover:text-white py-2 text-xs transition-colors tracking-widest flex items-center justify-center gap-2"
                        >
                            {regenerating ? 'ROTATING KEYS...' : 'REGENERATE SECURITY KEY'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PrintQrComponent;