// components/pages/MyActivityPage.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Gift,
  Users,
  Download,
  MapPin,
  X,
  Loader2,
  CheckCircle,
  Trophy,
  Ticket,
  Star,        // ← best for points/rewards
  Coins,       // ← best for currency-style points
  Zap,         // ← good for earned points / energy
  CircleDollarSign, // ← monetary points
  BadgeCheck,  // ← achievement points
  Gem,         // ← premium points
} from "lucide-react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

// import "./css/HomePage.css"; // external CSS 
// Conditionally import CSS only if file exists
try {
  require("./css/HomePage.css");
} catch (error) {
  console.warn("HomePage.css not found, skipping import");
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://nodejs.gridiron-app.com";

// ── Types ──────────────────────────────────────────────────────────────────────

interface ClaimedReward {
  id:          number;
  userid:      string;
  awardid:     string;
  worldid:     number;
  claimed_at?: string;
  assetname?:  string;
  description: string;
  points:      string;
  address:     string;
  rewardid:    string;
}

interface PassDownload {
  award_id:    string;
  awardimg?:   string;
  name?:       string;
  assetname?:  string;
  created_at?: string;
}

interface TeamJoined {
  teamid?:    string | number;
  worldid?:   string | number;
  worldname?: string;
  worldimg?:  string;
  name?:      string;
  joined_at?: string;
}

interface Reward {
  rewardid:    number;
  worldid:     number;
  award_id:    string;
  user_id:     string;
  assetname:   string;
  description: string;
  points:      string;
  public:      string;
}

interface ConfirmedTicket {
  seat_id:     number;
  userid:      string;
  awardid:     string;
  status:      string;
  created_at:  string;
  name:        string;
  awardimg:    string;
  assetname:   string;
  currency:    string;
  price:       string;
  row_label:   string;
  seat_number: string;
  label:       string;
}

// ── Claim reward dialog ────────────────────────────────────────────────────────
interface ClaimDialogProps {
  reward:    Reward;
  username:  string;
  onClose:   () => void;
  onClaimed: () => void;
}

function ClaimDialog({ reward, username, onClose, onClaimed }: ClaimDialogProps) {
  const [address,    setAddress]    = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) {
      toast.error("Please enter a delivery address.");
      return;
    }
    console.log("reward.award_id:",reward.award_id);

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/myrewards`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          userid:      username,
          awardid:     reward.award_id,
          worldid:     reward.worldid,
          rewardid:    reward.rewardid,
          assetname:   reward.assetname,
          description: reward.description,
          points:      reward.points,
          address:     address.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to claim reward");

      toast.success(`Reward claimed! We'll send "${reward.assetname}" to your address.`);
      onClaimed();
      onClose();
    } catch (err: any) {
      console.error("Claim error:", err);
      toast.error(err.message || "Failed to claim reward. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-md rounded-2xl bg-white dark:bg-[#151E3A] border border-gray-200 dark:border-[#2D385B] shadow-2xl p-8 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#5871A7]/10 flex items-center justify-center flex-shrink-0">
              <Gift size={20} className="text-[#5871A7]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                Claim Reward
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {reward.assetname}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
          >
            <X size={14} />
          </button>
        </div>

        {/* Description */}
        {reward.description && (
          <div className="rounded-lg bg-gray-50 dark:bg-[#1A2235] border border-gray-100 dark:border-[#2D385B] px-4 py-3">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {reward.description}
            </p>
          </div>
        )}

        {/* Points */}
        {reward.points && (
          <div className="rounded-lg bg-gray-50 dark:bg-[#1A2235] border border-gray-100 dark:border-[#2D385B] px-4 py-3">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {reward.points}
            </p>
          </div>
        )}

        {/* Address form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <MapPin size={14} className="text-[#5871A7]" />
              Delivery Address
            </label>
            <textarea
              rows={3}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter your full delivery address including postcode / zip code"
              required
              disabled={submitting}
              className="
                w-full px-3 py-2 text-sm rounded-lg resize-y
                border border-gray-300 dark:border-[#2D385B]
                bg-white dark:bg-[#1A2235]
                text-gray-900 dark:text-white
                placeholder-gray-400 dark:placeholder-gray-500
                focus:outline-none focus:ring-2 focus:ring-[#5871A7] focus:border-transparent
                disabled:opacity-60 disabled:cursor-not-allowed
              "
            />
          </div>

          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || !address.trim()}
              className="flex-1 bg-[#5871A7] hover:bg-[#4560A0] text-white geo-claim-button"
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="mr-2 animate-spin" />
                  Claiming…
                </>
              ) : (
                <>
                  <CheckCircle size={14} className="mr-2" />
                  Claim Reward
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Thumbnail helper ───────────────────────────────────────────────────────────
function Thumbnail({ src, alt }: { src?: string; alt: string }) {
  const [errored, setErrored] = useState(false);
  const url = src?.startsWith("http") ? src : src ? `${API_URL}${src}` : null;

  if (!url || errored) {
    return (
      <div className="w-14 h-14 rounded-xl flex-shrink-0 bg-gray-100 dark:bg-gray-800 flex items-center justify-center border border-gray-200 dark:border-gray-700">
        <Gift size={20} className="text-gray-400" />
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      onError={() => setErrored(true)}
      className="w-14 h-14 rounded-xl flex-shrink-0 object-cover border border-gray-200 dark:border-gray-700"
    />
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function MyActivityPage() {
  const router = useRouter();

  // Auth
  const [currentUsername, setCurrentUsername] = useState("");

  // Data
  const [downloads,  setDownloads]  = useState<PassDownload[]>([]);
  const [teams,      setTeams]      = useState<TeamJoined[]>([]);
  const [rewards,    setRewards]    = useState<Reward[]>([]);
  const [tickets,  setTickets]  = useState<ConfirmedTicket[]>([]);
  const [claimedIds, setClaimedIds] = useState<Set<number>>(new Set());

  // Loading
  const [loadingDownloads, setLoadingDownloads] = useState(true);
  const [loadingTeams,     setLoadingTeams]     = useState(true);
  const [loadingRewards,   setLoadingRewards]   = useState(true);
  const [loadingTickets,  setLoadingTickets]    = useState(true);
  const [loadingClaimed,   setLoadingClaimed]   = useState(true);

  const [cssLoading, setCssLoading] = useState(false);
  // Claim dialog
  const [claimTarget, setClaimTarget] = useState<Reward | null>(null);

  const worldId = process.env.NEXT_PUBLIC_WORLDID || "0";
  const [currentPoints, setCurrentPoints] = useState<string | null>(null);
  const [claimedPoints, setClaimedPoints] = useState<string | null>(null);
  const [balancePoints, setBalancePoints] = useState<string | null>(null);

  useEffect(() => {
    if (currentUsername) {
      fetch(`${API_URL}/points/${currentUsername}`)
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

  // ── Read username ────────────────────────────────────────────────────────────
  useEffect(() => {
    const username = localStorage.getItem("username") ?? "";
    setCurrentUsername(username);
  }, []);

  // ── Fetch pass downloads ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUsername) return;
    const load = async () => {
      setLoadingDownloads(true);
      try {
        const res  = await fetch(`${API_URL}/passdownloads/${currentUsername}`);
        const data = await res.json();
        console.log(">>>>>>>>>> /passdownloads/ data:", data);
        setDownloads(Array.isArray(data) ? data : data.downloads ?? []);
      } catch (err) {
        console.error("Error fetching passdownloads:", err);
      } finally {
        setLoadingDownloads(false);
      }
    };
    load();
  }, [currentUsername]);

  // ── Fetch teams joined ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUsername) return;
    const load = async () => {
      setLoadingTeams(true);
      try {
        const res  = await fetch(`${API_URL}/teamsjoined/${currentUsername}`);
        const data = await res.json();
        console.log(">>>>>>>>>> /teamsjoined/ data:", data);
        setTeams(Array.isArray(data) ? data : data.teams ?? []);
      } catch (err) {
        console.error("Error fetching teamsjoined:", err);
      } finally {
        setLoadingTeams(false);
      }
    };
    load();
  }, [currentUsername]);

  // ── Fetch ALL rewards (claimed + unclaimed) ──────────────────────────────────
  // The /rewards endpoint should return every reward the user is eligible for
  // regardless of whether they have already claimed it.
  useEffect(() => {
    if (!currentUsername) return;
    const load = async () => {
      setLoadingRewards(true);
      try {
        const res  = await fetch(`${API_URL}/rewards/${currentUsername}`);
        const data = await res.json();
        setRewards(Array.isArray(data) ? data : data.rewards ?? []);
      } catch (err) {
        console.error("Error fetching rewards:", err);
      } finally {
        setLoadingRewards(false);
      }
    };
    load();
  }, [currentUsername]);

  // ── Fetch confirmed tickets ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUsername) return;
    const load = async () => {
      setLoadingTickets(true);
      try {
        const res  = await fetch(`${API_URL}/confirmedtickets/${currentUsername}`);
        const data = await res.json();
        console.log(">>>>>>>>>> /confirmedtickets/ data:", data);
        setTickets(Array.isArray(data) ? data : data.tickets ?? []);
      } catch (err) {
        console.error("Error fetching confirmedtickets:", err);
      } finally {
        setLoadingTickets(false);
      }
    };
    load();
  }, [currentUsername]);

  // ── Fetch previously claimed rewards ────────────────────────────────────────
  // Used only to mark which rewards have already been claimed.
  useEffect(() => {
    if (!currentUsername) return;
    const load = async () => {
      setLoadingClaimed(true);
      try {
        const res = await fetch(`${API_URL}/claimedrewards/${currentUsername}`);
        if (!res.ok) return;
        const data = await res.json();
        const list: ClaimedReward[] = Array.isArray(data)
          ? data
          : data.rewards ?? data.claimed ?? [];

        setClaimedIds((prev) => {
          const next = new Set(prev);
          list.forEach((r) => { if (r.rewardid) next.add(Number(r.rewardid)); });
          return next;
        });
      } catch (err) {
        console.error("Error fetching claimed rewards:", err);
      } finally {
        setLoadingClaimed(false);
      }
    };
    load();
  }, [currentUsername]);

  // Function to inject entire stylesheet dynamically into the page
  const injectCSS = async (cssText: string) => {
    try {
      const styleElement = document.createElement('style');
      styleElement.textContent = cssText;
      document.head.appendChild(styleElement);
      console.log(`Stylesheet injected successfully`);
    } catch (error) {
      console.error('Error injecting stylesheet:', error);
    }
  };

  const fetchAndApplyCSS = async () => {
    setCssLoading(true);
    try {
      const response = await fetch(`${API_URL}/target-css/${worldId}`, {
        headers: {
          'Accept': 'text/css,*/*',
        },
      });
      
      const cssText = await response.text();
      const cleanCssText = cssText.replace(/<[^>]*>/g, '');
      injectCSS(cleanCssText);
      console.log('>>>>>>>>>> CSS injected successfully');
    } catch (error) {
      console.error('Error fetching CSS:', error);
    } finally {
      setCssLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hostname !== 'app.geo-drops.com') {
      fetchAndApplyCSS();
    }
  }, []);

  // ── Handle successful claim ──────────────────────────────────────────────────
  const handleClaimed = useCallback((rewardId: number) => {
    setClaimedIds((prev) => new Set([...prev, rewardId]));
  }, []);

  // ── Loading skeleton ─────────────────────────────────────────────────────────
  const ListSkeleton = () => (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 dark:border-[#2E4066] animate-pulse"
        >
          <div className="w-14 h-14 rounded-xl bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
            <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );

  // ── Main render ──────────────────────────────────────────────────────────────
  return (
    <div className="lg:w-[85%] space-y-10">

      {/* Claim dialog */}
      {claimTarget && (
        <ClaimDialog
          reward={claimTarget}
          username={currentUsername}
          onClose={() => setClaimTarget(null)}
          onClaimed={() => handleClaimed(claimTarget.rewardid)}
        />
      )}

      {/* Page header */}
      <div>
        <h1 className="text-3xl font-semibold">My Tickets & Rewards</h1>
        <p className="text-sm text-gray-500 mt-1">
          Your downloaded passes, street teams and available rewards
        </p>
      </div>

      <hr className="border-[#D4D8EA] dark:border-[#2E4066]" />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2.5">
          <Star size={20} className="text-[#5871A7]" />
            Available Points: {balancePoints}
            <span className="text-sm font-normal text-gray-400">
              Earned ({currentPoints})
            </span>
            <span className="text-sm font-normal text-gray-400">
              Claimed ({claimedPoints})
            </span>
        </h2>
        <p className="text-sm text-gray-500">
          You can spend or redeem gift vouchers using available points. Contact <strong>info@geo-drops.com</strong> for information.
          {/* You can redeem GBP{Number(currentPoints) / 100} worth of gift vouchers using these points. Contact <strong>info@geo-drops.com</strong> for information. */}
        </p>
      </section>

      <hr className="border-[#D4D8EA] dark:border-[#2E4066]" />

      {/* ── Section 3: Rewards ───────────────────────────────────────────── */}
      {/* Shows ALL rewards — claimed ones get a "Claimed" badge instead of   */}
      {/* the Claim button.  Unclaimed ones stay actionable.                  */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2.5">
          <Trophy size={20} className="text-[#5871A7]" />
          Rewards
          {!loadingRewards && !loadingClaimed && (
            <span className="text-sm font-normal text-gray-400">
              ({rewards.length})
            </span>
          )}
        </h2>
        <p className="text-sm text-gray-500">
          All rewards you are eligible for (which will deduct the points shown). Unclaimed rewards can be requested
          for delivery by clicking <strong>Claim</strong>.
        </p>

        {/* Summary pills */}
        {!loadingRewards && !loadingClaimed && rewards.length > 0 && (
          <div className="flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-xs bg-[#5871A7]/10 text-[#5871A7] px-3 py-1.5 rounded-full font-medium">
              <Trophy size={12} />
              {rewards.length} total
            </span>
            {claimedIds.size > 0 && (
              <span className="inline-flex items-center gap-1.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1.5 rounded-full font-medium">
                <CheckCircle size={12} />
                {claimedIds.size} claimed
              </span>
            )}
            {rewards.length - claimedIds.size > 0 && (
              <span className="inline-flex items-center gap-1.5 text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-3 py-1.5 rounded-full font-medium">
                <Gift size={12} />
                {rewards.length - claimedIds.size} unclaimed
              </span>
            )}
          </div>
        )}

        {loadingRewards || loadingClaimed ? (
          <ListSkeleton />
        ) : rewards.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 dark:border-[#2E4066] p-8 text-center geo-card-body bg-clgeodrops">
            <Trophy size={28} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
            <p className="text-sm text-gray-400">No rewards available right now.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 dark:border-[#2E4066] overflow-hidden geo-card-body bg-clgeodrops">

            {/* Table header */}
            <div className="grid grid-cols-[1fr_2fr_auto] gap-4 px-5 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-[#2E4066] text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <span>Reward</span>
              <span>Description</span>
              <span className="text-right">Status</span>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-[#2E4066]">
              {rewards.map((reward) => {
                const isClaimed = claimedIds.has(reward.rewardid);
                return (
                  <div
                    key={reward.rewardid}
                    className="grid grid-cols-[1fr_2fr_auto] gap-4 items-center px-5 py-4 bg-white dark:bg-[#151E3A] hover:bg-gray-50 dark:hover:bg-gray-800/30"
                    // higlights claimed lines specifically
                    // className={`
                    //   grid grid-cols-[1fr_2fr_auto] gap-4 items-center px-5 py-4
                    //   transition-colors
                    //   ${isClaimed
                    //     ? "bg-green-50/40 dark:bg-green-900/10"
                    //     : "bg-white dark:bg-[#151E3A] hover:bg-gray-50 dark:hover:bg-gray-800/30"
                    //   }
                    // `}
                  >
                    {/* Name + ID */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="font-medium text-gray-800 dark:text-white truncate">
                          {reward.assetname || "Reward"}
                        </p>
                      </div>
                      <p className="text-xs font-mono text-gray-400 mt-0.5">
                      Drop ID:{" "}
                      <a
                        href={`/dashboard/award-details/${reward.award_id}`}
                        className="text-[#5871A7] hover:underline"
                      >
                        <b>{reward.award_id}</b>
                      </a> Points: {reward.points} Reward ID: {reward.rewardid} 
                      </p>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {reward.description}
                    </p>

                    {/* Action / status */}
                    <div className="flex justify-end">
                      {isClaimed ? (
                        /* ── Already claimed ─────────────────────────────── */
                        <span className="inline-flex items-center gap-1.5 text-xs text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-3 py-1.5 rounded-full font-medium whitespace-nowrap">
                          <CheckCircle size={12} />
                          Claimed
                        </span>
                      ) : (
                        /* ── Available to claim ──────────────────────────── */
                        <Button
                          size="sm"
                          onClick={() => setClaimTarget(reward)}
                          disabled={(Number(balancePoints)) < Number(reward.points)}
                          className="bg-[#5871A7] hover:bg-[#4560A0] text-white h-8 px-4 text-xs whitespace-nowrap geo-claim-button"
                        >
                          <Gift size={12} className="mr-1.5" />
                          {(Number(balancePoints)) >= Number(reward.points) ? "Claim" : "Insufficient Points"}
                        </Button> 
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <hr className="border-[#D4D8EA] dark:border-[#2E4066]" />

      {/* ── Section 2: Street Teams ───────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2.5">
          <Users size={20} className="text-[#5871A7]" />
          Street Teams Joined
          {!loadingTeams && (
            <span className="text-sm font-normal text-gray-400">
              ({teams.length})
            </span>
          )}
        </h2>

        {loadingTeams ? (
          <ListSkeleton />
        ) : teams.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 dark:border-[#2E4066] p-8 text-center geo-card-body bg-clgeodrops">
            <Users size={28} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
            <p className="text-sm text-gray-400">You haven't joined any street teams yet.</p>
          </div>
        ) : (
          <div className="space-y-3 geo-card-body">
            {teams.map((team, i) => (
              <div
                key={`${team.teamid ?? team.worldid}-${i}`}
                className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 dark:border-[#2E4066] bg-white dark:bg-[#151E3A] hover:shadow-sm transition-shadow"
              >
                <Thumbnail
                  src={team.worldimg}
                  alt={team.worldname || team.name || "Team"}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 dark:text-white truncate">
                    {team.worldname || team.name || "Team"}
                  </p>
                  {team.worldid && (
                    <p className="text-xs font-mono text-gray-400 mt-0.5">
                      Dropsite ID: {team.worldid}
                    </p>
                  )}
                  {team.joined_at && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Joined:{" "}
                      {new Date(team.joined_at).toLocaleDateString("en-GB", {
                        day:   "2-digit",
                        month: "short",
                        year:  "numeric",
                      })}
                    </p>
                  )}
                </div>
                <span className="flex-shrink-0 text-xs bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 px-2.5 py-1 rounded-full font-medium">
                  Team
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <hr className="border-[#D4D8EA] dark:border-[#2E4066]" />

      {/* ── Section 1: Tickets Confirmed ─────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2.5">
          <Ticket size={20} className="text-[#5871A7]" />
          Tickets Bought
          {!loadingTickets && (
            <span className="text-sm font-normal text-gray-400">
              ({tickets.length})
            </span>
          )}
        </h2>

        {loadingTickets ? (
          <ListSkeleton />
        ) : tickets.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 dark:border-[#2E4066] p-8 text-center geo-card-body bg-clgeodrops">
            <Ticket size={28} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
            <p className="text-sm text-gray-400">No tickets bought yet.</p>
          </div>
        ) : (
          <div className="space-y-3 geo-card-body">
            {tickets.map((ticket, i) => (
              <div
                key={`${ticket.awardid}-${i}`}
                className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 dark:border-[#2E4066] bg-white dark:bg-[#151E3A] hover:shadow-sm transition-shadow"
              >
                <Thumbnail src={ticket.awardimg} alt={ticket.name || ticket.awardid} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 dark:text-white truncate">
                    {ticket.name || ticket.assetname || "Pass"}
                  </p>
                  <p className="text-xs font-mono text-gray-400 mt-0.5">
                      Drop ID:{" "}
                      <a
                        href={`/dashboard/award-details/${ticket.awardid}`}
                        className="text-[#5871A7] hover:underline"
                      >
                        <b>{ticket.awardid} - {ticket.assetname} {ticket.currency.toUpperCase()}{ticket.price}</b>
                      </a>
                    </p>
                  {ticket.label && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Seat:{" "}
                      {ticket.label || "Any"}
                    </p>
                  )}
                  {ticket.created_at && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Bought:{" "}
                      {new Date(ticket.created_at).toLocaleDateString("en-GB", {
                        day:   "2-digit",
                        month: "short",
                        year:  "numeric",
                      })}
                    </p>
                  )}
                </div>
                <span className="flex-shrink-0 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-full font-medium">
                  Ticket
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <hr className="border-[#D4D8EA] dark:border-[#2E4066]" />

      {/* ── Section 1: Pass Downloads ─────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2.5">
          <Download size={20} className="text-[#5871A7]" />
          Downloaded Passes
          {!loadingDownloads && (
            <span className="text-sm font-normal text-gray-400">
              ({downloads.length})
            </span>
          )}
        </h2>

        {loadingDownloads ? (
          <ListSkeleton />
        ) : downloads.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 dark:border-[#2E4066] p-8 text-center geo-card-body bg-clgeodrops">
            <Download size={28} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
            <p className="text-sm text-gray-400">No passes downloaded yet.</p>
          </div>
        ) : (
          <div className="space-y-3 geo-card-body">
            {downloads.map((dl, i) => (
              <div
                key={`${dl.award_id}-${i}`}
                className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 dark:border-[#2E4066] bg-white dark:bg-[#151E3A] hover:shadow-sm transition-shadow"
              >
                <Thumbnail src={dl.awardimg} alt={dl.name || dl.award_id} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 dark:text-white truncate">
                    {dl.name || dl.assetname || "Pass"}
                  </p>
                  <p className="text-xs font-mono text-gray-400 mt-0.5">
                      Drop ID:{" "}
                      <a
                        href={`/dashboard/award-details/${dl.award_id}`}
                        className="text-[#5871A7] hover:underline"
                      >
                        <b>{dl.award_id} - {dl.assetname}</b>
                      </a>
                    </p>
                  {dl.created_at && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Downloaded:{" "}
                      {new Date(dl.created_at).toLocaleDateString("en-GB", {
                        day:   "2-digit",
                        month: "short",
                        year:  "numeric",
                      })}
                    </p>
                  )}
                </div>
                <span className="flex-shrink-0 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-full font-medium">
                  Pass
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  );
}