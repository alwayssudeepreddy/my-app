// Utility functions for screen sharing monitoring across the app
import React from 'react';

export const checkScreenShareStatus = () => {
  const isActive = sessionStorage.getItem('screenShareActive') === 'true';
  const startTime = sessionStorage.getItem('screenShareStartTime');
  const stoppedAt = sessionStorage.getItem('screenShareStoppedAt');
  
  return {
    isActive,
    startTime: startTime ? new Date(startTime) : null,
    stoppedAt: stoppedAt ? new Date(stoppedAt) : null,
    duration: startTime ? Date.now() - new Date(startTime).getTime() : 0
  };
};

export const enforceScreenShare = () => {
  const status = checkScreenShareStatus();
  
  if (!status.isActive) {
    alert('🚨 Screen sharing is required! Redirecting to verification page...');
    window.location.href = '/screen';
    return false;
  }
  
  return true;
};

export const ScreenShareGuard = ({ children }: { children: React.ReactNode }) => {
  const [isValid, setIsValid] = React.useState(false);
  
  React.useEffect(() => {
    const checkStatus = () => {
      const status = checkScreenShareStatus();
      if (!status.isActive) {
        window.location.href = '/screen';
      } else {
        setIsValid(true);
      }
    };
    
    checkStatus();
    
    // Check every 5 seconds
    const interval = setInterval(checkStatus, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  if (!isValid) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Verifying screen sharing...</p>
        </div>
      </div>
    );
  }
  
  return <>{children}</>;
};
