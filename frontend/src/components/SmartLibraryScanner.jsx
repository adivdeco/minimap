import React, { useState } from 'react';
import { Camera, X, CheckCircle, CreditCard, Gift, AlertCircle } from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner'; // Import the scanner
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
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white z-50">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
      <p>Verifying Access...</p>
    </div>
  );

  // 2. CAMERA SCANNING STATE
  if (isScanning) return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center">
      {/* Close Camera Button */}
      <button
        onClick={() => setIsScanning(false)}
        className="absolute top-6 right-6 p-3 bg-white/20 text-white rounded-full z-50"
      >
        <X size={24} />
      </button>

      <div className="w-full max-w-md aspect-square relative rounded-xl overflow-hidden shadow-2xl border-2 border-white/30">
        <Scanner
          onScan={(result) => {
            if (result && result[0]) {
              handleScan(result[0].rawValue);
            }
          }}
          onError={(error) => {
            console.error(error);
            setCameraError("Please allow camera permissions to scan.");
          }}
          components={{
            audio: false, // Disable beep sound if desired
            torch: true,  // Allow flashlight usage
            finder: true  // Show the scanning square box
          }}
        />
      </div>

      <p className="text-white mt-6 text-center px-4">
        {cameraError ? (
          <span className="text-red-400 flex items-center justify-center gap-2">
            <AlertCircle size={20} /> {cameraError}
          </span>
        ) : (
          "Align the QR code within the frame"
        )}
      </p>
    </div>
  );

  // 3. SUCCESS SCREEN
  if (scanResult === 'SUCCESS') return (
    <div className="flex flex-col items-center justify-center h-screen bg-green-600 text-white p-6 text-center relative">
      <CloseButton />
      <CheckCircle size={80} className="mb-4 animate-bounce" />
      <h1 className="text-3xl font-bold mb-2">Access Granted!</h1>
      <div className="bg-white text-green-800 px-8 py-4 rounded-xl shadow-lg mt-4 transform hover:scale-105 transition">
        <p className="text-sm uppercase tracking-wide font-bold opacity-70">Your Seat</p>
        <p className="text-5xl font-black">{data?.seat || 'A-1'}</p>
      </div>

      {/* NEW: Stats Display */}
      <div className="grid grid-cols-2 gap-4 mt-6 w-full max-w-xs">
        <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
          <p className="text-xs uppercase opacity-70 font-bold">Check-ins Left</p>
          <p className="text-xl font-bold">
            {data?.checkinsRemaining !== undefined ? data.checkinsRemaining : '-'}
            <span className="text-sm opacity-60">/{data?.maxDailyCheckins || '-'}</span>
          </p>
        </div>
        <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
          <p className="text-xs uppercase opacity-70 font-bold">Time Left</p>
          <p className="text-xl font-bold">
            {data?.remainingTime ? `${data.remainingTime.hours}h ${data.remainingTime.minutes}m` : '-'}
          </p>
        </div>
      </div>
      <p className="mt-6 opacity-90 text-lg font-medium">{message}</p>
    </div>
  );

  // 4. TRIAL OFFER SCREEN
  if (scanResult === 'OFFER_TRIAL') return (
    <div className="flex flex-col items-center justify-center h-screen bg-indigo-600 text-white p-6 text-center relative">
      <CloseButton />
      <Gift size={64} className="mb-4 text-yellow-300" />
      <h1 className="text-2xl font-bold">First Time Here?</h1>
      <p className="mt-2 mb-8 opacity-90">{message}</p>

      <div className="bg-white text-gray-800 p-6 rounded-xl shadow-xl w-full max-w-sm">
        <h3 className="font-bold text-lg">Free Trial Offer</h3>
        <p className="text-gray-500 text-sm mb-4">Get {data?.trialDays || 1} day(s) free access.</p>

        <button
          onClick={handleActivateTrial}
          className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 transition"
        >
          Activate Free Trial
        </button>
        <button
          onClick={() => setScanResult('SHOW_PLANS')}
          className="w-full mt-3 text-indigo-600 font-semibold text-sm"
        >
          No, show paid plans
        </button>
      </div>
    </div>
  );

  // 5. PAYMENT / ERROR SCREEN
  if (scanResult === 'SHOW_PLANS' || scanResult === 'ERROR') return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-50 dark:bg-[#050505] p-6 relative transition-colors">
      <CloseButton />
      <div className="bg-white dark:bg-[#0F0F12] p-6 rounded-2xl shadow-xl w-full max-w-md text-center border border-gray-200 dark:border-white/10">

        {scanResult === 'ERROR' ? (
          <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
        ) : (
          <CreditCard size={48} className="mx-auto text-blue-500 mb-4" />
        )}

        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          {scanResult === 'ERROR' ? "Access Denied" : "Subscription Required"}
        </h2>

        <p className="text-gray-500 dark:text-gray-400 mb-6 mt-2">{message}</p>

        {scanResult === 'SHOW_PLANS' && (
          <div className="space-y-3 text-left">
            <div className="border border-gray-200 dark:border-white/10 p-4 rounded-lg flex justify-between items-center cursor-pointer hover:border-blue-500 transition bg-white dark:bg-white/5">
              <div>
                <p className="font-bold text-gray-900 dark:text-white">Daily Pass</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">24 Hours Access</p>
              </div>
              <span className="font-bold text-blue-600 dark:text-blue-400">₹50</span>
            </div>
            <div className="border p-4 rounded-lg flex justify-between items-center cursor-pointer border-blue-500 bg-blue-50 dark:bg-blue-900/20">
              <div>
                <p className="font-bold text-gray-900 dark:text-white">Monthly Pass</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">30 Days Access</p>
              </div>
              <span className="font-bold text-blue-600 dark:text-blue-400">₹800</span>
            </div>
            <button className="w-full bg-black dark:bg-white text-white dark:text-black py-3 rounded-lg font-bold mt-6 hover:opacity-80 transition">
              Proceed to Pay
            </button>
          </div>
        )}

        {scanResult === 'ERROR' && (
          <button
            onClick={() => setScanResult(null)}
            className="w-full bg-gray-900 dark:bg-white text-white dark:text-black py-3 rounded-lg font-bold mt-6"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );

  // 6. IDLE STATE (Home Screen of Scanner)
  return (
    <div className="relative h-screen bg-black flex flex-col items-center justify-center">
      <CloseButton />

      <div className="text-center space-y-8 p-6">
        <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mx-auto animate-pulse">
          <Camera size={48} className="text-white" />
        </div>

        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Scan & Enter</h1>
          <p className="text-gray-400">Point your camera at the library entry QR code</p>
        </div>

        <button
          onClick={() => setIsScanning(true)} // Opens the Camera UI
          className="w-full max-w-xs bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-blue-500/30 transition transform hover:scale-105 flex items-center justify-center gap-2"
        >
          <Camera size={24} />
          Scan QR Code
        </button>

        {/* Debug Button (Optional) */}
        <button
          onClick={() => handleScan("valid_test_qr_string")}
          className="text-gray-500 text-sm hover:text-white underline"
        >
          (Dev Only: Simulate Scan)
        </button>
      </div>
    </div>
  );
};

export default SmartLibraryScanner;