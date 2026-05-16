// components/ListExportForm.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Download, Users, Globe, Mail,
  Loader2, CheckCircle, AlertCircle,
  ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import toast from "react-hot-toast";

// ── Types ──────────────────────────────────────────────────────────────────────
type ExportType = "dropusers" | "dropsiteusers" | "mailinglist";

interface ExportOption {
  id:          ExportType;
  label:       string;
  description: string;
  icon:        React.ElementType;
  color:       string;
  fields:      ExportField[];
}

interface ExportField {
  key:         string;
  label:       string;
  placeholder: string;
  required:    boolean;
}

interface ExportState {
  loading:  boolean;
  success:  boolean | null;
  rowCount: number | null;
  error:    string | null;
}

interface DropEntry {
  awardid:  string;
  name?:    string;
}

interface DropsiteEntry {
  worldid:   number;
  worldname: string;
}

interface MailingListEntry {
  listid:   string;
  listname: string;
}

// ── Export config ──────────────────────────────────────────────────────────────
const EXPORT_OPTIONS: ExportOption[] = [
  {
    id:          "dropusers",
    label:       "Drop / Award Users",
    description: "Export all users who have claimed a specific Drop/Award.",
    icon:        Users,
    color:       "bg-blue-600",
    fields: [
      {
        key:         "awardid",
        label:       "Award / Drop ID",
        placeholder: "e.g. 123",
        required:    true,
      },
    ],
  },
  {
    id:          "dropsiteusers",
    label:       "Dropsite / World Users",
    description: "Export all users registered to a specific Dropsite/World.",
    icon:        Globe,
    color:       "bg-purple-600",
    fields: [
      {
        key:         "worldid",
        label:       "World / Dropsite ID",
        placeholder: "e.g. 456",
        required:    true,
      },
    ],
  },
  {
    id:          "mailinglist",
    label:       "Mailing List Members",
    description: "Export all members of a specific mailing list.",
    icon:        Mail,
    color:       "bg-green-600",
    fields: [
      {
        key:         "listid",
        label:       "List ID",
        placeholder: "e.g. list-abc123",
        required:    true,
      },
    ],
  },
];

// ── Helper: trigger a file download from a Blob ────────────────────────────────
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Export card component ──────────────────────────────────────────────────────
interface ExportCardProps {
  option:          ExportOption;
  currentUsername: string;
  drops:           DropEntry[];
  dropsites:       DropsiteEntry[];
  mailingLists:    MailingListEntry[];
}

function ExportCard({
  option,
  currentUsername,
  drops,
  dropsites,
  mailingLists,
}: ExportCardProps) {
  const [values,   setValues]   = useState<Record<string, string>>({});
  const [state,    setState]    = useState<ExportState>({
    loading: false, success: null, rowCount: null, error: null,
  });
  const [expanded, setExpanded] = useState(false);

  const Icon = option.icon;

  const handleChange = (key: string, val: string) => {
    setValues((p) => ({ ...p, [key]: val }));
    // Clear result when user edits
    setState({ loading: false, success: null, rowCount: null, error: null });
  };

  const handleExport = async () => {
    // Validate required fields
    for (const f of option.fields) {
      if (f.required && !values[f.key]?.trim()) {
        toast.error(`Please enter ${f.label}`);
        return;
      }
    }

    setState({ loading: true, success: null, rowCount: null, error: null });

    try {
      let url = "";
      let filename = "";

      if (option.id === "dropusers") {
        url      = `${process.env.NEXT_PUBLIC_API_URL}/export/dropusers/${currentUsername}/${values.awardid}`;
        filename = `drop-users-${values.awardid}-${Date.now()}.csv`;
      } else if (option.id === "dropsiteusers") {
        url      = `${process.env.NEXT_PUBLIC_API_URL}/export/dropsiteusers/${currentUsername}/${values.worldid}`;
        filename = `dropsite-users-${values.worldid}-${Date.now()}.csv`;
      } else if (option.id === "mailinglist") {
        url      = `${process.env.NEXT_PUBLIC_API_URL}/export/mailinglist/${currentUsername}/${values.listid}`;
        filename = `mailinglist-${values.listid}-${Date.now()}.csv`;
      }

      const res = await fetch(url);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server error ${res.status}`);
      }

      const blob = await res.blob();
      const text = await blob.text();

      // Count rows (subtract 1 for the header)
      const rowCount = Math.max(0, text.split(/\r?\n/).filter(Boolean).length - 1);

      downloadBlob(blob, filename);

      setState({ loading: false, success: true, rowCount, error: null });
      toast.success(`Exported ${rowCount.toLocaleString()} rows to ${filename}`);

    } catch (err: any) {
      console.error("Export error:", err);
      const msg = err.message || "Export failed. Please try again.";
      setState({ loading: false, success: false, rowCount: null, error: msg });
      toast.error(msg);
    }
  };

  // ── Dropdown options for each type ──────────────────────────────────────────
  const renderDropdown = (field: ExportField) => {
    if (option.id === "dropusers" && field.key === "awardid" && drops.length > 0) {
      return (
        <select
          value={values[field.key] ?? ""}
          onChange={(e) => handleChange(field.key, e.target.value)}
          className="
            w-full px-3 py-2 text-sm rounded-lg border border-gray-300
            dark:border-[#2D385B] bg-white dark:bg-[#1A2235]
            text-gray-900 dark:text-white
            focus:outline-none focus:ring-2 focus:ring-[#5871A7]
          "
        >
          <option value="">Select a Drop…</option>
          {drops.map((d) => (
            <option key={d.awardid} value={d.awardid}>
              {d.name ? `${d.name} (${d.awardid})` : d.awardid}
            </option>
          ))}
        </select>
      );
    }

    if (option.id === "dropsiteusers" && field.key === "worldid" && dropsites.length > 0) {
      return (
        <select
          value={values[field.key] ?? ""}
          onChange={(e) => handleChange(field.key, e.target.value)}
          className="
            w-full px-3 py-2 text-sm rounded-lg border border-gray-300
            dark:border-[#2D385B] bg-white dark:bg-[#1A2235]
            text-gray-900 dark:text-white
            focus:outline-none focus:ring-2 focus:ring-[#5871A7]
          "
        >
          <option value="">Select a Dropsite…</option>
          {dropsites.map((d) => (
            <option key={d.worldid} value={String(d.worldid)}>
              {d.worldname} ({d.worldid})
            </option>
          ))}
        </select>
      );
    }

    if (option.id === "mailinglist" && field.key === "listid" && mailingLists.length > 0) {
      return (
        <select
          value={values[field.key] ?? ""}
          onChange={(e) => handleChange(field.key, e.target.value)}
          className="
            w-full px-3 py-2 text-sm rounded-lg border border-gray-300
            dark:border-[#2D385B] bg-white dark:bg-[#1A2235]
            text-gray-900 dark:text-white
            focus:outline-none focus:ring-2 focus:ring-[#5871A7]
          "
        >
          <option value="">Select a Mailing List…</option>
          {mailingLists.map((l) => (
            <option key={l.listid} value={l.listid}>
              {l.listname} ({l.listid})
            </option>
          ))}
        </select>
      );
    }

    // Fallback: plain text input
    return (
      <Input
        placeholder={field.placeholder}
        value={values[field.key] ?? ""}
        onChange={(e) => handleChange(field.key, e.target.value)}
        disabled={state.loading}
      />
    );
  };

  return (
    <div className="rounded-xl border border-[#D4D8EA] dark:border-[#2E4066] bg-white dark:bg-[#151E3A] overflow-hidden shadow-sm">

      {/* ── Card header ──────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer select-none"
        onClick={() => setExpanded((p) => !p)}
      >
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${option.color}`}>
            <Icon size={18} className="text-white" />
          </div>
          <div>
            <p className="font-semibold text-gray-800 dark:text-white text-sm">
              {option.label}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {option.description}
            </p>
          </div>
        </div>
        {expanded
          ? <ChevronUp size={16} className="text-gray-400 flex-shrink-0" />
          : <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />
        }
      </div>

      {/* ── Expanded body ─────────────────────────────────────────────────── */}
      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-[#D4D8EA] dark:border-[#2E4066] pt-4">

          {/* Fields */}
          {option.fields.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {field.label}
                {field.required && <span className="text-red-500 ml-0.5">*</span>}
              </label>
              {renderDropdown(field)}
            </div>
          ))}

          {/* Result banner */}
          {state.success === true && (
            <div className="flex items-center gap-2.5 rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-700 px-4 py-3">
              <CheckCircle size={15} className="text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-800 dark:text-green-200">
                Export complete —{" "}
                <span className="font-semibold">
                  {state.rowCount?.toLocaleString()} rows
                </span>{" "}
                downloaded.
              </p>
            </div>
          )}

          {state.success === false && state.error && (
            <div className="flex items-center gap-2.5 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-700 px-4 py-3">
              <AlertCircle size={15} className="text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-800 dark:text-red-200">
                {state.error}
              </p>
            </div>
          )}

          {/* Export button */}
          <Button
            type="button"
            onClick={handleExport}
            disabled={state.loading}
            className="w-full bg-[#5871A7] hover:bg-[#4560A0] text-white"
          >
            {state.loading ? (
              <>
                <Loader2 size={15} className="mr-2 animate-spin" />
                Exporting…
              </>
            ) : (
              <>
                <Download size={15} className="mr-2" />
                Export CSV
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Main page component ────────────────────────────────────────────────────────
export default function ListExportForm() {
  const router = useRouter();

  // Auth
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [accessChecked, setAccessChecked]     = useState(false);
  const [adminStatus, setAdminStatus]         = useState(false);

  // Data for dropdowns
  const [drops,        setDrops]        = useState<DropEntry[]>([]);
  const [dropsites,    setDropsites]    = useState<DropsiteEntry[]>([]);
  const [mailingLists, setMailingLists] = useState<MailingListEntry[]>([]);

  // ── Step 1: Read username ──────────────────────────────────────────────────
  useEffect(() => {
    const username = localStorage.getItem("username") ?? "";
    setCurrentUsername(username);
  }, []);

  // ── Step 2: Check admin access ─────────────────────────────────────────────
  useEffect(() => {
    if (currentUsername === null) return;

    if (currentUsername === "") {
      setAdminStatus(false);
      setAccessChecked(true);
      router.push("/dashboard");
      return;
    }

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

  // ── Step 3: Load dropdown data ─────────────────────────────────────────────
  useEffect(() => {
    if (!accessChecked || !adminStatus || !currentUsername) return;

    // Load drops created by this user
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/listawards/listbyuser/${currentUsername}`)
      .then((r) => r.json())
      .then((d) => setDrops(Array.isArray(d) ? d : d.awards ?? []))
      .catch(() => setDrops([]));

    // Load dropsites for this user
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/listworldawards/listbyuser/${currentUsername}`)
      .then((r) => r.json())
      .then((d) => setDropsites(Array.isArray(d) ? d : []))
      .catch(() => setDropsites([]));

    // Load mailing lists for this user
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/mailinglist/listids/${currentUsername}`)
      .then((r) => r.json())
      .then((d) => setMailingLists(Array.isArray(d) ? d : d.lists ?? []))
      .catch(() => setMailingLists([]));

  }, [accessChecked, adminStatus, currentUsername]);

  // ── Render guards ──────────────────────────────────────────────────────────
  if (currentUsername === null || !accessChecked) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-2">
          <Loader2 className="animate-spin h-8 w-8 text-[#5871A7] mx-auto" />
          <p className="text-gray-500 text-sm">Checking permissions…</p>
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

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <div className="lg:w-[85%] space-y-6">

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl md:text-3xl font-semibold">Export Lists</h1>
          <p className="text-sm text-gray-500 mt-1">
            Download user data from your Drops, Dropsites and Mailing Lists.
          </p>
        </div>
        <Download size={28} className="text-[#5871A7]" />
      </div>
      <hr className="border-[#D4D8EA] dark:border-[#2E4066]" />

      {/* Export cards */}
      <div className="space-y-4">
        {EXPORT_OPTIONS.map((option) => (
          <ExportCard
            key={option.id}
            option={option}
            currentUsername={currentUsername!}
            drops={drops}
            dropsites={dropsites}
            mailingLists={mailingLists}
          />
        ))}
      </div>

      {/* Footer hint */}
      <div className="rounded-lg border border-[#D4D8EA] dark:border-[#2E4066] bg-gray-50 dark:bg-gray-800/50 px-5 py-4">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          <span className="font-semibold">Note:</span> Exported CSV files are
          downloaded directly to your browser. Each file includes a header row
          followed by one row per user. Large exports may take a few seconds.
        </p>
      </div>

    </div>
  );
}