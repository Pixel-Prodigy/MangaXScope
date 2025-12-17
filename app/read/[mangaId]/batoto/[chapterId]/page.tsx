"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Settings,
  ExternalLink,
  Loader2,
  ImageOff,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

// =============================================================================
// TYPES
// =============================================================================

interface SourcePage {
  index: number;
  imageUrl: string;
  width?: number;
  height?: number;
}

interface ChapterPagesResponse {
  chapterId: string;
  pages: SourcePage[];
  referer?: string;
  source: string;
}

interface BatotoChapter {
  id: string;
  chapter: string | null;
  volume: string | null;
  title: string | null;
  language: string;
  pages: number;
  publishedAt: string;
  externalUrl: string | null;
}

interface BatotoChaptersResponse {
  chapters: BatotoChapter[];
  total: number;
  source: string;
  seriesId: string;
}

interface ExternalSourceInfo {
  mangaId: string;
  hasExternalSource: boolean;
  externalSource: {
    provider: string;
    externalId: string;
  } | null;
}

// =============================================================================
// DATA FETCHING
// =============================================================================

async function fetchBatotoChapterPages(chapterId: string): Promise<ChapterPagesResponse> {
  const response = await fetch(
    `/api/sources/batoto/pages?chapterId=${encodeURIComponent(chapterId)}`
  );
  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: "Failed to fetch" }));
    throw new Error(data.error || "Failed to fetch chapter pages");
  }
  return response.json();
}

async function fetchBatotoChapterList(seriesId: string): Promise<BatotoChaptersResponse> {
  const response = await fetch(
    `/api/sources/batoto/chapters?seriesId=${encodeURIComponent(seriesId)}`
  );
  if (!response.ok) {
    throw new Error("Failed to fetch chapter list");
  }
  return response.json();
}

async function fetchExternalSourceInfo(mangaId: string): Promise<ExternalSourceInfo> {
  const response = await fetch(`/api/sources/batoto/link?mangaId=${encodeURIComponent(mangaId)}`);
  if (!response.ok) {
    throw new Error("Failed to fetch external source info");
  }
  return response.json();
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function BatotoReaderPage() {
  const params = useParams();
  const router = useRouter();
  const mangaId = params.mangaId as string;
  const chapterId = params.chapterId as string;

  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Fetch external source info to get the seriesId
  const { data: sourceInfo } = useQuery({
    queryKey: ["external-source", mangaId],
    queryFn: () => fetchExternalSourceInfo(mangaId),
    staleTime: 10 * 60 * 1000,
  });

  // Fetch chapter pages
  const {
    data: pagesData,
    isLoading: isLoadingPages,
    error: pagesError,
  } = useQuery({
    queryKey: ["batoto-pages", chapterId],
    queryFn: () => fetchBatotoChapterPages(chapterId),
    retry: 2,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch chapter list for navigation
  const { data: chapterList } = useQuery({
    queryKey: ["batoto-chapters", sourceInfo?.externalSource?.externalId],
    queryFn: () => fetchBatotoChapterList(sourceInfo!.externalSource!.externalId),
    enabled: !!sourceInfo?.externalSource?.externalId,
    staleTime: 10 * 60 * 1000,
  });

  // Find current chapter index and neighbors
  const currentChapterIndex = chapterList?.chapters.findIndex(
    (ch) => ch.id === chapterId
  );
  const prevChapter =
    currentChapterIndex !== undefined && currentChapterIndex > 0
      ? chapterList?.chapters[currentChapterIndex - 1]
      : null;
  const nextChapter =
    currentChapterIndex !== undefined &&
    chapterList &&
    currentChapterIndex < chapterList.chapters.length - 1
      ? chapterList.chapters[currentChapterIndex + 1]
      : null;
  const currentChapter =
    currentChapterIndex !== undefined
      ? chapterList?.chapters[currentChapterIndex]
      : null;

  // Auto-hide controls after delay
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(true);
    controlsTimeoutRef.current = setTimeout(() => {
      if (!showSettings) {
        setShowControls(false);
      }
    }, 3000);
  }, [showSettings]);

  // Handle tap/click to toggle controls
  const handleTap = useCallback(() => {
    if (showControls) {
      setShowControls(false);
      setShowSettings(false);
    } else {
      resetControlsTimeout();
    }
  }, [showControls, resetControlsTimeout]);

  // Handle scroll to reset controls timeout
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      resetControlsTimeout();
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [resetControlsTimeout]);

  // Initial controls timeout
  useEffect(() => {
    controlsTimeoutRef.current = setTimeout(() => {
      if (!showSettings) {
        setShowControls(false);
      }
    }, 3000);

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && prevChapter) {
        router.push(`/read/${mangaId}/batoto/${prevChapter.id}`);
      } else if (e.key === "ArrowRight" && nextChapter) {
        router.push(`/read/${mangaId}/batoto/${nextChapter.id}`);
      } else if (e.key === "Escape") {
        router.push(`/manga/${mangaId}`);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router, mangaId, prevChapter, nextChapter]);

  // Loading state
  if (isLoadingPages) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
          <p className="text-white/70 text-sm">Loading chapter from Batoto...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (pagesError || !pagesData) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-black p-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <ImageOff className="h-12 w-12 text-white/50" />
          <p className="text-white text-lg font-medium">
            Failed to load chapter
          </p>
          <p className="text-white/70 text-sm max-w-md">
            {pagesError instanceof Error
              ? pagesError.message
              : "This chapter may not be available on Batoto"}
          </p>
          <div className="flex gap-3 mt-4">
            <Link href={`/manga/${mangaId}`}>
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Manga
              </Button>
            </Link>
            {currentChapter?.externalUrl && (
              <a
                href={currentChapter.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button className="gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Read on Batoto
                </Button>
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  // No pages found
  if (pagesData.pages.length === 0) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-black p-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <ImageOff className="h-12 w-12 text-white/50" />
          <p className="text-white text-lg font-medium">
            No pages found
          </p>
          <p className="text-white/70 text-sm max-w-md">
            The chapter structure may have changed. Try reading directly on Batoto.
          </p>
          <div className="flex gap-3 mt-4">
            <Link href={`/manga/${mangaId}`}>
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Manga
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Top Controls */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/90 to-transparent pb-8 pt-safe"
          >
            <div className="flex items-center justify-between px-4 py-3">
              <Link href={`/manga/${mangaId}`}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20 gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Back</span>
                </Button>
              </Link>

              <div className="flex-1 text-center px-4">
                <div className="flex items-center justify-center gap-2">
                  <p className="text-white font-medium truncate">
                    {currentChapter?.chapter
                      ? `Chapter ${currentChapter.chapter}`
                      : "Chapter"}
                    {currentChapter?.title && (
                      <span className="text-white/70 font-normal">
                        {" · "}
                        {currentChapter.title}
                      </span>
                    )}
                  </p>
                  <Badge className="bg-orange-500/80 text-white text-xs">
                    Batoto
                  </Badge>
                </div>
                {currentChapter?.volume && (
                  <p className="text-white/60 text-xs">
                    Volume {currentChapter.volume}
                  </p>
                )}
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSettings(!showSettings);
                }}
              >
                {showSettings ? (
                  <X className="h-4 w-4" />
                ) : (
                  <Settings className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Settings Panel */}
            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-4 pb-4 overflow-hidden"
                >
                  <div className="bg-white/10 backdrop-blur-xl rounded-xl p-4">
                    <p className="text-white text-sm">
                      Reading from Batoto
                    </p>
                    <p className="text-white/60 text-xs mt-1">
                      Images are loaded directly from Batoto servers
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Container - Vertical Scroll */}
      <div
        ref={scrollContainerRef}
        className="min-h-screen overflow-y-auto"
        onClick={handleTap}
      >
        {/* Chapter Header */}
        <div className="flex flex-col items-center justify-center py-12 px-4 bg-gradient-to-b from-zinc-900 to-black">
          <div className="text-center max-w-2xl">
            <Badge className="bg-orange-500/80 text-white mb-3">
              Batoto
            </Badge>
            {currentChapter?.volume && (
              <p className="text-white/50 text-sm mb-1">
                Volume {currentChapter.volume}
              </p>
            )}
            <h1 className="text-white text-2xl sm:text-3xl font-bold mb-2">
              {currentChapter?.chapter
                ? `Chapter ${currentChapter.chapter}`
                : "Chapter"}
            </h1>
            {currentChapter?.title && (
              <p className="text-white/70 text-lg sm:text-xl">
                {currentChapter.title}
              </p>
            )}
            <p className="text-white/40 text-sm mt-4">
              {pagesData.pages.length} pages
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center">
          {pagesData.pages.map((page) => (
            <BatotoReaderImage
              key={`${chapterId}-${page.index}`}
              src={page.imageUrl}
              alt={`Page ${page.index + 1}`}
              index={page.index}
              total={pagesData.pages.length}
              referer={pagesData.referer}
            />
          ))}
        </div>

        {/* End of Chapter Navigation */}
        <div className="flex flex-col items-center gap-4 py-12 px-4 bg-zinc-900">
          <p className="text-white/70 text-sm">
            End of{" "}
            {currentChapter?.chapter
              ? `Chapter ${currentChapter.chapter}`
              : "Chapter"}
          </p>
          <div className="flex gap-3">
            {prevChapter && (
              <Link href={`/read/${mangaId}/batoto/${prevChapter.id}`}>
                <Button variant="outline" className="gap-2">
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    Ch. {prevChapter.chapter || "Prev"}
                  </span>
                  <span className="sm:hidden">Prev</span>
                </Button>
              </Link>
            )}
            {nextChapter && (
              <Link href={`/read/${mangaId}/batoto/${nextChapter.id}`}>
                <Button className="gap-2">
                  <span className="hidden sm:inline">
                    Ch. {nextChapter.chapter || "Next"}
                  </span>
                  <span className="sm:hidden">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
          {!nextChapter && (
            <p className="text-white/50 text-xs">
              You&apos;ve reached the latest chapter!
            </p>
          )}
          <Link href={`/manga/${mangaId}`}>
            <Button variant="ghost" className="text-white/60 hover:text-white">
              Back to Manga Details
            </Button>
          </Link>
        </div>
      </div>

      {/* Bottom Navigation Controls */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-black/90 to-transparent pt-8 pb-safe"
          >
            <div className="flex items-center justify-between px-4 py-3">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20 gap-2 min-w-[80px] sm:min-w-[100px]"
                disabled={!prevChapter}
                onClick={() =>
                  prevChapter &&
                  router.push(`/read/${mangaId}/batoto/${prevChapter.id}`)
                }
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Prev</span>
              </Button>

              <div className="text-white/70 text-xs sm:text-sm text-center">
                <span className="font-medium text-white">
                  Ch. {currentChapter?.chapter || "?"}
                </span>
                <span className="mx-1">·</span>
                <span>{pagesData.pages.length} pages</span>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20 gap-2 min-w-[80px] sm:min-w-[100px]"
                disabled={!nextChapter}
                onClick={() =>
                  nextChapter &&
                  router.push(`/read/${mangaId}/batoto/${nextChapter.id}`)
                }
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// =============================================================================
// READER IMAGE COMPONENT
// =============================================================================

function BatotoReaderImage({
  src,
  alt,
  index,
  total,
}: {
  src: string;
  alt: string;
  index: number;
  total: number;
  // Note: referer header cannot be set from client-side img tags
  // If images require referer, we'd need to proxy them through an API route
  referer?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  return (
    <div className="relative w-full max-w-4xl">
      {!loaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 min-h-[300px]">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-white/50" />
            <span className="text-white/50 text-xs">
              {index + 1} / {total}
            </span>
          </div>
        </div>
      )}
      {error ? (
        <div className="flex items-center justify-center bg-zinc-900 min-h-[300px] text-white/50">
          <div className="flex flex-col items-center gap-2">
            <ImageOff className="h-8 w-8" />
            <span className="text-xs">Failed to load page {index + 1}</span>
          </div>
        </div>
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          className={`w-full h-auto transition-opacity duration-300 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
          loading={index < 3 ? "eager" : "lazy"}
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          // Referrer policy to help with some image loading
          referrerPolicy="no-referrer"
        />
      )}
    </div>
  );
}

