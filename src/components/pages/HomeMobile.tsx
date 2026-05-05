"use client";

import React, { useEffect, useState } from "react";
import GeoDropCard from "../shared/GeoDropCard";
import { Award, geoDropsApi } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Check, Copy, Loader2, Share2, MessageCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import { usePagination } from "@/hooks/usePagination";
import Pagination from "./Pagination";
import dynamic from "next/dynamic";
import toast from "react-hot-toast";

const GeoDropsInstructionsModal = dynamic(
  () => import("@/components/shared/GeoDropsInstructionsModal"),
  { ssr: false }
);

// ── Detect iOS ────────────────────────────────────────────────────────────────
function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

function isMacWithSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Macintosh/.test(navigator.userAgent) && /Safari/.test(navigator.userAgent);
}

// ── Build an iMessage deep-link URL ──────────────────────────────────────────
// sms: with &body= opens Messages and pre-fills the compose field.
// On iOS this opens the Messages app directly.
function buildIMessageUrl(text: string): string {
  return `sms:&body=${encodeURIComponent(text)}`;
}

// ── iMessage share button ─────────────────────────────────────────────────────
interface IMessageButtonProps {
  profileUrl:  string;
  displayname: string;
}

function IMessageShareButton({ profileUrl, displayname }: IMessageButtonProps) {
  const messageText = `Hey! Check out ${displayname}'s Geo-Drops profile 👇\n${profileUrl}`;
  const imessageUrl = buildIMessageUrl(messageText);

  const handleClick = () => {
    // On iOS / macOS Safari — open Messages directly
    if (isIOS() || isMacWithSafari()) {
      window.location.href = imessageUrl;
      return;
    }

    // On Android / other — fall back to native share sheet
    if (navigator.share) {
      navigator.share({
        title: `${displayname}'s Geo-Drops Profile`,
        text:  messageText,
        url:   profileUrl,
      }).catch(() => {});
      return;
    }

    // Final fallback — copy to clipboard
    navigator.clipboard.writeText(profileUrl).then(() => {
      toast.success("Link copied — paste it in your messaging app!");
    }).catch(() => {
      toast.error("Failed to copy link");
    });
  };

  return (
    <Button
      size="sm"
      onClick={handleClick}
      className="
        rounded-full flex items-center gap-2 font-semibold
        bg-[#34C759] hover:bg-[#2db34e]
        text-white
        transition-all duration-200
        shadow-sm hover:shadow-md
      "
      title="Share via iMessage"
    >
      {/* iMessage bubble icon */}
      <MessageCircle size={16} />
      iMessage
    </Button>
  );
}

// ── Shareable link row ────────────────────────────────────────────────────────
interface ShareRowProps {
  profileUrl:  string;
  displayname: string;
}

function ShareRow({ profileUrl, displayname }: ShareRowProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      toast.success("Profile link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${displayname}'s Geo-Drops Profile`,
          text:  `Check out ${displayname}'s Geo-Drops!`,
          url:   profileUrl,
        });
      } catch {
        // User cancelled — ignore
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-2 mb-4">
      {/* URL pill */}
      <div className="
        flex items-center gap-2
        bg-white dark:bg-[#151E3A]
        border border-gray-200 dark:border-[#2D385B]
        rounded-[10px] px-4 py-2.5
        flex-1 max-w-md
      ">
        <Share2 size={16} className="text-clgeodrops flex-shrink-0" />
        <span className="text-sm text-[#8E91A0] dark:text-[#9CB0DA] truncate">
          {profileUrl}
        </span>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">

        {/* ── iMessage — primary CTA ───────────────────────────────────── */}
        <IMessageShareButton
          profileUrl={profileUrl}
          displayname={displayname}
        />

        {/* ── Copy link ─────────────────────────────────────────────────── */}
        <Button
          size="sm"
          onClick={handleCopyLink}
          className="
            bg-clgeodrops hover:opacity-60 duration-200 ease-in-out
            text-white rounded-full flex items-center gap-2
            geo-claim-button
          "
        >
          {copied ? (
            <><Check size={16} /> Copied!</>
          ) : (
            <><Copy size={16} /> Copy Link</>
          )}
        </Button>

        {/* ── Native share (shows on mobile, hidden on desktop) ─────────── */}
        {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
        <Button
            size="sm"
            variant="outline"
            onClick={handleNativeShare}
            className="
            rounded-full
            hover:bg-[#151E3A] dark:text-[#5871A7] hover:text-white
            flex items-center gap-2
            "
        >
            <Share2 size={16} />
            Share
        </Button>
        )}
      </div>
    </div>
  );
}

// ── iMessage invite banner ────────────────────────────────────────────────────
// Shown only on iOS to encourage sharing the profile via Messages
function IMessageInviteBanner({
  profileUrl,
  displayname,
}: {
  profileUrl:  string;
  displayname: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show on iOS and only if they haven't dismissed it
    if (isIOS() && !sessionStorage.getItem("imessage_banner_dismissed")) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const messageText = `Hey! Check out ${displayname}'s Geo-Drops profile 👇\n${profileUrl}`;

  return (
    <div className="
      flex items-start justify-between gap-3
      bg-[#34C759]/8 dark:bg-[#34C759]/12
      border border-[#34C759]/30
      rounded-2xl px-4 py-3 mb-4
    ">
      <div className="flex items-start gap-3">
        {/* iMessage green bubble icon */}
        <div className="
          w-10 h-10 rounded-xl flex-shrink-0
          bg-[#34C759] text-white
          flex items-center justify-center
        ">
          <MessageCircle size={20} />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-800 dark:text-white">
            Share your drops via iMessage
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Tap below to send your profile link directly in Messages.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <a
          href={buildIMessageUrl(messageText)}
          className="
            inline-flex items-center gap-1.5
            bg-[#34C759] hover:bg-[#2db34e]
            text-white text-xs font-bold
            px-3 py-1.5 rounded-full
            transition-colors
          "
        >
          <MessageCircle size={13} />
          Open Messages
        </a>
        <button
          type="button"
          onClick={() => {
            setVisible(false);
            sessionStorage.setItem("imessage_banner_dismissed", "1");
          }}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
const HomePage = () => {
  const [awards,         setAwards]         = useState<Award[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState<string | null>(null);
  const [currentPoints,  setCurrentPoints]  = useState<string | null>(null);
  const [claimedPoints,  setClaimedPoints]  = useState<string | null>(null);
  const [balancePoints,  setBalancePoints]  = useState<string | null>(null);

  const currentUsername = localStorage.getItem("username")    ?? "";
  const displayname     = localStorage.getItem("displayname") ?? "";
  const profileUrl      = `${process.env.NEXT_PUBLIC_GEO_URL}/${displayname}`;

  // ── Fetch points ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUsername) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/points/${currentUsername}`)
      .then((r) => r.json())
      .then((data) => {
        localStorage.setItem("currentpoints", data.totalPoints);
        localStorage.setItem("claimedpoints", data.claimedPoints);
        localStorage.setItem("balancepoints", data.balancePoints);
        setCurrentPoints(data.totalPoints);
        setClaimedPoints(data.claimedPoints);
        setBalancePoints(data.balancePoints);
      })
      .catch((err) => console.error("Error fetching points:", err));
  }, [currentUsername]);

  // ── Fetch awards ──────────────────────────────────────────────────────────
  const {
    currentPage,
    totalPages,
    paginatedData,
    goToPage,
    itemsPerPage,
    totalItems,
  } = usePagination({ data: awards, itemsPerPage: 12, initialPage: 1 });

  useEffect(() => {
    const fetchAwards = async () => {
      try {
        const response = await geoDropsApi.getAllAwards();
        if (response.success && response.data) {
          setAwards(response.data as Award[]);
        } else {
          setError("Failed to fetch awards");
        }
      } catch {
        setError("Error loading awards");
      } finally {
        setLoading(false);
        const targetId = sessionStorage.getItem("lastViewedAward");
        if (targetId) {
          setTimeout(() => {
            document.getElementById(targetId)?.scrollIntoView({
              behavior: "instant",
              block:    "center",
            });
          }, 100);
          sessionStorage.removeItem("lastViewedAward");
        }
      }
    };
    fetchAwards();
  }, []);

  useEffect(() => { goToPage(1); }, [awards]);

  // ── Render guards ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-geodrops" />
          <p className="text-gray-600 dark:text-gray-400">
            Loading latest Drops…
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

      {/* ── Page heading ───────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
        <h1 className="text-3xl font-semibold">Latest Drops</h1>
        {awards.length > 0 && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 sm:mt-0">
            {totalItems} Drops available
          </p>
        )}
      </div>

      {/* ── iMessage invite banner (iOS only) ──────────────────────────── */}
      <IMessageInviteBanner
        profileUrl={profileUrl}
        displayname={displayname}
      />

      {/* ── Share row — iMessage as primary CTA ────────────────────────── */}
      <ShareRow
        profileUrl={profileUrl}
        displayname={displayname}
      />

      {/* ── Awards grid ────────────────────────────────────────────────── */}
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