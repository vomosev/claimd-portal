// components/EmailMailingListBroadcastForm.tsx
"use client";

import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Mail, Save, Send, ArrowLeft, FileText,
  AlignLeft, User, List, Search, X,
  CheckSquare, Square, Users,
} from "lucide-react";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { HtmlTextarea } from "@/components/ui/HtmlTextarea";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import {
  emailMailingListBroadcastApi,
  EmailBroadcast,
} from "@/services/emailMailingListBroadcastApi";
import { emailBroadcastApi } from "@/services/emailBroadcastApi";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

// ── Types ──────────────────────────────────────────────────────────────────────
interface MailingListEntry {
  listid:   string;
  listname: string;
}

interface MailingListMember {
  userid:   string;
  fullname: string;
  listid:   string;
  listname: string;
}

interface EmailBroadcastFormProps {
  mode:         "new" | "edit";
  broadcastId?: number;
}

// ── Schema ─────────────────────────────────────────────────────────────────────
const schema = z.object({
  listid:   z.string().min(1, "Mailing list is required"),
  subject:  z.string().min(1, "Subject is required").max(500),
  htmltext: z.string().min(1, "Email content is required"),
});

type FormValues = z.infer<typeof schema>;

// ── Inline member list with single-email selection ────────────────────────────
interface MailingListMemberListProps {
  listId:            string;
  selectedMember:    string | null;
  onSelectMember:    (userid: string | null) => void;
  onMembersLoaded:   (members: MailingListMember[]) => void;
}

function MailingListMemberList({
  listId,
  selectedMember,
  onSelectMember,
  onMembersLoaded,
}: MailingListMemberListProps) {
  const [members,  setMembers]  = useState<MailingListMember[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [search,   setSearch]   = useState("");

  useEffect(() => {
    if (!listId) {
      setMembers([]);
      onMembersLoaded([]);
      return;
    }

    const fetchMembers = async () => {
      setLoading(true);
      setError(null);
      setSearch("");
      const username = localStorage.getItem("username") ?? "";
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/mailinglist/listmembers/${listId}/${username}`
        );
        if (!res.ok) throw new Error("Failed to fetch members");
        const data = await res.json();
        const list: MailingListMember[] = Array.isArray(data) ? data : data.members ?? [];
        setMembers(list);
        onMembersLoaded(list);
      } catch (err) {
        console.error("Error fetching mailing list members:", err);
        setError("Failed to load members.");
        setMembers([]);
        onMembersLoaded([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listId]);

  // ── Empty / not selected ──────────────────────────────────────────────────
  if (!listId) {
    return (
      <div className="rounded-lg border border-dashed border-[#D4D8EA] dark:border-[#2E4066] p-6 text-center">
        <User size={24} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
        <p className="text-sm text-gray-400">
          Select a mailing list above to see its members.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#5871A7]" />
        <span className="text-sm text-gray-500">Loading members…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-700 p-4">
        <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[#D4D8EA] dark:border-[#2E4066] p-6 text-center">
        <p className="text-sm text-gray-400">No members found in this list.</p>
      </div>
    );
  }

  const filtered = members.filter((m) => {
    const q = search.toLowerCase();
    return (
      m.userid.toLowerCase().includes(q) ||
      (m.fullname || "").toLowerCase().includes(q)
    );
  });

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
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search members…"
            className="
              w-full pl-9 pr-9 py-2 text-sm rounded-lg
              border border-gray-300 dark:border-[#2D385B]
              bg-gray-50 dark:bg-[#1A2235]
              text-gray-900 dark:text-white
              focus:outline-none focus:ring-2 focus:ring-[#5871A7]
            "
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={12} />
            </button>
          )}
        </div>
        <span className="text-xs text-gray-500 flex-shrink-0">
          {members.length} member{members.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Selected-member hint */}
      {selectedMember && (
        <div className="flex items-center justify-between rounded-lg bg-[#5871A7]/8 dark:bg-[#5871A7]/15 border border-[#5871A7]/20 px-3 py-2">
          <span className="text-xs text-[#5871A7] font-medium flex items-center gap-1.5">
            <CheckSquare size={13} />
            Sending to:{" "}
            <span className="font-mono">{selectedMember}</span>
          </span>
          <button
            type="button"
            onClick={() => onSelectMember(null)}
            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
          >
            <X size={11} /> Deselect
          </button>
        </div>
      )}

      {/* Scrollable member list */}
      <div className="rounded-lg border border-[#D4D8EA] dark:border-[#2E4066] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border-b border-[#D4D8EA] dark:border-[#2E4066]">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Recipients
            <span className="ml-1.5 text-gray-400 normal-case font-normal">
              — tick to send to a single member
            </span>
          </span>
          <span className="text-xs bg-[#5871A7]/10 text-[#5871A7] font-semibold px-2 py-0.5 rounded-full">
            {members.length.toLocaleString()} member{members.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="max-h-64 overflow-y-auto divide-y divide-[#D4D8EA] dark:divide-[#2E4066]">
          {filtered.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-5">
              No results for &ldquo;{search}&rdquo;
            </p>
          ) : (
            filtered.map((m, i) => {
              const isSelected = selectedMember === m.userid;
              return (
                <label
                  key={`${m.userid}-${i}`}
                  className={`
                    flex items-center gap-3 px-4 py-2.5 cursor-pointer
                    transition-colors select-none
                    ${isSelected
                      ? "bg-[#5871A7]/8 dark:bg-[#5871A7]/15"
                      : "hover:bg-gray-50 dark:hover:bg-gray-800/30"
                    }
                  `}
                >
                  {/* Visible checkbox icon */}
                  <span className="flex-shrink-0">
                    {isSelected
                      ? <CheckSquare size={16} className="text-[#5871A7]" />
                      : <Square     size={16} className="text-gray-300 dark:text-gray-600" />
                    }
                  </span>

                  {/* Hidden real checkbox */}
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={isSelected}
                    onChange={() => onSelectMember(isSelected ? null : m.userid)}
                  />

                  {/* Avatar */}
                  <div className="w-7 h-7 rounded-full bg-[#5871A7]/10 flex items-center justify-center flex-shrink-0">
                    <User size={13} className="text-[#5871A7]" />
                  </div>

                  {/* Name + userid */}
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium truncate ${
                      isSelected
                        ? "text-[#5871A7]"
                        : "text-gray-800 dark:text-gray-200"
                    }`}>
                      {m.fullname || m.userid}
                    </p>
                    {m.fullname && (
                      <p className="text-xs text-gray-400 truncate font-mono">
                        {m.userid}
                      </p>
                    )}
                  </div>

                  {isSelected && (
                    <span className="ml-auto text-[10px] bg-[#5871A7] text-white px-2 py-0.5 rounded-full flex-shrink-0">
                      Selected
                    </span>
                  )}
                </label>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ── Single-email predictive search input ──────────────────────────────────────
interface SingleEmailInputProps {
  members:        MailingListMember[];
  value:          string;
  onChange:       (v: string) => void;
  onSelect:       (userid: string) => void;
  disabled?:      boolean;
}

function SingleEmailInput({
  members,
  value,
  onChange,
  onSelect,
  disabled,
}: SingleEmailInputProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef      = useRef<HTMLDivElement>(null);

  const suggestions = value.trim()
    ? members.filter((m) => {
        const q = value.toLowerCase();
        return (
          m.userid.toLowerCase().includes(q) ||
          (m.fullname || "").toLowerCase().includes(q)
        );
      }).slice(0, 8)
    : [];

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Mail
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          disabled={disabled}
          placeholder="Type a name or email to search…"
          className="
            w-full pl-9 pr-9 py-2.5 text-sm rounded-lg
            border border-gray-300 dark:border-[#2D385B]
            bg-white dark:bg-[#1A2235]
            text-gray-900 dark:text-white
            placeholder-gray-400 dark:placeholder-gray-500
            focus:outline-none focus:ring-2 focus:ring-[#5871A7] focus:border-transparent
            disabled:opacity-60 disabled:cursor-not-allowed
          "
        />
        {value && (
          <button
            type="button"
            onClick={() => { onChange(""); setOpen(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Suggestions dropdown */}
      {open && suggestions.length > 0 && (
        <div className="
          absolute z-20 mt-1 w-full rounded-xl
          bg-white dark:bg-[#151E3A]
          border border-gray-200 dark:border-[#2D385B]
          shadow-xl overflow-hidden
        ">
          {suggestions.map((m) => (
            <button
              key={m.userid}
              type="button"
              onMouseDown={(e) => {
                // Use mousedown so blur doesn't fire first
                e.preventDefault();
                onSelect(m.userid);
                onChange(m.userid);
                setOpen(false);
              }}
              className="
                w-full flex items-center gap-3 px-4 py-2.5 text-left
                hover:bg-[#5871A7]/8 dark:hover:bg-[#5871A7]/15
                transition-colors
              "
            >
              <div className="w-7 h-7 rounded-full bg-[#5871A7]/10 flex items-center justify-center flex-shrink-0">
                <User size={13} className="text-[#5871A7]" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                  {m.fullname || m.userid}
                </p>
                {m.fullname && (
                  <p className="text-xs font-mono text-gray-400 truncate">{m.userid}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function EmailMailingListBroadcastForm({
  mode,
  broadcastId,
}: EmailBroadcastFormProps) {
  const router = useRouter();

  // Auth state
  const [currentUsername, setCurrentUsername] = useState("");
  const [accessChecked,   setAccessChecked]   = useState(false);
  const [adminStatus,     setAdminStatus]     = useState(false);

  // UI state
  const [loading,      setLoading]      = useState(true);
  const [savingDraft,  setSavingDraft]  = useState(false);
  const [sending,      setSending]      = useState(false);
  const [confirmSend,  setConfirmSend]  = useState(false);
  const [currentId,    setCurrentId]    = useState<number | undefined>(broadcastId);

  // Mailing list state
  const [mailingLists,        setMailingLists]        = useState<MailingListEntry[]>([]);
  const [loadingMailingLists, setLoadingMailingLists] = useState(false);
  const [existingBroadcast,   setExistingBroadcast]   = useState<EmailBroadcast | null>(null);
  const [allMembers,          setAllMembers]          = useState<MailingListMember[]>([]);

  // ── Single-email state ─────────────────────────────────────────────────────
  // selectedMember  — set by ticking a checkbox in the list
  // singleEmailInput — set by typing in the predictive search box
  // Both can set the final send target; the checkbox takes display priority
  const [selectedMember,    setSelectedMember]    = useState<string | null>(null);
  const [singleEmailInput,  setSingleEmailInput]  = useState("");
  const [confirmSingleSend, setConfirmSingleSend] = useState(false);
  const [sendingSingle,     setSendingSingle]     = useState(false);

  // The effective single-send target — checkbox wins over text input
  const singleSendTarget = selectedMember || (singleEmailInput.trim() || null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { listid: "", subject: "", htmltext: "" },
  });

  const listIdValue   = form.watch("listid");
  const htmltextValue = form.watch("htmltext");

  const isEditableBroadcast =
    mode === "new" || existingBroadcast?.sentstatus === 0;

  const effectiveListId = String(
    listIdValue || (existingBroadcast as any)?.listid || ""
  );

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

  // ── Step 3: Load mailing lists ─────────────────────────────────────────────
  useEffect(() => {
    if (!currentUsername) return;
    const fetchLists = async () => {
      setLoadingMailingLists(true);
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/mailinglist/listids/${currentUsername}`
        );
        if (res.ok) {
          const data = await res.json();
          setMailingLists(Array.isArray(data) ? data : data.lists ?? []);
        }
      } catch (error) {
        console.error("Error fetching mailing lists:", error);
      } finally {
        setLoadingMailingLists(false);
      }
    };
    fetchLists();
  }, [currentUsername]);

  // ── Step 4: Load existing broadcast for edit mode ─────────────────────────
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
              listid:   (data as any).listid || "",
              subject:  data.subject         || "",
              htmltext: data.htmltext        || "",
            });
          } else {
            toast.error("Broadcast not found.");
            router.push("/dashboard/emailmailinglist-broadcasts");
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

  // ── Reset single-send state when list changes ──────────────────────────────
  useEffect(() => {
    setSelectedMember(null);
    setSingleEmailInput("");
    setConfirmSingleSend(false);
    setAllMembers([]);
  }, [effectiveListId]);

  // ── Ensure a draft id exists before sending ────────────────────────────────
  const ensureDraftId = async (values: FormValues): Promise<number | null> => {
    if (currentId) return currentId;
    const selectedList = mailingLists.find((l) => l.listid === values.listid);
    const draftResult = await emailMailingListBroadcastApi.saveDraft({
      userid:     currentUsername,
      awardid:    "",
      worldid:    "",
      listid:     values.listid,
      listname:   selectedList?.listname || "",
      endpoint:   "emailmailinglist",
      tenant:     "",
      subject:    values.subject,
      htmltext:   values.htmltext,
      sentstatus: 0 as const,
    });
    if (!draftResult.success || !draftResult.id) return null;
    setCurrentId(draftResult.id);
    return draftResult.id;
  };

  // ── Save draft ─────────────────────────────────────────────────────────────
  const handleSaveDraft = async () => {
    const isValid = await form.trigger();
    if (!isValid) return;
    const values = form.getValues();
    setSavingDraft(true);
    try {
      const selectedList = mailingLists.find((l) => l.listid === values.listid);
      const payload = {
        userid:     currentUsername,
        awardid:    "",
        worldid:    "",
        listid:     values.listid,
        listname:   selectedList?.listname || "",
        endpoint:   "emailmailinglist",
        tenant:     "",
        subject:    values.subject,
        htmltext:   values.htmltext,
        sentstatus: 0 as const,
        ...(currentId ? { id: currentId } : {}),
      };
      const result = await emailMailingListBroadcastApi.saveDraft(payload);
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

  // ── Broadcast send (all members) ───────────────────────────────────────────
  const handleSendEmail = async () => {
    if (!confirmSend) { setConfirmSend(true); return; }
    const isValid = await form.trigger();
    if (!isValid) { setConfirmSend(false); return; }

    const values = form.getValues();
    setSending(true);
    try {
      const id = await ensureDraftId(values);
      if (!id) {
        toast.error("Could not save draft before sending.");
        return;
      }
      const result = await emailMailingListBroadcastApi.sendEmail({
        id,
        userid:   currentUsername,
        worldid:  "",
        listid:   values.listid,
        subject:  values.subject,
        htmltext: values.htmltext,
      } as any);

      if (result.success) {
        toast.success("Email broadcast sent successfully!");
        router.push("/dashboard/emailmailinglist-broadcasts");
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

  // ── Single-member send ─────────────────────────────────────────────────────
  const handleSendSingleEmail = async () => {
    if (!singleSendTarget) {
      toast.error("Please select or type a recipient first.");
      return;
    }
    if (!confirmSingleSend) { setConfirmSingleSend(true); return; }

    const isValid = await form.trigger();
    if (!isValid) { setConfirmSingleSend(false); return; }

    const values = form.getValues();
    setSendingSingle(true);
    try {
      const id = await ensureDraftId(values);
      if (!id) {
        toast.error("Could not save draft before sending.");
        return;
      }
      const result = await emailMailingListBroadcastApi.sendEmail({
        id,
        userid:     currentUsername,
        worldid:    "",
        listid:     values.listid,
        subject:    values.subject,
        htmltext:   values.htmltext,
        recipients: [singleSendTarget],
      } as any);

      if (result.success) {
        toast.success(`Email sent to ${singleSendTarget}!`);
        setSelectedMember(null);
        setSingleEmailInput("");
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
            onClick={() => router.push("/dashboard/emailmailinglist-broadcasts")}
          >
            <ArrowLeft size={16} className="mr-1" /> Back
          </Button>
          <h1 className="text-3xl font-semibold">View Email Broadcast</h1>
        </div>
        <hr className="border-[#D4D8EA] dark:border-[#2E4066]" />
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-700 p-6">
          <p className="text-yellow-800 dark:text-yellow-200 font-medium">
            This email broadcast has already been sent and cannot be edited.
          </p>
          <div className="mt-4 space-y-3 text-sm text-gray-700 dark:text-gray-300">
            <div><span className="font-medium">Endpoint:</span> {existingBroadcast.endpoint}</div>
            <div><span className="font-medium">List ID:</span> {(existingBroadcast as any).listid}</div>
            <div><span className="font-medium">Subject:</span> {existingBroadcast.subject}</div>
            <div>
              <span className="font-medium">Message:</span>
              <div
                className="
                  mt-2 rounded-lg border border-gray-200 dark:border-gray-700
                  bg-white dark:bg-gray-900
                  p-4
                  prose prose-sm dark:prose-invert max-w-none
                  overflow-auto
                "
                dangerouslySetInnerHTML={{ __html: existingBroadcast.htmltext || "" }}
              />
            </div>
            <div><span className="font-medium">Sent at:</span> {new Date(existingBroadcast.updated_at).toLocaleString()}</div>
          </div>
        </div>
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <div className="lg:w-[85%] space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" size="sm"
            onClick={() => router.push("/dashboard/emailmailinglist-broadcasts")}
          >
            <ArrowLeft size={16} className="mr-1" /> Back
          </Button>
          <h1 className="text-3xl font-semibold">
            {mode === "new" ? "New Mailing List Broadcast" : "Edit Mailing List Broadcast"}
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

          {/* ── Section 1: Mailing List Selection ───────────────────────── */}
          <section className="space-y-6">
            <h2 className="text-xl font-semibold flex items-center gap-2.5">
              <List className="text-geodrops" /> Mailing List Selection
            </h2>

            <FormField
              name="listid"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Mailing List</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={!isEditableBroadcast || loadingMailingLists}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            loadingMailingLists
                              ? "Loading mailing lists…"
                              : mailingLists.length === 0
                              ? "No mailing lists available"
                              : "Select a mailing list"
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {mailingLists.map((l) => (
                        <SelectItem key={l.listid} value={l.listid}>
                          <div className="flex flex-col">
                            <span className="font-medium">{l.listname || l.listid}</span>
                            {l.listname && (
                              <span className="text-xs text-gray-500 font-mono">{l.listid}</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    The email will be sent to all members of the selected mailing list.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </section>

          <hr className="border-[#D4D8EA] dark:border-[#2E4066]" />

          {/* ── Section 2: Recipient List ────────────────────────────────── */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2.5">
              <Users className="text-geodrops" /> Recipients
            </h2>
            <p className="text-sm text-gray-500">
              All members of the selected list are shown below.
              {allMembers.length > 0 && (
                <> Tick a row to target that person, or leave all unticked to broadcast to everyone.</>
              )}
            </p>

            {/* Inline checkable member list */}
            <MailingListMemberList
              listId={effectiveListId}
              selectedMember={selectedMember}
              onSelectMember={(userid) => {
                setSelectedMember(userid);
                // Sync the text input when selecting via checkbox
                setSingleEmailInput(userid ?? "");
                setConfirmSingleSend(false);
              }}
              onMembersLoaded={setAllMembers}
            />

            {/* ── Single-email predictive search ──────────────────────────── */}
            {effectiveListId && allMembers.length > 0 && (
              <div className="space-y-2 pt-1">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Or type to search and select a single recipient
                </p>
                <SingleEmailInput
                  members={allMembers}
                  value={singleEmailInput}
                  onChange={(v) => {
                    setSingleEmailInput(v);
                    // Clear checkbox selection if user starts typing a different name
                    if (selectedMember && !selectedMember.toLowerCase().startsWith(v.toLowerCase())) {
                      setSelectedMember(null);
                    }
                    setConfirmSingleSend(false);
                  }}
                  onSelect={(userid) => {
                    setSelectedMember(userid);
                    setSingleEmailInput(userid);
                    setConfirmSingleSend(false);
                  }}
                  disabled={!isEditableBroadcast}
                />
              </div>
            )}
          </section>

          <hr className="border-[#D4D8EA] dark:border-[#2E4066]" />

          {/* ── Section 3: Email Content ─────────────────────────────────── */}
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

          {/* ── Actions ──────────────────────────────────────────────────── */}
          {isEditableBroadcast && (
            <div className="space-y-4">

              {/* Single-send confirm banner */}
              {singleSendTarget && confirmSingleSend && (
                <div className="rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-700 p-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-orange-800 dark:text-orange-200">Confirm Single Send</p>
                    <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                      This will send only to{" "}
                      <strong className="font-mono">{singleSendTarget}</strong>.
                      This action cannot be undone.
                    </p>
                  </div>
                  <Button type="button" variant="outline" size="sm"
                    onClick={() => setConfirmSingleSend(false)} className="flex-shrink-0"
                  >Cancel</Button>
                </div>
              )}

              {/* Broadcast confirm banner */}
              {!singleSendTarget && confirmSend && (
                <div className="rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-700 p-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-orange-800 dark:text-orange-200">Confirm Send</p>
                    <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                      This will send the email to{" "}
                      <strong>all {allMembers.length} members</strong> of mailing list{" "}
                      <strong>
                        {mailingLists.find((l) => l.listid === form.getValues("listid"))?.listname
                          || form.getValues("listid")}
                      </strong>. This action cannot be undone.
                    </p>
                  </div>
                  <Button type="button" variant="outline" size="sm"
                    onClick={() => setConfirmSend(false)} className="flex-shrink-0"
                  >Cancel</Button>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-between">
                <Button type="button" variant="outline"
                  onClick={() => router.push("/dashboard/emailmailinglist-broadcasts")}
                  className="sm:w-auto"
                >
                  <ArrowLeft size={16} className="mr-2" /> Cancel
                </Button>

                <div className="flex flex-col sm:flex-row gap-3">

                  {/* Save draft */}
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

                  {/* ── Adaptive send button ──────────────────────────────── */}
                  {singleSendTarget ? (
                    // Single send — green
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
                          {confirmSingleSend
                            ? "Confirm Single Send"
                            : `Send to ${singleSendTarget}`
                          }
                        </>
                      )}
                    </Button>
                  ) : (
                    // Broadcast to all — blue
                    <Button
                      type="button"
                      onClick={handleSendEmail}
                      disabled={savingDraft || sending || allMembers.length === 0}
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
                            ? "Confirm Send"
                            : `Send to All (${allMembers.length})`
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