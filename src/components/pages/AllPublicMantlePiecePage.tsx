// src/components/pages/AllPublicMantlePiecePage.tsx
"use client";
import React, { useEffect, useState } from "react";
import MantlePieceCard from "../shared/MantlePieceCard";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Loader2, Home, LogIn } from "lucide-react";
import { usePagination } from "@/hooks/usePagination";
import Pagination from "./Pagination";

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

const AllPublicMantlePiecePage = () => {
  const [awards, setAwards] = useState<claimedAwards[]>([]);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

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

  // Check if user is logged in
  useEffect(() => {
    const username = localStorage.getItem("username");
    setIsLoggedIn(!!username);
  }, []);

  useEffect(() => {
    const fetchAllPublicAwards = async () => {
      try {
        const res = await axios.get<claimedAwards[]>(
          `${process.env.NEXT_PUBLIC_API_URL}/claimedawardsarray/public`
        );

        setAwards(res.data);
      } catch (err) {
        console.error(err);
        setError("Error loading public awards");
      }
      setLoading(false);
    };

    fetchAllPublicAwards();
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
            Loading public profile....
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
    <div className="p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div className="flex-1">
          <h1 className="text-xl md:text-3xl font-semibold">Public Profile</h1>
          {awards.length > 0 && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              {totalItems} public Geo-Drops
            </p>
          )}
        </div>

        {/* Sign In / Home Button */}
        <div className="flex-shrink-0">
          {isLoggedIn ? (
            <Button
              onClick={() => router.push("/dashboard")}
              variant="outline"
              className="flex items-center gap-2 rounded-full"
            >
              <Home className="w-4 h-4" />
              Home
            </Button>
          ) : (
            <Button
              onClick={() => router.push("/signin")}
              className="flex items-center gap-2 rounded-full bg-clgeodrops hover:opacity-60 duration-200 ease-in-out text-white"
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </Button>
          )}
        </div>
      </div>

      {awards.length < 1 ? (
        <div className="w-full flex flex-col items-center justify-center gap-3 py-60">
          <h3 className="text-2xl font-semibold text-gray-600 dark:text-gray-400">
            No public Drops available yet
          </h3>
          <Button
            className="rounded-full disabled:opacity-50 disabled:cursor-not-allowed 
               bg-clgeodrops hover:opacity-60 duration-200 ease-in-out text-white
            "
            onClick={() => {
              router.push(`/`);
            }}
          >
            Explore Drops
          </Button>
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

export default AllPublicMantlePiecePage;
