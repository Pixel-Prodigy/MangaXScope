"use client";

import { useCallback } from "react";

export type HapticFeedbackType = "light" | "medium" | "heavy" | "success" | "warning" | "error";

interface HapticFeedbackOptions {
  type?: HapticFeedbackType;
  enabled?: boolean;
}

const HAPTIC_PATTERNS: Record<HapticFeedbackType, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 30,
  success: [10, 20, 10],
  warning: [20, 10, 20],
  error: [30, 20, 30, 20],
};

/**
 * Hook for providing haptic feedback on supported devices
 * Uses the Vibration API when available
 */
export function useHapticFeedback() {
  const trigger = useCallback(
    (options: HapticFeedbackOptions = {}) => {
      const { type = "medium", enabled = true } = options;

      if (!enabled) return;

      // Check if Vibration API is available
      if (!("vibrate" in navigator)) {
        return;
      }

      const pattern = HAPTIC_PATTERNS[type];

      try {
        if (Array.isArray(pattern)) {
          navigator.vibrate(pattern);
        } else {
          navigator.vibrate(pattern);
        }
      } catch (error) {
        // Silently fail if vibration is not supported or blocked
        console.debug("Haptic feedback not available:", error);
      }
    },
    []
  );

  return { trigger };
}

/**
 * Utility function to trigger haptic feedback directly
 */
export function triggerHapticFeedback(
  type: HapticFeedbackType = "medium",
  enabled: boolean = true
) {
  if (!enabled || !("vibrate" in navigator)) return;

  const pattern = HAPTIC_PATTERNS[type];

  try {
    if (Array.isArray(pattern)) {
      navigator.vibrate(pattern);
    } else {
      navigator.vibrate(pattern);
    }
  } catch (error) {
    // Silently fail if vibration is not supported or blocked
    console.debug("Haptic feedback not available:", error);
  }
}

