import Image from "next/image";
import { Button } from "@/components/ui/button";
import dummyLogo from "@/assets/dummy-card-logo.png";
import dummyImg from "@/assets/dummy-card-image.png";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import moment from "moment";
import { claimedAwards } from "../pages/MantlePiecePage";
import { useEffect, useState } from "react";

export default function MantlePieceCard({ award }: { award: claimedAwards }) {
  const formattedDate = moment(award.created_at).format("DD MMMM YYYY");
  const router = useRouter();
  const pathname = usePathname();
  const isCorrectUrl = /\bhttps?:\/\/(?:www\.)?[^\s/$.?#].[^\s]*\b/;
  const [displayName, setDisplayName] = useState<string>("");
  const [loadingDisplayName, setLoadingDisplayName] = useState(true);

  // Check if we're on a public profile page (dynamic route like /[displayName] or /mantlepiece)
  const isPublicProfile =
    pathname === "/mantlepiece" ||
    (pathname.startsWith("/") &&
      !pathname.startsWith("/dashboard") &&
      !pathname.startsWith("/mantlepiece"));

  // Fetch display name for the user
  useEffect(() => {
    const fetchDisplayName = async () => {
      if (award.userid && isPublicProfile) {
        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/users/${award.userid}/display-name`
          );
          const data = await response.json();

          if (data.success && data.displayName) {
            setDisplayName(data.displayName);
          } else {
            // Fallback to userid if no display name
            setDisplayName("N/A");
          }
        } catch (error) {
          console.error("Error fetching display name:", error);
          // Fallback to userid
          setDisplayName(award.userid);
        } finally {
          setLoadingDisplayName(false);
        }
      } else {
        // For private pages, show the email
        setDisplayName(award.userid || "Unknown");
        setLoadingDisplayName(false);
      }
    };

    fetchDisplayName();
  }, [award.userid, isPublicProfile]);

  return (
    <div
      className="bg-white dark:bg-[#151E3A] dark:border dark:border-[#2D385B] rounded-[10px] p-4 w-full cursor-pointer"
      onClick={() => {
        if (isPublicProfile) {
          // For public profiles, navigate to a public view page
          router.push(`/award-details/${award.awardid}/${displayName}`);
        } else {
          // For private mantlepiece, use the existing dashboard route
          router.push(
            `/dashboard/award-details/${award.awardid}?mantlepiece=true`
          );
        }
      }}
    >
      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        <Image
          src={dummyLogo}
          alt="Logo"
          width={50}
          height={50}
          className="rounded-full"
        />
        <div>
          <h2 className="font-extrabold tracking-normal leading-[1.2] pr-10">
            {award.assetname === "Not found"
              ? "TBC"
              : !award.assetname
              ? "TBC"
              : award.assetname}
          </h2>
          <p className="text-xs text-[#8E91A0] dark:text-[#9CB0DA] mt-0.5 font-semibold">
            {award.name === "Not found"
              ? "TBC"
              : !award.name
              ? "TBC"
              : award.name}
          </p>
        </div>
      </div>
      {/* Drop Image */}
      <div className="overflow-hidden rounded-[10px]">
        <Image
          src={
            award.awardimg
              ? `${
                  isCorrectUrl.test(award.awardimg)
                    ? award.awardimg
                    : process.env.NEXT_PUBLIC_API_URL + award.awardimg
                }`
              : dummyImg
          }
          alt={award.assetname || "Drop Image"}
          width={1000}
          height={1000}
          className="w-full h-[250px] object-cover"
          unoptimized
        />
      </div>
      {/* Claimed Avatars */}
      <div className="flex items-center justify-between ">
        <div className="text-[13px] text-[#B6B9C8] dark:text-[#9CB0DA] font-semibold">
          <p>
            <span className="p-[10px]"></span>
          </p>
          <p>
            Issued to:{" "}
            <span className="dark:text-white">
              {loadingDisplayName ? (
                <span className="inline-block w-20 h-4 bg-gray-300 dark:bg-gray-600 animate-pulse rounded"></span>
              ) : (
                displayName
              )}
            </span>
          </p>
          <p>
            Issued on: <span className="dark:text-white">{formattedDate}</span>
          </p>
          <p>
            Drop ID: <span className="dark:text-white">{award.awardid}</span>
          </p>
        </div>
        {/* Buttons */}
        <div className="flex gap-1.5">
          <Button
            size="sm"
            className="bg-clgeodrops hover:opacity-60 duration-200 ease-in-out text-white rounded-full geo-claim-button"
          >
            View
          </Button>
        </div>
      </div>
    </div>
  );
}
