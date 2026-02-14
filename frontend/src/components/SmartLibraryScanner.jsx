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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dynamic Background with Blur */}
      <div
        className={`absolute inset-0 transition-colors duration-500 ${scanResult === 'ERROR'
            ? 'bg-red-900/20 backdrop-blur-md'
            : 'bg-black/60 backdrop-blur-md'
          }`}
      />

      <CloseButton />

      <div className="relative w-full max-w-md transforms transition-all">
        <div className="bg-white dark:bg-[#121214] rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-white/5">

          {/* Header Section */}
          <div className={`p-8 pb-6 text-center border-b border-gray-100 dark:border-white/5 ${scanResult === 'ERROR' ? 'bg-red-50/50 dark:bg-red-500/5' : 'bg-blue-50/50 dark:bg-blue-500/5'
            }`}>
            <div className={`mx-auto w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-lg transform rotate-3 transition-transform hover:rotate-0 ${scanResult === 'ERROR'
                ? 'bg-gradient-to-tr from-red-500 to-pink-600 text-white shadow-red-500/30'
                : 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-blue-500/30'
              }`}>
              {scanResult === 'ERROR' ? (
                <AlertCircle size={40} className="drop-shadow-md" />
              ) : (
                <CreditCard size={40} className="drop-shadow-md" />
              )}
            </div>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
              {scanResult === 'ERROR' ? "Access Denied" : "Subscription Required"}
            </h2>

            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium px-4">
              {message || (scanResult === 'ERROR' ? "Please try scanning again." : "Choose a plan to continue accessing the library.")}
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
                        className="group relative border border-gray-200 dark:border-white/10 p-4 rounded-xl cursor-pointer hover:border-blue-500 dark:hover:border-blue-500 transition-all duration-300 bg-gray-50 dark:bg-white/5 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:shadow-md"
                        onClick={() => {
                          // Placeholder for payment selection logic
                          // setSelectedPlan(plan); 
                          // console.log("Selected plan:", plan);
                        }}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
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

                <button className="w-full relative overflow-hidden bg-gray-900 dark:bg-white text-white dark:text-black py-4 rounded-xl font-bold text-lg hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200">
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    Proceed to Payment
                  </span>
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

      </div>
    </div>
  );
};

export default SmartLibraryScanner;