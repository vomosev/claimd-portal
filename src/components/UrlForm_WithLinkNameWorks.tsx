// dashboard/components/UrlForm.tsx
"use client";

import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Link, Plus, Trash2, ExternalLink, Globe,
  Save, Eye, LayoutList, AlertTriangle,
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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import toast from "react-hot-toast";

// ── Types ──────────────────────────────────────────────────────────────────────
interface DuplicateRecord {
  id:       number;
  name:     string;
  linkname: string;
  url:      string;
  userid?:  string;
}

// Only linkname is checked — keep the interface focused
interface RowDuplicates {
  linkname?: DuplicateRecord;
}

interface Dropsite {
  worldid:      number;
  worldname:    string;
  description?: string;
}

interface UrlFormProps {
  mode:      "add" | "edit";
  recordId?: number;
}

// ── Inline toggle ─────────────────────────────────────────────────────────────
interface InlineToggleProps {
  label:    string;
  icon:     React.ElementType;
  value:    0 | 1;
  onChange: (val: 0 | 1) => void;
}

function InlineToggle({ label, icon: Icon, value, onChange }: InlineToggleProps) {
  const enabled = value === 1;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(enabled ? 0 : 1)}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium
        transition-colors duration-150 select-none
        ${enabled
          ? "border-[#5871A7] bg-[#5871A7]/10 text-[#5871A7] dark:bg-[#5871A7]/20"
          : "border-gray-200 dark:border-[#2E4066] bg-white dark:bg-transparent text-gray-400 hover:border-gray-300"
        }
      `}
    >
      <Icon size={13} />
      {label}
      <span className={`
        ml-1 inline-flex h-4 w-7 flex-shrink-0 rounded-full relative transition-colors duration-200
        ${enabled ? "bg-[#5871A7]" : "bg-gray-200 dark:bg-gray-700"}
      `}>
        <span className={`
          absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform duration-200
          ${enabled ? "translate-x-3.5" : "translate-x-0.5"}
        `} />
      </span>
    </button>
  );
}

// ── Duplicate warning — linkname only ─────────────────────────────────────────
function DuplicateWarning({
  rowIndex,
  duplicates,
  currentUsername,
}: {
  rowIndex:        number;
  duplicates:      RowDuplicates;
  currentUsername: string | null;
}) {
  if (!duplicates.linkname) return null;

  const record = duplicates.linkname;
  const isOwn  = currentUsername && record.userid === currentUsername;

  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-700 px-4 py-3 text-sm">
      <AlertTriangle size={16} className="flex-shrink-0 text-orange-500 mt-0.5" />
      <div className="space-y-1">
        <p className="font-medium text-orange-800 dark:text-orange-200">
          Link name already taken on Link {rowIndex + 1}
        </p>
        <p className="text-orange-700 dark:text-orange-300 text-xs">
          <span className="font-semibold">Link Name</span>{" "}
          {isOwn
            ? `already used by one of your own links (ID #${record.id}).`
            : "is already taken — please choose a different link name."
          }
        </p>
      </div>
    </div>
  );
}

// ── Schema ─────────────────────────────────────────────────────────────────────
const urlEntrySchema = z.object({
  id:             z.number().optional(),
  name:           z.string().min(1, "Site name is required").max(200),
  linkname:       z
    .string()
    .min(1, "Link name is required")
    .max(200)
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers and hyphens are allowed"),
  url:            z
    .string()
    .min(1, "URL is required")
    .url("Must be a valid URL (include https://)"),
  profiledisplay: z.union([z.literal(0), z.literal(1)]),
  linkdisplay:    z.union([z.literal(0), z.literal(1)]),
});

const schema = z.object({
  worldId: z.string().optional(),
  urls: z
    .array(urlEntrySchema)
    .min(1, "At least one URL is required")
    .max(20, "Maximum 20 URLs allowed"),
});

type FormValues    = z.infer<typeof schema>;
type UrlEntryValue = z.infer<typeof urlEntrySchema>;

// ── Default empty URL row ─────────────────────────────────────────────────────
const emptyUrl = (): UrlEntryValue => ({
  name:           "",
  linkname:       "",
  url:            "",
  profiledisplay: 0,
  linkdisplay:    0,
});

// ── Component ──────────────────────────────────────────────────────────────────
export default function UrlForm({ mode, recordId }: UrlFormProps) {
  const router = useRouter();

  // Auth state
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [accessChecked, setAccessChecked]     = useState(false);
  const [adminStatus, setAdminStatus]         = useState(false);

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  // Data state
  const [dropsites, setDropsites]               = useState<Dropsite[]>([]);
  const [loadingDropsites, setLoadingDropsites] = useState(false);
  const [originalValues, setOriginalValues]     = useState<FormValues | null>(null);

  // Duplicate state — only tracks linkname per row
  const [rowDuplicates, setRowDuplicates] = useState<Record<number, RowDuplicates>>({});

  // Per-row debounce timers
  const debounceTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      worldId: "none",
      urls:    [emptyUrl()],
    },
  });

  const urlFields = form.watch("urls");

  // ── Collect own record ids for edit mode ─────────────────────────────────────
  const ownIds = (() => {
    if (mode !== "edit" || !originalValues) return [];
    return originalValues.urls
      .map((u) => u.id)
      .filter((id): id is number => id !== undefined);
  })();

  // ── Step 1: Read username ─────────────────────────────────────────────────────
  useEffect(() => {
    const username = localStorage.getItem("username") ?? "";
    setCurrentUsername(username);
  }, []);

  // ── Step 2: Check admin access ────────────────────────────────────────────────
  useEffect(() => {
    if (currentUsername === null) return;

    if (currentUsername === "") {
      setAdminStatus(false);
      setAccessChecked(true);
      setLoading(false);
      router.push("/dashboard");
      return;
    }

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/getuserrole/${currentUsername}`)
      .then((res) => res.json())
      .then((data) => {
        const isAdmin =
          String(data.role).includes("admin") ||
          String(data.role).includes("superuser");

        setAdminStatus(isAdmin);
        setAccessChecked(true);

        if (!isAdmin) {
          toast.error("Access denied. Admin privileges required.");
          setLoading(false);
          router.push("/dashboard");
          return;
        }

        if (mode === "add") setLoading(false);
      })
      .catch(() => {
        setAdminStatus(false);
        setAccessChecked(true);
        setLoading(false);
        router.push("/dashboard");
      });
  }, [currentUsername, router, mode]);

  // ── Step 3: Load dropsites ────────────────────────────────────────────────────
  useEffect(() => {
    if (!accessChecked || !adminStatus || currentUsername === null) return;

    const fetchDropsites = async () => {
      setLoadingDropsites(true);
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/worldawards/listbyuser/${currentUsername}`
        );
        if (response.ok) {
          const data = await response.json();
          setDropsites(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error("Error fetching dropsites:", error);
      } finally {
        setLoadingDropsites(false);
      }
    };

    fetchDropsites();
  }, [accessChecked, adminStatus, currentUsername]);

  // ── Step 4: Load existing record for edit mode ────────────────────────────────
  useEffect(() => {
    if (!accessChecked || !adminStatus) return;
    if (mode !== "edit" || !recordId) return;

    const fetchRecord = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/urls/${recordId}`
        );

        if (!response.ok) {
          toast.error("Record not found.");
          router.push("/dashboard/list-urls");
          return;
        }

        const data = await response.json();

        const rows: Array<{
          id:              number;
          name:            string;
          linkname:        string;
          url:             string;
          worldid?:        string;
          profiledisplay?: number;
          linkdisplay?:    number;
        }> = Array.isArray(data) ? data : [data];

        const formValues: FormValues = {
          worldId: rows[0]?.worldid || "none",
          urls: rows.map((r): UrlEntryValue => ({
            id:             r.id,
            name:           r.name     ?? "",
            linkname:       r.linkname ?? "",
            url:            r.url      ?? "",
            profiledisplay: r.profiledisplay === 1 ? 1 : 0,
            linkdisplay:    r.linkdisplay    === 1 ? 1 : 0,
          })),
        };

        setOriginalValues(formValues);
        form.reset(formValues);
      } catch (error) {
        console.error("Error fetching URL record:", error);
        toast.error("Failed to load record.");
      } finally {
        setLoading(false);
      }
    };

    fetchRecord();
  }, [accessChecked, adminStatus, mode, recordId, form, router]);

  // ── Step 5: Linkname-only duplicate checker ───────────────────────────────────
  // Called on every keystroke via the debounced watcher below.
  // Only sends the linkname value — nothing else.
  const checkLinknameDuplicate = useCallback(
    async (rowIndex: number, linkname: string) => {
      // Clear warning immediately if field is empty
      if (!linkname.trim()) {
        setRowDuplicates((prev) => {
          const next = { ...prev };
          delete next[rowIndex];
          return next;
        });
        return;
      }

      try {
        if (!accessChecked || !adminStatus || currentUsername === null) return;
        const username = localStorage.getItem("username") ?? "";
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/duplicateurls`,
          {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              linkname:   linkname.trim(),
              userid:   username.trim(),
              excludeIds: ownIds,
            }),
          }
        );

        if (!res.ok) return;

        // { linkname?: record } or {}
        const data: RowDuplicates = await res.json();

        setRowDuplicates((prev) => {
          if (!data.linkname) {
            const next = { ...prev };
            delete next[rowIndex];
            return next;
          }
          return { ...prev, [rowIndex]: data };
        });

      } catch (err) {
        console.error("Duplicate linkname check error:", err);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ownIds]
  );

  // ── Debounced per-row trigger ─────────────────────────────────────────────────
  // Fires 300 ms after the user stops typing in the linkname field.
  // Each row has its own timer slot so rows don't interfere with each other.
  const debouncedCheckLinkname = useCallback(
    (rowIndex: number, linkname: string) => {
      clearTimeout(debounceTimers.current[rowIndex]);
      debounceTimers.current[rowIndex] = setTimeout(() => {
        checkLinknameDuplicate(rowIndex, linkname);
      }, 300);
    },
    [checkLinknameDuplicate]
  );

  // Watch only the linkname field of every row
  useEffect(() => {
    urlFields.forEach((row, index) => {
      debouncedCheckLinkname(index, row.linkname);
    });

    return () => {
      Object.values(debounceTimers.current).forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlFields.map((u) => u.linkname).join(",")]);
  // ↑ Only re-runs when a linkname value actually changes — not on every field edit

  // ── Shared helper: remove row from form state + clean up ──────────────────────
  const removeRowLocally = (index: number) => {
    const current = form.getValues("urls");
    form.setValue("urls", current.filter((_, i) => i !== index));

    clearTimeout(debounceTimers.current[index]);
    delete debounceTimers.current[index];

    setRowDuplicates((prev) => {
      const next: Record<number, RowDuplicates> = {};
      Object.entries(prev).forEach(([key, val]) => {
        const k = Number(key);
        if (k < index)      next[k]     = val;
        else if (k > index) next[k - 1] = val;
      });
      return next;
    });
  };

  // ── Delete row — calls backend if the row has an id ───────────────────────────
  const deleteFromBackend = async (index: number) => {
    const current = form.getValues("urls");

    if (current.length <= 1) {
      toast.error("At least one URL is required.");
      return;
    }

    const row = current[index];

    if (row.id) {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/urls/${row.id}`,
          { method: "DELETE" }
        );

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          toast.error(err.error || "Failed to delete link.");
          return;
        }

        toast.success("Link deleted successfully.");
      } catch (err) {
        console.error("Error deleting URL:", err);
        toast.error("Failed to delete link.");
        return;
      }
    }

    removeRowLocally(index);
  };

  // ── Remove row ────────────────────────────────────────────────────────────────
  const removeUrlRow = (index: number) => {
    const current = form.getValues("urls");
    const row     = current[index];

    if (current.length <= 1) {
      toast.error("At least one URL is required.");
      return;
    }

    if (row.id) {
      deleteFromBackend(index);
      return;
    }

    removeRowLocally(index);
  };

  // ── Add a new empty row ───────────────────────────────────────────────────────
  const addUrlRow = () => {
    const current = form.getValues("urls");
    if (current.length >= 20) {
      toast.error("Maximum 20 URLs allowed.");
      return;
    }
    form.setValue("urls", [...current, emptyUrl()]);
  };

  // ── Change detection ──────────────────────────────────────────────────────────
  const hasFormChanges = (current: FormValues): boolean => {
    if (mode === "add") return true;
    if (!originalValues) return true;
    return JSON.stringify(current) !== JSON.stringify(originalValues);
  };

  const totalDuplicateWarnings = Object.keys(rowDuplicates).length;
  const hasDuplicates          = totalDuplicateWarnings > 0;

  // ── Submit ────────────────────────────────────────────────────────────────────
  const onSubmit = async (values: FormValues) => {
    if (mode === "edit" && !hasFormChanges(values)) {
      toast.error("No changes detected.");
      return;
    }

    if (hasDuplicates) {
      toast.error(
        `Please resolve ${totalDuplicateWarnings} duplicate link name${totalDuplicateWarnings > 1 ? "s" : ""} before saving.`
      );
      return;
    }

    setSaving(true);

    try {
      const payload = {
        userid:  currentUsername,
        worldid: values.worldId && values.worldId !== "none" ? values.worldId : null,
        tenant:  "",
        urls:    values.urls,
        ...(mode === "edit" && recordId ? { groupId: recordId } : {}),
      };

      const endpoint =
        mode === "add"
          ? `${process.env.NEXT_PUBLIC_API_URL}/urls`
          : `${process.env.NEXT_PUBLIC_API_URL}/urls/${recordId}`;

      const response = await fetch(endpoint, {
        method:  mode === "add" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Request failed");
      }

      toast.success(
        mode === "add" ? "URLs saved successfully!" : "URLs updated successfully!"
      );

      if (mode === "edit") setOriginalValues(values);
      router.push("/dashboard/list-urls");
    } catch (error) {
      console.error("Error saving URLs:", error);
      toast.error(`Failed to save: ${error}`);
    } finally {
      setSaving(false);
    }
  };

  // ── Render guards ─────────────────────────────────────────────────────────────
  if (currentUsername === null) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5871A7] mx-auto" />
          <p className="text-gray-500 text-sm">Loading...</p>
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

  // ── Main render ───────────────────────────────────────────────────────────────
  return (
    <div className="lg:w-[85%] space-y-6">

      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-semibold">
          {mode === "add" ? "Add" : "Edit"} Link(s)
        </h1>
        <p className="text-sm italic text-gray-500">
          {mode === "edit" ? "Update your links" : ""}
        </p>
      </div>
      <hr className="border-[#D4D8EA] dark:border-[#2E4066]" />

      {/* ── Global duplicate alert ────────────────────────────────────────── */}
      {hasDuplicates && (
        <div className="flex items-center gap-2.5 rounded-lg border border-orange-300 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-700 px-4 py-3">
          <AlertTriangle size={16} className="flex-shrink-0 text-orange-500" />
          <p className="text-sm text-orange-800 dark:text-orange-200">
            <span className="font-semibold">
              {totalDuplicateWarnings} link name{totalDuplicateWarnings > 1 ? "s are" : " is"} already taken.
            </span>{" "}
            Please choose a different link name before saving.
          </p>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">

          {/* ── Section 1: Dropsite (hidden) ─────────────────────────────── */}
          <section className="space-y-6" hidden>
            <h2 className="text-xl font-semibold flex items-center gap-2.5">
              <Globe className="text-geodrops" /> Dropsite (optional)
            </h2>
            <FormField
              name="worldId"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Show link on this Dropsite's links page</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={loadingDropsites}
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
                      <SelectItem value="none">None</SelectItem>
                      {dropsites.map((d) => (
                        <SelectItem key={d.worldid} value={d.worldid.toString()}>
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
                    Optionally link these URLs to a specific Dropsite.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </section>

          {/* ── Section 2: URL List ─────────────────────────────────────── */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2.5">
                <Link className="text-geodrops" /> Links
              </h2>
              <span className="text-sm text-gray-500">
                {urlFields.length} / 20 links
              </span>
            </div>

            <p className="text-sm text-gray-500">
              Add the site names and URLs you want to display on your link page.
              Use the toggles on each link to control where it appears publicly.
            </p>

            <div className="space-y-4">
              {urlFields.map((row, index) => {
                const dupes    = rowDuplicates[index];
                const hasDupes = !!dupes?.linkname;

                return (
                  <div
                    key={index}
                    className={`
                      rounded-lg border p-4 space-y-4 transition-colors
                      ${hasDupes
                        ? "border-orange-300 dark:border-orange-700 bg-orange-50/30 dark:bg-orange-900/10"
                        : "border-[#D4D8EA] dark:border-[#2E4066]"
                      }
                    `}
                  >
                    {/* ── Row header ─────────────────────────────────────── */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-2">
                        Link {index + 1}
                        {row.id && (
                          <span className="text-[10px] font-mono text-gray-300 dark:text-gray-600">
                            #{row.id}
                          </span>
                        )}
                        {hasDupes && (
                          <AlertTriangle size={13} className="text-orange-500" />
                        )}
                      </span>

                      <div className="flex items-center gap-2 flex-wrap">

                        {/* profiledisplay toggle */}
                        <FormField
                          name={`urls.${index}.profiledisplay`}
                          control={form.control}
                          render={({ field }) => (
                            <FormItem className="m-0 p-0 space-y-0">
                              <FormControl>
                                <InlineToggle
                                  label="Profile"
                                  icon={Eye}
                                  value={field.value as 0 | 1}
                                  onChange={(val) => field.onChange(val)}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        {/* linkdisplay toggle */}
                        <FormField
                          name={`urls.${index}.linkdisplay`}
                          control={form.control}
                          render={({ field }) => (
                            <FormItem className="m-0 p-0 space-y-0">
                              <FormControl>
                                <InlineToggle
                                  label="Links page"
                                  icon={LayoutList}
                                  value={field.value as 0 | 1}
                                  onChange={(val) => field.onChange(val)}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        {/* Remove / delete row */}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeUrlRow(index)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 h-7 w-7 p-0"
                          disabled={urlFields.length <= 1}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>

                    {/* ── Linkname duplicate warning ──────────────────────── */}
                    {hasDupes && dupes && (
                      <DuplicateWarning
                        rowIndex={index}
                        duplicates={dupes}
                        currentUsername={currentUsername}
                      />
                    )}

                    {/* ── Fields ─────────────────────────────────────────── */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                      {/* Link Name — checked against /duplicateurls on every keystroke */}
                      <FormField
                        name={`urls.${index}.linkname`}
                        control={form.control}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel
                              className={hasDupes ? "text-orange-600 dark:text-orange-400" : ""}
                            >
                              Link Name
                              {hasDupes && (
                                <AlertTriangle size={12} className="inline ml-1 text-orange-500" />
                              )}
                            </FormLabel>
                            <p className="text-sm text-gray-500">
                              URL name e.g. ega-songs01
                            </p>
                            <FormControl>
                              <Input
                                placeholder="e.g. ega-songs01"
                                className={
                                  hasDupes
                                    ? "border-orange-400 focus:ring-orange-400"
                                    : ""
                                }
                                {...field}
                                onChange={(e) => {
                                  // Strip invalid chars + force lowercase as user types
                                  const cleaned = e.target.value
                                    .toLowerCase()
                                    .replace(/[^a-z0-9-]/g, "");
                                  field.onChange(cleaned);
                                  // Trigger duplicate check immediately on each keystroke
                                  // (the debounce inside debouncedCheckLinkname handles throttling)
                                  debouncedCheckLinkname(index, cleaned);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Site Name */}
                      <FormField
                        name={`urls.${index}.name`}
                        control={form.control}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Site Name</FormLabel>
                            <p className="text-sm text-gray-500">
                              Name to show on the links page
                            </p>
                            <FormControl>
                              <Input
                                placeholder="e.g. Instagram, YouTube..."
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* URL */}
                      <FormField
                        name={`urls.${index}.url`}
                        control={form.control}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>URL</FormLabel>
                            <p className="text-sm text-gray-500">
                              The destination URL for this link
                            </p>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  placeholder="https://www.geo-drops.com"
                                  {...field}
                                />
                                {field.value?.startsWith("http") && (
                                  <a
                                    href={field.value}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5871A7] hover:text-[#4560A0]"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <ExternalLink size={16} />
                                  </a>
                                )}
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add row button */}
            <Button
              type="button"
              variant="outline"
              onClick={addUrlRow}
              disabled={urlFields.length >= 20}
              className="w-full border-dashed border-[#5871A7] text-[#5871A7] hover:bg-[#5871A7]/10"
            >
              <Plus size={16} className="mr-2" />
              Add Another Link
            </Button>

            {/* Preview */}
            {urlFields.some((u) => u.name || u.url) && (
              <div className="rounded-lg border border-[#5871A7]/30 bg-blue-50/50 dark:bg-blue-900/10 p-5 space-y-3">
                <h3 className="font-semibold text-[#5871A7] text-sm uppercase tracking-wide">
                  Preview
                </h3>
                <div className="space-y-2">
                  {urlFields
                    .filter((u) => u.name || u.url)
                    .map((u, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-2.5 gap-3"
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-medium truncate">
                            {u.name || (
                              <span className="text-gray-400 italic">Unnamed link</span>
                            )}
                          </span>
                          {u.linkname && (
                            <span className="text-xs text-gray-400">/{u.linkname}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {u.profiledisplay === 1 && (
                            <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-[#5871A7]/10 text-[#5871A7]">
                              <Eye size={10} /> Profile
                            </span>
                          )}
                          {u.linkdisplay === 1 && (
                            <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-[#5871A7]/10 text-[#5871A7]">
                              <LayoutList size={10} /> Links
                            </span>
                          )}
                          {u.url?.startsWith("http") ? (
                            <a
                              href={u.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#5871A7] hover:text-[#4560A0] flex items-center gap-1 text-xs"
                            >
                              Visit <ExternalLink size={12} />
                            </a>
                          ) : (
                            <span className="text-gray-400 text-xs italic">No URL</span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </section>

          <hr className="border-[#D4D8EA] dark:border-[#2E4066]" />

          {/* ── Actions ──────────────────────────────────────────────────── */}
          <div className="flex flex-col md:flex-row md:justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              className="md:w-[10%]"
              onClick={() => router.push("/dashboard/list-urls")}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="md:w-[40%] bg-[#5871A7] hover:bg-[#4560A0] text-white disabled:opacity-60"
              disabled={saving || hasDuplicates}
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  {mode === "add" ? "Saving..." : "Updating..."}
                </>
              ) : hasDuplicates ? (
                <>
                  <AlertTriangle size={16} className="mr-2" />
                  Resolve {totalDuplicateWarnings} Duplicate{totalDuplicateWarnings > 1 ? "s" : ""} First
                </>
              ) : (
                <>
                  <Save size={16} className="mr-2" />
                  {mode === "add" ? "Save Links" : "Update Links"}
                </>
              )}
            </Button>
          </div>

        </form>
      </Form>
    </div>
  );
}