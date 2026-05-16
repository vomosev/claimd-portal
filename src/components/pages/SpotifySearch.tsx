// src/components/pages/SpotifySearch.tsx
"use client";

import { useState, useEffect } from "react";
import Head from "next/head";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

// Keep all your interfaces the same...
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

interface TrackData {
  artist_id: string;
  artist_name: string;
  release_title: string;
  track_title: string;
  type: string;
  image_url: string;
  popularity?: number;
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

export default function SpotifySearch(): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState<string>("");
  const [type, setType] = useState<SearchType>("artist");
  const [results, setResults] = useState<(SpotifyArtist | SpotifyTrack)[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [existingArtistIds, setExistingArtistIds] = useState<string[]>([]);
  const [existingTrackIds, setExistingTrackIds] = useState<string[]>([]);
  const [selectedTracks, setSelectedTracks] = useState<string[]>([]);
  const [error, setError] = useState<string>("");
  const [returnTo, setReturnTo] = useState<string>("");
  const [linkedAwardId, setLinkedAwardId] = useState<string>("");
  const [linkMode, setLinkMode] = useState<string>("");
  const [maxLinksReached, setMaxLinksReached] = useState(false);
  const [currentLinkCount, setCurrentLinkCount] = useState(0);
  const [existingSpotifyLinks, setExistingSpotifyLinks] = useState<
    SpotifyLinkDetail[]
  >([]);
  const [loadingExistingLinks, setLoadingExistingLinks] = useState(false);
  const [username, setUsername] = useState<string>("");
  const [cssLoading, setCssLoading] = useState(false);

  // Function to inject entire stylesheet dynamically into the page
  const injectCSS = async (cssText: string) => {
    try {
      // Create and inject new style element with the entire stylesheet
      const styleElement = document.createElement("style");
      styleElement.textContent = cssText;
      document.head.appendChild(styleElement);

      console.log(`Stylesheet injected successfully`);
    } catch (error) {
      console.error("Error injecting stylesheet:", error);
    }
  };

  // Function to fetch and apply CSS
  const worldId = process.env.NEXT_PUBLIC_WORLDID || "0";
  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL || "https://nodejs.gridiron-app.com";

  const fetchAndApplyCSS = async () => {
    setCssLoading(true);
    try {
      const response = await fetch(`${apiUrl}/target-css/${worldId}`, {
        headers: {
          Accept: "text/css,*/*",
        },
      });

      const cssText = await response.text();
      console.log(`>>>>>>>>>> ${apiUrl}/target-css/${worldId}`, "cssText");

      // Extract only the CSS values, removing HTML tags if any
      const cleanCssText = cssText.replace(/<[^>]*>/g, "");

      // Inject CSS into the page immediately
      injectCSS(cleanCssText);

      // Log the clean CSS text for debugging
      console.log(">>>>>>>>>> CSS injected successfully", "cleanCssText");
    } catch (error) {
      console.error("Error fetching CSS:", error);
    } finally {
      setCssLoading(false);
    }
  };

  const [count, setCount] = useState(0);
  useEffect(() => {
    setCount(count + 1); // Runs once after mount
    fetchAndApplyCSS();
  }, []); // Empty dependency array

  // Handle localStorage access safely
  useEffect(() => {
    const storedUsername = localStorage.getItem("username");
    if (storedUsername) {
      setUsername(storedUsername);
    }
  }, []);

  const checkCurrentLinkCount = async (awardId: string) => {
    try {
      const response = await fetch(`${apiUrl}/award-spotify-links/${awardId}`);
      if (response.ok) {
        const data = await response.json();
        const currentCount = data.links ? data.links.length : 0;
        setCurrentLinkCount(currentCount);
        if (currentCount >= 5) {
          setMaxLinksReached(true);
        } else {
          setMaxLinksReached(false);
        }
      }
    } catch (error) {
      console.error("Error checking link count:", error);
    }
  };

  // Function to fetch existing Spotify links for the award
  const fetchExistingSpotifyLinks = async (awardId: string) => {
    setLoadingExistingLinks(true);
    try {
      const response = await fetch(`${apiUrl}/award-spotify-links/${awardId}`);
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

  // Function to remove a Spotify link
  const handleRemoveSpotifyLink = async (spotifyId: string) => {
    if (!linkedAwardId || linkedAwardId === "new") return;

    try {
      const response = await fetch(
        `${apiUrl}/award-spotify-links/${linkedAwardId}/${spotifyId}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        // Remove from local state
        setExistingSpotifyLinks((prev) =>
          prev.filter((link) => link.spotify_id !== spotifyId)
        );
        // Update link count
        setCurrentLinkCount((prev) => prev - 1);
        setMaxLinksReached(false);
      } else {
        throw new Error("Failed to remove link");
      }
    } catch (error) {
      console.error("Error removing Spotify link:", error);
      setError("Failed to remove Spotify link");
    }
  };

  useEffect(() => {
    const queryParam = searchParams.get("query");
    const typeParam = searchParams.get("type") as SearchType;
    const returnToParam = searchParams.get("returnTo");
    const awardIdParam = searchParams.get("awardId");
    const modeParam = searchParams.get("mode");

    if (returnToParam) {
      setReturnTo(returnToParam);
    }
    if (awardIdParam) {
      setLinkedAwardId(awardIdParam);
    }
    if (modeParam) {
      setLinkMode(modeParam);
    }

    if (queryParam) {
      setQuery(queryParam);
      setType(typeParam || "artist");
      handleSearch(queryParam, typeParam || "artist");
    }

    // Check current link count if linking to an award
    if (
      returnToParam === "award-form" &&
      awardIdParam &&
      awardIdParam !== "new"
    ) {
      checkCurrentLinkCount(awardIdParam);
      fetchExistingSpotifyLinks(awardIdParam);
    }
  }, [searchParams]);

  // Load initial data from URL params
  useEffect(() => {
    const queryParam = searchParams.get("query");
    const typeParam = searchParams.get("type") as SearchType;

    if (queryParam) {
      setQuery(queryParam);
      setType(typeParam || "artist");
      handleSearch(queryParam, typeParam || "artist");
    }
  }, [searchParams]);

  const handleSearch = async (
    searchQuery: string = query,
    searchType: SearchType = type
  ): Promise<void> => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError("");

    try {
      console.log("Making request to:", `${apiUrl}/spotify-search`);

      const response = await fetch(`${apiUrl}/spotify-search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: searchQuery,
          type: searchType,
        }),
      });

      console.log("Response status:", response.status);
      console.log("Response headers:", response.headers);

      // Check if the response is actually JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const textResponse = await response.text();
        console.error("Non-JSON response:", textResponse);
        throw new Error(
          `Server returned ${response.status}: Expected JSON but got ${contentType}`
        );
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data: SearchResponse = await response.json();
      console.log("Search response:", data);

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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    const params = new URLSearchParams();
    params.set("query", query);
    params.set("type", type);
    router.push(`/dashboard/spotify?${params.toString()}`);
    handleSearch();
  };

  const handleAddArtist = async (artist: SpotifyArtist): Promise<void> => {
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
        // Add award linking if applicable
        ...(returnTo === "award-form" &&
          linkedAwardId !== "new" && {
            award_id: linkedAwardId,
          }),
      };

      const response = await fetch(`${apiUrl}/spotify-add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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

        // Update link count after successful addition
        if (returnTo === "award-form" && linkedAwardId !== "new") {
          const newCount = currentLinkCount + 1;
          setCurrentLinkCount(newCount);
          if (newCount >= 5) {
            setMaxLinksReached(true);
          }
          // Refresh existing links to show the new addition
          fetchExistingSpotifyLinks(linkedAwardId);
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add artist");
      }
    } catch (error) {
      console.error("Add artist error:", error);
      setError(error instanceof Error ? error.message : "Failed to add artist");
    }
  };

  const handleTrackSelection = (trackId: string): void => {
    setSelectedTracks((prev) =>
      prev.includes(trackId)
        ? prev.filter((id) => id !== trackId)
        : [...prev, trackId]
    );
  };

  const handleAddTracks = async (): Promise<void> => {
    if (selectedTracks.length === 0) return;

    try {
      const requestBody = {
        tracks: selectedTracks,
        // Add award linking if applicable
        ...(returnTo === "award-form" &&
          linkedAwardId !== "new" && {
            award_id: linkedAwardId,
          }),
      };

      const response = await fetch(`${apiUrl}/spotify-add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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

        // Update link count after successful addition
        if (returnTo === "award-form" && linkedAwardId !== "new") {
          const newCount = currentLinkCount + selectedTracks.length;
          setCurrentLinkCount(newCount);
          if (newCount >= 5) {
            setMaxLinksReached(true);
          }
          // Refresh existing links to show the new additions
          fetchExistingSpotifyLinks(linkedAwardId);
        }

        setSelectedTracks([]);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add tracks");
      }
    } catch (error) {
      console.error("Add tracks error:", error);
      setError(error instanceof Error ? error.message : "Failed to add tracks");
    }
  };

  const handleReturnToAwardForm = () => {
    if (linkedAwardId === "new") {
      // For new awards, return to add form
      router.push("/dashboard/awards/add?from=spotify");
    } else {
      // For existing awards, return to edit form
      const searchParams = new URLSearchParams();
      searchParams.set("from", "spotify");
      if (linkMode) {
        searchParams.set("mode", linkMode);
      }
      router.push(
        `/dashboard/edit-award/${linkedAwardId}?${searchParams.toString()}`
      );
    }
  };

  // Type guards
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

  return (
    <>
      <Head>
        <title>Spotify Search - Artists & Tracks</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="container mx-auto px-4 py-8">
        {/* <h1 className="text-xl md:text-3xl font-bold mb-8"></h1> */}
        <h1 className="text-xl md:text-3xl font-semibold flex items-center justify-between mb-4 logo-wrapper">
          Search For Artists/Tracks on Spotify
          <div className="flex gap-2">
            {returnTo === "award-form" && (
              <Button
                onClick={handleReturnToAwardForm}
                className="flex items-center mb-4"
              >
                Return to Geo Drop Form
              </Button>
            )}
            <Button
              onClick={() => router.back()}
              variant="outline"
              className="flex items-center mb-4"
            >
              <ChevronLeft />
              Back
            </Button>
          </div>
        </h1>

        {returnTo === "award-form" && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-blue-900">
                  Linking Spotify Content to Geo Drop
                </h3>
                <p className="text-sm text-blue-700 mt-1">
                  {linkedAwardId === "new"
                    ? "Adding content for new Geo Drop"
                    : `Adding content for Geo Drop ID: ${linkedAwardId}`}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Maximum 5 links allowed per Geo Drop
                </p>
              </div>
              <div className="bg-yellow-100 border border-yellow-300 rounded px-3 py-1">
                <span className="text-xs text-yellow-800 font-medium">
                  {currentLinkCount}/5 Links
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Existing Spotify Links Section */}
        {returnTo === "award-form" && linkedAwardId !== "new" && (
          <div className="bg-gray-500 border border-gray-200 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-gray-900 mb-3">
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
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    {/* Image */}
                    <div className="flex-shrink-0">
                      <img
                        src={link.image_url || "/images/music-track.jpg"}
                        alt={link.display_name}
                        className="w-10 h-10 rounded object-cover bg-gray-200"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "/images/music-track.jpg";
                        }}
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-grow min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm truncate text-gray-900">
                          {link.display_name}
                        </h4>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {link.link_type}
                        </span>
                      </div>
                      {link.track_title && (
                        <p className="text-xs text-gray-600 truncate">
                          {link.track_title}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
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
                        onClick={() => handleRemoveSpotifyLink(link.spotify_id)}
                        className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
                        title="Remove link"
                      >
                        <svg
                          className="w-3 h-3"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">
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

        <div className="search-container">
          <form onSubmit={handleSubmit} className="search-form mb-6">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <div className="flex-grow min-w-0">
                <input
                  type="text"
                  value={query}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setQuery(e.target.value)
                  }
                  placeholder="Search for artists or tracks..."
                  className="form-control w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="flex-shrink-0 bg-white">
                <select
                  value={type}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setType(e.target.value as SearchType)
                  }
                  className="form-select px-3 py-2 border border-gray-300 text-black rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="artist">Artists</option>
                  <option value="track">Tracks</option>
                </select>
              </div>

              <div className="flex-shrink-0">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-info px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
                >
                  {loading ? "Searching..." : "Search"}
                </button>
              </div>
            </div>
          </form>

          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Searching Spotify...</p>
              </div>
            </div>
          )}

          {!loading && query && results.length > 0 && (
            <>
              <h2 className="text-2xl font-semibold mb-4">
                Search Results for &quot;{query}&quot;
              </h2>

              {type === "artist" ? (
                <div className="results-container grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {results.map((item) => {
                    if (!isArtist(item)) return null;

                    const artist = item;
                    const imageUrl =
                      artist.images?.[0]?.url ||
                      "https://nodejs.gridiron-app.com/images/diggad_logo.png";
                    const isExisting = existingArtistIds.includes(artist.id);

                    return (
                      <div
                        key={artist.id}
                        className="result-card bg-white rounded-lg shadow-md p-4"
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
                        <div className="result-title font-semibold text-lg mb-1">
                          {artist.name}
                        </div>
                        <div className="result-subtitle text-gray-600 mb-3">
                          Followers:{" "}
                          {artist.followers?.total?.toLocaleString() || 0}
                        </div>
                        <button
                          onClick={() => handleAddArtist(artist)}
                          disabled={isExisting || maxLinksReached}
                          className={`action-button w-full py-2 px-4 rounded-md ${
                            isExisting || maxLinksReached
                              ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                              : "bg-black text-white hover:bg-gray-600"
                          }`}
                        >
                          {isExisting
                            ? "Already Added"
                            : maxLinksReached
                            ? "Max Links Reached"
                            : "Add Artist"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <>
                  <div className="results-container grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
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
                          className="result-card bg-white rounded-lg shadow-md p-4"
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
                          <div className="result-title font-semibold text-lg mb-1">
                            {track.name}
                          </div>
                          <div className="result-subtitle text-gray-600 mb-3">
                            {track.artists?.map((a) => a.name).join(", ")}
                            <br />
                            {track.album?.name}
                          </div>

                          {!isExisting ? (
                            <label
                              className={`action-checkbox-button flex items-center justify-center w-full py-2 px-4 border-2 border-dashed rounded-md cursor-pointer ${
                                maxLinksReached
                                  ? "border-gray-200 bg-gray-100 cursor-not-allowed opacity-50"
                                  : "border-gray-300 hover:border-blue-500"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleTrackSelection(track.id)}
                                className="mr-2"
                                disabled={maxLinksReached && !isSelected}
                              />
                              <span
                                className={`button-text ${
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
                            <span className="action-checkbox-button text-black flex items-center justify-center w-full py-2 px-4 bg-gray-400 text-gray-600 rounded-md">
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
                      className="btn btn-success bg-green-500 text-white px-6 py-3 rounded-md hover:bg-green-600 font-semibold"
                    >
                      Add Selected Tracks ({selectedTracks.length})
                    </button>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
