"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { addMistake } from "../utils/secureMistakeTracker";

export default function ScreenCapture() {
  const [isCapturing, setIsCapturing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  const startCapture = async () => {
    try {
      // Force monitor selection with preferences
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: "monitor", // Force monitor/screen selection
          width: { ideal: 1920 }, // Prefer common resolutions
          height: { ideal: 1080 },
          frameRate: { ideal: 15 } // Lower framerate for efficiency
        },
        audio: false
      });

      // Enhanced monitor detection
      const videoTrack = mediaStream.getVideoTracks()[0];
      const settings = videoTrack.getSettings();
      
      console.log("Video track settings:", settings);
      
      // Check display surface type
      if (settings.displaySurface && settings.displaySurface !== 'monitor') {
        mediaStream.getTracks().forEach(track => track.stop());
        alert('❌ You must share your ENTIRE SCREEN (monitor), not a window or tab. Please try again and select "Entire Screen".');
        return;
      }

      // More strict dimension checking for monitor detection
      const screenWidth = window.screen.width;
      const screenHeight = window.screen.height;
      const captureWidth = settings.width || 0;
      const captureHeight = settings.height || 0;

      console.log(`Screen: ${screenWidth}x${screenHeight}, Capture: ${captureWidth}x${captureHeight}`);

      const widthRatio = captureWidth / screenWidth;
      const heightRatio = captureHeight / screenHeight;
      
      // Stricter checking - must be at least 90% of screen size
      if (widthRatio < 0.9 || heightRatio < 0.9) {
        mediaStream.getTracks().forEach(track => track.stop());
        alert('❌ It appears you shared a window instead of full screen. Please share your ENTIRE SCREEN (monitor).');
        return;
      }

      // ✅ SUCCESS: User shared full screen properly!
      setStream(mediaStream);
      setIsVerified(true);
      setIsCapturing(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      // Store screen sharing info for contest page
      sessionStorage.setItem('screenShareActive', 'true');
      sessionStorage.setItem('screenShareStartTime', new Date().toISOString());

      // Set up disconnect detection
      setupDisconnectDetection(mediaStream, videoTrack);

      // Start background monitoring
      const imageCapture = new ImageCapture(videoTrack) as any;
      startBackgroundMonitoring(imageCapture);

      // Show success and redirect
      alert('✅ Screen sharing verified! You will be redirected to the contest page.....');
      
      setTimeout(() => {
        router.push('/contest'); // Redirect to contest page
      }, 1000);

    } catch (err) {
      console.error("Error accessing screen:", err);
      setIsCapturing(false);
      alert('❌ Error: ' + (err instanceof Error ? err.message : 'Failed to access screen'));
    }
  };

  const startBackgroundMonitoring = (imageCapture: any) => {
    // Start capturing screenshots in background every 5 seconds
    intervalRef.current = setInterval(async () => {
      try {
        const bitmap = await imageCapture.grabFrame();
        
        // Create canvas with compression
        const canvas = document.createElement("canvas");
        const scale = 0.8; // 80% of original size
        canvas.width = bitmap.width * scale;
        canvas.height = bitmap.height * scale;
        
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        }

        // Heavy compression and auto-download
        canvas.toBlob(
          (blob) => {
            if (blob) {
              console.log("Background monitoring capture:", (blob.size / 1024).toFixed(2), "KB");

              const now = new Date();
              const timestamp = now.toISOString().replace(/[:.]/g, '-');
              const filename = `contest-monitor-${timestamp}.jpg`;

              // Auto-download
              const url = URL.createObjectURL(blob);
              const downloadLink = document.createElement("a");
              downloadLink.href = url;
              downloadLink.download = filename;
              downloadLink.style.display = "none";
              
              document.body.appendChild(downloadLink);
              downloadLink.click();
              document.body.removeChild(downloadLink);
              
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            }
          },
          "image/jpeg",
          0.3 // Heavy compression for background monitoring
        );
      } catch (err) {
        console.error("Background monitoring error:", err);
      }
    }, 5000);
  };

  const setupDisconnectDetection = (mediaStream: MediaStream, videoTrack: MediaStreamTrack) => {
    // Listen for when user stops screen sharing (clicks "Stop sharing" button)
    videoTrack.addEventListener('ended', () => {
      console.log('🚨 Screen sharing stopped by user');
      handleScreenShareStopped();
    });

    // Also listen to the entire stream
    mediaStream.addEventListener('inactive', () => {
      console.log('🚨 Screen sharing stream became inactive');
      handleScreenShareStopped();
    });

    // Periodically check if track is still active
    const checkInterval = setInterval(() => {
      if (!videoTrack.enabled || videoTrack.readyState === 'ended') {
        console.log('🚨 Screen sharing track ended during monitoring');
        clearInterval(checkInterval);
        handleScreenShareStopped();
      }
    }, 1000); // Check every second
  };

  const handleScreenShareStopped = () => {
    // Record screen sharing stop as a critical mistake
    addMistake('screen_share_stopped', 'User stopped screen sharing');
    
    // Mark screen sharing as stopped
    sessionStorage.setItem('screenShareActive', 'false');
    sessionStorage.setItem('screenShareStoppedAt', new Date().toISOString());
    
    // Stop background monitoring
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Check if user was in contest when screen sharing stopped
    const wasInContest = sessionStorage.getItem('examStarted') === 'true';

    if (wasInContest) {
      // Record additional mistake for stopping during contest
      addMistake('screen_share_stopped_during_contest', 'Screen sharing stopped while contest was active');
      
      // If user was in contest, this will trigger freeze in contest page
      alert('🚨 CRITICAL: Screen sharing stopped during contest! Your contest has been frozen and admin notified.');
    } else {
      // If not in contest yet, just show warning
      alert('🚨 CRITICAL: Screen sharing stopped! Please restart screen sharing to continue.');
    }
    
    // Reset state
    setIsCapturing(false);
    setIsVerified(false);
    setStream(null);

    // Don't force reload if user was in contest - let contest page handle the freeze
    if (!wasInContest) {
      setTimeout(() => {
        window.location.reload(); // Force reload to restart verification
      }, 2000);
    }
  };

  const stopCapture = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    if (stream) {
      stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      setStream(null);
    }
    setIsCapturing(false);
    setIsVerified(false);
    sessionStorage.removeItem('screenShareActive');
    sessionStorage.removeItem('screenShareStartTime');
  };

  return (
    <div className="flex flex-col items-center p-10 min-h-screen bg-gray-50">
      <h1 className="text-3xl font-bold mb-6 text-center">Contest Screen Verification</h1>
      
      <div className="max-w-2xl text-center mb-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-700 font-semibold mb-2">
            🚨 MANDATORY: Share Your ENTIRE SCREEN (Monitor)
          </p>
          <p className="text-red-600 text-sm">
            📺 When popup appears, select "Entire Screen" - NOT a window or tab
          </p>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-700 text-sm mb-1">
            🔒 This ensures contest integrity by monitoring your screen
          </p>
          <p className="text-blue-600 text-sm">
            💾 Screenshots will be captured automatically during the contest
          </p>
        </div>
      </div>

      {!isVerified ? (
        <div className="text-center">
          <button 
            onClick={startCapture}
            disabled={isCapturing}
            className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-lg font-semibold"
          >
            {isCapturing ? "⏳ Verifying..." : "🎥 Start Screen Sharing Verification"}
          </button>
          
          <p className="text-gray-600 text-sm mt-4">
            Click above and select "Entire Screen" when prompted
          </p>
        </div>
      ) : (
        <div className="text-center">
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-4">
            <p className="text-green-700 font-semibold text-lg mb-2">
              ✅ Screen Sharing Verified!
            </p>
            <p className="text-green-600">
              🔄 Redirecting to contest page...
            </p>
          </div>
          
          <button 
            onClick={stopCapture}
            className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            ⏹️ Cancel & Stop Sharing
          </button>
        </div>
      )}

      <video ref={videoRef} autoPlay playsInline style={{ display: "none" }} />
      
      {isCapturing && (
        <div className="mt-6 text-center">
          <p className="text-green-600 text-sm">
            🟢 Background monitoring active...
          </p>
        </div>
      )}
    </div>
  );
}
