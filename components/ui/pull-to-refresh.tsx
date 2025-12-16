"use client";

import { ReactNode, useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void> | void;
  disabled?: boolean;
  threshold?: number;
  className?: string;
}

export function PullToRefresh({
  children,
  onRefresh,
  disabled = false,
  threshold = 80,
  className,
}: PullToRefreshProps) {
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number | null>(null);
  const canPullRef = useRef(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || disabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Only allow pull if at the top of the scroll
      if (container.scrollTop === 0) {
        canPullRef.current = true;
        startYRef.current = e.touches[0].clientY;
      } else {
        canPullRef.current = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!canPullRef.current || startYRef.current === null) return;

      const currentY = e.touches[0].clientY;
      const deltaY = currentY - startYRef.current;

      if (deltaY > 0 && container.scrollTop === 0) {
        e.preventDefault();
        setIsPulling(true);
        // Cap the pull distance and add resistance
        const distance = Math.min(deltaY * 0.5, threshold * 1.5);
        setPullDistance(distance);
      }
    };

    const handleTouchEnd = async () => {
      if (!canPullRef.current || startYRef.current === null) return;

      if (pullDistance >= threshold && !isRefreshing) {
        setIsRefreshing(true);
        setIsPulling(false);
        setPullDistance(0);

        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
          startYRef.current = null;
        }
      } else {
        setIsPulling(false);
        setPullDistance(0);
        startYRef.current = null;
      }
    };

    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    container.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [disabled, pullDistance, threshold, isRefreshing, onRefresh]);

  const progress = Math.min((pullDistance / threshold) * 100, 100);
  const shouldShowIndicator = isPulling || isRefreshing;

  return (
    <div ref={containerRef} className={cn("relative overflow-auto", className)}>
      <AnimatePresence>
        {shouldShowIndicator && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="absolute top-0 left-0 right-0 flex items-center justify-center z-50 pointer-events-none"
            style={{ paddingTop: Math.max(pullDistance - 40, 0) }}
          >
            <div className="flex flex-col items-center gap-2">
              {isRefreshing ? (
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              ) : (
                <motion.div
                  animate={{ rotate: progress >= 100 ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Loader2
                    className="h-6 w-6 text-primary"
                    style={{
                      opacity: progress / 100,
                      transform: `scale(${Math.min(progress / 100, 1)})`,
                    }}
                  />
                </motion.div>
              )}
              {progress >= 100 && !isRefreshing && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs text-muted-foreground"
                >
                  Release to refresh
                </motion.p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.div
        animate={{
          y: isRefreshing ? 60 : pullDistance,
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30,
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}

