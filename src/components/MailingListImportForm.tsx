// components/MailingListImportForm.tsx
"use client";

import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  Mail,
  List,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  Users,
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
import toast from "react-hot-toast";

// ── Types ──────────────────────────────────────────────────────────────────────
interface ImportResult {
  success:   boolean;
  listid?:   string;
  imported?: number;
  skipped?:  number;
  errors?:   string[];
  message?:  string;
}

interface CsvPreviewRow {
  userid:    string;
  fullname:  string;
  awardid:   string;
  worldid:   string;
  listowner: string;
  listname:  string;
}

// ── Schema ─────────────────────────────────────────────────────────────────────
const schema = z.object({
  listname:  z.string().min(1, "List name is required").max(200),
  listowner: z.string().min(1, "List owner is required").max(200),
  awardid:   z.string().max(200).optional(),
  worldid:   z.string().max(200).optional(),
});

type FormValues = z.infer<typeof schema>;

// ── CSV column names that match mailinglistrows ────────────────────────────────
const REQUIRED_COLUMNS = ["userid", "fullname", "listowner", "listname"] as const;
const OPTIONAL_COLUMNS = ["awardid", "worldid"] as const;
const ALL_COLUMNS      = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS] as const;

// ── Helper: parse CSV text → array of objects ─────────────────────────────────
function parseCsv(text: string): Record<string, string>[] {
  const lines  = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/"/g, ""));
  return lines.slice(1).map((line) => {
    // Handle quoted fields
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i] ?? "";
    });
    return row;
  });
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function MailingListImportForm() {
  const router = useRouter();

  // Auth state
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [accessChecked, setAccessChecked]     = useState(false);
  const [adminStatus, setAdminStatus]         = useState(false);

  // UI state
  const [importing, setImporting]           = useState(false);
  const [importResult, setImportResult]     = useState<ImportResult | null>(null);

  // File state
  const [selectedFile, setSelectedFile]     = useState<File | null>(null);
  const [csvPreview, setCsvPreview]         = useState<CsvPreviewRow[]>([]);
  const [csvHeaders, setCsvHeaders]         = useState<string[]>([]);
  const [csvError, setCsvError]             = useState<string | null>(null);
  const [totalRows, setTotalRows]           = useState(0);
  const fileInputRef                        = useRef<HTMLInputElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      listname:  "",
      listowner: "",
      awardid:   "",
      worldid:   "",
    },
  });

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

  // ── Pre-fill listowner when username is ready ─────────────────────────────────
  useEffect(() => {
    if (currentUsername) {
      form.setValue("listowner", currentUsername);
    }
  }, [currentUsername, form]);

  // ── CSV file selection & preview ──────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvError(null);
    setImportResult(null);

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setCsvError("Only .csv files are supported.");
      setSelectedFile(null);
      setCsvPreview([]);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setCsvError("File size must be under 10 MB.");
      setSelectedFile(null);
      setCsvPreview([]);
      return;
    }

    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCsv(text);

      if (rows.length === 0) {
        setCsvError("The CSV file appears to be empty or has no data rows.");
        setCsvPreview([]);
        return;
      }

      // Validate required columns exist
      const headers = Object.keys(rows[0]).map((h) => h.toLowerCase());
      setCsvHeaders(headers);

      const missingRequired = REQUIRED_COLUMNS.filter(
        (col) => !headers.includes(col)
      );

      if (missingRequired.length > 0) {
        setCsvError(
          `Missing required columns: ${missingRequired.join(", ")}. ` +
          `Required: ${REQUIRED_COLUMNS.join(", ")}`
        );
        setCsvPreview([]);
        return;
      }

      setTotalRows(rows.length);

      // Build preview rows (first 5)
      const preview: CsvPreviewRow[] = rows.slice(0, 5).map((r) => ({
        userid:    r.userid    || "",
        fullname:  r.fullname  || "",
        awardid:   r.awardid   || "",
        worldid:   r.worldid   || "",
        listowner: r.listowner || "",
        listname:  r.listname  || "",
      }));

      setCsvPreview(preview);
    };

    reader.onerror = () => {
      setCsvError("Failed to read the file.");
    };

    reader.readAsText(file);
  };

  // ── Submit ────────────────────────────────────────────────────────────────────
  const onSubmit = async (values: FormValues) => {
    if (!selectedFile) {
      toast.error("Please select a CSV file to import.");
      return;
    }

    if (csvError) {
      toast.error("Please fix the CSV errors before importing.");
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      const fd = new FormData();
      fd.append("csvfile",   selectedFile);
      fd.append("userid",    currentUsername ?? "");
      fd.append("listname",  values.listname);
      fd.append("listowner", values.listowner);
      fd.append("awardid",   values.awardid  ?? "");
      fd.append("worldid",   values.worldid  ?? "");

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/importlist`,
        { method: "POST", body: fd }
      );

      const data: ImportResult = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Import failed");
      }

      setImportResult(data);
      toast.success(
        `Import complete! ${data.imported} rows imported to list ${data.listid}.`
      );

      // Reset file input
      setSelectedFile(null);
      setCsvPreview([]);
      setCsvHeaders([]);
      setTotalRows(0);
      if (fileInputRef.current) fileInputRef.current.value = "";

    } catch (err: any) {
      console.error("Import error:", err);
      toast.error(err.message || "Import failed. Please try again.");
      setImportResult({ success: false, message: err.message });
    } finally {
      setImporting(false);
    }
  };

  // ── Render guards ─────────────────────────────────────────────────────────────
  if (currentUsername === null || !accessChecked) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-2">
          <Loader2 className="animate-spin h-8 w-8 text-[#5871A7] mx-auto" />
          <p className="text-gray-500 text-sm">Checking permissions...</p>
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
        <h1 className="text-xl md:text-3xl font-semibold">Import Mailing List</h1>
        <p className="text-sm italic text-gray-500">Upload a CSV file</p>
      </div>
      <hr className="border-[#D4D8EA] dark:border-[#2E4066]" />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">

          {/* ── Section 1: List Details ──────────────────────────────────── */}
          <section className="space-y-6">
            <h2 className="text-xl font-semibold flex items-center gap-2.5">
              <List className="text-geodrops" /> List Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <FormField
                name="listname"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>List Name <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5871A7] pointer-events-none" />
                        <Input className="pl-9" placeholder="e.g. Summer Campaign 2025" {...field} />
                      </div>
                    </FormControl>
                    <FormDescription>
                      A descriptive name for this mailing list.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                name="listowner"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>List Owner <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Users size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5871A7] pointer-events-none" />
                        <Input className="pl-9" placeholder="e.g. admin@example.com" {...field} />
                      </div>
                    </FormControl>
                    <FormDescription>
                      The owner/creator of this list (defaults to your username).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                name="awardid"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Drop/Award ID (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 123" {...field} />
                    </FormControl>
                    <FormDescription>
                      Associate this list with a specific award/drop.
                      Overrides the value in the CSV if set.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                name="worldid"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel> Dropsite/World ID (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 456" {...field} />
                    </FormControl>
                    <FormDescription>
                      Associate this list with a specific world/dropsite.
                      Overrides the value in the CSV if set.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

            </div>
          </section>

          <hr className="border-[#D4D8EA] dark:border-[#2E4066]" />

          {/* ── Section 2: CSV Upload ────────────────────────────────────── */}
          <section className="space-y-6">
            <h2 className="text-xl font-semibold flex items-center gap-2.5">
              <FileText className="text-geodrops" /> CSV File
            </h2>

            {/* Column spec */}
            <div className="rounded-lg border border-[#D4D8EA] dark:border-[#2E4066] bg-gray-50 dark:bg-gray-800/50 p-4 space-y-2">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Expected CSV column names (header row):
              </p>
              <div className="flex flex-wrap gap-2">
                {REQUIRED_COLUMNS.map((col) => (
                  <span
                    key={col}
                    className="text-xs px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 font-mono font-semibold"
                  >
                    {col} <span className="opacity-60">(required)</span>
                  </span>
                ))}
                {OPTIONAL_COLUMNS.map((col) => (
                  <span
                    key={col}
                    className="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-mono"
                  >
                    {col} <span className="opacity-60">(optional)</span>
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Column names must match exactly (lowercase). Optional columns
                can be omitted. Values in the form above override CSV values
                for <code className="font-mono">awardid</code> and{" "}
                <code className="font-mono">worldid</code>.
              </p>
            </div>

            {/* File input */}
            <div
              className={`
                relative rounded-xl border-2 border-dashed p-8 text-center
                transition-colors cursor-pointer
                ${csvError
                  ? "border-red-400 bg-red-50 dark:bg-red-900/10"
                  : selectedFile
                  ? "border-green-400 bg-green-50 dark:bg-green-900/10"
                  : "border-[#D4D8EA] dark:border-[#2E4066] hover:border-[#5871A7] dark:hover:border-[#5871A7]"
                }
              `}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleFileChange}
              />

              {selectedFile && !csvError ? (
                <div className="space-y-1">
                  <CheckCircle className="h-10 w-10 text-green-500 mx-auto" />
                  <p className="font-semibold text-green-700 dark:text-green-300">
                    {selectedFile.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                    {totalRows > 0 && ` · ${totalRows.toLocaleString()} data rows`}
                  </p>
                  <p className="text-xs text-gray-400">Click to change file</p>
                </div>
              ) : csvError ? (
                <div className="space-y-1">
                  <AlertCircle className="h-10 w-10 text-red-500 mx-auto" />
                  <p className="font-semibold text-red-700 dark:text-red-300">
                    Invalid file
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-400">{csvError}</p>
                  <p className="text-xs text-gray-400 mt-2">Click to select a different file</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-10 w-10 text-gray-400 mx-auto" />
                  <p className="font-medium text-gray-600 dark:text-gray-400">
                    Click to select a CSV file
                  </p>
                  <p className="text-xs text-gray-400">
                    .csv files only · max 10 MB
                  </p>
                </div>
              )}
            </div>

            {/* CSV preview table */}
            {csvPreview.length > 0 && !csvError && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <FileText size={14} className="text-[#5871A7]" />
                  Preview (first {csvPreview.length} of {totalRows.toLocaleString()} rows)
                </p>

                <div className="overflow-x-auto rounded-lg border border-[#D4D8EA] dark:border-[#2E4066]">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-[#1A2235] border-b border-[#D4D8EA] dark:border-[#2E4066]">
                        {ALL_COLUMNS.map((col) => (
                          <th
                            key={col}
                            className={`
                              text-left px-3 py-2 font-semibold uppercase tracking-wide
                              ${csvHeaders.includes(col)
                                ? "text-gray-700 dark:text-gray-300"
                                : "text-gray-400 dark:text-gray-600"
                              }
                            `}
                          >
                            {col}
                            {!csvHeaders.includes(col) && (
                              <span className="ml-1 text-[9px] opacity-60">(not in CSV)</span>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#D4D8EA] dark:divide-[#2E4066]">
                      {csvPreview.map((row, i) => (
                        <tr
                          key={i}
                          className="hover:bg-gray-50 dark:hover:bg-[#1A2235] transition-colors"
                        >
                          <td className="px-3 py-2 font-mono text-gray-700 dark:text-gray-300 truncate max-w-[120px]">
                            {row.userid || <span className="text-red-400 italic">empty</span>}
                          </td>
                          <td className="px-3 py-2 text-gray-600 dark:text-gray-400 truncate max-w-[120px]">
                            {row.fullname || <span className="text-red-400 italic">empty</span>}
                          </td>
                          <td className="px-3 py-2 text-gray-500 dark:text-gray-500 font-mono">
                            {row.awardid || <span className="opacity-40">—</span>}
                          </td>
                          <td className="px-3 py-2 text-gray-500 dark:text-gray-500 font-mono">
                            {row.worldid || <span className="opacity-40">—</span>}
                          </td>
                          <td className="px-3 py-2 text-gray-500 dark:text-gray-500 truncate max-w-[100px]">
                            {row.listowner || <span className="opacity-40">—</span>}
                          </td>
                          <td className="px-3 py-2 text-gray-500 dark:text-gray-500 truncate max-w-[100px]">
                            {row.listname || <span className="opacity-40">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalRows > 5 && (
                  <p className="text-xs text-gray-400 text-right">
                    + {(totalRows - 5).toLocaleString()} more rows
                  </p>
                )}
              </div>
            )}
          </section>

          {/* ── Import result banner ─────────────────────────────────────── */}
          {importResult && (
            <div className={`
              rounded-lg border p-5 space-y-2
              ${importResult.success
                ? "border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-700"
                : "border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-700"
              }
            `}>
              <div className="flex items-center gap-2">
                {importResult.success
                  ? <CheckCircle size={18} className="text-green-600 dark:text-green-400" />
                  : <AlertCircle size={18} className="text-red-600 dark:text-red-400" />
                }
                <p className={`font-semibold text-sm ${
                  importResult.success
                    ? "text-green-800 dark:text-green-200"
                    : "text-red-800 dark:text-red-200"
                }`}>
                  {importResult.success ? "Import Successful" : "Import Failed"}
                </p>
              </div>

              {importResult.success && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                  {[
                    { label: "List ID",  value: importResult.listid    },
                    { label: "Imported", value: importResult.imported  },
                    { label: "Skipped",  value: importResult.skipped   },
                  ].map((item) => (
                    item.value !== undefined && (
                      <div
                        key={item.label}
                        className="bg-white dark:bg-gray-800 rounded-lg px-3 py-2 text-center border border-green-200 dark:border-green-800"
                      >
                        <p className="text-xs text-gray-500 uppercase tracking-wide">{item.label}</p>
                        <p className="font-bold text-gray-800 dark:text-white mt-0.5">
                          {item.value}
                        </p>
                      </div>
                    )
                  ))}
                </div>
              )}

              {importResult.message && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {importResult.message}
                </p>
              )}

              {importResult.errors && importResult.errors.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs font-semibold text-red-700 dark:text-red-300">Errors:</p>
                  {importResult.errors.map((e, i) => (
                    <p key={i} className="text-xs text-red-600 dark:text-red-400 font-mono">
                      {e}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          <hr className="border-[#D4D8EA] dark:border-[#2E4066]" />

          {/* ── Actions ──────────────────────────────────────────────────── */}
          <div className="flex flex-col md:flex-row md:justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              className="md:w-[10%]"
              onClick={() => router.push("/dashboard")}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="md:w-[45%] bg-[#5871A7] hover:bg-[#4560A0] text-white"
              disabled={importing || !selectedFile || !!csvError}
            >
              {importing ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Importing {totalRows.toLocaleString()} rows...
                </>
              ) : (
                <>
                  <Upload size={16} className="mr-2" />
                  Import {totalRows > 0 ? `${totalRows.toLocaleString()} Rows` : "CSV"}
                </>
              )}
            </Button>
          </div>

        </form>
      </Form>
    </div>
  );
}