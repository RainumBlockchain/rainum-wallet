import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Auto-lock timeout options in minutes (0 = never)
export const AUTO_LOCK_OPTIONS = [
  { value: 0, label: 'Never' },
  { value: 5, label: '5 minutes' },
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
] as const;

interface AutoLockState {
  timeoutMinutes: number; // 0 = disabled
  lastActivityTime: number;
  isWarningShown: boolean;

  // Actions
  setTimeoutMinutes: (minutes: number) => void;
  updateActivity: () => void;
  setWarningShown: (shown: boolean) => void;
  getRemainingTime: () => number; // Returns remaining seconds
  isLocked: () => boolean;
}

export const useAutoLockStore = create<AutoLockState>()(
  persist(
    (set, get) => ({
      timeoutMinutes: 0, // Default: DISABLED (use wallet-settings.ts instead)
      lastActivityTime: Date.now(),
      isWarningShown: false,

      setTimeoutMinutes: (minutes: number) => {
        set({
          timeoutMinutes: minutes,
          lastActivityTime: Date.now(),
          isWarningShown: false
        });
      },

      updateActivity: () => {
        set({
          lastActivityTime: Date.now(),
          isWarningShown: false
        });
      },

      setWarningShown: (shown: boolean) => {
        set({ isWarningShown: shown });
      },

      getRemainingTime: () => {
        const { timeoutMinutes, lastActivityTime } = get();

        if (timeoutMinutes === 0) {
          return Infinity; // Never lock
        }

        const timeoutMs = timeoutMinutes * 60 * 1000;
        const elapsed = Date.now() - lastActivityTime;
        const remaining = Math.max(0, timeoutMs - elapsed);

        return Math.floor(remaining / 1000); // Return seconds
      },

      isLocked: () => {
        const { timeoutMinutes, lastActivityTime } = get();

        if (timeoutMinutes === 0) {
          return false; // Never lock
        }

        const timeoutMs = timeoutMinutes * 60 * 1000;
        const elapsed = Date.now() - lastActivityTime;

        return elapsed >= timeoutMs;
      },
    }),
    {
      name: 'rainum-auto-lock',
      partialize: (state) => ({
        timeoutMinutes: state.timeoutMinutes,
        // Don't persist activity time or warning state
      }),
    }
  )
);
