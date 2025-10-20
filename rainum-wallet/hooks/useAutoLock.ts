import { useEffect, useState, useCallback } from 'react';
import { useAutoLockStore } from '@/lib/auto-lock-store';

const WARNING_THRESHOLD_SECONDS = 30; // Show warning 30 seconds before lock

interface UseAutoLockReturn {
  shouldLock: boolean;
  showWarning: boolean;
  remainingSeconds: number;
  dismissWarning: () => void;
}

export function useAutoLock(): UseAutoLockReturn {
  const {
    timeoutMinutes,
    updateActivity,
    getRemainingTime,
    isLocked,
    isWarningShown,
    setWarningShown
  } = useAutoLockStore();

  const [shouldLock, setShouldLock] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  // Track user activity
  useEffect(() => {
    if (timeoutMinutes === 0) return; // Auto-lock disabled

    const handleActivity = () => {
      updateActivity();
      setShowWarning(false);
      setWarningShown(false);
    };

    // Activity events to track
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

    events.forEach(event => {
      document.addEventListener(event, handleActivity);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [timeoutMinutes, updateActivity, setWarningShown]);

  // Check lock status periodically
  useEffect(() => {
    if (timeoutMinutes === 0) {
      setShouldLock(false);
      setShowWarning(false);
      return;
    }

    const checkInterval = setInterval(() => {
      const remaining = getRemainingTime();
      setRemainingSeconds(remaining);

      // Check if should lock
      if (isLocked()) {
        setShouldLock(true);
        setShowWarning(false);
        return;
      }

      // Show warning if approaching timeout
      if (remaining <= WARNING_THRESHOLD_SECONDS && remaining > 0 && !isWarningShown) {
        setShowWarning(true);
        setWarningShown(true);
      } else if (remaining > WARNING_THRESHOLD_SECONDS) {
        setShowWarning(false);
        setWarningShown(false);
      }
    }, 1000); // Check every second

    return () => clearInterval(checkInterval);
  }, [timeoutMinutes, getRemainingTime, isLocked, isWarningShown, setWarningShown]);

  const dismissWarning = useCallback(() => {
    updateActivity();
    setShowWarning(false);
    setWarningShown(false);
  }, [updateActivity, setWarningShown]);

  return {
    shouldLock,
    showWarning,
    remainingSeconds,
    dismissWarning
  };
}
