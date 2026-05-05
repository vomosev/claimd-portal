// components/EmailTeamBroadcastForm.tsx
"use client";

import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Mail, Save, Send, ArrowLeft, Globe,
  FileText, AlignLeft, Users,
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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import toast from "react-hot-toast";
import {
  emailTeamBroadcastApi,
  EmailBroadcast,
} from "@/services/emailTeamBroadcastApi";
import { emailBroadcastApi } from "@/services/emailBroadcastApi";
import TeamUserIdList from "./TeamUserIdList";

// ── Types ──────────────────────────────────────────────────────────────────────
export interface WorldSearchResult {
  worldid:      string;
  worldname?:   string;
  description?: string;
  worldimg?:    string;
  tenant?:      string;
}

interface UserRecord {
  userid:    string;
  email?:    string;
  username?: string;
}

interface EmailBroadcastFormProps {
  mode:         "new" | "edit";
  broadcastId?: number;
}

// ── Schema ─────────────────────────────────────────────────────────────────────
const schema = z.object({
  worldid:  z.string().min(1, "Dropsite ID is required"),
  subject:  z.string().min(1, "Subject is required").max(500),
  htmltext: z.string().min(1, "Email content is required"),
});

type FormValues = z.infer<typeof schema>;

// ── Component ──────────────────────────────────────────────────────────────────
export default function EmailTeamBroadcastForm({
  mode,
  broadcastId,
}: EmailBroadcastFormProps) {
  const router = useRouter();

  // ── Auth state ─────────────────────────────────────────────────────────────
  const [currentUsername, setCurrentUsername] = useState("");
  const [accessChecked, setAccessChecked]     = useState(false);
  const [adminStatus, setAdminStatus]         = useState(false);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [loading, setLoading]         = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [sending, setSending]         = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);
  const [currentId, setCurrentId]     = useState<number | undefined>(broadcastId);

  // ── Dropsite state ─────────────────────────────────────────────────────────
  const [selectedWorld, setSelectedWorld]         = useState<WorldSearchResult | null>(null);
  const [existingBroadcast, setExistingBroadcast] = useState<EmailBroadcast | null>(null);
  const [dropsites, setDropsites]                 = useState<WorldSearchResult[]>([]);
  const [loadingDropsites, setLoadingDropsites]   = useState(false);

  // ── Recipient / single-send state ─────────────────────────────────────────
  const [allUsers, setAllUsers]                     = useState<UserRecord[]>([]);
  const [selectedRecipient, setSelectedRecipient]   = useState<string | null>(null);
  const [recipientSearch, setRecipientSearch]       = useState("");
  const [confirmSingleSend, setConfirmSingleSend]   = useState(false);
  const [sendingSingle, setSendingSingle]           = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { worldid: "", subject: "", htmltext: "" },
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

  // ── Step 3: Load dropsites ─────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUsername) return;
    const fetchDropsites = async () => {
      setLoadingDropsites(true);
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/worldawards/listbyuser/${currentUsername}`
        );
        if (res.ok) {
          const data = await res.json();
          setDropsites(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error("Error fetching dropsites:", error);
      } finally {
        setLoadingDropsites(false);
      }
    };
    fetchDropsites();
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
              worldid:  data.worldid  || "",
              subject:  data.subject  || "",
              htmltext: data.htmltext || "",
            });
          } else {
            toast.error("Broadcast not found.");
            router.push("/dashboard/emailteam-broadcasts");
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

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleWorldSelect = (world: WorldSearchResult) => {
    setSelectedWorld(world);
    form.setValue("worldid", String(world.worldid), {
      shouldValidate: true,
      shouldDirty:    true,
    });
    // Reset single-send state when world changes
    setSelectedRecipient(null);
    setConfirmSingleSend(false);
    setRecipientSearch("");
  };

  // ── Ensure draft id ────────────────────────────────────────────────────────
  const ensureDraftId = async (values: FormValues): Promise<number | null> => {
    if (currentId) return currentId;
    const draftResult = await emailTeamBroadcastApi.saveDraft({
      userid:     currentUsername,
      awardid:    "",
      worldid:    values.worldid,
      endpoint:   "emailteam",
      tenant:     selectedWorld?.tenant || existingBroadcast?.tenant || "",
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
      const payload = {
        userid:     currentUsername,
        awardid:    "",
        worldid:    values.worldid,
        endpoint:   "emailteam",
        tenant:     selectedWorld?.tenant || existingBroadcast?.tenant || "",
        subject:    values.subject,
        htmltext:   values.htmltext,
        sentstatus: 0 as const,
        ...(currentId ? { id: currentId } : {}),
      };
      const result = await emailTeamBroadcastApi.saveDraft(payload);
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

  // ── Broadcast to all ───────────────────────────────────────────────────────
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
      const result = await emailTeamBroadcastApi.sendEmail({
        id,
        userid:  currentUsername,
        worldid: values.worldid,
        subject: values.subject,
        htmltext: values.htmltext,
      });
      if (result.success) {
        toast.success("Email broadcast sent successfully!");
        router.push("/dashboard/emailteam-broadcasts");
      } else {
        toast.error("Failed to send email: " + (result.error || "Unknown error"));
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
    if (!selectedRecipient) {
      toast.error("Please select a recipient first.");
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
      const result = await emailTeamBroadcastApi.sendEmail({
        id,
        userid:     currentUsername,
        worldid:    values.worldid,
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

  // ── Derived values ─────────────────────────────────────────────────────────
  const worldIdValue      = form.watch("worldid");
  const htmltextValue     = form.watch("htmltext");
  const effectiveWorldId  = String(worldIdValue || existingBroadcast?.worldid || "");
  const isEditableBroadcast =
    mode === "new" || existingBroadcast?.sentstatus === 0;

  // ── Render guards ──────────────────────────────────────────────────────────
  if (!accessChecked || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5871A7] mx-auto" />
          <p className="text-gray-500 text-sm">
            {!accessChecked ? "Checking permissions..." : "Loading broadcast..."}
          </p>
        </div>
      </div>
    );
  }

  if (!adminStatus) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500">Redirecting...</p>
      </div>
    );
  }

  if (mode === "edit" && existingBroadcast?.sentstatus === 1) {
    return (
      <div className="lg:w-[85%] space-y-6">
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" size="sm"
            onClick={() => router.push("/dashboard/emailteam-broadcasts")}
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
            <div><span className="font-medium">Dropsite ID:</span> {existingBroadcast.worldid}</div>
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
            onClick={() => router.push("/dashboard/emailteam-broadcasts")}
          >
            <ArrowLeft size={16} className="mr-1" /> Back
          </Button>
          <h1 className="text-3xl font-semibold">
            {mode === "new" ? "New Street Team Broadcast" : "Edit Street Team Broadcast"}
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

          {/* ── Section 1: Street Team Selection ─────────────────────────────── */}
          <section className="space-y-6">
            <h2 className="text-xl font-semibold flex items-center gap-2.5">
              <Globe className="text-geodrops" /> Street Team Selection
            </h2>

            <FormField
              name="worldid"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Street Team</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      const world = dropsites.find((d) => String(d.worldid) === value);
                      if (world) handleWorldSelect(world);
                    }}
                    value={field.value ? String(field.value) : ""}
                    disabled={!isEditableBroadcast || loadingDropsites}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            loadingDropsites
                              ? "Loading dropsites..."
                              : dropsites.length === 0
                              ? "No dropsites available"
                              : "Select a Dropsite"
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {dropsites.map((d) => (
                        <SelectItem key={d.worldid} value={String(d.worldid)}>
                          <div className="flex flex-col">
                            <span className="font-medium">{d.worldname}</span>
                            {d.description && (
                              <span className="text-xs text-gray-500 truncate max-w-[300px]">
                                {d.description}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Select a Street Team. The email will be sent to all users
                    registered to the selected Street Team.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </section>

          <hr className="border-[#D4D8EA] dark:border-[#2E4066]" />

          {/* ── Section 2: Recipient List ──────────────────────────────────── */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2.5">
              <Users className="text-geodrops" /> Recipients
            </h2>
            <p className="text-sm text-gray-500">
              All users registered to this Street Team are listed below.
              {allUsers.length > 0 && (
                <> Tick a name to target that person, or leave all unticked to broadcast to everyone.</>
              )}
            </p>

            <TeamUserIdList
              worldId={effectiveWorldId}
              selectedRecipient={selectedRecipient}
              onSelectRecipient={(r) => {
                setSelectedRecipient(r);
                setConfirmSingleSend(false);
              }}
              search={recipientSearch}
              onSearchChange={setRecipientSearch}
              onUsersLoaded={setAllUsers}
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
                        placeholder="Enter email subject..."
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

              {/* Single-send confirm banner */}
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
                  >
                    Cancel
                  </Button>
                </div>
              )}

              {/* Broadcast confirm banner */}
              {!selectedRecipient && confirmSend && (
                <div className="rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-700 p-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-orange-800 dark:text-orange-200">Confirm Send</p>
                    <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                      This will send the email to{" "}
                      <strong>all {allUsers.length} registered users</strong> of Dropsite{" "}
                      <strong>{form.getValues("worldid")}</strong>. This action cannot be undone.
                    </p>
                  </div>
                  <Button type="button" variant="outline" size="sm"
                    onClick={() => setConfirmSend(false)} className="flex-shrink-0"
                  >
                    Cancel
                  </Button>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-between">
                <Button type="button" variant="outline"
                  onClick={() => router.push("/dashboard/emailteam-broadcasts")}
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
                      <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#5871A7] mr-2" />Saving Draft...</>
                    ) : (
                      <><Save size={16} className="mr-2" />Save Draft</>
                    )}
                  </Button>

                  {/* ── Send button — adapts to single or broadcast ───────── */}
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
                        <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />Sending...</>
                      ) : (
                        <>
                          <Send size={16} className="mr-2" />
                          {confirmSingleSend
                            ? "Confirm Single Send"
                            : `Send to ${selectedRecipient}`
                          }
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={handleSendEmail}
                      disabled={savingDraft || sending || allUsers.length === 0}
                      className={`sm:w-auto ${
                        confirmSend
                          ? "bg-orange-600 hover:bg-orange-700"
                          : "bg-[#5871A7] hover:bg-[#4560A0]"
                      } text-white`}
                    >
                      {sending ? (
                        <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />Sending...</>
                      ) : (
                        <>
                          <Send size={16} className="mr-2" />
                          {confirmSend
                            ? "Confirm Send"
                            : `Broadcast to All (${allUsers.length})`
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