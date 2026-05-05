// components/UrlForm.tsx
"use client";

import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Link, Plus, Trash2, ExternalLink, Globe,
  Save, Eye, LayoutList, AlertTriangle,
  ImageIcon, X, Upload, Loader2,
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

interface RowDuplicates {
  linkname?: DuplicateRecord;
}

interface Dropsite {
  worldid:      number;
  worldname:    string;
  description?: string;
}

// A unique linkname + its current linkimg from the API
interface LinkImgEntry {
  linkname: string;
  linkimg:  string | null;
}

// Per-linkname image upload state
interface LinkImgUploadState {
  file:       File | null;
  preview:    string | null;
  uploading:  boolean;
  uploadedUrl: string | null; // URL returned after a successful upload
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

// ── Duplicate warning ─────────────────────────────────────────────────────────
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

// ── LinkImg upload card ────────────────────────────────────────────────────────
function LinkImgCard({
  entry,
  uploadState,
  onFileSelect,
  onClear,
  onUpload,
}: {
  entry:         LinkImgEntry;
  uploadState:   LinkImgUploadState;
  onFileSelect:  (linkname: string, file: File) => void;
  onClear:       (linkname: string) => void;
  onUpload:      (linkname: string) => void;
}) {
  const inputRef   = useRef<HTMLInputElement>(null);
  const currentImg = uploadState.uploadedUrl ?? entry.linkimg ?? null;
  const previewSrc = uploadState.preview ?? currentImg;

  return (
    <div className="rounded-lg border border-[#D4D8EA] dark:border-[#2E4066] p-4 space-y-3">

      {/* Card header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-800 dark:text-white flex items-center gap-1.5">
            <ImageIcon size={14} className="text-[#5871A7]" />
            <span className="font-mono text-[#5871A7]">
              <a
                href={`${process.env.NEXT_PUBLIC_GEO_URL}/links/${entry.linkname}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#5871A7] hover:text-[#4560A0] hover:underline inline-flex items-center gap-1"
              >
                {entry.linkname}
                <ExternalLink size={12} />
              </a>

            </span>
          </p>
          {/* <p className="text-[10px] text-gray-400 dark:text-gray-500 font-mono mt-0.5">
            Saved at {entry.linkname}
          </p> */}
        </div>

        {/* Status badge */}
        {uploadState.uploadedUrl && (
          <span className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full font-medium">
            Uploaded ✓
          </span>
        )}
        {!uploadState.uploadedUrl && currentImg && !uploadState.file && (
          <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium">
            Has image
          </span>
        )}
      </div>

      {/* Image preview / drop zone */}
      <div className="flex items-start gap-4">

        {previewSrc ? (
          /* Preview */
          <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 dark:border-[#2E4066] flex-shrink-0 group">
            <img
              src={previewSrc}
              alt={entry.linkname}
              className="w-full h-full object-cover"
            />
            {/* Hover remove overlay */}
            <button
              type="button"
              onClick={() => onClear(entry.linkname)}
              className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
            >
              <X size={16} className="text-white" />
            </button>
            {uploadState.file && (
              <span className="absolute bottom-1 left-1 text-[9px] bg-blue-600 text-white px-1 rounded">
                New
              </span>
            )}
          </div>
        ) : (
          /* Drop zone */
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="
              w-20 h-20 flex-shrink-0 flex flex-col items-center justify-center gap-1
              rounded-lg border-2 border-dashed border-gray-300 dark:border-[#2E4066]
              hover:border-[#5871A7] text-gray-400 hover:text-[#5871A7]
              transition-colors text-[10px]
            "
          >
            <ImageIcon size={18} />
            <span>Add</span>
          </button>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2 flex-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            className="w-full text-xs h-8"
          >
            <Upload size={12} className="mr-1.5" />
            {previewSrc ? "Change image" : "Select image"}
          </Button>

          {uploadState.file && !uploadState.uploadedUrl && (
            <Button
              type="button"
              size="sm"
              onClick={() => onUpload(entry.linkname)}
              disabled={uploadState.uploading}
              className="w-full text-xs h-8 bg-[#5871A7] hover:bg-[#4560A0] text-white"
            >
              {uploadState.uploading ? (
                <>
                  <Loader2 size={12} className="mr-1.5 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload size={12} className="mr-1.5" />
                  Upload now
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelect(entry.linkname, file);
          e.target.value = "";
        }}
      />
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

  // ── LinkImg section state ──────────────────────────────────────────────────
  // Unique linknames with their current linkimg values from the API
  const [linkImgEntries, setLinkImgEntries]     = useState<LinkImgEntry[]>([]);
  const [loadingLinkImgs, setLoadingLinkImgs]   = useState(false);
  // Upload state keyed by linkname
  const [linkImgUploads, setLinkImgUploads]     = useState<Record<string, LinkImgUploadState>>({});

  // Duplicate state
  const [rowDuplicates, setRowDuplicates] = useState<Record<number, RowDuplicates>>({});

  // Debounce timers
  const debounceTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      worldId: "none",
      urls:    [emptyUrl()],
    },
  });

  const urlFields = form.watch("urls");

  // ── Collect own record ids ────────────────────────────────────────────────────
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
          linkimg?:        string;
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

  // ── Step 5: Load unique linknames + linkimg values from the same endpoint ─────
  // Runs whenever the username is known and access is confirmed.
  // Also re-runs when urlFields change so new rows appear immediately.
  useEffect(() => {
    if (!accessChecked || !adminStatus || !currentUsername) return;

    const fetchLinkImgs = async () => {
      setLoadingLinkImgs(true);
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/urls?userid=${encodeURIComponent(currentUsername)}`
        );
        if (!res.ok) return;

        const data: Array<{
          linkname: string;
          linkimg?: string | null;
        }> = await res.json();

        // De-duplicate by linkname — keep the first occurrence
        const seen  = new Set<string>();
        const unique: LinkImgEntry[] = [];

        (Array.isArray(data) ? data : []).forEach((row) => {
          if (row.linkname && !seen.has(row.linkname)) {
            seen.add(row.linkname);
            unique.push({
              linkname: row.linkname,
              linkimg:  row.linkimg ?? null,
            });
          }
        });

        setLinkImgEntries(unique);
      } catch (err) {
        console.error("Error fetching link images:", err);
      } finally {
        setLoadingLinkImgs(false);
      }
    };

    fetchLinkImgs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessChecked, adminStatus, currentUsername]);

  // ── Step 5b: Add newly typed linknames to the linkimg section on the fly ──────
  // When a user types a valid linkname in the URL rows that isn't yet in
  // linkImgEntries, append it so they can upload an image immediately.
  // useEffect(() => {
  //   const existing = new Set(linkImgEntries.map((e) => e.linkname));
  //   const toAdd: LinkImgEntry[] = [];

  //   urlFields.forEach((row) => {
  //     if (
  //       row.linkname &&
  //       /^[a-z0-9-]+$/.test(row.linkname) &&
  //       !existing.has(row.linkname)
  //     ) {
  //       toAdd.push({ linkname: row.linkname, linkimg: null });
  //       existing.add(row.linkname);
  //     }
  //   });

  //   if (toAdd.length > 0) {
  //     setLinkImgEntries((prev) => [...prev, ...toAdd]);
  //   }
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [urlFields.map((u) => u.linkname).join(",")]);

  // ── Step 6: Linkname-only duplicate checker ───────────────────────────────────
  const checkLinknameDuplicate = useCallback(
    async (rowIndex: number, linkname: string) => {
      if (!linkname.trim()) {
        setRowDuplicates((prev) => {
          const next = { ...prev };
          delete next[rowIndex];
          return next;
        });
        return;
      }

      try {
        const username = localStorage.getItem("username") ?? "";
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/duplicateurls`,
          {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              linkname:   linkname.trim(),
              userid:     username.trim(),
              excludeIds: ownIds,
            }),
          }
        );

        if (!res.ok) return;

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

  const debouncedCheckLinkname = useCallback(
    (rowIndex: number, linkname: string) => {
      clearTimeout(debounceTimers.current[rowIndex]);
      debounceTimers.current[rowIndex] = setTimeout(() => {
        checkLinknameDuplicate(rowIndex, linkname);
      }, 300);
    },
    [checkLinknameDuplicate]
  );

  useEffect(() => {
    urlFields.forEach((row, index) => {
      debouncedCheckLinkname(index, row.linkname);
    });
    return () => {
      Object.values(debounceTimers.current).forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlFields.map((u) => u.linkname).join(",")]);

  // ── LinkImg upload handlers ───────────────────────────────────────────────────
  const handleLinkImgFileSelect = (linkname: string, file: File) => {
    // Revoke previous preview URL if any
    const prev = linkImgUploads[linkname];
    if (prev?.preview) URL.revokeObjectURL(prev.preview);

    setLinkImgUploads((s) => ({
      ...s,
      [linkname]: {
        file,
        preview:     URL.createObjectURL(file),
        uploading:   false,
        uploadedUrl: null,
      },
    }));
  };

  const handleLinkImgClear = (linkname: string) => {
    const prev = linkImgUploads[linkname];
    if (prev?.preview) URL.revokeObjectURL(prev.preview);

    setLinkImgUploads((s) => ({
      ...s,
      [linkname]: {
        file:        null,
        preview:     null,
        uploading:   false,
        uploadedUrl: null,
      },
    }));
  };

  const handleLinkImgUpload = async (linkname: string) => {
    const state = linkImgUploads[linkname];
    if (!state?.file) return;

    setLinkImgUploads((s) => ({
      ...s,
      [linkname]: { ...s[linkname], uploading: true },
    }));

    try {
      const fd = new FormData();
      fd.append("linkname", linkname);
      fd.append("userid",   currentUsername ?? "");
      fd.append("image",    state.file);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/uploadlinkimg`,
        { method: "POST", body: fd }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Upload failed");
      }

      const data = await res.json();
      // API should return { url: "/var/imageurl_<linkname>.<ext>" } or similar
      const uploadedUrl = data.url ?? data.imageurl ?? data.path ?? null;

      // Revoke the object URL — we now have a real server URL
      if (state.preview) URL.revokeObjectURL(state.preview);

      setLinkImgUploads((s) => ({
        ...s,
        [linkname]: {
          file:        null,
          preview:     null,
          uploading:   false,
          uploadedUrl,
        },
      }));

      // Also update the linkImgEntries so the card reflects the new image
      setLinkImgEntries((prev) =>
        prev.map((e) =>
          e.linkname === linkname ? { ...e, linkimg: uploadedUrl } : e
        )
      );

      toast.success(`Image uploaded for /${linkname}`);
    } catch (err: any) {
      console.error("LinkImg upload error:", err);
      toast.error(err.message || "Failed to upload image.");

      setLinkImgUploads((s) => ({
        ...s,
        [linkname]: { ...s[linkname], uploading: false },
      }));
    }
  };

  // Revoke all object URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(linkImgUploads).forEach((s) => {
        if (s.preview) URL.revokeObjectURL(s.preview);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Row helpers ───────────────────────────────────────────────────────────────
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

  const deleteFromBackend = async (index: number) => {
    const current = form.getValues("urls");
    if (current.length <= 1) { toast.error("At least one URL is required."); return; }

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

  const removeUrlRow = (index: number) => {
    const current = form.getValues("urls");
    if (current.length <= 1) { toast.error("At least one URL is required."); return; }
    current[index].id ? deleteFromBackend(index) : removeRowLocally(index);
  };

  const addUrlRow = () => {
    const current = form.getValues("urls");
    if (current.length >= 20) { toast.error("Maximum 20 URLs allowed."); return; }
    form.setValue("urls", [...current, emptyUrl()]);
  };

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

    // Warn if any images are selected but not yet uploaded
    const pendingUploads = Object.entries(linkImgUploads).filter(
      ([, s]) => s.file && !s.uploadedUrl
    );
    if (pendingUploads.length > 0) {
      toast.error(
        `Please upload ${pendingUploads.length} pending image${pendingUploads.length > 1 ? "s" : ""} before saving.`
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

  // ── Pending upload count ──────────────────────────────────────────────────────
  const pendingUploadCount = Object.values(linkImgUploads).filter(
    (s) => s.file && !s.uploadedUrl
  ).length;

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

      {/* ── Pending uploads alert ─────────────────────────────────────────── */}
      {pendingUploadCount > 0 && (
        <div className="flex items-center gap-2.5 rounded-lg border border-blue-300 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-700 px-4 py-3">
          <Upload size={16} className="flex-shrink-0 text-blue-500" />
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <span className="font-semibold">
              {pendingUploadCount} image{pendingUploadCount > 1 ? "s" : ""} selected but not yet uploaded.
            </span>{" "}
            Click "Upload now" on each image before saving.
          </p>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">

          {/* ── Hidden dropsite field ─────────────────────────────────────── */}
          <section hidden>
            <FormField
              name="worldId"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <Select onValueChange={field.onChange} value={field.value} disabled={loadingDropsites}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {dropsites.map((d) => (
                        <SelectItem key={d.worldid} value={d.worldid.toString()}>
                          {d.worldname}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </section>

          {/* ── Section 1: URL List ─────────────────────────────────────── */}
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
              Add the URLs you want to display on your profile & links pages.
              Use the toggles to control their visibility on these pages.
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
                    {/* Row header */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-2">
                        Link {index + 1}
                        {row.id && (
                          <span className="text-[10px] font-mono text-gray-300 dark:text-gray-600">
                            #{row.id}
                          </span>
                        )}
                        {hasDupes && <AlertTriangle size={13} className="text-orange-500" />}
                      </span>

                      <div className="flex items-center gap-2 flex-wrap">
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

                    {/* Duplicate warning */}
                    {hasDupes && dupes && (
                      <DuplicateWarning
                        rowIndex={index}
                        duplicates={dupes}
                        currentUsername={currentUsername}
                      />
                    )}

                    {/* Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        name={`urls.${index}.linkname`}
                        control={form.control}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={hasDupes ? "text-orange-600 dark:text-orange-400" : ""}>
                              Links page
                              {hasDupes && <AlertTriangle size={12} className="inline ml-1 text-orange-500" />}
                            </FormLabel>
                            <p className="text-sm text-gray-500">For Links URL e.g. geo-drops.com/links/ega-01</p>
                            <FormControl>
                              <Input
                                placeholder="e.g. ega-01"
                                className={hasDupes ? "border-orange-400 focus:ring-orange-400" : ""}
                                {...field}
                                onChange={(e) => {
                                  const cleaned = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
                                  field.onChange(cleaned);
                                  debouncedCheckLinkname(index, cleaned);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        name={`urls.${index}.name`}
                        control={form.control}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Site name</FormLabel>
                            <p className="text-sm text-gray-500">Name to show on the links page</p>
                            <FormControl>
                              <Input placeholder="e.g. Instagram, YouTube..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        name={`urls.${index}.url`}
                        control={form.control}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>URL</FormLabel>
                            <p className="text-sm text-gray-500">The destination URL for this link</p>
                            <FormControl>
                              <div className="relative">
                                <Input placeholder="https://www.geo-drops.com" {...field} />
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
                <h3 className="font-semibold text-[#5871A7] text-sm uppercase tracking-wide">Preview</h3>
                <div className="space-y-2">
                  {urlFields.filter((u) => u.name || u.url).map((u, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-2.5 gap-3"
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium truncate">
                          {u.name || <span className="text-gray-400 italic">Unnamed link</span>}
                        </span>
                        {/* {u.linkname && <span className="text-xs text-gray-400">/{u.linkname}</span>} */}
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
                          <a href={u.url} target="_blank" rel="noopener noreferrer"
                            className="text-[#5871A7] hover:text-[#4560A0] flex items-center gap-1 text-xs"
                          >
                            <ExternalLink size={12} />
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

            {/* <hr className="border-[#D4D8EA] dark:border-[#2E4066]" /> */}

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
                disabled={saving || hasDuplicates || pendingUploadCount > 0}
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
                ) : pendingUploadCount > 0 ? (
                  <>
                    <Upload size={16} className="mr-2" />
                    Upload {pendingUploadCount} Image{pendingUploadCount > 1 ? "s" : ""} First
                  </>
                ) : (
                  <>
                    <Save size={16} className="mr-2" />
                    {mode === "add" ? "Save Links" : "Update Links"}
                  </>
                )}
              </Button>
            </div>

          </section>

          <hr className="border-[#D4D8EA] dark:border-[#2E4066]" />

          {/* ── Section 2: Link Images ───────────────────────────────────── */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2.5">
                <ImageIcon className="text-geodrops" size={22} /> Links Page Backgrounds
              </h2>
              {loadingLinkImgs && (
                <span className="flex items-center gap-1.5 text-xs text-gray-400">
                  <Loader2 size={12} className="animate-spin" /> Loading…
                </span>
              )}
            </div>

            <p className="text-sm text-gray-500">
              Upload a background image for each links page. Images are saved independently
              and can be updated at any time without re-saving the whole form.
            </p>

            {!loadingLinkImgs && linkImgEntries.length === 0 && (
              <p className="text-sm text-gray-400 italic">
                No links yet — add links above and they will appear here.
              </p>
            )}

            {linkImgEntries.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {linkImgEntries.map((entry) => (
                  <LinkImgCard
                    key={entry.linkname}
                    entry={entry}
                    uploadState={
                      linkImgUploads[entry.linkname] ?? {
                        file: null, preview: null, uploading: false, uploadedUrl: null,
                      }
                    }
                    onFileSelect={handleLinkImgFileSelect}
                    onClear={handleLinkImgClear}
                    onUpload={handleLinkImgUpload}
                  />
                ))}
              </div>
            )}
          </section>

        </form>
      </Form>
    </div>
  );
}