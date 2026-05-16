"use client";

import React, { useEffect, useState } from "react";
import GeoDropCard from "../shared/GeoDropCard";
import { Award, geoDropsApi } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Check, Copy, Loader2, Share2 } from "lucide-react";
import { usePathname } from "next/navigation";
import { usePagination } from "@/hooks/usePagination";
import Pagination from "./Pagination";
import dynamic from 'next/dynamic';
import toast from "react-hot-toast";

// Import the modal with no SSR
const GeoDropsInstructionsModal = dynamic(
  () => import('@/components/shared/GeoDropsInstructionsModal'),
  { ssr: false }
);

const HomePage = () => {
  const [awards, setAwards] = useState<Award[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pathName = usePathname();
  const [copied, setCopied] = useState(false);

  const currentUsername = localStorage.getItem("username") ?? "";
  const displayname = localStorage.getItem("displayname") ?? "";

  const profileUrl = `${process.env.NEXT_PUBLIC_GEO_URL}/${displayname}`;
  const [currentPoints, setCurrentPoints] = useState<string | null>(null);
  const [claimedPoints, setClaimedPoints] = useState<string | null>(null);
  const [balancePoints, setBalancePoints] = useState<string | null>(null);

  useEffect(() => {
    if (currentUsername) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/points/${currentUsername}`)
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
  }, [currentUsername]);

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
          title: `${displayname}'s Geo-Drops Profile`,
          text: `Check out ${displayname}'s Geo-Drops!`,
          url: profileUrl,
        });
      } catch (err) {
        console.log("Share cancelled");
      }
    } else {
      handleCopyLink();
    }
  };

  const {
    currentPage,
    totalPages,
    paginatedData,
    goToPage,
    itemsPerPage,
    totalItems,
  } = usePagination({
    data: awards,
    itemsPerPage: 12,
    initialPage: 1,
  });

  useEffect(() => {
    const fetchAwards = async () => {
      try {
        const response = await geoDropsApi.getAllAwards();
        if (response.success && response.data) {
          setAwards(response.data as Award[]);
        } else {
          console.error("API call failed:", response.error);
          setError("Failed to fetch awards");
        }
      } catch (err) {
        console.error("Error fetching awards:", err);
        setError("Error loading awards");
      } finally {
        setLoading(false);
        let targetId = sessionStorage.getItem("lastViewedAward");

        if (targetId) {
          setTimeout(() => {
            const element = document.getElementById(targetId);
            if (element) {
              element.scrollIntoView({
                behavior: "instant",
                block: "center",
              });
            }
          }, 100);
          sessionStorage.removeItem("lastViewedAward");
        }
      }
    };

    fetchAwards();
  }, []);

  // Reset to first page when awards change
  useEffect(() => {
    goToPage(1);
  }, [awards]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-geodrops" />
          <p className="text-gray-600 dark:text-gray-400">
            Loading latest Drops....
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

  return (
    <div>
      {Number(process.env.NEXT_PUBLIC_DISTRIBUTION) === 0 && (
        <div className="hidden md:block">
          <GeoDropsInstructionsModal />
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="text-xl md:text-3xl font-semibold">Latest Drops</h1>
        {awards.length > 0 && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 sm:mt-0">
            {totalItems} Drops available
          </p>
        )}
        {/* Add a button to re-open instructions */}
        {/* <button onClick={() => {
          localStorage.removeItem("geoDropsInstructionsSeen");
          window.location.reload();
        }}>
          Show Instructions
        </button> */}
      </div>

      {/* Shareable Link Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-2 mb-4">
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
                Copy Your Profile Link
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

      {awards.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400">
            No Drops available at the moment.
          </p>
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {paginatedData.map((award) => (
              <GeoDropCard key={award.awardid} award={award} />
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

export default HomePage;
