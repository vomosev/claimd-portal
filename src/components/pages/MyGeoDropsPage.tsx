"use client";

import React, { useEffect, useState } from "react";
import GeoDropCard from "../shared/GeoDropCard";
import { Award, geoDropsApi } from "@/services/api";
import { Loader2 } from "lucide-react";
import { usePagination } from "@/hooks/usePagination";
import Pagination from "./Pagination";
import dynamic from 'next/dynamic';

// Import the modal with no SSR
const GeoDropsInstructionsModal = dynamic(
  () => import('@/components/shared/GeoDropsInstructionsModal'),
  { ssr: false }
);

const MyGeoDropsPage = () => {
  const [awards, setAwards] = useState<Award[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentUsername = localStorage.getItem("username") ?? "";

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
        const response = await geoDropsApi.getAllAdminAwards(currentUsername);
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
    <div className="pb-8">
      {Number(process.env.NEXT_PUBLIC_DISTRIBUTION) === 1 && (
        <div className="hidden md:block">
          <GeoDropsInstructionsModal />
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="text-3xl font-semibold">My Drops</h1>
        {awards.length > 0 && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 sm:mt-0">
            {totalItems} Drops created
          </p>
        )}
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

export default MyGeoDropsPage;
