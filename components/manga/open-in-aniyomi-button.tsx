"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { generateAniyomiIntent, isAndroid } from "@/lib/utils";

interface OpenInAniyomiButtonProps {
  mangaId: string;
  className?: string;
  variant?:
    | "default"
    | "outline"
    | "secondary"
    | "ghost"
    | "link"
    | "destructive";
  size?: "default" | "sm" | "lg" | "icon" | "icon-sm" | "icon-lg";
  showHelperText?: boolean;
}

export function OpenInAniyomiButton({
  mangaId,
  className,
  variant = "outline",
  size = "lg",
  showHelperText = true,
}: OpenInAniyomiButtonProps) {
  const [isAndroidDevice, setIsAndroidDevice] = useState(false);

  useEffect(() => {
    setIsAndroidDevice(isAndroid());
  }, []);

  const handleClick = () => {
    if (!mangaId) {
      console.warn("OpenInAniyomiButton: mangaId is required");
      return;
    }
    try {
      const intentUrl = generateAniyomiIntent(mangaId);
      // See doc comment above: Using window.location.href inside a click handler
      // is the most reliable way to trigger the intent on Android browsers.
      window.location.href = intentUrl;
    } catch (error) {
      console.error(
        "OpenInAniyomiButton: Failed to generate intent URL",
        error
      );
      // As a fallback, open MangaDex in new tab
      window.open(`https://mangadex.org/title/${mangaId}`, "_blank");
    }
  };

  // Only render on Android devices
  if (!isAndroidDevice) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={handleClick}
        title="Open in AniYomi (requires AniYomi + MangaDex extension installed)"
      >
        <ExternalLink className="mr-2 h-4 w-4" />
        Open in AniYomi
      </Button>
      {showHelperText && (
        <p className="text-xs text-muted-foreground">
          Requires AniYomi + MangaDex extension installed
        </p>
      )}
    </div>
  );
}
