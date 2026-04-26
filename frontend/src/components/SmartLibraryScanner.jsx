import React, { useState, useRef } from 'react';
import { Camera, X, CheckCircle, CreditCard, Gift, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner'; // Import the scanner
import jsQR from 'jsqr';
import { checkInUser, activateTrialPlan } from '../api/entry';
import { useAuth } from '../context/AuthContext';

const SmartLibraryScanner = ({ onClose }) => {
  const { checkAuth } = useAuth();
  const [scanResult, setScanResult] = useState(null); // 'SUCCESS', 'OFFER_TRIAL', 'SHOW_PLANS', 'ERROR'
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [data, setData] = useState(null);

  // New State to toggle Camera UI
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setCameraError('');
    setIsScanning(false);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        context.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        
        if (code && code.data) {
          handleScan(code.data);
        } else {
          setLoading(false);
          setScanResult('ERROR');
          setMessage("Could not find a valid QR code in the uploaded image.");
        }
      };
      img.onerror = () => {
        setLoading(false);
        setScanResult('ERROR');
        setMessage("Invalid image file selected.");
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset input
  };

  // Helper for Close Button
  const CloseButton = () => (
    <button
      onClick={onClose}
      className="absolute top-6 right-6 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full transition-colors z-50 backdrop-blur-md"
    >
      <X size={24} />
    </button>
  );

  // --- API HANDLERS ---

  const handleScan = async (qrString) => {
    // 1. Stop scanning immediately after capturing
    setIsScanning(false);
    setLoading(true);
    setCameraError(''); // Clear previous errors

    try {
      // 2. Call your existing API
      const response = await checkInUser(qrString);
      const { success, action, msg, ...rest } = response;

      if (success) {
        setScanResult('SUCCESS');
        setData(rest);
        if (checkAuth) checkAuth(); // Refresh User Context
      } else {
        if (action) {
          setScanResult(action);
          setData(rest);
        } else {
          setScanResult('ERROR');
        }
      }
      setMessage(msg);

    } catch (err) {
      const errorMsg = err.response?.data?.msg || "Scan Failed or Invalid QR";
      setMessage(errorMsg);
      setScanResult('ERROR');
    } finally {
      setLoading(false);
    }
  };

  const handleActivateTrial = async () => {
    setLoading(true);
    try {
      const response = await activateTrialPlan(data.libraryId, data.planId);
      setScanResult('SUCCESS');
      setData({ seat: response.seat });
      setMessage("Trial Activated! Seat Assigned.");
      if (checkAuth) checkAuth(); // Refresh User Context
    } catch (err) {
      setMessage(err.response?.data?.msg || "Failed to activate trial.");
    } finally {
      setLoading(false);
    }
  };

  // --- RENDER STATES ---

  // 1. LOADING STATE
  if (loading) return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-50 dark:bg-[#0f0f0f] text-gray-900 dark:text-white z-50">
      <div className="relative w-20 h-20">
        <div className="absolute top-0 left-0 w-full h-full border-4 border-purple-200 dark:border-purple-900/30 rounded-full"></div>
        <div className="absolute top-0 left-0 w-full h-full border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
      <p className="mt-6 font-medium animate-pulse text-purple-600 dark:text-purple-400">Verifying Access...</p>
    </div>
  );

  // 2. CAMERA SCANNING STATE
  if (isScanning) return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center">
      {/* Close Camera Button */}
      <button
        onClick={() => setIsScanning(false)}
        className="absolute top-6 right-6 p-3 bg-white/10 text-white rounded-full z-50 hover:bg-white/20 transition-all backdrop-blur-md"
      >
        <X size={24} />
      </button>

      <div className="w-full max-w-md aspect-square relative rounded-3xl overflow-hidden shadow-2xl border border-white/20">
        <Scanner
          onScan={(result) => {
            if (result && result[0]) {
              handleScan(result[0].rawValue);
            }
          }}
          onError={(error) => {

            setCameraError("Please allow camera permissions to scan.");
          }}
          components={{
            audio: false,
            torch: true,
            finder: true
          }}
        />
        {/* Overlay Scanner Frame */}
        <div className="absolute inset-0 border-[30px] border-black/50 pointer-events-none">
          <div className="absolute inset-0 border-2 border-white/50 m-[-2px]">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-purple-500"></div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-purple-500"></div>
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-purple-500"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-purple-500"></div>
          </div>
        </div>
      </div>

      <p className="text-white/80 mt-8 text-center px-4 font-medium backdrop-blur-sm bg-black/30 py-2 rounded-full border border-white/10">
        {cameraError ? (
          <span className="text-red-400 flex items-center justify-center gap-2">
            <AlertCircle size={20} /> {cameraError}
          </span>
        ) : (
          "Align the QR code within the frame"
        )}
      </p>

      <button
        onClick={() => {
          setIsScanning(false);
          fileInputRef.current?.click();
        }}
        className="mt-6 flex items-center justify-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-full transition-all backdrop-blur-md font-medium"
      >
        <ImageIcon size={20} />
        Scan from Gallery
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
          accept="image/*" 
          className="hidden" 
        />
      </button>
    </div>
  );

  // 3. SUCCESS SCREEN
  if (scanResult === 'SUCCESS') return (
    <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-green-900 to-slate-900 text-white p-6 text-center relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none"></div>
      <CloseButton />

      <div className="relative z-10 bg-white/10 backdrop-blur-xl p-8 rounded-3xl border border-white/20 shadow-2xl max-w-sm w-full">
        <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/40">
          <CheckCircle size={40} className="text-white" />
        </div>

        <h1 className="text-3xl font-bold mb-2 text-white">Access Granted!</h1>
        <p className="text-green-200 mb-6 font-medium">Welcome back!</p>

        <div className="bg-white/10 border border-white/10 p-6 rounded-2xl mb-6">
          <p className="text-xs uppercase tracking-widest font-bold text-green-300 mb-1">Assigned Seat</p>
          <p className="text-5xl font-black text-white tracking-tight">{data?.seat || 'A-1'}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-black/20 rounded-xl p-4">
            <p className="text-[10px] uppercase font-bold text-green-300 mb-1">Check-ins</p>
            <p className="text-xl font-bold">
              {data?.checkinsRemaining !== undefined ? data.checkinsRemaining : '-'}
              <span className="text-sm opacity-50 ml-1">/ {data?.maxDailyCheckins || '-'}</span>
            </p>
          </div>
          <div className="bg-black/20 rounded-xl p-4">
            <p className="text-[10px] uppercase font-bold text-green-300 mb-1">Time Left</p>
            <p className="text-xl font-bold">
              {data?.remainingTime ? `${data.remainingTime.hours}h ${data.remainingTime.minutes}m` : '-'}
            </p>
          </div>
        </div>

        {message && <p className="mt-6 text-sm text-green-100/80">{message}</p>}
      </div>
    </div>
  );

  // 4. TRIAL OFFER SCREEN
  if (scanResult === 'OFFER_TRIAL') return (
    <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-indigo-900 to-purple-900 text-white p-6 text-center relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent pointer-events-none"></div>
      <CloseButton />

      <div className="relative z-10 bg-white/10 backdrop-blur-xl p-8 rounded-3xl border border-white/20 shadow-2xl max-w-sm w-full">
        <div className="w-20 h-20 bg-indigo-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-500/40">
          <Gift size={40} className="text-white" />
        </div>

        <h1 className="text-2xl font-bold mb-2">First Time Here?</h1>
        <p className="text-indigo-200 mb-8 text-sm">{message || "Experience our premium library for free."}</p>

        <div className="bg-gradient-to-br from-white/10 to-transparent p-6 rounded-2xl border border-white/10 mb-6 relative overflow-hidden group hover:border-indigo-400 transition-colors cursor-pointer" onClick={handleActivateTrial}>
          <div className="absolute top-0 right-0 bg-yellow-400 text-black text-[10px] font-bold px-2 py-1 rounded-bl-lg">FREE</div>
          <h3 className="font-bold text-lg mb-1">Free Trial Access</h3>
          <p className="text-gray-300 text-xs">Get full access for {data?.trialDays || 1} day(s).</p>
        </div>

        <button
          onClick={handleActivateTrial}
          className="w-full bg-white text-indigo-900 py-3.5 rounded-xl font-bold hover:bg-indigo-50 transition-colors shadow-lg mb-4"
        >
          Activate Free Trial
        </button>

        <button
          onClick={() => setScanResult('SHOW_PLANS')}
          className="text-sm text-indigo-200 hover:text-white transition-colors font-medium"
        >
          View Paid Plans
        </button>
      </div>
    </div>
  );

  // 5. PAYMENT / ERROR SCREEN
  if (scanResult === 'SHOW_PLANS' || scanResult === 'ERROR') return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <CloseButton />

      <div className="relative w-full max-w-md bg-white dark:bg-gray-900/90 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-gray-200 dark:border-white/10">

        {/* Header Section */}
        <div className={`p-8 text-center border-b border-gray-100 dark:border-white/5 ${scanResult === 'ERROR'
            ? 'bg-red-50 dark:bg-red-500/10'
            : 'bg-gradient-to-b from-purple-50 to-white dark:from-purple-900/20 dark:to-transparent'
          }`}>
          <div className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-lg transform rotate-3 transition-transform hover:rotate-0 ${scanResult === 'ERROR'
              ? 'bg-red-500 text-white shadow-red-500/30'
              : 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-purple-500/30'
            }`}>
            {scanResult === 'ERROR' ? <AlertCircle size={32} /> : <CreditCard size={32} />}
          </div>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {scanResult === 'ERROR' ? "Access Denied" : "Select a Plan"}
          </h2>

          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium px-4">
            {message || (scanResult === 'ERROR' ? "Please try scanning again." : "Choose a subscription to continue.")}
          </p>
        </div>

        {/* Content Section */}
        <div className="p-6">
          {scanResult === 'SHOW_PLANS' && (
            <div className="space-y-4">
              <div className="max-h-[320px] overflow-y-auto custom-scrollbar pr-2 space-y-3">
                {data?.plans?.length > 0 ? (
                  data.plans.map((plan) => (
                    <div
                      key={plan._id}
                      className="group relative border border-gray-200 dark:border-white/10 p-4 rounded-xl cursor-pointer hover:border-purple-500 dark:hover:border-purple-500 transition-all duration-300 bg-gray-50 dark:bg-white/5 hover:bg-purple-50 dark:hover:bg-purple-500/10"
                      onClick={() => { /* Plan selection logic */ }}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                            {plan.title}
                          </h3>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-300">
                              {plan.durationInDays} Days
                            </span>
                            <span className="text-xs text-gray-400 dark:text-gray-500">•</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {plan.hoursPerDay}h / day
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="block text-lg font-black text-gray-900 dark:text-white group-hover:scale-105 transition-transform">
                            ₹{plan.price}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400">No public plans available at the moment.</p>
                  </div>
                )}
              </div>

              <button className="w-full relative overflow-hidden bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-purple-500/30 active:scale-[0.98] transition-all duration-200">
                Proceed to Payment
              </button>
            </div>
          )}

          {scanResult === 'ERROR' && (
            <button
              onClick={() => setScanResult(null)}
              className="w-full bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white py-4 rounded-xl font-bold text-lg hover:bg-gray-200 dark:hover:bg-white/20 transition-all duration-200"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // 6. IDLE STATE (Home Screen of Scanner)
  return (
    <div className="relative h-screen bg-gray-900 dark:bg-[#050505] flex flex-col items-center justify-center overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-[-20%] right-[-20%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] left-[-20%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[100px] pointer-events-none"></div>

      <CloseButton />

      <div className="text-center space-y-8 p-6 relative z-10 max-w-sm w-full">
        <div className="w-32 h-32 bg-white/5 backdrop-blur-xl rounded-full flex items-center justify-center mx-auto border border-white/10 shadow-2xl shadow-purple-500/20 relative">
          <div className="absolute inset-0 rounded-full border border-white/20 animate-ping opacity-20"></div>
          <Camera size={48} className="text-white drop-shadow-md" />
        </div>

        <div>
          <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">Scan & Enter</h1>
          <p className="text-gray-400 text-lg leading-relaxed">Point your camera at the library entry QR code to check-in.</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => setIsScanning(true)}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-4 rounded-xl font-bold text-lg shadow-xl shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-3"
          >
            <Camera size={24} />
            Scan QR Code
          </button>
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white py-4 rounded-xl font-bold text-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-3"
          >
            <ImageIcon size={24} />
            Upload QR Image
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept="image/*" 
              className="hidden" 
            />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SmartLibraryScanner;