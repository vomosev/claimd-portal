// components/EmailRewardBroadcastForm.tsx
"use client";

import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Gift, MapPin, CheckCircle, Loader2,
  Mail, Save, Send, ArrowLeft, Image as ImageIcon,
  FileText, AlignLeft, Search, X,
  CheckSquare, Square, Users,
} from "lucide-react";
import {
  Form, FormField, FormItem, FormLabel,
  FormControl, FormMessage, FormDescription,
} from "@/components/ui/form";
import { Input }        from "@/components/ui/input";
import { HtmlTextarea } from "@/components/ui/HtmlTextarea";
import { Button }       from "@/components/ui/button";
import toast            from "react-hot-toast";
import {
  EmailBroadcast,
  RewardSearchResult,
  emailRewardBroadcastApi,
} from "@/services/emailRewardBroadcastApi";
import { emailBroadcastApi } from "@/services/emailBroadcastApi";
import RewardSearchBox from "./RewardSearchBox";

// ── Types ──────────────────────────────────────────────────────────────────────
interface EmailBroadcastFormProps {
  mode:         "new" | "edit";
  broadcastId?: number;
}

const schema = z.object({
  awardid:  z.string().min(1, "Award ID is required"),
  subject:  z.string().min(1, "Subject is required").max(500),
  htmltext: z.string().min(1, "Email content is required"),
});

type FormValues = z.infer<typeof schema>;

// ── Claim dialog — rendered at ROOT level outside any <form> ──────────────────
// This is critical — if this is nested inside a <form> the submit button
// will trigger the parent form instead of its own onSubmit handler.
interface ClaimDialogProps {
  recipient:   string;
  awardId:     string;
  worldId?:    string;
  assetName?:  string;
  currentUser: string;
  onClose:     () => void;
  onClaimed:   (recipient: string) => void;
}

function ClaimDialog({
  recipient,
  awardId,
  worldId,
  assetName,
  onClose,
  onClaimed,
}: ClaimDialogProps) {
  const [address,    setAddress]    = useState("");
  const [submitting, setSubmitting] = useState(false);

  // ── Prevent the parent page from scrolling behind the modal ──────────────
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    // Stop ALL propagation — parent form must not see this event
    e.preventDefault();
    e.stopPropagation();

    if (!address.trim()) {
      toast.error("Please enter a delivery address.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/myrewards`,
        {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            userid:      recipient,
            awardid:     awardId,
            worldid:     worldId   || "",
            assetname:   assetName || "",
            description: "",
            address:     address.trim(),
            // points:      0,
            // rewardid:    "",
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to claim reward");

      toast.success(`Reward claimed for ${recipient}!`);
      onClaimed(recipient);
      onClose();
    } catch (err: any) {
      console.error("Claim error:", err);
      toast.error(err.message || "Failed to claim. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    // Backdrop — clicking outside closes the dialog
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onMouseDown={(e) => {
        // Only close if clicking the backdrop itself, not the card
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Dialog card — note: this is a standalone <form>, NOT nested in another */}
      <form
        className="
          relative z-10 w-full max-w-md rounded-2xl
          bg-white dark:bg-[#151E3A]
          border border-gray-200 dark:border-[#2D385B]
          shadow-2xl p-8 space-y-5
        "
        onSubmit={handleSubmit}
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
              <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5 truncate max-w-[240px]">
                {recipient}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="
              w-7 h-7 rounded-full flex items-center justify-center
              text-gray-400 hover:text-gray-600
              hover:bg-gray-100 dark:hover:bg-gray-800
              transition-colors flex-shrink-0
            "
          >
            <X size={14} />
          </button>
        </div>

        {/* Address input */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
            <MapPin size={14} className="text-[#5871A7]" />
            Delivery Address
          </label>
          <textarea
            rows={4}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter full delivery address including postcode / zip code"
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

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="
              flex-1 px-4 py-2 rounded-lg text-sm font-medium
              border border-gray-300 dark:border-[#2D385B]
              text-gray-700 dark:text-gray-300
              hover:bg-gray-50 dark:hover:bg-gray-800
              disabled:opacity-60 disabled:cursor-not-allowed
              transition-colors
            "
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !address.trim()}
            className="
              flex-1 px-4 py-2 rounded-lg text-sm font-medium
              flex items-center justify-center gap-2
              bg-[#5871A7] hover:bg-[#4560A0] text-white
              disabled:opacity-60 disabled:cursor-not-allowed
              transition-colors
            "
          >
            {submitting ? (
              <><Loader2 size={14} className="animate-spin" />Claiming…</>
            ) : (
              <><CheckCircle size={14} />Claim Reward</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Recipient list ─────────────────────────────────────────────────────────────
interface RecipientListProps {
  recipients:        string[];
  selectedRecipient: string | null;
  onSelect:          (r: string | null) => void;
  search:            string;
  onSearchChange:    (v: string) => void;
  loading:           boolean;
  claimedIds:        Set<string>;       // ← server-loaded claimed set
  onClaimClick:      (recipient: string) => void;  // ← lifted to parent
}

function RecipientList({
  recipients,
  selectedRecipient,
  onSelect,
  search,
  onSearchChange,
  loading,
  claimedIds,
  onClaimClick,
}: RecipientListProps) {
  const filtered = recipients.filter((r) =>
    r.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#5871A7]" />
        Loading recipients…
      </div>
    );
  }

  if (recipients.length === 0) {
    return (
      <p className="text-sm text-gray-400 italic py-4">
        No users found yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">

      {/* Search + count */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search recipients…"
            className="
              w-full pl-9 pr-4 py-2 text-sm rounded-lg
              border border-gray-300 dark:border-[#2D385B]
              bg-gray-50 dark:bg-[#1A2235]
              text-gray-900 dark:text-white
              focus:outline-none focus:ring-2 focus:ring-[#5871A7]
            "
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={12} />
            </button>
          )}
        </div>
        <span className="text-xs text-gray-500 flex-shrink-0">
          {recipients.length} recipient{recipients.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Selected hint */}
      {selectedRecipient && (
        <div className="flex items-center justify-between rounded-lg bg-[#5871A7]/8 dark:bg-[#5871A7]/15 border border-[#5871A7]/20 px-3 py-2">
          <span className="text-xs text-[#5871A7] font-medium flex items-center gap-1.5">
            <CheckSquare size={13} />
            Sending to: <span className="font-mono">{selectedRecipient}</span>
          </span>
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
          >
            <X size={11} /> Deselect
          </button>
        </div>
      )}

      {/* Scrollable list */}
      <div className="rounded-lg border border-[#D4D8EA] dark:border-[#2E4066] divide-y divide-[#D4D8EA] dark:divide-[#2E4066] max-h-64 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-5">
            No results for &ldquo;{search}&rdquo;
          </p>
        ) : (
          filtered.map((recipient) => {
            const isSelected = selectedRecipient === recipient;
            const isClaimed  = claimedIds.has(recipient);

            return (
              <div
                key={recipient}
                className={`
                  flex items-center gap-2 px-4 py-2.5 transition-colors
                  ${isSelected
                    ? "bg-[#5871A7]/8 dark:bg-[#5871A7]/15"
                    : "hover:bg-gray-50 dark:hover:bg-gray-800/40"
                  }
                  ${isClaimed ? "opacity-70" : ""}
                `}
              >
                {/* Checkbox label */}
                <label className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer select-none">
                  <span className="flex-shrink-0">
                    {isSelected ? (
                      <CheckSquare size={16} className="text-[#5871A7]" />
                    ) : (
                      <Square size={16} className="text-gray-300 dark:text-gray-600" />
                    )}
                  </span>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={isSelected}
                    onChange={() => onSelect(isSelected ? null : recipient)}
                  />
                  <span
                    className={`
                      text-sm font-mono truncate
                      ${isSelected
                        ? "text-[#5871A7] font-semibold"
                        : "text-gray-700 dark:text-gray-300"
                      }
                    `}
                  >
                    {recipient}
                  </span>
                </label>

                {/* Right: badges + claim button */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isSelected && (
                    <span className="text-[10px] bg-[#5871A7] text-white px-2 py-0.5 rounded-full">
                      Selected
                    </span>
                  )}

                  {isClaimed ? (
                    <span className="inline-flex items-center gap-1 text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded-full font-medium">
                      <CheckCircle size={10} />
                      Claimed
                    </span>
                  ) : (
                    // ── type="button" is ESSENTIAL to prevent form submission ──
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onClaimClick(recipient);
                      }}
                      className="
                        inline-flex items-center gap-1 text-[10px] font-semibold
                        bg-[#5871A7]/10 hover:bg-[#5871A7]/20
                        text-[#5871A7]
                        px-2.5 py-1 rounded-full
                        border border-[#5871A7]/20 hover:border-[#5871A7]/40
                        transition-colors
                      "
                      title={`Claim reward for ${recipient}`}
                    >
                      <Gift size={10} />
                      Claim
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function EmailBroadcastForm({
  mode,
  broadcastId,
}: EmailBroadcastFormProps) {
  const router = useRouter();

  // Auth
  const [currentUsername, setCurrentUsername] = useState("");
  const [accessChecked,   setAccessChecked]   = useState(false);
  const [adminStatus,     setAdminStatus]     = useState(false);

  // UI
  const [loading,      setLoading]      = useState(true);
  const [savingDraft,  setSavingDraft]  = useState(false);
  const [sending,      setSending]      = useState(false);
  const [confirmSend,  setConfirmSend]  = useState(false);
  const [currentId,    setCurrentId]    = useState<number | undefined>(broadcastId);

  // Award / broadcast
  const [selectedAward,     setSelectedAward]     = useState<RewardSearchResult | null>(null);
  const [existingBroadcast, setExistingBroadcast] = useState<EmailBroadcast | null>(null);

  // Recipients
  const [allRecipients,     setAllRecipients]     = useState<string[]>([]);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [recipientSearch,   setRecipientSearch]   = useState("");

  // ── Claimed state — loaded from /claimedrewards + updated locally ──────────
  const [claimedIds,     setClaimedIds]     = useState<Set<string>>(new Set());
  const [loadingClaimed, setLoadingClaimed] = useState(false);

  // ── Claim dialog — lifted to top level so it is OUTSIDE the <form> ─────────
  const [claimDialogRecipient, setClaimDialogRecipient] = useState<string | null>(null);

  // Single-send
  const [selectedRecipient, setSelectedRecipient] = useState<string | null>(null);
  const [confirmSingleSend, setConfirmSingleSend] = useState(false);
  const [sendingSingle,     setSendingSingle]     = useState(false);

  // Pick random
  const [pickRandomResult,  setPickRandomResult]  = useState<string | null>(null);
  const [pickRandomLoading, setPickRandomLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { awardid: "", subject: "", htmltext: "" },
  });

  // ── Step 1: Read username ──────────────────────────────────────────────────
  useEffect(() => {
    const username = localStorage.getItem("username") ?? "";
    setCurrentUsername(username);
  }, []);

  // ── Step 2: Check admin access ─────────────────────────────────────────────
  useEffect(() => {
    if (!currentUsername) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/getuserrole/${currentUsername}`)
      .then((r) => r.json())
      .then((data) => {
        const isAdmin =
          String(data.role).includes("admin") ||
          String(data.role).includes("superuser");
        setAdminStatus(isAdmin);
        setAccessChecked(true);
        if (!isAdmin) {
          toast.error("Access denied. Admin privileges required.");
          router.push("/dashboard");
        }
      })
      .catch(() => {
        setAdminStatus(false);
        setAccessChecked(true);
        router.push("/dashboard");
      });
  }, [currentUsername, router]);

  // ── Step 3: Load existing broadcast for edit mode ─────────────────────────
  useEffect(() => {
    if (!accessChecked || !adminStatus) return;
    if (mode === "edit" && broadcastId) {
      const fetchBroadcast = async () => {
        try {
          const data = await emailBroadcastApi.getEmailBroadcast(broadcastId);
          if (data) {
            setExistingBroadcast(data);
            setCurrentId(data.id);
            form.reset({
              awardid:  data.awardid  || "",
              subject:  data.subject  || "",
              htmltext: data.htmltext || "",
            });
          } else {
            toast.error("Broadcast not found.");
            router.push("/dashboard/emailrewards-broadcasts");
          }
        } catch {
          toast.error("Failed to load broadcast.");
        } finally {
          setLoading(false);
        }
      };
      fetchBroadcast();
    } else {
      setLoading(false);
    }
  }, [accessChecked, adminStatus, mode, broadcastId, form, router]);

  // ── Step 4: Fetch recipients + claimed status when awardId changes ─────────
  const awardIdValue     = form.watch("awardid");
  const htmltextValue    = form.watch("htmltext");
  const effectiveAwardId = String(awardIdValue || existingBroadcast?.awardid || "");

  useEffect(() => {
    if (!effectiveAwardId) {
      setAllRecipients([]);
      setClaimedIds(new Set());
      setSelectedRecipient(null);
      return;
    }

    // ── Fetch recipients ───────────────────────────────────────────────────
    const fetchRecipients = async () => {
      setRecipientsLoading(true);
      try {
        const data = await emailRewardBroadcastApi.getRewardUsers(effectiveAwardId);
        setAllRecipients(Array.isArray(data) ? data : []);
      } catch {
        console.error("Failed to fetch recipients");
        setAllRecipients([]);
      } finally {
        setRecipientsLoading(false);
      }
    };

    // ── Fetch claimed status from /claimedrewards ──────────────────────────
    // Returns a list of userids who have already claimed this reward.
    // We use this to pre-mark the "Claimed" badge on load.
    const fetchClaimedStatus = async () => {
      setLoadingClaimed(true);
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/claimedrewards/${effectiveAwardId}`
        );
        if (!res.ok) return;
        const data = await res.json();

        // API may return:
        //   [ { userid: "...", ... }, ... ]  ← array of claim objects
        //   [ "userid1", "userid2", ... ]     ← flat array of user ids
        const list: string[] = [];
        (Array.isArray(data) ? data : []).forEach((entry) => {
          if (typeof entry === "string") {
            list.push(entry);
          } else if (entry?.userid) {
            list.push(entry.userid);
          }
        });

        setClaimedIds(new Set(list));
      } catch (err) {
        console.error("Failed to fetch claimed status:", err);
        // Non-fatal — page still works
      } finally {
        setLoadingClaimed(false);
      }
    };

    fetchRecipients();
    fetchClaimedStatus();
  }, [effectiveAwardId]);

  // ── Award selection ────────────────────────────────────────────────────────
  const handleAwardSelect = (award: RewardSearchResult) => {
    setSelectedAward(award);
    form.setValue("awardid", String(award.awardid), {
      shouldValidate: true,
      shouldDirty:    true,
    });
    setSelectedRecipient(null);
    setAllRecipients([]);
    setClaimedIds(new Set());
    setRecipientSearch("");
  };

  // ── Called when a recipient is successfully claimed ────────────────────────
  const handleClaimed = (recipient: string) => {
    setClaimedIds((prev) => new Set([...prev, recipient]));
    setClaimDialogRecipient(null);
  };

  // ── Save draft ─────────────────────────────────────────────────────────────
  const handleSaveDraft = async () => {
    const isValid = await form.trigger();
    if (!isValid) return;
    const values = form.getValues();
    setSavingDraft(true);
    try {
      const payload = {
        userid:     currentUsername,
        awardid:    values.awardid,
        worldid:    selectedAward?.worldid?.toString() || existingBroadcast?.worldid || "",
        endpoint:   "emailrewards",
        tenant:     "",
        subject:    values.subject,
        htmltext:   values.htmltext,
        sentstatus: 0 as const,
        ...(currentId ? { id: currentId } : {}),
      };
      const result = await emailBroadcastApi.saveDraft(payload);
      if (result.success) {
        if (result.id && !currentId) setCurrentId(result.id);
        toast.success("Draft saved successfully!");
      } else {
        toast.error("Failed to save draft: " + (result.error || "Unknown error"));
      }
    } catch (err) {
      toast.error("Error saving draft.");
      console.error(err);
    } finally {
      setSavingDraft(false);
    }
  };

  // ── Ensure draft id ────────────────────────────────────────────────────────
  const ensureDraftId = async (values: FormValues): Promise<number | null> => {
    if (currentId) return currentId;
    const draftResult = await emailBroadcastApi.saveDraft({
      userid:     currentUsername,
      awardid:    values.awardid,
      worldid:    selectedAward?.worldid?.toString() || existingBroadcast?.worldid || "",
      endpoint:   "emailrewards",
      tenant:     "",
      subject:    values.subject,
      htmltext:   values.htmltext,
      sentstatus: 0 as const,
    });
    if (!draftResult.success || !draftResult.id) return null;
    setCurrentId(draftResult.id);
    return draftResult.id;
  };

  // ── Broadcast send ─────────────────────────────────────────────────────────
  const handleSendEmail = async () => {
    if (!confirmSend) { setConfirmSend(true); return; }
    const isValid = await form.trigger();
    if (!isValid) { setConfirmSend(false); return; }
    const values = form.getValues();
    setSending(true);
    try {
      const id = await ensureDraftId(values);
      if (!id) { toast.error("Could not save draft before sending."); return; }
      const result = await emailBroadcastApi.sendEmail({
        id,
        userid:   currentUsername,
        awardid:  values.awardid,
        subject:  values.subject,
        htmltext: values.htmltext,
      });
      if (result.success) {
        toast.success("Email broadcast sent successfully!");
        router.push("/dashboard/emailrewards-broadcasts");
      } else {
        toast.error("Failed to send: " + (result.error || "Unknown error"));
      }
    } catch (err) {
      toast.error("Error sending email.");
      console.error(err);
    } finally {
      setSending(false);
      setConfirmSend(false);
    }
  };

  // ── Single-user send ───────────────────────────────────────────────────────
  const handleSendSingleEmail = async () => {
    if (!selectedRecipient) { toast.error("Please select a recipient first."); return; }
    if (!confirmSingleSend) { setConfirmSingleSend(true); return; }
    const isValid = await form.trigger();
    if (!isValid) { setConfirmSingleSend(false); return; }
    const values = form.getValues();
    setSendingSingle(true);
    try {
      const id = await ensureDraftId(values);
      if (!id) { toast.error("Could not save draft before sending."); return; }
      const result = await emailBroadcastApi.sendEmail({
        id,
        userid:     currentUsername,
        awardid:    values.awardid,
        subject:    values.subject,
        htmltext:   values.htmltext,
        recipients: [selectedRecipient],
      });
      if (result.success) {
        toast.success(`Email sent to ${selectedRecipient}!`);
        setSelectedRecipient(null);
        setConfirmSingleSend(false);
      } else {
        toast.error("Failed to send: " + (result.error || "Unknown error"));
      }
    } catch (err) {
      toast.error("Error sending email.");
      console.error(err);
    } finally {
      setSendingSingle(false);
      setConfirmSingleSend(false);
    }
  };

  // ── Pick random ────────────────────────────────────────────────────────────
  const pickRandom = async (awardid: string) => {
    setPickRandomLoading(true);
    setPickRandomResult(null);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/pickrandom/${currentUsername}/${awardid}`,
        { method: "GET", headers: { "Content-Type": "application/json" } }
      );
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result      = await response.json();
      const displayText =
        result.message  || result.text    || result.response ||
        result.winner   || result.username ||
        JSON.stringify(result, null, 2);
      setPickRandomResult(displayText);
      toast.success(`Winner picked: ${displayText}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "An error occurred";
      toast.error("Error picking random winner");
      setPickRandomResult(`Error: ${msg}`);
    } finally {
      setPickRandomLoading(false);
    }
  };

  const isEditableBroadcast = mode === "new" || existingBroadcast?.sentstatus === 0;

  // ── Render guards ──────────────────────────────────────────────────────────
  if (!accessChecked || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5871A7] mx-auto" />
          <p className="text-gray-500 text-sm">
            {!accessChecked ? "Checking permissions…" : "Loading broadcast…"}
          </p>
        </div>
      </div>
    );
  }

  if (!adminStatus) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500">Redirecting…</p>
      </div>
    );
  }

  if (mode === "edit" && existingBroadcast?.sentstatus === 1) {
    return (
      <div className="lg:w-[85%] space-y-6">
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" size="sm"
            onClick={() => router.push("/dashboard/emailrewards-broadcasts")}
          >
            <ArrowLeft size={16} className="mr-1" /> Back
          </Button>
          <h1 className="text-xl md:text-3xl font-semibold">View Email Broadcast</h1>
        </div>
        <hr className="border-[#D4D8EA] dark:border-[#2E4066]" />
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-700 p-6">
          <p className="text-yellow-800 dark:text-yellow-200 font-medium">
            This email broadcast has already been sent and cannot be edited.
          </p>
          <div className="mt-4 space-y-3 text-sm text-gray-700 dark:text-gray-300">
            <div><span className="font-medium">Endpoint:</span> {existingBroadcast.endpoint}</div>
            <div><span className="font-medium">Drop ID:</span> {existingBroadcast.awardid}</div>
            <div><span className="font-medium">Subject:</span> {existingBroadcast.subject}</div>
            <div>
              <span className="font-medium">Message:</span>
              <div
                className="mt-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 prose prose-sm dark:prose-invert max-w-none overflow-auto"
                dangerouslySetInnerHTML={{ __html: existingBroadcast.htmltext || "" }}
              />
            </div>
            <div>
              <span className="font-medium">Sent at:</span>{" "}
              {new Date(existingBroadcast.updated_at).toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <div className="lg:w-[85%] space-y-6">

      {/* ── Claim dialog — rendered at ROOT, completely outside the <Form> ── */}
      {claimDialogRecipient && (
        <ClaimDialog
          recipient={claimDialogRecipient}
          awardId={effectiveAwardId}
          worldId={selectedAward?.worldid?.toString() || existingBroadcast?.worldid || ""}
          assetName={selectedAward?.assetname || ""}
          currentUser={currentUsername}
          onClose={() => setClaimDialogRecipient(null)}
          onClaimed={handleClaimed}
        />
      )}

      {/* ── Pick random modal ─────────────────────────────────────────────── */}
      {(pickRandomResult !== null || pickRandomLoading) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setPickRandomResult(null)}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative z-10 w-full max-w-md rounded-2xl bg-white dark:bg-[#151E3A] border border-gray-200 dark:border-[#2D385B] shadow-2xl p-8 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                Random Pick Result
              </h2>
              <button type="button" onClick={() => setPickRandomResult(null)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >✕</button>
            </div>
            {pickRandomLoading ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#5871A7]" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Picking a winner…</p>
              </div>
            ) : (
              <div className="rounded-xl bg-gray-50 dark:bg-[#1A2235] border border-gray-100 dark:border-[#2D385B] px-5 py-4">
                <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words font-mono">
                  {pickRandomResult}
                </pre>
              </div>
            )}
            {!pickRandomLoading && (
              <div className="flex justify-end">
                <button type="button" onClick={() => setPickRandomResult(null)}
                  className="px-5 py-2 rounded-lg text-sm font-medium bg-[#5871A7] hover:bg-[#4560A0] text-white transition-colors"
                >Close</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" size="sm"
            onClick={() => router.push("/dashboard/emailrewards-broadcasts")}
          >
            <ArrowLeft size={16} className="mr-1" /> Back
          </Button>
          <h1 className="text-xl md:text-3xl font-semibold">
            {mode === "new" ? "New Reward Broadcast" : "Edit Reward Broadcast"}
          </h1>
        </div>
        {currentId && (
          <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
            Draft ID: {currentId}
          </span>
        )}
      </div>
      <hr className="border-[#D4D8EA] dark:border-[#2E4066]" />

      <Form {...form}>
        <form className="space-y-10" onSubmit={(e) => e.preventDefault()}>

          {/* ── Section 1: Reward Selection ───────────────────────────────── */}
          <section className="space-y-6">
            <h2 className="text-xl font-semibold flex items-center gap-2.5">
              <Mail className="text-geodrops" /> Reward Selection
            </h2>

            <FormField
              name="awardid"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Search & Select Reward</FormLabel>
                  <FormControl>
                    <RewardSearchBox
                      value={field.value}
                      onSelect={handleAwardSelect}
                      placeholder="Type a Drop ID or name to search…"
                      disabled={!isEditableBroadcast}
                    />
                  </FormControl>
                  <FormDescription>
                    Start typing to search for Rewards. The email will be sent to
                    all users who have won the selected Reward.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Reward Details Card */}
            {(selectedAward || (mode === "edit" && existingBroadcast?.awardid)) && (
              <div className="rounded-lg border border-[#5871A7]/30 bg-blue-50/50 dark:bg-blue-900/10 p-5 space-y-4">
                <h3 className="font-semibold text-[#5871A7] flex items-center gap-2">
                  <ImageIcon size={16} /> Reward Details
                </h3>
                {selectedAward ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedAward.awardimg && (
                      <div className="md:col-span-2 flex items-start gap-4">
                        <img
                          src={
                            selectedAward.awardimg.startsWith("http")
                              ? selectedAward.awardimg
                              : `${process.env.NEXT_PUBLIC_API_URL}${selectedAward.awardimg}`
                          }
                          alt={selectedAward.assetname}
                          className="w-24 h-24 object-cover rounded-lg border border-gray-200 flex-shrink-0"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                        <div className="space-y-1">
                          <div>
                            <span className="text-xs text-gray-500 uppercase tracking-wide">Asset Name</span>
                            <p className="font-medium">{selectedAward.assetname || "—"}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    {!selectedAward.awardimg && (
                      <div>
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Asset Name</span>
                        <p className="font-medium">{selectedAward.assetname || "—"}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-xs text-gray-500 uppercase tracking-wide">Drop ID</span>
                      <p className="font-mono text-sm">{selectedAward.awardid}</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <p>Drop ID: <span className="font-mono font-medium">{existingBroadcast?.awardid}</span></p>
                    <p className="mt-1 text-xs text-gray-400">Search above to change the Drop.</p>
                  </div>
                )}
              </div>
            )}
          </section>

          <hr className="border-[#D4D8EA] dark:border-[#2E4066]" />

          {/* ── Section 2: Recipients ─────────────────────────────────────── */}
          <section className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-xl font-semibold flex items-center gap-2.5">
                <Users className="text-geodrops" /> Recipients
              </h2>

              {allRecipients.length > 0 && (
                <Button
                  type="button"
                  onClick={() => pickRandom(effectiveAwardId)}
                  variant="outline"
                  size="sm"
                  disabled={pickRandomLoading}
                  className="rounded-full hover:bg-[#151E3A] dark:text-[#5871A7] hover:text-white"
                >
                  {pickRandomLoading ? (
                    <><Loader2 size={13} className="mr-1.5 animate-spin" />Picking…</>
                  ) : "🎲 Pick Another Random Winner"}
                </Button>
              )}
            </div>

            <p className="text-sm text-gray-500">
              All users who have won this Reward are listed below.
              {allRecipients.length > 0 && (
                <> Tick a name to target that person, or leave all unticked to broadcast to everyone.
                Use <strong>Claim</strong> to record a physical reward delivery.</>
              )}
            </p>

            {loadingClaimed && (
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-400" />
                Loading claim status…
              </div>
            )}

            {/* RecipientList — no longer owns any dialog state */}
            <RecipientList
              recipients={allRecipients}
              selectedRecipient={selectedRecipient}
              onSelect={(r) => {
                setSelectedRecipient(r);
                setConfirmSingleSend(false);
              }}
              search={recipientSearch}
              onSearchChange={setRecipientSearch}
              loading={recipientsLoading}
              claimedIds={claimedIds}
              onClaimClick={(recipient) => setClaimDialogRecipient(recipient)}
            />
          </section>

          <hr className="border-[#D4D8EA] dark:border-[#2E4066]" />

          {/* ── Section 3: Email Content ───────────────────────────────────── */}
          <section className="space-y-6">
            <h2 className="text-xl font-semibold flex items-center gap-2.5">
              <FileText className="text-geodrops" /> Email Content
            </h2>

            <FormField
              name="subject"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5871A7] pointer-events-none" />
                      <Input
                        className="pl-9"
                        placeholder="Enter email subject…"
                        {...field}
                        disabled={!isEditableBroadcast}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="htmltext"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel className="flex items-center gap-2">
                      <AlignLeft size={16} /> Email Body (HTML)
                    </FormLabel>
                    <span className="text-xs text-gray-400">HTML supported</span>
                  </div>
                  <FormControl>
                    <HtmlTextarea
                      placeholder={`<p>Dear recipient,</p>\n<p>We are excited to share this with you...</p>`}
                      {...field}
                      disabled={!isEditableBroadcast}
                    />
                  </FormControl>
                  <div className="flex justify-between items-center">
                    <FormMessage />
                    <span className="text-xs text-gray-400">
                      {(field.value?.length || 0).toLocaleString()} characters
                    </span>
                  </div>
                </FormItem>
              )}
            />

            {/* HTML Preview */}
            {htmltextValue && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Preview</h3>
                  <span className="text-xs text-gray-400">Rendered HTML preview</span>
                </div>
                <div
                  className="rounded-lg border border-gray-200 dark:border-gray-700 p-5 bg-white dark:bg-gray-900 min-h-[120px] prose prose-sm dark:prose-invert max-w-none overflow-auto"
                  dangerouslySetInnerHTML={{ __html: htmltextValue }}
                />
              </div>
            )}
          </section>

          <hr className="border-[#D4D8EA] dark:border-[#2E4066]" />

          {/* ── Actions ───────────────────────────────────────────────────── */}
          {isEditableBroadcast && (
            <div className="space-y-4">

              {selectedRecipient && confirmSingleSend && (
                <div className="rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-700 p-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-orange-800 dark:text-orange-200">Confirm Single Send</p>
                    <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                      This will send only to{" "}
                      <strong className="font-mono">{selectedRecipient}</strong>. This action cannot be undone.
                    </p>
                  </div>
                  <Button type="button" variant="outline" size="sm"
                    onClick={() => setConfirmSingleSend(false)} className="flex-shrink-0"
                  >Cancel</Button>
                </div>
              )}

              {!selectedRecipient && confirmSend && (
                <div className="rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-700 p-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-orange-800 dark:text-orange-200">Confirm Broadcast</p>
                    <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                      This will send the email to{" "}
                      <strong>all {allRecipients.length} recipients</strong> of Drop{" "}
                      <strong>{form.getValues("awardid")}</strong>. This action cannot be undone.
                    </p>
                  </div>
                  <Button type="button" variant="outline" size="sm"
                    onClick={() => setConfirmSend(false)} className="flex-shrink-0"
                  >Cancel</Button>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-between">
                <Button type="button" variant="outline"
                  onClick={() => router.push("/dashboard/emailrewards-broadcasts")}
                  className="sm:w-auto"
                >
                  <ArrowLeft size={16} className="mr-2" /> Cancel
                </Button>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button type="button" variant="outline"
                    onClick={handleSaveDraft}
                    disabled={savingDraft || sending || sendingSingle}
                    className="sm:w-auto border-[#5871A7] text-[#5871A7] hover:bg-[#5871A7]/10"
                  >
                    {savingDraft ? (
                      <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#5871A7] mr-2" />Saving Draft…</>
                    ) : (
                      <><Save size={16} className="mr-2" />Save Draft</>
                    )}
                  </Button>

                  {selectedRecipient ? (
                    <Button
                      type="button"
                      onClick={handleSendSingleEmail}
                      disabled={sendingSingle || sending}
                      className={`sm:w-auto text-white ${
                        confirmSingleSend
                          ? "bg-orange-600 hover:bg-orange-700"
                          : "bg-green-600 hover:bg-green-700"
                      }`}
                    >
                      {sendingSingle ? (
                        <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />Sending…</>
                      ) : (
                        <>
                          <Send size={16} className="mr-2" />
                          {confirmSingleSend ? "Confirm Single Send" : `Send to ${selectedRecipient}`}
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={handleSendEmail}
                      disabled={savingDraft || sending || allRecipients.length === 0}
                      className={`sm:w-auto ${
                        confirmSend
                          ? "bg-orange-600 hover:bg-orange-700"
                          : "bg-[#5871A7] hover:bg-[#4560A0]"
                      } text-white`}
                    >
                      {sending ? (
                        <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />Sending…</>
                      ) : (
                        <>
                          <Send size={16} className="mr-2" />
                          {confirmSend
                            ? "Confirm Broadcast"
                            : `Broadcast to All (${allRecipients.length})`
                          }
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

        </form>
      </Form>
    </div>
  );
}