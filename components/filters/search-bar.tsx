"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Search, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryStates, parseAsString } from "nuqs";

const DEBOUNCE_DELAY = 500;

export function SearchBar() {
  const [search, setSearch] = useQueryStates(
    { q: parseAsString.withDefault("") },
    { shallow: false }
  );

  const [localValue, setLocalValue] = useState(() => search.q || "");
  const [isDebouncing, setIsDebouncing] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInternalUpdateRef = useRef(false);

  // Sync from URL to local state when URL changes externally (e.g., browser navigation)
  // Using a ref to track internal updates to avoid sync loops
  // This is a valid pattern for syncing external state (URL params) to local state for controlled inputs
  useEffect(() => {
    if (!isInternalUpdateRef.current) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocalValue(search.q || "");
    }
    isInternalUpdateRef.current = false;
  }, [search.q]);

  const debouncedSetSearch = useCallback(
    (value: string) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      if (value.trim()) {
        setIsDebouncing(true);
      }

      debounceTimerRef.current = setTimeout(() => {
        setIsDebouncing(false);
        isInternalUpdateRef.current = true;
        setSearch({ q: value.trim() || null });
      }, DEBOUNCE_DELAY);
    },
    [setSearch]
  );

  const handleSearch = (value: string) => {
    setLocalValue(value);
    debouncedSetSearch(value);
  };

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const clearSearch = () => {
    setLocalValue("");
    setIsDebouncing(false);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    isInternalUpdateRef.current = true;
    setSearch({ q: null });
  };

  return (
    <div className="relative w-full">
      <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors sm:left-4" />
      <Input
        type="text"
        placeholder="Search for manga..."
        value={localValue}
        onChange={(e) => handleSearch(e.target.value)}
        className="w-full pl-10 pr-12 sm:pl-11 sm:pr-14 h-11 sm:h-12 text-base rounded-xl border-border/60 transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
      <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-1.5 sm:right-2">
        {isDebouncing && localValue && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
        {localValue && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg hover:bg-destructive/10 hover:text-destructive active:bg-destructive/20 transition-colors"
            onClick={clearSearch}
            type="button"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

