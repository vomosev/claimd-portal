// src/components/pages/PublicMantlePiecePage.tsx
"use client";
import React, { useEffect, useState } from "react";
import MantlePieceCard from "../shared/MantlePieceCard";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Loader2, Share2, Copy, Check } from "lucide-react";
import { usePagination } from "@/hooks/usePagination";
import Pagination from "./Pagination";
import toast from "react-hot-toast";

export interface claimedAwards {
  id: number;
  awardid: number | null;
  assetglburl: string | null;
  assetusdzurl: string | null;
  googledrive: string | null;
  assettemplate: string | null;
  geolocation: string | null;
  awardimg: string | null;
  description: string | null;
  videolocation: string | null;
  userid: string | null;
  assetname: string | null;
  type: string | null;
  name: string | null;
  certifyingbody: string | null;
  latitude: string | null;
  longitude: string | null;
  allowed_radius: string | null;
  tokenuri: string | null;
  tokenurl: string | null;
  locationname: string | null;
  locationtype: string | null;
  dropname: string | null;
  vertical: string | null;
  textbook: string | null;
  challenge: string | null;
  htmltext: string | null;
  claimedawardurl: string | null;
  redeemed: boolean | null;
  priority: number | null;
  public: number | null;
  created_at: string | null;
}

interface PublicMantlePiecePageProps {
  displayName: string;
}

type ViewMode = "claimed" | "created";

const PublicMantlePiecePage = ({ displayName }: PublicMantlePiecePageProps) => {
  const [claimedAwards, setClaimedAwards] = useState<claimedAwards[]>([]);
  const [createdAwards, setCreatedAwards] = useState<claimedAwards[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("created"); // Changed default to "created"
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<string | null>(null);
  const [claimedPoints, setClaimedPoints] = useState<string | null>(null);
  const [balancePoints, setBalancePoints] = useState<string | null>(null);

  const profileUrl = `${process.env.NEXT_PUBLIC_GEO_URL}/${displayName}`;

  // Get the current awards based on view mode
  const currentAwards = viewMode === "claimed" ? claimedAwards : createdAwards;

  const {
    currentPage,
    totalPages,
    paginatedData,
    goToPage,
    itemsPerPage,
    totalItems,
  } = usePagination({
    data: currentAwards,
    itemsPerPage: 12,
    initialPage: 1,
  });

  useEffect(() => {
    if (displayName) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/pointspublic/${displayName}`)
        .then((res) => res.json())
        .then((data) => {
          localStorage.setItem("currentpoints", data.totalPoints);
          setCurrentPoints(data.totalPoints);
          localStorage.setItem("claimedpoints", data.claimedPoints);
          setClaimedPoints(data.claimedPoints);
          localStorage.setItem("balancepoints", data.balancePoints);
          setBalancePoints(data.balancePoints);
        })
        .catch((err) => {
          console.error("Error fetching currentPoints:", err);
        });
    }
  }, [displayName]);

  useEffect(() => {
    const fetchAwards = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch both claimed and created awards in parallel
        const [claimedRes, createdRes] = await Promise.all([
          axios.get<claimedAwards[]>(
            `${process.env.NEXT_PUBLIC_API_URL}/claimedawards/publicbyuser/${displayName}`
          ),
          axios.get<claimedAwards[]>(
            `${process.env.NEXT_PUBLIC_API_URL}/awards/publicbyuser/${displayName}`
          ),
        ]);

        console.log("Claimed awards:", claimedRes.data);
        console.log("Created awards:", createdRes.data);

        setClaimedAwards(claimedRes.data);
        setCreatedAwards(createdRes.data);
      } catch (err) {
        console.error(err);
        setError("Error loading Geo-Drops");
      } finally {
        setLoading(false);
      }
    };

    if (displayName) {
      fetchAwards();
    }
  }, [displayName]);

  // Reset to first page when view mode or awards change
  useEffect(() => {
    goToPage(1);
  }, [viewMode, currentAwards]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      toast.success("Profile link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy link");
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${displayName}'s Geo-Drops Profile`,
          text: `Check out ${displayName}'s Drops!`,
          url: profileUrl,
        });
      } catch (err) {
        console.log("Share cancelled");
      }
    } else {
      handleCopyLink();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-geodrops" />
          <p className="text-gray-600 dark:text-gray-400">
            Loading {displayName}'s profile....
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="text-geodrops hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  const hasAnyAwards = claimedAwards.length > 0 || createdAwards.length > 0;

  return (
    <div className="p-5">
      <div className="flex flex-col mb-6 mt-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3">
          <h1 className="text-3xl font-semibold">{displayName} has {currentPoints} points</h1>
          {hasAnyAwards && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 sm:mt-0">
              {totalItems} {viewMode === "claimed" ? "unlocked" : "created"} Drops
            </p>
          )}
        </div>

        {/* Shareable Link Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-2">
          <div className="flex items-center gap-2 bg-white dark:bg-[#151E3A] border border-gray-200 dark:border-[#2D385B] rounded-[10px] px-4 py-2.5 flex-1 max-w-md">
            <Share2 size={16} className="text-clgeodrops flex-shrink-0" />
            <span className="text-sm text-[#8E91A0] dark:text-[#9CB0DA] truncate">
              {profileUrl}
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleCopyLink}
              className="bg-clgeodrops hover:opacity-60 duration-200 ease-in-out text-white rounded-full flex items-center gap-2 geo-claim-button"
            >
              {copied ? (
                <>
                  <Check size={16} />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={16} />
                  Copy Link
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleShare}
              className="rounded-full hover:bg-[#151E3A] dark:text-[#5871A7] hover:text-white flex items-center gap-2"
            >
              <Share2 size={16} />
              Share
            </Button>
          </div>
        </div>

        {/* Toggle Buttons */}
        {hasAnyAwards && (
          <div className="flex gap-2 mt-4">
            <Button
              onClick={() => setViewMode("created")}
              className={`rounded-full px-6 transition-all duration-200 ${
                viewMode === "created"
                  ? "bg-clgeodrops text-white hover:opacity-80"
                  : "bg-white dark:bg-[#151E3A] text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-[#2D385B] hover:bg-gray-50 dark:hover:bg-[#1a2847]"
              }`}
            >
              Created ({createdAwards.length})
            </Button>
            <Button
              onClick={() => setViewMode("claimed")}
              className={`rounded-full px-6 transition-all duration-200 ${
                viewMode === "claimed"
                  ? "bg-clgeodrops text-white hover:opacity-80"
                  : "bg-white dark:bg-[#151E3A] text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-[#2D385B] hover:bg-gray-50 dark:hover:bg-[#1a2847]"
              }`}
            >
              Unlocked ({claimedAwards.length})
            </Button>
            {/* <Button
              className="bg-none bg-transparent text-black hover:opacity-80 border-none shadow-none"
            >
              {currentPoints} Moves
            </Button> */}
          </div>
        )}
      </div>

      {!hasAnyAwards ? (
        <div className="w-full flex flex-col items-center justify-center gap-3 py-60">
          <h3 className="text-2xl font-semibold text-gray-600 dark:text-gray-400">
            {displayName} hasn't made any Drops public yet
          </h3>
          <Button
            className="rounded-full disabled:opacity-50 disabled:cursor-not-allowed 
               bg-clgeodrops hover:opacity-60 duration-200 ease-in-out text-white"
            onClick={() => {
              router.push(`/`);
            }}
          >
            Explore Drops
          </Button>
        </div>
      ) : currentAwards.length === 0 ? (
        <div className="w-full flex flex-col items-center justify-center gap-3 py-40">
          <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400">
            No {viewMode === "claimed" ? "unlocked" : "created"} Drops to display
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Try switching to view {viewMode === "claimed" ? "created" : "unlocked"} Drops
          </p>
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {paginatedData.map((award, i) => (
              <MantlePieceCard key={i} award={award} />
            ))}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={goToPage}
            itemsPerPage={itemsPerPage}
            totalItems={totalItems}
          />
        </>
      )}
    </div>
  );
};

export default PublicMantlePiecePage;
