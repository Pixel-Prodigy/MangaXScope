"use client";

import { useCallback, useRef, useEffect } from "react";

export interface SwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number; // Minimum distance in pixels to trigger swipe
  velocityThreshold?: number; // Minimum velocity to trigger swipe
  preventScroll?: boolean; // Prevent default scroll during swipe
  enabled?: boolean; // Enable/disable swipe detection
}

const DEFAULT_THRESHOLD = 50;
const DEFAULT_VELOCITY_THRESHOLD = 0.3;

export function useSwipeGesture({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = DEFAULT_THRESHOLD,
  velocityThreshold = DEFAULT_VELOCITY_THRESHOLD,
  preventScroll = false,
  enabled = true,
}: SwipeGestureOptions) {
  const touchStartRef = useRef<{
    x: number;
    y: number;
    time: number;
  } | null>(null);
  const touchMoveRef = useRef<{
    x: number;
    y: number;
    time: number;
  } | null>(null);
  const elementRef = useRef<HTMLElement | null>(null);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!enabled) return;

      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };
      touchMoveRef.current = null;
    },
    [enabled]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!enabled || !touchStartRef.current) return;

      const touch = e.touches[0];
      touchMoveRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };

      // Prevent scroll if we're detecting a horizontal swipe
      if (preventScroll && touchStartRef.current) {
        const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
        const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);

        // If horizontal movement is greater than vertical, prevent scroll
        if (deltaX > deltaY && deltaX > 10) {
          e.preventDefault();
        }
      }
    },
    [enabled, preventScroll]
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!enabled || !touchStartRef.current) return;

      const touchEnd = e.changedTouches[0];
      const start = touchStartRef.current;
      const move = touchMoveRef.current;

      if (!move) {
        touchStartRef.current = null;
        return;
      }

      const deltaX = move.x - start.x;
      const deltaY = move.y - start.y;
      const deltaTime = move.time - start.time;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      // Avoid division by zero
      const velocity = deltaTime > 0 ? distance / deltaTime : 0;

      // Check if swipe meets threshold requirements
      if (distance < threshold || (deltaTime > 0 && velocity < velocityThreshold)) {
        touchStartRef.current = null;
        touchMoveRef.current = null;
        return;
      }

      // Determine swipe direction
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      if (absX > absY) {
        // Horizontal swipe
        if (deltaX > 0 && onSwipeRight) {
          onSwipeRight();
        } else if (deltaX < 0 && onSwipeLeft) {
          onSwipeLeft();
        }
      } else {
        // Vertical swipe
        if (deltaY > 0 && onSwipeDown) {
          onSwipeDown();
        } else if (deltaY < 0 && onSwipeUp) {
          onSwipeUp();
        }
      }

      touchStartRef.current = null;
      touchMoveRef.current = null;
    },
    [
      enabled,
      threshold,
      velocityThreshold,
      onSwipeLeft,
      onSwipeRight,
      onSwipeUp,
      onSwipeDown,
    ]
  );

  const setRef = useCallback(
    (node: HTMLElement | null) => {
      if (elementRef.current) {
        elementRef.current.removeEventListener("touchstart", handleTouchStart);
        elementRef.current.removeEventListener("touchmove", handleTouchMove);
        elementRef.current.removeEventListener("touchend", handleTouchEnd);
      }

      elementRef.current = node;

      if (node && enabled) {
        node.addEventListener("touchstart", handleTouchStart, {
          passive: !preventScroll,
        });
        node.addEventListener("touchmove", handleTouchMove, {
          passive: !preventScroll,
        });
        node.addEventListener("touchend", handleTouchEnd, { passive: true });
      }
    },
    [enabled, preventScroll, handleTouchStart, handleTouchMove, handleTouchEnd]
  );

  useEffect(() => {
    return () => {
      if (elementRef.current) {
        elementRef.current.removeEventListener("touchstart", handleTouchStart);
        elementRef.current.removeEventListener("touchmove", handleTouchMove);
        elementRef.current.removeEventListener("touchend", handleTouchEnd);
      }
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return setRef;
}

