// components/EmailEventbriteBroadcastForm.tsx
"use client";

import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Mail, Save, Send, ArrowLeft, FileText,
  AlignLeft, User, List, Search, X,
  CheckSquare, Square, Users, RefreshCw,
  Calendar, MapPin, Ticket, ExternalLink,
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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import toast from "react-hot-toast";
import {
  emailMailingListBroadcastApi,
  EmailBroadcast,
} from "@/services/emailMailingListBroadcastApi";
import { emailBroadcastApi } from "@/services/emailBroadcastApi";

// ── Types ──────────────────────────────────────────────────────────────────────

/** An Eventbrite event */
interface EventbriteEvent {
  id:          string;
  name:        string;
  description: string;
  startDate:   string;
  endDate:     string;
  venue?:      string;
  url:         string;
  status:      string;  // live | draft | canceled | completed
  capacity:    number;
}

/** A single Eventbrite attendee */
interface EventbriteAttendee {
  id:       string;
  email:    string;
  fullname: string;
  status:   string;  // attending | not_attending | waitlist | checked_in
  orderId:  string;
  eventId:  string;
}

interface EmailBroadcastFormProps {
  mode:         "new" | "edit";
  broadcastId?: number;
}

// ── Schema ─────────────────────────────────────────────────────────────────────
const schema = z.object({
  eventid:  z.string().min(1, "Eventbrite event is required"),
  subject:  z.string().min(1, "Subject is required").max(500),
  htmltext: z.string().min(1, "Email content is required"),
});

type FormValues = z.infer<typeof schema>;

// ── Eventbrite attendee list with inline checkboxes ────────────────────────────
interface AttendeeListProps {
  eventId:          string;
  selectedAttendee: string | null;
  onSelectAttendee: (email: string | null) => void;
  onAttendeesLoaded:(attendees: EventbriteAttendee[]) => void;
}

function EventbriteAttendeeList({
  eventId,
  selectedAttendee,
  onSelectAttendee,
  onAttendeesLoaded,
}: AttendeeListProps) {
  const [attendees,    setAttendees]    = useState<EventbriteAttendee[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState<"attending" | "all">("attending");
  const [retryKey,     setRetryKey]     = useState(0);

  useEffect(() => {
    if (!eventId) {
      setAttendees([]);
      onAttendeesLoaded([]);
      return;
    }

    const fetchAttendees = async () => {
      setLoading(true);
      setError(null);
      setSearch("");
      try {
        // ── Your backend proxies to Eventbrite API ───────────────────────────
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/eventbrite/attendees/${eventId}?status=${statusFilter}`
        );
        if (!res.ok) throw new Error("Failed to fetch Eventbrite attendees");
        const data = await res.json();

        // Backend returns { attendees: [...] } or a flat array
        const raw: any[] = Array.isArray(data) ? data : data.attendees ?? [];

        const list: EventbriteAttendee[] = raw.map((a) => ({
          id:       a.id,
          email:    a.profile?.email    || a.email    || "",
          fullname: a.profile?.name     || a.fullname ||
                    [a.profile?.first_name, a.profile?.last_name]
                      .filter(Boolean).join(" ") || "",
          status:   a.status            || "attending",
          orderId:  a.order_id          || a.orderId  || "",
          eventId,
        }));

        setAttendees(list);
        onAttendeesLoaded(list);
      } catch (err) {
        console.error("Eventbrite attendee fetch error:", err);
        setError("Failed to load Eventbrite attendees.");
        setAttendees([]);
        onAttendeesLoaded([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendees();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, statusFilter, retryKey]);

  // ── Status badge colour ────────────────────────────────────────────────────
  const statusColour = (s: string) => {
    switch (s) {
      case "attending":   return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300";
      case "checked_in":  return "bg-blue-100  dark:bg-blue-900/30  text-blue-700  dark:text-blue-300";
      case "waitlist":    return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300";
      case "not_attending":
      case "cancelled":   return "bg-red-100   dark:bg-red-900/30   text-red-600   dark:text-red-400";
      default:            return "bg-gray-100  dark:bg-gray-800     text-gray-500";
    }
  };

  // ── Empty / loading / error states ────────────────────────────────────────
  if (!eventId) {
    return (
      <div className="rounded-lg border border-dashed border-[#D4D8EA] dark:border-[#2E4066] p-6 text-center">
        <Ticket size={24} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
        <p className="text-sm text-gray-400">
          Select an Eventbrite event above to see its attendees.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#5871A7]" />
        <span className="text-sm text-gray-500">Loading Eventbrite attendees…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-700 p-4 flex items-center justify-between gap-3">
        <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setRetryKey((k) => k + 1)}
          className="flex-shrink-0 text-red-600 border-red-300"
        >
          <RefreshCw size={13} className="mr-1.5" /> Retry
        </Button>
      </div>
    );
  }

  if (attendees.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[#D4D8EA] dark:border-[#2E4066] p-6 text-center">
        <p className="text-sm text-gray-400">
          No {statusFilter === "attending" ? "attending " : ""}attendees found for this event.
        </p>
      </div>
    );
  }

  const filtered = attendees.filter((a) => {
    const q = search.toLowerCase();
    return (
      a.email.toLowerCase().includes(q)    ||
      a.fullname.toLowerCase().includes(q) ||
      a.orderId.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-3">

      {/* Search + status filter + count */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email or order ID…"
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

        {/* Status filter */}
        <div className="flex gap-1 p-1 bg-gray-100 dark:bg-[#1A2235] rounded-lg flex-shrink-0">
          {(["attending", "all"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`
                px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors
                ${statusFilter === s
                  ? "bg-white dark:bg-[#151E3A] text-[#5871A7] shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
                }
              `}
            >
              {s === "all" ? "All statuses" : "Attending only"}
            </button>
          ))}
        </div>

        <span className="text-xs text-gray-500 flex-shrink-0">
          {attendees.length.toLocaleString()} attendee{attendees.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Selected attendee hint */}
      {selectedAttendee && (
        <div className="flex items-center justify-between rounded-lg bg-[#5871A7]/8 dark:bg-[#5871A7]/15 border border-[#5871A7]/20 px-3 py-2">
          <span className="text-xs text-[#5871A7] font-medium flex items-center gap-1.5">
            <CheckSquare size={13} />
            Sending to: <span className="font-mono">{selectedAttendee}</span>
          </span>
          <button
            type="button"
            onClick={() => onSelectAttendee(null)}
            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
          >
            <X size={11} /> Deselect
          </button>
        </div>
      )}

      {/* Scrollable attendee list */}
      <div className="rounded-lg border border-[#D4D8EA] dark:border-[#2E4066] overflow-hidden">

        {/* Table header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border-b border-[#D4D8EA] dark:border-[#2E4066]">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Eventbrite Attendees
            <span className="ml-1.5 text-gray-400 normal-case font-normal">
              — tick to send to a single attendee
            </span>
          </span>
          <span className="text-xs bg-[#5871A7]/10 text-[#5871A7] font-semibold px-2 py-0.5 rounded-full">
            {attendees.length.toLocaleString()}
          </span>
        </div>

        <div className="max-h-72 overflow-y-auto divide-y divide-[#D4D8EA] dark:divide-[#2E4066]">
          {filtered.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-5">
              No results for &ldquo;{search}&rdquo;
            </p>
          ) : (
            filtered.map((a) => {
              const isSelected = selectedAttendee === a.email;
              return (
                <label
                  key={`${a.id}-${a.email}`}
                  className={`
                    flex items-center gap-3 px-4 py-2.5 cursor-pointer
                    transition-colors select-none
                    ${isSelected
                      ? "bg-[#5871A7]/8 dark:bg-[#5871A7]/15"
                      : "hover:bg-gray-50 dark:hover:bg-gray-800/30"
                    }
                  `}
                >
                  {/* Visual checkbox */}
                  <span className="flex-shrink-0">
                    {isSelected
                      ? <CheckSquare size={16} className="text-[#5871A7]" />
                      : <Square      size={16} className="text-gray-300 dark:text-gray-600" />
                    }
                  </span>

                  {/* Hidden real checkbox */}
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={isSelected}
                    onChange={() => onSelectAttendee(isSelected ? null : a.email)}
                  />

                  {/* Avatar */}
                  <div className="w-7 h-7 rounded-full bg-[#F05537]/10 flex items-center justify-center flex-shrink-0">
                    <Ticket size={13} className="text-[#F05537]" />
                  </div>

                  {/* Name + email + order */}
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium truncate ${
                      isSelected
                        ? "text-[#5871A7]"
                        : "text-gray-800 dark:text-gray-200"
                    }`}>
                      {a.fullname || a.email}
                    </p>
                    <p className="text-xs text-gray-400 truncate font-mono">
                      {a.fullname ? a.email : ""}
                      {a.orderId ? ` · Order #${a.orderId}` : ""}
                    </p>
                  </div>

                  {/* Status badge */}
                  <span className={`
                    text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 font-medium capitalize
                    ${statusColour(a.status)}
                  `}>
                    {a.status.replace("_", " ")}
                  </span>

                  {isSelected && (
                    <span className="text-[10px] bg-[#5871A7] text-white px-2 py-0.5 rounded-full flex-shrink-0">
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

// ── Predictive single-email search ────────────────────────────────────────────
interface SingleEmailInputProps {
  attendees: EventbriteAttendee[];
  value:     string;
  onChange:  (v: string) => void;
  onSelect:  (email: string) => void;
  disabled?: boolean;
}

function SingleEmailInput({
  attendees,
  value,
  onChange,
  onSelect,
  disabled,
}: SingleEmailInputProps) {
  const [open,       setOpen]       = useState(false);
  const wrapperRef                  = useRef<HTMLDivElement>(null);

  const suggestions = value.trim()
    ? attendees
        .filter((a) => {
          const q = value.toLowerCase();
          return (
            a.email.toLowerCase().includes(q) ||
            a.fullname.toLowerCase().includes(q)
          );
        })
        .slice(0, 8)
    : [];

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
          onChange={(e) => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          disabled={disabled}
          placeholder="Type a name or email address…"
          className="
            w-full pl-9 pr-9 py-2.5 text-sm rounded-lg
            border border-gray-300 dark:border-[#2D385B]
            bg-white dark:bg-[#1A2235]
            text-gray-900 dark:text-white
            placeholder-gray-400 dark:placeholder-gray-500
            focus:outline-none focus:ring-2 focus:ring-[#5871A7]
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

      {/* Dropdown */}
      {open && suggestions.length > 0 && (
        <div className="
          absolute z-20 mt-1 w-full rounded-xl
          bg-white dark:bg-[#151E3A]
          border border-gray-200 dark:border-[#2D385B]
          shadow-xl overflow-hidden
        ">
          {suggestions.map((a) => (
            <button
              key={a.email}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(a.email);
                onChange(a.email);
                setOpen(false);
              }}
              className="
                w-full flex items-center gap-3 px-4 py-2.5 text-left
                hover:bg-[#5871A7]/8 dark:hover:bg-[#5871A7]/15
                transition-colors
              "
            >
              <div className="w-7 h-7 rounded-full bg-[#F05537]/10 flex items-center justify-center flex-shrink-0">
                <Ticket size={13} className="text-[#F05537]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                  {a.fullname || a.email}
                </p>
                {a.fullname && (
                  <p className="text-xs font-mono text-gray-400 truncate">{a.email}</p>
                )}
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0
                bg-green-100 text-green-700 capitalize">
                {a.status.replace("_", " ")}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function EmailEventbriteBroadcastForm({
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

  // Eventbrite data
  const [events,        setEvents]        = useState<EventbriteEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [existingBroadcast, setExistingBroadcast] = useState<EmailBroadcast | null>(null);
  const [allAttendees,  setAllAttendees]  = useState<EventbriteAttendee[]>([]);

  // Single-send state
  const [selectedAttendee,  setSelectedAttendee]  = useState<string | null>(null);
  const [singleEmailInput,  setSingleEmailInput]  = useState("");
  const [confirmSingleSend, setConfirmSingleSend] = useState(false);
  const [sendingSingle,     setSendingSingle]     = useState(false);

  const singleSendTarget = selectedAttendee || (singleEmailInput.trim() || null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { eventid: "", subject: "", htmltext: "" },
  });

  const eventIdValue  = form.watch("eventid");
  const htmltextValue = form.watch("htmltext");

  const isEditableBroadcast =
    mode === "new" || existingBroadcast?.sentstatus === 0;

  const effectiveEventId = String(
    eventIdValue || (existingBroadcast as any)?.eventid || ""
  );

  // ── Step 1: Read username ──────────────────────────────────────────────────
  useEffect(() => {
    const username = localStorage.getItem("username") ?? "";
    setCurrentUsername(username);
  }, []);

  // ── Step 2: Admin check ────────────────────────────────────────────────────
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

  // ── Step 3: Load Eventbrite events ────────────────────────────────────────
  // Backend proxies to GET /v3/organizations/{org_id}/events/
  useEffect(() => {
    if (!currentUsername) return;
    const fetchEvents = async () => {
      setLoadingEvents(true);
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/eventbrite/events`
        );
        if (res.ok) {
          const data = await res.json();
          const raw: any[] = Array.isArray(data) ? data : data.events ?? [];
          setEvents(
            raw.map((e) => ({
              id:          e.id,
              name:        e.name?.text || e.name || "",
              description: e.description?.text || e.description || "",
              startDate:   e.start?.utc || e.startDate || "",
              endDate:     e.end?.utc   || e.endDate   || "",
              venue:       e.venue?.name || e.venue     || "",
              url:         e.url        || "",
              status:      e.status     || "live",
              capacity:    e.capacity   || 0,
            }))
          );
        }
      } catch (error) {
        console.error("Error fetching Eventbrite events:", error);
        toast.error("Could not load Eventbrite events.");
      } finally {
        setLoadingEvents(false);
      }
    };
    fetchEvents();
  }, [currentUsername]);

  // ── Step 4: Edit mode ─────────────────────────────────────────────────────
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
              eventid:  (data as any).eventid || "",
              subject:  data.subject          || "",
              htmltext: data.htmltext         || "",
            });
          } else {
            toast.error("Broadcast not found.");
            router.push("/dashboard/emaileventbrite-broadcasts");
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

  // ── Reset when event changes ───────────────────────────────────────────────
  useEffect(() => {
    setSelectedAttendee(null);
    setSingleEmailInput("");
    setConfirmSingleSend(false);
    setAllAttendees([]);
  }, [effectiveEventId]);

  // ── Ensure draft id ────────────────────────────────────────────────────────
  const ensureDraftId = async (values: FormValues): Promise<number | null> => {
    if (currentId) return currentId;
    const selectedEvent = events.find((e) => e.id === values.eventid);
    const result = await emailMailingListBroadcastApi.saveDraft({
      userid:     currentUsername,
      awardid:    "",
      worldid:    "",
      listid:     values.eventid,
      listname:   selectedEvent?.name || "",
      endpoint:   "emaileventbrite",
      tenant:     "",
      subject:    values.subject,
      htmltext:   values.htmltext,
      sentstatus: 0 as const,
    });
    if (!result.success || !result.id) return null;
    setCurrentId(result.id);
    return result.id;
  };

  // ── Save draft ─────────────────────────────────────────────────────────────
  const handleSaveDraft = async () => {
    const isValid = await form.trigger();
    if (!isValid) return;
    const values = form.getValues();
    setSavingDraft(true);
    try {
      const selectedEvent = events.find((e) => e.id === values.eventid);
      const result = await emailMailingListBroadcastApi.saveDraft({
        userid:     currentUsername,
        awardid:    "",
        worldid:    "",
        listid:     values.eventid,
        listname:   selectedEvent?.name || "",
        endpoint:   "emaileventbrite",
        tenant:     "",
        subject:    values.subject,
        htmltext:   values.htmltext,
        sentstatus: 0 as const,
        ...(currentId ? { id: currentId } : {}),
      });
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

  // ── Broadcast send — all attendees ────────────────────────────────────────
  const handleSendEmail = async () => {
    if (!confirmSend) { setConfirmSend(true); return; }
    const isValid = await form.trigger();
    if (!isValid) { setConfirmSend(false); return; }

    const values = form.getValues();
    setSending(true);
    try {
      const id = await ensureDraftId(values);
      if (!id) { toast.error("Could not save draft before sending."); return; }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/eventbrite/send`,
        {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userid:      currentUsername,
            eventid:     values.eventid,
            subject:     values.subject,
            htmltext:    values.htmltext,
            broadcastId: id,
          }),
        }
      );

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Email sent to all Eventbrite attendees!");
        router.push("/dashboard/emaileventbrite-broadcasts");
      } else {
        toast.error(data.error || "Failed to send via Eventbrite.");
      }
    } catch (err) {
      toast.error("Error sending email.");
      console.error(err);
    } finally {
      setSending(false);
      setConfirmSend(false);
    }
  };

  // ── Single attendee send ───────────────────────────────────────────────────
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
      if (!id) { toast.error("Could not save draft before sending."); return; }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/eventbrite/send-single`,
        {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userid:      currentUsername,
            eventid:     values.eventid,
            subject:     values.subject,
            htmltext:    values.htmltext,
            recipient:   singleSendTarget,
            broadcastId: id,
          }),
        }
      );

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Email sent to ${singleSendTarget}!`);
        setSelectedAttendee(null);
        setSingleEmailInput("");
        setConfirmSingleSend(false);
      } else {
        toast.error(data.error || "Failed to send.");
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
            onClick={() => router.push("/dashboard/emaileventbrite-broadcasts")}
          >
            <ArrowLeft size={16} className="mr-1" /> Back
          </Button>
          <h1 className="text-xl md:text-3xl font-semibold">View Eventbrite Broadcast</h1>
        </div>
        <hr className="border-[#D4D8EA] dark:border-[#2E4066]" />
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-700 p-6">
          <p className="text-yellow-800 dark:text-yellow-200 font-medium">
            This broadcast has already been sent and cannot be edited.
          </p>
          <div className="mt-4 space-y-3 text-sm text-gray-700 dark:text-gray-300">
            <div><span className="font-medium">Event ID:</span> {(existingBroadcast as any).eventid}</div>
            <div><span className="font-medium">Subject:</span> {existingBroadcast.subject}</div>
            <div><span className="font-medium">Sent at:</span> {new Date(existingBroadcast.updated_at).toLocaleString()}</div>
          </div>
        </div>
      </div>
    );
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  const selectedEvent = events.find((e) => e.id === effectiveEventId);

  const eventStatusColour = (s: string) => {
    switch (s) {
      case "live":      return "bg-green-100 text-green-700";
      case "draft":     return "bg-gray-100 text-gray-500";
      case "canceled":  return "bg-red-100 text-red-600";
      case "completed": return "bg-blue-100 text-blue-700";
      default:          return "bg-gray-100 text-gray-500";
    }
  };

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <div className="lg:w-[85%] space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" size="sm"
            onClick={() => router.push("/dashboard/emaileventbrite-broadcasts")}
          >
            <ArrowLeft size={16} className="mr-1" /> Back
          </Button>
          <h1 className="text-xl md:text-3xl font-semibold flex items-center gap-2.5">
            <span style={{ color: "#F05537" }}>🎟</span>
            {mode === "new" ? "New Eventbrite Broadcast" : "Edit Eventbrite Broadcast"}
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

          {/* ── Section 1: Event Selection ────────────────────────────────── */}
          <section className="space-y-6">
            <h2 className="text-xl font-semibold flex items-center gap-2.5">
              <List className="text-geodrops" /> Eventbrite Event
            </h2>

            <FormField
              name="eventid"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Event</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={!isEditableBroadcast || loadingEvents}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            loadingEvents
                              ? "Loading Eventbrite events…"
                              : events.length === 0
                              ? "No events found — check Eventbrite API key"
                              : "Select an event"
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {events.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{e.name}</span>
                            <span className="text-xs text-gray-500">
                              {e.startDate
                                ? new Date(e.startDate).toLocaleDateString()
                                : ""
                              }
                              {e.venue ? ` · ${e.venue}` : ""}
                              {" · "}
                              <span className="capitalize">{e.status}</span>
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Events are pulled live from your Eventbrite account.
                    The email will be sent to all attendees of the selected event.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Selected event detail card */}
            {selectedEvent && (
              <div className="rounded-lg border border-[#F05537]/30 bg-orange-50/50 dark:bg-orange-900/10 p-5 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-800 dark:text-white text-base">
                        {selectedEvent.name}
                      </h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${eventStatusColour(selectedEvent.status)}`}>
                        {selectedEvent.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                      {selectedEvent.startDate && (
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />
                          {new Date(selectedEvent.startDate).toLocaleString()}
                        </span>
                      )}
                      {selectedEvent.venue && (
                        <span className="flex items-center gap-1">
                          <MapPin size={11} />
                          {selectedEvent.venue}
                        </span>
                      )}
                      {selectedEvent.capacity > 0 && (
                        <span className="flex items-center gap-1">
                          <Ticket size={11} />
                          Capacity: {selectedEvent.capacity.toLocaleString()}
                        </span>
                      )}
                    </div>
                    {selectedEvent.description && (
                      <p className="text-xs text-gray-500 line-clamp-2 mt-1">
                        {selectedEvent.description}
                      </p>
                    )}
                  </div>
                  {selectedEvent.url && (
                    <a
                      href={selectedEvent.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 flex items-center gap-1 text-xs text-[#F05537] hover:opacity-75"
                    >
                      <ExternalLink size={13} />
                      View
                    </a>
                  )}
                </div>
              </div>
            )}
          </section>

          <hr className="border-[#D4D8EA] dark:border-[#2E4066]" />

          {/* ── Section 2: Attendees ──────────────────────────────────────── */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2.5">
              <Users className="text-geodrops" /> Attendees
            </h2>
            <p className="text-sm text-gray-500">
              All attendees of the selected event are shown below.
              {allAttendees.length > 0 && (
                <> Tick a row to target that person, or leave all unticked to send to everyone.</>
              )}
            </p>

            <EventbriteAttendeeList
              eventId={effectiveEventId}
              selectedAttendee={selectedAttendee}
              onSelectAttendee={(email) => {
                setSelectedAttendee(email);
                setSingleEmailInput(email ?? "");
                setConfirmSingleSend(false);
              }}
              onAttendeesLoaded={setAllAttendees}
            />

            {/* Predictive search */}
            {effectiveEventId && allAttendees.length > 0 && (
              <div className="space-y-2 pt-1">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Or type to search and select a single attendee
                </p>
                <SingleEmailInput
                  attendees={allAttendees}
                  value={singleEmailInput}
                  onChange={(v) => {
                    setSingleEmailInput(v);
                    if (
                      selectedAttendee &&
                      !selectedAttendee.toLowerCase().startsWith(v.toLowerCase())
                    ) {
                      setSelectedAttendee(null);
                    }
                    setConfirmSingleSend(false);
                  }}
                  onSelect={(email) => {
                    setSelectedAttendee(email);
                    setSingleEmailInput(email);
                    setConfirmSingleSend(false);
                  }}
                  disabled={!isEditableBroadcast}
                />
              </div>
            )}
          </section>

          <hr className="border-[#D4D8EA] dark:border-[#2E4066]" />

          {/* ── Section 3: Email Content ──────────────────────────────────── */}
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
                    <Textarea
                      placeholder={`<p>Dear attendee,</p>\n<p>We are excited to share this with you...</p>`}
                      className="min-h-[320px] font-mono text-sm resize-y"
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

              {/* Single-send confirm */}
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

              {/* Broadcast confirm */}
              {!singleSendTarget && confirmSend && (
                <div className="rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-700 p-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-orange-800 dark:text-orange-200">Confirm Send to All Attendees</p>
                    <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                      This will email{" "}
                      <strong>all {allAttendees.length} attendees</strong> of event{" "}
                      <strong>{selectedEvent?.name || effectiveEventId}</strong>.
                      This action cannot be undone.
                    </p>
                  </div>
                  <Button type="button" variant="outline" size="sm"
                    onClick={() => setConfirmSend(false)} className="flex-shrink-0"
                  >Cancel</Button>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-between">
                <Button type="button" variant="outline"
                  onClick={() => router.push("/dashboard/emaileventbrite-broadcasts")}
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

                  {/* Adaptive send button */}
                  {singleSendTarget ? (
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
                    <Button
                      type="button"
                      onClick={handleSendEmail}
                      disabled={savingDraft || sending || allAttendees.length === 0}
                      className={`sm:w-auto ${
                        confirmSend
                          ? "bg-orange-600 hover:bg-orange-700"
                          : "bg-[#F05537] hover:bg-[#d94020]"
                      } text-white`}
                    >
                      {sending ? (
                        <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />Sending…</>
                      ) : (
                        <>
                          <Send size={16} className="mr-2" />
                          {confirmSend
                            ? "Confirm Send"
                            : `Send to All Attendees (${allAttendees.length})`
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