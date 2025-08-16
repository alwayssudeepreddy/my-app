"use client";
import { useEffect, useState, useRef } from "react";
import { addMistake, getMistakeCount, getAllMistakes } from "../utils/secureMistakeTracker";

export default function ContestPage() {
  const [fullscreenError, setFullscreenError] = useState(false);
  const [fullscreenActive, setFullscreenActive] = useState(false);
  const [message, setMessage] = useState("");
  const [examStarted, setExamStarted] = useState(false);
  const [showTabModal, setShowTabModal] = useState(false);
  const [exitCount, setExitCount] = useState(0);
  
  // Screen sharing monitoring states
  const [screenShareActive, setScreenShareActive] = useState(true);
  const [contestFrozen, setContestFrozen] = useState(false);
  const [freezeReason, setFreezeReason] = useState("");
  const [awaitingAdminDecision, setAwaitingAdminDecision] = useState(false);
  
  // Secure mistake tracking
  const [totalMistakes, setTotalMistakes] = useState(0);
  
  const messageTimeout = useRef<number | null>(null);
  const screenMonitorInterval = useRef<NodeJS.Timeout | null>(null);


  useEffect(() => {
    // Initialize mistake count from secure storage
    const currentMistakeCount = getMistakeCount();
    setTotalMistakes(currentMistakeCount);
    
    // Check initial screen sharing status
    const checkInitialScreenShare = () => {
      const isActive = sessionStorage.getItem('screenShareActive') === 'true';
      if (!isActive) {
        // Redirect back to screen verification if not sharing
        window.location.href = '/screen';
        return;
      }
      setScreenShareActive(true);
    };

    checkInitialScreenShare();

    // Start monitoring screen sharing every 2 seconds
    screenMonitorInterval.current = setInterval(() => {
      const isActive = sessionStorage.getItem('screenShareActive') === 'true';
      
      if (!isActive && screenShareActive && examStarted) {
        // Screen sharing stopped during exam - FREEZE THE CONTEST
        handleContestFreeze('Screen sharing stopped');
      }
      
      setScreenShareActive(isActive);
    }, 2000);

    const showMessage = (msg: string) => {
      setMessage(msg);
  if (messageTimeout.current) clearTimeout(messageTimeout.current);
  messageTimeout.current = window.setTimeout(() => setMessage(""), 3000);
    };

    // Fullscreen change
    const onFullscreenChange = () => {
      if (document.fullscreenElement) {
        setFullscreenActive(true);
        if (examStarted) showMessage("Exam Started! Fullscreen enabled.");
      } else {
        setFullscreenActive(false);
        if (examStarted) {
          // Record mistake securely
          const mistakeCount = addMistake('fullscreen_exit', 'User exited fullscreen mode');
          setTotalMistakes(mistakeCount);
          
          setExitCount(prev => {
            const newCount = prev + 1;
            if (newCount >= 3) {
              setShowTabModal(false);
              addMistake('auto_submit', 'Auto-submitted due to 3 fullscreen exits');
              handleSubmitExam();
              showMessage("You exited fullscreen or switched tabs 3 times. Exam submitted.");
            } else {
              setShowTabModal(true);
              showMessage("");
            }
            // Log event
            const data = {
              event: 'exited_fullscreen',
              count: newCount,
              timestamp: Date.now(),
              userAgent: navigator.userAgent,
              page: window.location.href
            };
            console.log('User exited fullscreen:', data);
            return newCount;
          });
          // Try to restore fullscreen
          enterFullscreen();
        }
      }
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);

    // Tab/window change
    const onVisibility = () => {
      if (document.hidden && examStarted) {
        // Record tab switch mistake
        const mistakeCount = addMistake('tab_switch', 'User switched to another tab/window');
        setTotalMistakes(mistakeCount);
        
        setExitCount(prev => {
          const newCount = prev + 1;
          if (newCount >= 3) {
            setShowTabModal(false);
            addMistake('auto_submit', 'Auto-submitted due to 3 tab switches');
            handleSubmitExam();
            showMessage("You switched tabs 3 times. Exam submitted.");
          } else {
            setShowTabModal(true);
            showMessage("");
          }
          console.log('User switched tab/window', { event: 'tab_switch', count: newCount, timestamp: Date.now(), userAgent: navigator.userAgent, page: window.location.href });
          return newCount;
        });
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    // Mouse leave
    const onMouseLeave = () => {
      if (examStarted) {
        // Record mouse leave mistake
        const mistakeCount = addMistake('mouse_leave', 'Mouse left the exam window');
        setTotalMistakes(mistakeCount);
        
        showMessage("Mouse left the exam window! Do not leave the exam area.");
        console.log('Mouse left window', { event: 'mouse_leave', timestamp: Date.now(), userAgent: navigator.userAgent, page: window.location.href });
      }
    };
    document.addEventListener('mouseleave', onMouseLeave);

    // Block shortcuts
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.altKey || e.metaKey) && examStarted) {
        e.preventDefault();
        
        // Record shortcut attempt mistake
        const mistakeCount = addMistake('blocked_shortcut', `Attempted shortcut: ${e.key} with ${e.ctrlKey ? 'Ctrl+' : ''}${e.altKey ? 'Alt+' : ''}${e.metaKey ? 'Meta+' : ''}`);
        setTotalMistakes(mistakeCount);
        
        showMessage("Keyboard shortcuts are disabled during the exam!");
        console.log('Shortcut blocked', { event: 'shortcut_blocked', timestamp: Date.now(), userAgent: navigator.userAgent, page: window.location.href });
      }
    };
    document.addEventListener('keydown', onKeyDown);

    // Send POST to API on unload
    const handleUnload = () => {
      navigator.sendBeacon("/api/route", JSON.stringify({ event: "leave" }));
    };
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('visibilitychange', onVisibility);
      document.removeEventListener('mouseleave', onMouseLeave);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener("beforeunload", handleUnload);
      if (messageTimeout.current) clearTimeout(messageTimeout.current);
      if (screenMonitorInterval.current) clearInterval(screenMonitorInterval.current);
    };
  }, [examStarted, screenShareActive]);

  // Contest freeze handling
  const handleContestFreeze = async (reason: string) => {
    // Record the freeze as a critical mistake
    const mistakeCount = addMistake('contest_freeze', `Contest frozen: ${reason}`);
    setTotalMistakes(mistakeCount);
    
    setContestFrozen(true);
    setFreezeReason(reason);
    setAwaitingAdminDecision(true);
    
    // Log the freeze incident with mistake data
    const allMistakes = getAllMistakes();
    const freezeData = {
      event: 'contest_frozen',
      reason: reason,
      timestamp: new Date().toISOString(),
      userId: 'contestant_42', // Replace with actual user ID
      examStartTime: sessionStorage.getItem('examStartTime'),
      screenShareStoppedAt: sessionStorage.getItem('screenShareStoppedAt'),
      totalMistakes: mistakeCount,
      mistakeHistory: allMistakes
    };
    
    console.log('🚨 CONTEST FROZEN:', freezeData);
    
    // Send freeze notification to backend/admin
    try {
      await fetch('/api/contest/freeze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(freezeData)
      });
    } catch (err) {
      console.error('Failed to notify admin of freeze:', err);
    }
    
    // Show freeze notification
    alert(`🚨 CONTEST FROZEN: ${reason}\n\nYour contest has been frozen and admin has been notified. Please wait for admin decision.`);
  };

  // Admin decision handlers (these would be called from admin interface)
  const handleAdminUnfreeze = () => {
    setContestFrozen(false);
    setAwaitingAdminDecision(false);
    setFreezeReason("");
    alert('✅ Contest unfrozen by admin. You may continue.');
  };

  const handleAdminAutoSubmit = () => {
    setAwaitingAdminDecision(false);
    handleSubmitExam();
    alert('📤 Contest auto-submitted by admin decision.');
  };

  // Fullscreen helpers
  function enterFullscreen() {
    const elem = document.documentElement as any;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch(() => {});
    } else if (elem.webkitRequestFullscreen) {
      elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) {
      elem.msRequestFullscreen();
    }
  }
  function exitFullscreen() {
    const doc: any = document;
    if (doc.exitFullscreen) {
      doc.exitFullscreen().catch(() => {});
    } else if (doc.webkitExitFullscreen) {
      doc.webkitExitFullscreen();
    } else if (doc.msExitFullscreen) {
      doc.msExitFullscreen();
    }
  }

  // Start/submit handlers
  const handleStartExam = () => {
    setExamStarted(true);
    setFullscreenError(false);
    enterFullscreen();
    setMessage("Exam Started! Fullscreen enabled.");
  };

  const handleTabModalStay = () => {
    setShowTabModal(false);
    setMessage("Please stay on the exam page.");
    enterFullscreen();
  };
  const handleTabModalSubmit = () => {
    setShowTabModal(false);
    handleSubmitExam();
  };
  const handleSubmitExam = () => {
    setExamStarted(false);
    setFullscreenError(false);
    exitFullscreen();
    setMessage("Exam Submitted! Fullscreen exited.");
  };
  // Set the background color of the whole page to white
  useEffect(() => {
    document.body.style.background = 'white';
    return () => {
      document.body.style.background = '';
    };
  }, []);

  return (
    <main
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        background: "#111",
        color: "#fff",
      }}
    >
      <div style={{
        position: 'fixed',
        top: 16,
        left: 16,
        background: '#222',
        color: '#fff',
        padding: '8px 18px',
        borderRadius: 8,
        fontWeight: 'bold',
        fontSize: 16,
        border: '1px solid #fff',
        zIndex: 3000
      }}>
        Tab exits left: {Math.max(0, 3 - exitCount)}
      </div>

      {/* Screen Share Status Indicator */}
      <div style={{
        position: 'fixed',
        top: 16,
        right: 16,
        background: screenShareActive ? '#1b5e20' : '#c62828',
        color: '#fff',
        padding: '8px 18px',
        borderRadius: 8,
        fontWeight: 'bold',
        fontSize: 14,
        border: '1px solid #fff',
        zIndex: 3000
      }}>
        {screenShareActive ? '🟢 Screen Sharing Active' : '🔴 Screen Sharing Stopped'}
      </div>

      {/* Secure Mistake Counter */}
      <div style={{
        position: 'fixed',
        top: 60,
        right: 16,
        background: totalMistakes > 5 ? '#d32f2f' : totalMistakes > 2 ? '#f57c00' : '#388e3c',
        color: '#fff',
        padding: '8px 18px',
        borderRadius: 8,
        fontWeight: 'bold',
        fontSize: 14,
        border: '1px solid #fff',
        zIndex: 3000
      }}>
        🚨 Mistakes: {totalMistakes}
      </div>

      <h1 style={{ color: "#fff", marginBottom: 32 }}>Welcome to the Exam</h1>
      
      {!examStarted && !contestFrozen && (
        <button
          onClick={handleStartExam}
          style={{
            padding: "10px 20px",
            margin: 10,
            fontSize: 16,
            background: "#222",
            color: "#fff",
            border: "1px solid #fff",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          Start Exam (Fullscreen)
        </button>
      )}
      
      {!contestFrozen && (
        <button
          onClick={handleSubmitExam}
          style={{
            padding: "10px 20px",
            margin: 10,
            fontSize: 16,
            background: "#222",
            color: "#fff",
            border: "1px solid #fff",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          Submit Exam (Exit Fullscreen)
        </button>
      )}
      
      <div style={{ marginTop: 20, color: '#ff5252', fontWeight: 'bold', minHeight: 28 }}>{message}</div>

      {showTabModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000
        }}>
          <div style={{ background: '#222', padding: 36, borderRadius: 14, textAlign: 'center', minWidth: 320, color: '#fff', border: '2px solid #fff' }}>
            <h2>Stay on the Exam Page</h2>
            <p>You tried to switch tabs or windows.<br/>You have {2 - exitCount + 1} warning(s) left.<br/>Please submit the exam or stay on this page.</p>
            <button onClick={handleTabModalStay} style={{ margin: 12, padding: '10px 24px', fontSize: 16, background: '#111', color: '#fff', border: '1px solid #fff', borderRadius: 6, cursor: 'pointer' }}>Stay</button>
            <button onClick={handleTabModalSubmit} style={{ margin: 12, padding: '10px 24px', fontSize: 16, background: '#c00', color: '#fff', border: '1px solid #fff', borderRadius: 6, cursor: 'pointer' }}>Submit Exam</button>
          </div>
        </div>
      )}

      {/* Contest Freeze Overlay */}
      {contestFrozen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(139, 0, 0, 0.95)', // Dark red overlay
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 4000
        }}>
          <div style={{ 
            background: '#1a1a1a', 
            padding: 48, 
            borderRadius: 16, 
            textAlign: 'center', 
            minWidth: 400, 
            color: '#fff', 
            border: '3px solid #ff1744',
            boxShadow: '0 0 30px rgba(255, 23, 68, 0.5)'
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🚨</div>
            <h2 style={{ color: '#ff1744', marginBottom: 16, fontSize: 24 }}>CONTEST FROZEN</h2>
            <p style={{ marginBottom: 12, fontSize: 16 }}>
              <strong>Reason:</strong> {freezeReason}
            </p>
            <p style={{ marginBottom: 20, fontSize: 14, color: '#ffab40' }}>
              Your contest has been frozen due to a policy violation.<br/>
              An admin has been notified and will decide whether to:<br/>
              • Allow you to continue, or<br/>
              • Auto-submit your exam
            </p>
            
            {awaitingAdminDecision && (
              <div style={{ 
                background: '#263238', 
                padding: 16, 
                borderRadius: 8, 
                marginBottom: 20,
                border: '1px solid #37474f'
              }}>
                <div style={{ fontSize: 14, color: '#81c784', marginBottom: 8 }}>
                  ⏳ Awaiting Admin Decision...
                </div>
                <div style={{ fontSize: 12, color: '#b0bec5' }}>
                  Please wait while the admin reviews your case.
                </div>
              </div>
            )}

            {/* Admin Testing Buttons (for demo/testing) */}
            <div style={{ marginTop: 24, borderTop: '1px solid #424242', paddingTop: 16 }}>
              <p style={{ fontSize: 12, color: '#757575', marginBottom: 12 }}>Admin Controls (Testing):</p>
              <button 
                onClick={handleAdminUnfreeze}
                style={{ 
                  margin: '0 8px', 
                  padding: '8px 16px', 
                  fontSize: 14, 
                  background: '#2e7d32', 
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: 4, 
                  cursor: 'pointer' 
                }}
              >
                ✅ Unfreeze
              </button>
              <button 
                onClick={handleAdminAutoSubmit}
                style={{ 
                  margin: '0 8px', 
                  padding: '8px 16px', 
                  fontSize: 14, 
                  background: '#d32f2f', 
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: 4, 
                  cursor: 'pointer' 
                }}
              >
                📤 Auto-Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
