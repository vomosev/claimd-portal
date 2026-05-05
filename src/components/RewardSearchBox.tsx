// dashboard/email-broadcasts/components/RewardSearchBox.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { emailRewardBroadcastApi, RewardSearchResult } from "@/services/emailRewardBroadcastApi";

interface RewardSearchBoxProps {
  value?: string;
  onSelect: (award: RewardSearchResult) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function RewardSearchBox({
  value,
  onSelect,
  placeholder = "Search by Drop ID or name...",
  disabled = false,
}: RewardSearchBoxProps) {
  const [query, setQuery] = useState(value || "");
  const [results, setResults] = useState<RewardSearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState(value || "");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const search = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const data = await emailRewardBroadcastApi.searchRewards(searchQuery.trim());
      setResults(data);
      setIsOpen(data.length > 0);
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setSelectedLabel("");

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 350);
  };

  const handleSelect = (award: RewardSearchResult) => {
    const label = `${award.awardid} — ${award.assetname}`;
    setQuery(label);
    setSelectedLabel(label);
    setIsOpen(false);
    setResults([]);
    onSelect(award);
  };

  const handleClear = () => {
    setQuery("");
    setSelectedLabel("");
    setResults([]);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5871A7] pointer-events-none"
        />
        <Input
          value={query}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled}
          className="pl-9 pr-9"
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isLoading && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#5871A7]" />
          )}
          {query && !isLoading && (
            <button
              type="button"
              onClick={handleClear}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={14} />
            </button>
          )}
          {!query && <ChevronDown size={14} className="text-gray-400" />}
        </div>
      </div>

      {/* Dropdown Results */}
      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-64 overflow-y-auto">
          {results.map((award) => (
            <button
              key={award.awardid}
              type="button"
              onClick={() => handleSelect(award)}
              className="w-full text-left px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors border-b border-gray-100 dark:border-gray-800 last:border-0"
            >
              <div className="flex items-center gap-3">
                {award.awardimg && (
                  <img
                    src={
                      award.awardimg.startsWith("http")
                        ? award.awardimg
                        : `${process.env.NEXT_PUBLIC_API_URL}${award.awardimg || process.env.NEXT_PUBLIC_LOGO_PATH}`
                    }
                    alt={award.assetname}
                    className="w-10 h-10 object-cover rounded-md border border-gray-200 flex-shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">
                    {award.assetname}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    ID: {award.awardid}
                    {award.assetname && (
                      <span> · {award.assetname}</span>
                    )}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {isOpen && !isLoading && results.length === 0 && query.length >= 2 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg px-4 py-3">
          <p className="text-sm text-gray-500">No Drops found for "{query}"</p>
        </div>
      )}
    </div>
  );
}