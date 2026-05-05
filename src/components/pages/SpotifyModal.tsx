// src/components/SpotifyModal.tsx
"use client";

import { useState, useEffect } from "react";
import { X, Search, Music, ExternalLink } from "lucide-react";
import Image from "next/image";

interface SpotifyImage {
  url: string;
  height?: number;
  width?: number;
}

interface SpotifyArtist {
  id: string;
  name: string;
  images?: SpotifyImage[];
  followers?: {
    total: number;
  };
  popularity?: number;
  genres?: string[];
}

interface SpotifyAlbum {
  id: string;
  name: string;
  images?: SpotifyImage[];
}

interface SpotifyTrack {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  album?: SpotifyAlbum;
  popularity?: number;
  duration_ms?: number;
}

interface SearchResponse {
  results: (SpotifyArtist | SpotifyTrack)[];
  existingArtistIds?: string[];
  existingTrackIds?: string[];
}

interface SpotifyLinkDetail {
  link_id: number;
  spotify_id: string;
  link_type: "artist" | "track";
  spotify_url: string;
  display_name: string;
  image_url?: string;
  track_title?: string;
  created_at: string;
}

type SearchType = "artist" | "track";

interface SpotifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  awardId?: number | string | undefined;
  onLinksUpdated?: () => void;
}

export default function SpotifyModal({
  isOpen,
  onClose,
  awardId,
  onLinksUpdated,
}: SpotifyModalProps) {
  const [query, setQuery] = useState<string>("");
  const [type, setType] = useState<SearchType>("artist");
  const [results, setResults] = useState<(SpotifyArtist | SpotifyTrack)[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [existingArtistIds, setExistingArtistIds] = useState<string[]>([]);
  const [existingTrackIds, setExistingTrackIds] = useState<string[]>([]);
  const [selectedTracks, setSelectedTracks] = useState<string[]>([]);
  const [error, setError] = useState<string>("");
  const [maxLinksReached, setMaxLinksReached] = useState(false);
  const [currentLinkCount, setCurrentLinkCount] = useState(0);
  const [existingSpotifyLinks, setExistingSpotifyLinks] = useState<
    SpotifyLinkDetail[]
  >([]);
  const [loadingExistingLinks, setLoadingExistingLinks] = useState(false);
  const [addingArtist, setAddingArtist] = useState<string | null>(null);
  const [addingTracks, setAddingTracks] = useState(false);
  const [removingLink, setRemovingLink] = useState<string | null>(null);

  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL || "https://nodejs.gridiron-app.com";

  // Load existing links when modal opens
  useEffect(() => {
    if (isOpen && awardId && awardId !== "new") {
      fetchExistingSpotifyLinks(String(awardId));
      checkCurrentLinkCount(String(awardId));
    }
  }, [isOpen, awardId]);

  const checkCurrentLinkCount = async (awardIdStr: string) => {
    try {
      const response = await fetch(
        `${apiUrl}/award-spotify-links/${awardIdStr}`
      );
      if (response.ok) {
        const data = await response.json();
        const currentCount = data.links ? data.links.length : 0;
        setCurrentLinkCount(currentCount);
        setMaxLinksReached(currentCount >= 5);
      }
    } catch (error) {
      console.error("Error checking link count:", error);
    }
  };

  const fetchExistingSpotifyLinks = async (awardIdStr: string) => {
    setLoadingExistingLinks(true);
    try {
      const response = await fetch(
        `${apiUrl}/award-spotify-links/${awardIdStr}`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setExistingSpotifyLinks(data.details || []);
        }
      }
    } catch (error) {
      console.error("Error fetching existing Spotify links:", error);
    } finally {
      setLoadingExistingLinks(false);
    }
  };

  const handleRemoveSpotifyLink = async (spotifyId: string) => {
    if (!awardId || awardId === "new") return;

    setRemovingLink(spotifyId);
    try {
      const response = await fetch(
        `${apiUrl}/award-spotify-links/${awardId}/${spotifyId}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        setExistingSpotifyLinks((prev) =>
          prev.filter((link) => link.spotify_id !== spotifyId)
        );
        setCurrentLinkCount((prev) => prev - 1);
        setMaxLinksReached(false);
        if (onLinksUpdated) onLinksUpdated();
      } else {
        throw new Error("Failed to remove link");
      }
    } catch (error) {
      console.error("Error removing Spotify link:", error);
      setError("Failed to remove Spotify link");
    } finally {
      setRemovingLink(null);
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${apiUrl}/spotify-search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, type }),
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server returned non-JSON response");
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data: SearchResponse = await response.json();
      setResults(data.results || []);
      setExistingArtistIds(data.existingArtistIds || []);
      setExistingTrackIds(data.existingTrackIds || []);
    } catch (error) {
      console.error("Search error:", error);
      setError(
        error instanceof Error ? error.message : "An unknown error occurred"
      );
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddArtist = async (artist: SpotifyArtist) => {
    setAddingArtist(artist.id);
    try {
      const requestBody = {
        artist_id: artist.id,
        artist_name: artist.name,
        release_title: "",
        type: "artist",
        image_url:
          artist.images?.[0]?.url ||
          "https://nodejs.gridiron-app.com/images/diggad_logo.png",
        popularity: artist.popularity,
        ...(awardId !== "new" && { award_id: awardId }),
      };

      const response = await fetch(`${apiUrl}/spotify-add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const textResponse = await response.text();
        console.error("Non-JSON response from add artist:", textResponse);
        throw new Error("Server error: Expected JSON response");
      }

      if (response.ok) {
        setExistingArtistIds((prev) => [...prev, artist.id]);
        if (awardId !== "new") {
          const newCount = currentLinkCount + 1;
          setCurrentLinkCount(newCount);
          setMaxLinksReached(newCount >= 5);
          fetchExistingSpotifyLinks(String(awardId));
          if (onLinksUpdated) onLinksUpdated();
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add artist");
      }
    } catch (error) {
      console.error("Add artist error:", error);
      setError(error instanceof Error ? error.message : "Failed to add artist");
    } finally {
      setAddingArtist(null);
    }
  };

  const handleTrackSelection = (trackId: string): void => {
    setSelectedTracks((prev) =>
      prev.includes(trackId)
        ? prev.filter((id) => id !== trackId)
        : [...prev, trackId]
    );
  };

  const handleAddTracks = async () => {
    if (selectedTracks.length === 0) return;

    setAddingTracks(true);
    try {
      const requestBody = {
        tracks: selectedTracks,
        ...(awardId !== "new" && { award_id: awardId }),
      };

      const response = await fetch(`${apiUrl}/spotify-add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const textResponse = await response.text();
        console.error("Non-JSON response from add tracks:", textResponse);
        throw new Error("Server error: Expected JSON response");
      }

      if (response.ok) {
        setExistingTrackIds((prev) => [...prev, ...selectedTracks]);
        if (awardId !== "new") {
          const newCount = currentLinkCount + selectedTracks.length;
          setCurrentLinkCount(newCount);
          setMaxLinksReached(newCount >= 5);
          fetchExistingSpotifyLinks(String(awardId));
          if (onLinksUpdated) onLinksUpdated();
        }
        setSelectedTracks([]);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add tracks");
      }
    } catch (error) {
      console.error("Add tracks error:", error);
      setError(error instanceof Error ? error.message : "Failed to add tracks");
    } finally {
      setAddingTracks(false);
    }
  };

  const isArtist = (
    item: SpotifyArtist | SpotifyTrack
  ): item is SpotifyArtist => {
    return "followers" in item;
  };

  const isTrack = (
    item: SpotifyArtist | SpotifyTrack
  ): item is SpotifyTrack => {
    return "artists" in item && "album" in item;
  };

  if (!isOpen) return null;

  return (
    <>
      <style jsx>{`
        .spotify-modal-content::-webkit-scrollbar {
          width: 10px;
        }

        .spotify-modal-content::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.1);
          border-radius: 10px;
        }

        .spotify-modal-content::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #1db954 0%, #00c1ce 100%);
          border-radius: 10px;
          border: 2px solid rgba(255, 255, 255, 0.2);
        }

        .spotify-modal-content::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #00c1ce 0%, #1db954 100%);
        }

        .dark .spotify-modal-content::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
        }

        .dark .spotify-modal-content::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #1db954 0%, #00c1ce 100%);
          border: 2px solid rgba(0, 0, 0, 0.3);
        }
      `}</style>
      <div
        className="fixed inset-0 flex items-center justify-center p-4"
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          zIndex: 9999,
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
        }}
      >
        <div
          className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          style={{ maxWidth: "72rem", margin: "0 auto" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Music className="text-green-500" />
              Search Spotify
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="spotify-modal-content flex-1 overflow-y-auto p-6">
            {/* Link Status */}
            {awardId !== "new" && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-blue-900 dark:text-blue-100">
                      Linking Spotify Content to Geo Drop
                    </h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      Adding content for Geo Drop ID: {awardId}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      Maximum 5 links allowed per Geo Drop
                    </p>
                  </div>
                  <div className="bg-yellow-100 dark:bg-yellow-900/40 border border-yellow-300 dark:border-yellow-700 rounded px-3 py-1">
                    <span className="text-xs text-yellow-800 dark:text-yellow-200 font-medium">
                      {currentLinkCount}/5 Links
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Existing Links */}
            {awardId !== "new" && (
              <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-6">
                <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
                  Current Spotify Links
                </h3>

                {loadingExistingLinks ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
                  </div>
                ) : existingSpotifyLinks.length > 0 ? (
                  <div className="space-y-2">
                    {existingSpotifyLinks.map((link) => (
                      <div
                        key={link.link_id}
                        className="flex items-center gap-3 p-3 bg-white dark:bg-gray-700 rounded-lg"
                      >
                        <img
                          src={link.image_url || "/images/music-track.jpg"}
                          alt={link.display_name}
                          className="w-10 h-10 rounded object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = "/images/music-track.jpg";
                          }}
                        />
                        <div className="flex-grow min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-sm truncate">
                              {link.display_name}
                            </h4>
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              {link.link_type}
                            </span>
                          </div>
                          {link.track_title && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                              {link.track_title}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={link.spotify_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 bg-green-500 hover:bg-green-600 text-white rounded-full transition-colors"
                            title="Open in Spotify"
                          >
                            <svg
                              className="w-3 h-3"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z" />
                            </svg>
                          </a>
                          <button
                            onClick={() =>
                              handleRemoveSpotifyLink(link.spotify_id)
                            }
                            disabled={removingLink === link.spotify_id}
                            className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative"
                            title="Remove link"
                          >
                            {removingLink === link.spotify_id ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                            ) : (
                              <svg
                                className="w-3 h-3"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path d="M18 6L6 18M6 6l12 12" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                    No Spotify links found for this Geo Drop
                  </p>
                )}
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                <strong>Error:</strong> {error}
              </div>
            )}

            {/* Search Form */}
            <div className="mb-6">
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Search for artists or tracks..."
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                />
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as SearchType)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                >
                  <option value="artist">Artists</option>
                  <option value="track">Tracks</option>
                </select>
                <button
                  onClick={handleSearch}
                  disabled={loading}
                  className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Search size={18} />
                  )}
                  {loading ? "Searching..." : "Search"}
                </button>
              </div>
            </div>

            {/* Loading */}
            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">
                    Searching Spotify...
                  </p>
                </div>
              </div>
            )}

            {/* Results */}
            {!loading && query && results.length > 0 && (
              <>
                <h3 className="text-xl font-semibold mb-4">
                  Search Results for &quot;{query}&quot;
                </h3>

                {type === "artist" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {results.map((item) => {
                      if (!isArtist(item)) return null;

                      const artist = item;
                      const imageUrl =
                        artist.images?.[0]?.url ||
                        "https://nodejs.gridiron-app.com/images/diggad_logo.png";
                      const isExisting = existingArtistIds.includes(artist.id);
                      const isAdding = addingArtist === artist.id;

                      return (
                        <div
                          key={artist.id}
                          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4"
                        >
                          <div className="relative w-full h-48 mb-3">
                            <Image
                              src={imageUrl}
                              alt={artist.name}
                              fill
                              className="object-cover rounded-md"
                              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            />
                          </div>
                          <div className="font-semibold text-lg mb-1">
                            {artist.name}
                          </div>
                          <div className="text-gray-600 dark:text-gray-400 mb-3">
                            Followers:{" "}
                            {artist.followers?.total?.toLocaleString() || 0}
                          </div>
                          <button
                            onClick={() => handleAddArtist(artist)}
                            disabled={isExisting || maxLinksReached || isAdding}
                            className={`w-full py-2 px-4 rounded-md flex items-center justify-center gap-2 ${
                              isExisting || maxLinksReached
                                ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                                : "bg-black text-white hover:bg-gray-600"
                            } ${isAdding ? "opacity-75" : ""}`}
                          >
                            {isAdding ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                <span>Adding...</span>
                              </>
                            ) : isExisting ? (
                              "Already Added"
                            ) : maxLinksReached ? (
                              "Max Links Reached"
                            ) : (
                              "Add Artist"
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                      {results.map((item) => {
                        if (!isTrack(item)) return null;

                        const track = item;
                        const imageUrl =
                          track.album?.images?.[0]?.url ||
                          "/images/default-track.png";
                        const isExisting = existingTrackIds.includes(track.id);
                        const isSelected = selectedTracks.includes(track.id);

                        return (
                          <div
                            key={track.id}
                            className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4"
                          >
                            <div className="relative w-full h-48 mb-3">
                              <Image
                                src={imageUrl}
                                alt={track.name}
                                fill
                                className="object-cover rounded-md"
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                              />
                            </div>
                            <div className="font-semibold text-lg mb-1">
                              {track.name}
                            </div>
                            <div className="text-gray-600 dark:text-gray-400 mb-3">
                              {track.artists?.map((a) => a.name).join(", ")}
                              <br />
                              {track.album?.name}
                            </div>

                            {!isExisting ? (
                              <label
                                className={`flex items-center justify-center w-full py-2 px-4 border-2 border-dashed rounded-md cursor-pointer ${
                                  maxLinksReached
                                    ? "border-gray-200 bg-gray-100 cursor-not-allowed opacity-50"
                                    : "border-gray-300 hover:border-blue-500"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() =>
                                    handleTrackSelection(track.id)
                                  }
                                  className="mr-2"
                                  disabled={maxLinksReached && !isSelected}
                                />
                                <span
                                  className={`${
                                    isSelected
                                      ? "text-blue-600 font-semibold"
                                      : ""
                                  } ${
                                    maxLinksReached && !isSelected
                                      ? "text-gray-900"
                                      : ""
                                  }`}
                                >
                                  {maxLinksReached && !isSelected
                                    ? "Max Links Reached"
                                    : isSelected
                                    ? "Selected"
                                    : "Select Track"}
                                </span>
                              </label>
                            ) : (
                              <span className=" flex items-center justify-center w-full py-2 px-4 bg-gray-400 text-gray-600 rounded-md">
                                Already Added
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {selectedTracks.length > 0 && (
                      <button
                        onClick={handleAddTracks}
                        disabled={addingTracks}
                        className="w-full bg-green-500 text-white px-6 py-3 rounded-md hover:bg-green-600 font-semibold flex items-center justify-center gap-2 disabled:opacity-75"
                      >
                        {addingTracks ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            <span>Adding Tracks...</span>
                          </>
                        ) : (
                          `Add Selected Tracks (${selectedTracks.length})`
                        )}
                      </button>
                    )}
                  </>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-6">
            <button
              onClick={onClose}
              className="w-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-6 py-3 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
