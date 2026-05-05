"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Award, geoDropsApi } from "@/services/api";
import { useRouter } from "next/navigation";
import dummyLogo from "@/assets/dummy-card-logo.png";
import dummyImg from "@/assets/dummy-card-image.png";
import { usePathname } from "next/navigation";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";
import moment from 'moment';

export default function GeoDropsCard({
  award,
  claimedIsVisible = true,
}: {
  award?: Award;
  claimedIsVisible?: boolean;
}) {
  const router = useRouter();
  const displayData = award || {
    assetname: "Geo-Drops Asset",
    locationname: "New Location",
    awardimg: "",
    description: "",
  };
  const isCorrectUrl = /\bhttps?:\/\/(?:www\.)?[^\s/$.?#].[^\s]*\b/;
  const [notClaimed, setClaimedStatus] = useState(false);
  const [isCheckingClaim, setIsCheckingClaim] = useState(false);
  const [isClaimLoading, setIsClaimLoading] = useState(false);
  const [isEditLoading, setIsEditLoading] = useState(false);
  const currentUsername = localStorage.getItem("username") ?? "";
  const [role, setUserrole] = useState(null);
  const [adminStatus, setAdminStatus] = useState(false);
  const pathname = usePathname();

  // Check if award is already claimed when component mounts or award changes
  useEffect(() => {
    const checkIfAlreadyClaimed = async () => {
      if (!award?.awardid) {
        console.error("No award ID, skipping check");
        return;
      }

      setAdminStatus(false);

      fetch(`${process.env.NEXT_PUBLIC_API_URL}/getuserrole/${currentUsername}`)
        .then((res) => res.json())
        .then((data) => {
          setUserrole(data.role);
          if ((String(data.role).includes("admin")) || (String(data.role).includes("superuser"))) {
            setAdminStatus(true);
          }
        });

      setIsCheckingClaim(true);

      try {
        const response = await geoDropsApi.getUserClaimedAwardsByID(
          String(currentUsername),
          String(award.awardid)
        );

        // Access the data from the API response
        const currentawards = response.data;

        let isThisAwardClaimed = false;

        if (Array.isArray(currentawards)) {
          // If it's an array, check each item
          isThisAwardClaimed = currentawards.some((claimedAward) => {
            return String(claimedAward.awardid) === String(award.awardid);
          });
        } else if (typeof currentawards === "string") {
          // If it's a string, check if the award ID is included
          isThisAwardClaimed = (currentawards as string[]).includes(
            String(award.awardid)
          );
        } else if (currentawards && typeof currentawards === "object") {
          // If it's an object, check if it has the award ID
          isThisAwardClaimed =
            String((currentawards as any).awardid) === String(award.awardid);
        }

        setClaimedStatus(isThisAwardClaimed);
      } catch (error) {
        console.error(
          `Error checking claimed awards for ${award.awardid}:`,
          error
        );
        setClaimedStatus(false);
      } finally {
        setIsCheckingClaim(false);
      }
    };

    checkIfAlreadyClaimed();
  }, [award?.awardid]);

  const handleCardClick = () => {
    // Only allow card click if buttons are not loading
    if (!isClaimLoading && !isEditLoading) {
      handleClaim();
    }
  };

  const handleClaim = async () => {
    if (!award?.awardid) {
      console.error("No award ID available to claim");
      toast.error("No award ID available");
      return;
    }

    // Prevent multiple clicks
    if (isClaimLoading) return;

    setIsClaimLoading(true);

    let mantlepiecesuffix = !notClaimed ? "?mantlepiece=true" : "";

    try {
      sessionStorage.setItem("lastViewedAward", award.awardid.toString());

      const param =
        pathname === "/public/my-geo-drops" &&
        award.public.toString() === "0"
          ? "?my-geo-drops=true"
          : "";

      router.push(
        `/award-details/${award.awardid}/public`
      );
    } catch (error) {
      console.error("Error during claim process:", error);
      toast.error("Error processing claim");
    }
    // Note: Loading state will be reset when component unmounts during navigation
  };

  const getClaimButtonState = () => {
    if (isClaimLoading) return { text: "Loading...", disabled: true };
    if (isCheckingClaim) return { text: "Checking...", disabled: true };
    if (!notClaimed) return { text: "View the Drop", disabled: false };
    return { text: "Get the Drop", disabled: false };
  };

  const claimButtonState = getClaimButtonState();
  return (
    <div
      className="bg-white dark:bg-[#151E3A] dark:border dark:border-[#2D385B] rounded-[10px] p-4 w-full"
      id={award?.awardid?.toString() ?? ""}
    >
      {/* Header */}
      <div
        className="flex items-start gap-4 mb-4 cursor-pointer"
        onClick={handleCardClick}
      >
        <Image
          src={dummyLogo}
          alt="Logo"
          width={50}
          height={50}
          className="rounded-full"
        />
        <div>
          <h2 className="font-extrabold tracking-normal leading-[1.2] pr-10">
            {displayData.assetname}
          </h2>
          <p className="text-xs text-[#8E91A0] dark:text-[#9CB0DA] mt-0.5 font-semibold">
            {displayData.locationname}
          </p>
        </div>
      </div>

      {/* Drop Image */}
      <div
        className="overflow-hidden rounded-[10px] cursor-pointer"
        onClick={handleCardClick}
      >
        <Image
          src={
            displayData.awardimg
              ? `${
                  isCorrectUrl.test(displayData.awardimg)
                    ? displayData.awardimg
                    : process.env.NEXT_PUBLIC_API_URL + displayData.awardimg
                }`
              : dummyImg
          }
          alt={displayData.assetname || "Drop Image"}
          width={1000}
          height={1000}
          className="w-full aspect-square object-cover"
          unoptimized
          onError={(e) => {
            console.error("Image failed to load:", displayData.awardimg);
            const target = e.target as HTMLImageElement;
            if (target.src !== dummyImg.src) {
              target.src = dummyImg.src;
            }
          }}
          onLoad={() => {}}
        />
      </div>

      {claimedIsVisible && (
        <div className="mt-3">
          <p className="font-extrabold geo-award-id pb-2">Closes on: {award?.finish_date && moment(award.finish_date).format('DD MMMM YYYY')}</p>
          {/* Unlocked Avatars */}
          <div className="flex items-center justify-between">
            {/* Buttons */}
            <div className="flex gap-1.5 justify-between w-full">
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  className="bg-clgeodrops hover:opacity-60 duration-200 ease-in-out text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed geo-claim-button"
                  onClick={handleClaim}
                  disabled={claimButtonState.disabled || isClaimLoading}
                >
                  {isClaimLoading && (
                    <Loader2 size={16} className="animate-spin mr-2" />
                  )}
                  {claimButtonState.text}
                </Button>
              </div>
              {pathname === "/public/my-geo-drops" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full pointer-events-none"
                >
                  {award?.public.toString() === "1" ? "Public" : "Private"}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
