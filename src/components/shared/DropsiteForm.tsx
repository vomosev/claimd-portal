// DropsiteForm.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ChevronLeft, MapPin, Globe, UploadCloud, Loader2,
  SlidersHorizontal, Plus, Trash2, GripVertical,
  ChevronDown, ChevronUp,
} from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";

// ── Types ──────────────────────────────────────────────────────────────────────

interface DropsiteFormProps {
  mode:     "add" | "edit";
  worldId?: string;
}

interface DropsiteData {
  worldname:      string;
  description:    string;
  publicurl:      string;
  privateurl:     string;
  localaddress:   string;
  public:         string;
  latitude:       string;
  longitude:      string;
  allowed_radius: string;
  worldimg:       string;
  worldbkgimg:    string;
  userid:         string;
  useridb:        string;
  useridc:        string;
  useridd:        string;
}

/** A single field definition stored in worlds.jsoncolumns */
interface FieldDef {
  key:          string;
  label:        string;
  type:         "text" | "email" | "number" | "textarea" | "select";
  placeholder?: string;
  required:     boolean;
  options?:     string[];
}

const FIELD_TYPES: FieldDef["type"][] = [
  "text", "email", "number", "textarea", "select",
];

const emptyField = (): FieldDef => ({
  key:         "",
  label:       "",
  type:        "text",
  placeholder: "",
  required:    false,
  options:     [],
});

// ── Field editor row ───────────────────────────────────────────────────────────
interface FieldEditorRowProps {
  index:     number;
  field:     FieldDef;
  total:     number;
  onChange:  (index: number, updated: FieldDef) => void;
  onRemove:  (index: number) => void;
  onMoveUp:  (index: number) => void;
  onMoveDown:(index: number) => void;
}

function FieldEditorRow({
  index, field, total, onChange, onRemove, onMoveUp, onMoveDown,
}: FieldEditorRowProps) {
  const [optionInput, setOptionInput] = useState("");

  const update = (patch: Partial<FieldDef>) =>
    onChange(index, { ...field, ...patch });

  const addOption = () => {
    const val = optionInput.trim();
    if (!val) return;
    update({ options: [...(field.options ?? []), val] });
    setOptionInput("");
  };

  const removeOption = (i: number) =>
    update({ options: (field.options ?? []).filter((_, idx) => idx !== i) });

  const inputClass =
    "w-full px-3 py-1.5 text-sm rounded-lg border border-input bg-background " +
    "focus:outline-none focus:ring-2 focus:ring-[#5871A7] focus:border-transparent";

  return (
    <div className="rounded-lg border border-[#D4D8EA] dark:border-[#2E4066] overflow-hidden">

      {/* ── Coloured header bar ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-[#D4D8EA] dark:border-[#2E4066]">
        <GripVertical size={15} className="text-gray-400 flex-shrink-0" />
        <span className="w-5 h-5 rounded-full bg-[#5871A7] text-white text-[10px] flex items-center justify-center font-bold flex-shrink-0">
          {index + 1}
        </span>
        <span className="text-sm font-medium truncate flex-1 text-gray-700 dark:text-gray-300">
          {field.label || field.key || "New field"}
        </span>

        <button
          type="button"
          onClick={() => onMoveUp(index)}
          disabled={index === 0}
          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors"
          title="Move up"
        >
          <ChevronUp size={14} />
        </button>
        <button
          type="button"
          onClick={() => onMoveDown(index)}
          disabled={index === total - 1}
          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors"
          title="Move down"
        >
          <ChevronDown size={14} />
        </button>

        <button
          type="button"
          onClick={() => onRemove(index)}
          className="p-1 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          title="Remove field"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-transparent">

        {/* Key */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Field Key <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={field.key}
            onChange={(e) =>
              update({
                key: e.target.value
                  .toLowerCase()
                  .replace(/\s+/g, "_")
                  .replace(/[^a-z0-9_]/g, ""),
              })
            }
            placeholder="e.g. phone_number"
            className={inputClass}
          />
          <p className="text-[10px] text-gray-400 mt-1">
            Lowercase letters, numbers and underscores only
          </p>
        </div>

        {/* Label */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Display Label <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={field.label}
            onChange={(e) => update({ label: e.target.value })}
            placeholder="e.g. Phone Number"
            className={inputClass}
          />
        </div>

        {/* Type */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Field Type
          </label>
          <select
            value={field.type}
            onChange={(e) =>
              update({
                type:    e.target.value as FieldDef["type"],
                options: e.target.value === "select" ? field.options ?? [] : [],
              })
            }
            className={inputClass}
          >
            {FIELD_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Placeholder */}
        {field.type !== "select" && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Placeholder Text
            </label>
            <input
              type="text"
              value={field.placeholder ?? ""}
              onChange={(e) => update({ placeholder: e.target.value })}
              placeholder="Hint shown inside the field…"
              className={inputClass}
            />
          </div>
        )}

        {/* Required toggle */}
        <div className="flex items-center gap-2 md:col-span-2">
          <Checkbox
            id={`req-${index}`}
            checked={field.required}
            onCheckedChange={(checked) => update({ required: !!checked })}
          />
          <label htmlFor={`req-${index}`} className="text-sm font-medium cursor-pointer">
            This field is required
          </label>
        </div>

        {/* Options — select type only */}
        {field.type === "select" && (
          <div className="md:col-span-2 space-y-2">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Dropdown Options
            </label>

            <div className="space-y-1">
              {(field.options ?? []).map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="flex-1 text-sm px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 border border-input truncate">
                    {opt}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeOption(i)}
                    className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors flex-shrink-0"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={optionInput}
                onChange={(e) => setOptionInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOption(); } }}
                placeholder="Type an option and press Enter or Add…"
                className={`${inputClass} flex-1`}
              />
              <button
                type="button"
                onClick={addOption}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-[#5871A7] text-white hover:bg-[#4560A0] transition-colors flex-shrink-0"
              >
                Add
              </button>
            </div>

            {(field.options ?? []).length === 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                ⚠ Add at least one option for this select field.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function DropsiteForm({ mode, worldId }: DropsiteFormProps) {
  const router = useRouter();
  const [loading,          setLoading]          = useState(false);
  const [saving,           setSaving]           = useState(false);
  const [currentUsername,  setCurrentUsername]  = useState("");
  const [isAdmin,          setIsAdmin]          = useState(false);
  const [findingCoords,    setFindingCoords]    = useState(false);
  const [uploadingImage,   setUploadingImage]   = useState(false);

  // ── Dropsite image state (unchanged) ──────────────────────────────────────
  const [pendingImageFile,    setPendingImageFile]    = useState<File | null>(null);
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(null);

  // ── Background image state (new — mirrors the image upload pattern) ────────
  const [pendingBkgFile,    setPendingBkgFile]    = useState<File | null>(null);
  const [pendingBkgPreview, setPendingBkgPreview] = useState<string | null>(null);
  const [uploadingBkg,      setUploadingBkg]      = useState(false);

  const [formData, setFormData] = useState<DropsiteData>({
    worldname:      "",
    description:    "",
    publicurl:      "",
    privateurl:     "",
    localaddress:   "",
    public:         "1",
    latitude:       "",
    longitude:      "",
    allowed_radius: "100",
    worldimg:       "",
    worldbkgimg:    "",
    userid:         "",
    useridb:        "",
    useridc:        "",
    useridd:        "",
  });

  const [originalData,       setOriginalData]       = useState<DropsiteData | null>(null);
  const [worldnameAvailable, setWorldnameAvailable] = useState<boolean | null>(null);
  const [checkingWorldname,  setCheckingWorldname]  = useState(false);

  // ── Dynamic field definitions ──────────────────────────────────────────────
  const [fieldDefs,     setFieldDefs]     = useState<FieldDef[]>([]);
  const [fieldsLoading, setFieldsLoading] = useState(false);
  const [savingFields,  setSavingFields]  = useState(false);
  const [fieldsSaveMsg, setFieldsSaveMsg] = useState<string | null>(null);
  const [fieldErrors,   setFieldErrors]   = useState<string[]>([]);

  // ── Debounced worldname check ──────────────────────────────────────────────
  useEffect(() => {
    if (mode === "edit") return;
    if (!formData.worldname || formData.worldname.trim().length < 2) {
      setWorldnameAvailable(null);
      return;
    }
    const timer = setTimeout(async () => {
      setCheckingWorldname(true);
      try {
        const r = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/dropsites/check/${encodeURIComponent(formData.worldname.trim())}`
        );
        setWorldnameAvailable(r.data.available);
      } catch {
        setWorldnameAvailable(null);
      } finally {
        setCheckingWorldname(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.worldname, mode]);

  // ── Admin check + initial data load ───────────────────────────────────────
  useEffect(() => {
    const username = localStorage.getItem("username") ?? "";
    setCurrentUsername(username);

    if (!username) return;

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/getuserrolebyworld/${username}/${worldId}`)
      .then((r) => r.json())
      .then((data) => {
        const ok =
          String(data.role).includes("admin") ||
          String(data.role).includes("superuser");

        if (!ok) {
          toast.error("Access denied. Admin privileges required.");
          router.push("/dashboard/dropsites");
          return;
        }

        setIsAdmin(true);

        if (mode === "edit" && worldId) {
          fetchDropsiteData();
          fetchFieldDefs();
        } else {
          setLoading(false);
        }
      })
      .catch(() => router.push("/dashboard/dropsites"));
  }, [mode, worldId, router]);

  // ── Fetch dropsite data ────────────────────────────────────────────────────
  const fetchDropsiteData = async () => {
    setLoading(true);
    try {
      const username = localStorage.getItem("username") ?? "";
      const r = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/dropsites/worlds/list/${worldId}/${username}`
      );
      if (r.data) {
        const d: DropsiteData = {
          worldname:      r.data.worldname             || "",
          description:    r.data.description           || "",
          publicurl:      r.data.publicurl             || "",
          privateurl:     r.data.privateurl            || "",
          localaddress:   r.data.localaddress          || "",
          public:         r.data.public                || "1",
          latitude:       r.data.latitude?.toString()  || "",
          longitude:      r.data.longitude?.toString() || "",
          allowed_radius: r.data.allowed_radius        || "100",
          worldimg:       r.data.worldimg              || "",
          worldbkgimg:    r.data.worldbkgimg           || "",
          userid:         r.data.userid                || "",
          useridb:        r.data.useridb               || "",
          useridc:        r.data.useridc               || "",
          useridd:        r.data.useridd               || "",
        };
        setFormData(d);
        setOriginalData(d);
      }
    } catch {
      toast.error("Failed to load dropsite data");
      router.push("/dashboard/dropsites");
    } finally {
      setLoading(false);
    }
  };

  // ── Fetch field definitions ────────────────────────────────────────────────
  const fetchFieldDefs = async () => {
    if (!worldId) return;
    setFieldsLoading(true);
    try {
      const r = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/worldsettings/jsoncolumns/${worldId}`
      );
      if (!r.ok) return;
      const data = await r.json();
      const raw  = data?.jsoncolumns;
      if (!raw) { setFieldDefs([]); return; }
      const parsed: FieldDef[] =
        typeof raw === "string" ? JSON.parse(raw) : raw;
      setFieldDefs(Array.isArray(parsed) ? parsed : []);
    } catch (err) {
      console.error("Error fetching field definitions:", err);
    } finally {
      setFieldsLoading(false);
    }
  };

  // ── Field definition handlers ──────────────────────────────────────────────
  const handleFieldChange = (index: number, updated: FieldDef) => {
    setFieldDefs((prev) => { const next = [...prev]; next[index] = updated; return next; });
    setFieldErrors([]);
  };

  const handleAddField    = () => setFieldDefs((prev) => [...prev, emptyField()]);
  const handleRemoveField = (index: number) => setFieldDefs((prev) => prev.filter((_, i) => i !== index));

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setFieldDefs((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  };

  const handleMoveDown = (index: number) => {
    setFieldDefs((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  };

  // ── Validate field definitions ─────────────────────────────────────────────
  const validateFields = (): string[] => {
    const errors: string[] = [];
    const keys = new Set<string>();
    fieldDefs.forEach((f, i) => {
      const n = i + 1;
      if (!f.key.trim())   errors.push(`Field ${n}: Key is required`);
      if (!f.label.trim()) errors.push(`Field ${n}: Label is required`);
      if (keys.has(f.key)) errors.push(`Field ${n}: Key "${f.key}" is duplicated`);
      if (f.key) keys.add(f.key);
      if (f.type === "select" && (!f.options || f.options.length === 0)) {
        errors.push(`Field ${n} ("${f.label || f.key}"): Select type needs at least one option`);
      }
    });
    return errors;
  };

  // ── Save field definitions ─────────────────────────────────────────────────
  const handleSaveFieldDefs = async () => {
    const errors = validateFields();
    if (errors.length > 0) {
      setFieldErrors(errors);
      toast.error("Please fix the errors before saving fields.");
      return;
    }
    setFieldErrors([]);
    setSavingFields(true);
    setFieldsSaveMsg(null);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/worldsettings/jsoncolumns/${worldId}`,
        {
          method:  "PUT",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ jsoncolumns: JSON.stringify(fieldDefs) }),
        }
      );
      if (!res.ok) throw new Error("Save failed");
      toast.success("Field definitions saved!");
      setFieldsSaveMsg("Saved successfully!");
      setTimeout(() => setFieldsSaveMsg(null), 3000);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save field definitions.");
      setFieldsSaveMsg("Error saving. Please try again.");
    } finally {
      setSavingFields(false);
    }
  };

  // ── Form helpers ───────────────────────────────────────────────────────────
  const handleInputChange = (field: keyof DropsiteData, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const handleFindCoordinates = async () => {
    const addr = formData.localaddress || formData.publicurl;
    if (!addr) { toast.error("Please enter an address or public URL first"); return; }
    setFindingCoords(true);
    try {
      const r    = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addr)}&limit=1`
      );
      const data = await r.json();
      if (data?.length > 0) {
        setFormData((prev) => ({ ...prev, latitude: data[0].lat, longitude: data[0].lon }));
        toast.success("Coordinates found!");
      } else {
        toast.error("No coordinates found for this address");
      }
    } catch { toast.error("Error finding coordinates"); }
    finally  { setFindingCoords(false); }
  };

  const handleMyCoordinates = () => {
    if (!navigator.geolocation) { toast.error("Geolocation not supported"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData((prev) => ({
          ...prev,
          latitude:  pos.coords.latitude.toString(),
          longitude: pos.coords.longitude.toString(),
        }));
        toast.success("Current location set!");
      },
      () => toast.error("Unable to retrieve your location")
    );
  };

  // ── Dropsite image handlers (unchanged) ────────────────────────────────────
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select a valid image file"); return; }
    if (file.size > 5 * 1024 * 1024)    { toast.error("Image size should be less than 5MB"); return; }
    setPendingImageFile(file);
    setPendingImagePreview(URL.createObjectURL(file));
    toast.success("Image selected — will upload when you save");
  };

  const uploadImage = async (file: File, currentWorldId: string): Promise<string | null> => {
    setUploadingImage(true);
    const cleanName = file.name.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9.-]/g, "").toLowerCase();
    try {
      const fd = new FormData();
      fd.append("file",      new File([file], cleanName, { type: file.type }));
      fd.append("worldid",   currentWorldId);
      fd.append("worldname", formData.worldname);
      const r = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/uploadworldimg`, fd,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      return r.data.success ? (r.data.url ?? null) : null;
    } catch { return null; }
    finally  { setUploadingImage(false); }
  };

  // ── Background image handlers (new — mirrors image upload pattern exactly) ─
  const handleBkgSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select a valid image file"); return; }
    if (file.size > 5 * 1024 * 1024)    { toast.error("Image size should be less than 5MB"); return; }
    setPendingBkgFile(file);
    setPendingBkgPreview(URL.createObjectURL(file));
    toast.success("Background image selected — will upload when you save");
  };

  const uploadBkgImage = async (file: File, currentWorldId: string): Promise<boolean> => {
    setUploadingBkg(true);
    const cleanName = file.name.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9.-]/g, "").toLowerCase();
    try {
      const fd = new FormData();
      fd.append("file",      new File([file], cleanName, { type: file.type }));
      fd.append("worldid",   currentWorldId);
      fd.append("worldname", formData.worldname);
      const r = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/uploadworldbkgimg`, fd,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      return !!r.data.success;
    } catch { return false; }
    finally  { setUploadingBkg(false); }
  };

  // ── Change detection ───────────────────────────────────────────────────────
  const hasChanges = () => {
    if (mode === "add")  return true;
    if (!originalData)   return true;
    if (pendingImageFile) return true;
    if (pendingBkgFile)   return true;           // ← include bkg change
    return Object.keys(formData).some(
      (k) => formData[k as keyof DropsiteData] !== originalData[k as keyof DropsiteData]
    );
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasChanges()) { toast.error("No changes to save"); return; }
    setSaving(true);

    try {
      let finalWorldImg = formData.worldimg;

      // Upload dropsite image if pending
      if (pendingImageFile) {
        toast.loading("Uploading image…", { id: "img-upload" });
        const uploadedUrl = await uploadImage(
          pendingImageFile,
          mode === "edit" && worldId ? worldId : "new"
        );
        toast.dismiss("img-upload");

        if (uploadedUrl) {
          finalWorldImg = uploadedUrl;
        } else {
          if (!window.confirm("Image upload failed. Save without image?")) {
            setSaving(false);
            return;
          }
        }
      }

      // Upload background image if pending
      if (pendingBkgFile) {
        toast.loading("Uploading background image…", { id: "bkg-upload" });
        const bkgOk = await uploadBkgImage(
          pendingBkgFile,
          mode === "edit" && worldId ? worldId : "new"
        );
        toast.dismiss("bkg-upload");

        if (!bkgOk) {
          if (!window.confirm("Background image upload failed. Save without it?")) {
            setSaving(false);
            return;
          }
        }
      }

      const submitData = {
        ...formData,
        worldimg:  finalWorldImg,
        userid:    currentUsername,
        latitude:  formData.latitude  ? parseFloat(formData.latitude)  : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      };

      const r = mode === "add"
        ? await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/deploy/world`, submitData)
        : await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/worlds/update/${worldId}`, submitData);

      if (r.data.success) {
        setPendingImageFile(null);
        setPendingImagePreview(null);
        setPendingBkgFile(null);
        setPendingBkgPreview(null);
        toast.success(`Dropsite ${mode === "add" ? "added" : "updated"} successfully!`);
        router.push("/dashboard/dropsites");
      } else {
        toast.error(r.data.message || "Operation failed");
      }
    } catch { toast.error("Failed to save dropsite"); }
    finally  { setSaving(false); }
  };

  if (loading)  return <div className="flex items-center justify-center min-h-[400px]"><p>Loading dropsite data…</p></div>;
  if (!isAdmin) return null;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="lg:w-[85%] space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-semibold">
          {mode === "add" ? "Add" : "Edit"} Dropsite
        </h1>
      </div>
      <hr className="border-[#D4D8EA] dark:border-[#2E4066]" />

      <form onSubmit={handleSubmit} className="space-y-10">

        {/* ── Basic Information ────────────────────────────────────────── */}
        <section className="space-y-6">
          <h2 className="text-xl font-semibold flex items-center gap-2.5">
            <Globe className="text-geodrops" /> Dropsite Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <div>
              <label className="text-sm font-medium mb-2 block">Dropsite Name *</label>
              <div className="relative">
                <Input
                  value={formData.worldname}
                  onChange={(e) => { handleInputChange("worldname", e.target.value); setWorldnameAvailable(null); }}
                  placeholder="Enter dropsite name"
                  required
                  disabled={mode === "edit"}
                  className={`pr-10 ${
                    worldnameAvailable === true  ? "border-green-500 focus:ring-green-500" :
                    worldnameAvailable === false ? "border-red-500 focus:ring-red-500"     : ""
                  }`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {checkingWorldname && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
                  {!checkingWorldname && worldnameAvailable === true  && <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                  {!checkingWorldname && worldnameAvailable === false && <svg className="h-4 w-4 text-red-500"   fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>}
                </div>
              </div>
              {mode === "add" && !checkingWorldname && worldnameAvailable === true  && <p className="text-green-600 text-xs mt-1">✓ {formData.worldname} is available</p>}
              {mode === "add" && !checkingWorldname && worldnameAvailable === false && <p className="text-red-500 text-xs mt-1">✗ {formData.worldname} is already taken</p>}
              {mode === "add" && checkingWorldname                                  && <p className="text-gray-400 text-xs mt-1">Checking availability…</p>}
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Allowed Radius (meters)</label>
              <Input
                type="number"
                value={formData.allowed_radius}
                onChange={(e) => handleInputChange("allowed_radius", e.target.value)}
                placeholder="100"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">User ID</label>
              <Input
                value={formData.userid}
                onChange={(e) => handleInputChange("userid", e.target.value)}
                placeholder="user@email.com"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Secondary User ID (optional)</label>
              <Input
                value={formData.useridb}
                onChange={(e) => handleInputChange("useridb", e.target.value)}
                placeholder="user@email.com"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Third User ID (optional)</label>
              <Input
                value={formData.useridc}
                onChange={(e) => handleInputChange("useridc", e.target.value)}
                placeholder="user@email.com"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Fourth User ID (optional)</label>
              <Input
                value={formData.useridd}
                onChange={(e) => handleInputChange("useridd", e.target.value)}
                placeholder="user@email.com"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="Enter dropsite description"
                rows={3}
              />
            </div>
          </div>
        </section>

        <hr className="border-[#D4D8EA] dark:border-[#2E4066]" />

        {/* ── Network Configuration ────────────────────────────────────── */}
        <section className="space-y-6">
          <h2 className="text-xl font-semibold">Network Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Public URL</label>
              <Input value={formData.publicurl}  onChange={(e) => handleInputChange("publicurl",  e.target.value)} placeholder="https://example.com" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Private URL</label>
              <Input value={formData.privateurl} onChange={(e) => handleInputChange("privateurl", e.target.value)} placeholder="https://private.example.com" />
            </div>
          </div>
        </section>

        <hr className="border-[#D4D8EA] dark:border-[#2E4066]" />

        {/* ── Location ────────────────────────────────────────────────── */}
        <section className="space-y-6">
          <h2 className="text-xl font-semibold flex items-center gap-2.5">
            <MapPin className="text-geodrops" /> Location
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Address</label>
              <Input value={formData.localaddress} onChange={(e) => handleInputChange("localaddress", e.target.value)} placeholder="100 New Oxford Street London" />
            </div>
            <div className="flex items-end">
              <div className="flex items-center space-x-2">
                <Checkbox id="public" checked={formData.public === "1"} onCheckedChange={(c) => handleInputChange("public", c ? "1" : "0")} />
                <label htmlFor="public" className="text-sm font-medium">Make Dropsite Public</label>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Latitude</label>
              <Input value={formData.latitude}  onChange={(e) => handleInputChange("latitude",  e.target.value)} placeholder="0.000000" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Longitude</label>
              <Input value={formData.longitude} onChange={(e) => handleInputChange("longitude", e.target.value)} placeholder="0.000000" />
            </div>
            <div className="md:col-span-2 flex gap-4">
              <Button type="button" onClick={handleFindCoordinates} disabled={findingCoords} variant="outline">
                {findingCoords ? "Finding…" : "Find Coordinates"}
              </Button>
              <Button type="button" onClick={handleMyCoordinates} variant="outline">
                Use My Location
              </Button>
            </div>
          </div>
        </section>

        <hr className="border-[#D4D8EA] dark:border-[#2E4066]" />

        {/* ── Dropsite Image (unchanged) ───────────────────────────────── */}
        <section className="space-y-6">
          <h2 className="text-xl font-semibold">Dropsite Image</h2>
          <div>
            <label className="text-sm font-medium mb-2 block">Upload Image</label>
            <div className="relative">
              <Input type="file" accept="image/*" onChange={handleImageSelect} disabled={uploadingImage} />
              {uploadingImage && <div className="absolute right-3 top-1/2 -translate-y-1/2"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#5871A7]" /></div>}
            </div>
            {pendingImageFile && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                <UploadCloud className="h-3 w-3" /> {pendingImageFile.name} — will upload when you save
              </p>
            )}
            {pendingImagePreview && (
              <div className="mt-2">
                <p className="text-xs text-gray-500 mb-1">Preview (not yet saved):</p>
                <img src={pendingImagePreview} alt="Preview" className="max-w-[200px] max-h-[200px] object-contain rounded-md border border-amber-300" />
              </div>
            )}
            {!pendingImagePreview && formData.worldimg && (
              <div className="mt-2">
                <p className="text-xs text-gray-500 mb-1">Current image:</p>
                <img src={formData.worldimg} alt="Dropsite" className="max-w-[200px] max-h-[200px] object-contain rounded-md border" />
              </div>
            )}
          </div>
        </section>

        <hr className="border-[#D4D8EA] dark:border-[#2E4066]" />

        {/* ── Background Image (new — mirrors Dropsite Image section) ─────
            Uses /uploadworldbkgimg endpoint instead of /uploadworldimg.
            State, validation and preview logic are identical.           */}
        <section className="space-y-6">
          <h2 className="text-xl font-semibold">Dropsite Background Image</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            This image is used as the full-screen background on public pages for this Dropsite.
          </p>
          <div>
            <label className="text-sm font-medium mb-2 block">Upload Background Image</label>
            <div className="relative">
              <Input
                type="file"
                accept="image/*"
                onChange={handleBkgSelect}
                disabled={uploadingBkg}
              />
              {uploadingBkg && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#5871A7]" />
                </div>
              )}
            </div>
            {pendingBkgFile && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                <UploadCloud className="h-3 w-3" /> {pendingBkgFile.name} — will upload when you save
              </p>
            )}
            {pendingBkgPreview && (
              <div className="mt-2">
                <p className="text-xs text-gray-500 mb-1">Preview (not yet saved):</p>
                <img
                  src={pendingBkgPreview}
                  alt="Background preview"
                  className="max-w-[200px] max-h-[200px] object-contain rounded-md border border-amber-300"
                />
              </div>
            )}
            {!pendingBkgPreview && formData.worldbkgimg && (
              <div className="mt-2">
                <p className="text-xs text-gray-500 mb-1">Current background:</p>
                <img src={formData.worldbkgimg} alt="Dropsite" className="max-w-[200px] max-h-[200px] object-contain rounded-md border" />
              </div>
            )}
          </div>
        </section>

        {/* ── Form action buttons ───────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.push("/dashboard/dropsites")} className="md:w-[20%]">
            Cancel
          </Button>
          <Button type="submit" disabled={saving || !hasChanges()} className="md:w-[45%]">
            {saving && (uploadingImage || uploadingBkg)
              ? "Uploading image…"
              : saving
              ? (mode === "add" ? "Saving…" : "Updating…")
              : (mode === "add" ? "Add Dropsite" : "Update Dropsite")}
          </Button>
        </div>

      </form>

      {/* ── Dynamic Field Definitions (edit mode only) ────────────────── */}
      {mode === "edit" && worldId && (
        <>
          <hr className="border-[#D4D8EA] dark:border-[#2E4066]" />

          <section className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-xl font-semibold flex items-center gap-2.5">
                <SlidersHorizontal className="text-geodrops" /> User Registration Fields
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                These fields will appear on the signup form for users registering at this Dropsite.
              </p>
            </div>

            {fieldsLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-gray-400" />
                Loading field definitions…
              </div>
            ) : (
              <div className="space-y-4">

                {fieldErrors.length > 0 && (
                  <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-700 p-4 space-y-1">
                    <p className="text-sm font-medium text-red-800 dark:text-red-200">
                      Please fix the following errors:
                    </p>
                    <ul className="list-disc list-inside space-y-0.5">
                      {fieldErrors.map((err, i) => (
                        <li key={i} className="text-xs text-red-700 dark:text-red-300">{err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {fieldDefs.length === 0 && (
                  <div className="rounded-lg border border-dashed border-[#D4D8EA] dark:border-[#2E4066] p-8 text-center">
                    <SlidersHorizontal size={28} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                    <p className="text-sm text-gray-400">
                      No registration fields defined yet. Click <strong>Add Field</strong> to create one.
                    </p>
                  </div>
                )}

                {fieldDefs.map((f, i) => (
                  <FieldEditorRow
                    key={i}
                    index={i}
                    field={f}
                    total={fieldDefs.length}
                    onChange={handleFieldChange}
                    onRemove={handleRemoveField}
                    onMoveUp={handleMoveUp}
                    onMoveDown={handleMoveDown}
                  />
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddField}
                  className="w-full border-dashed border-[#5871A7] text-[#5871A7] hover:bg-[#5871A7]/10"
                >
                  <Plus size={16} className="mr-2" /> Add Field
                </Button>

                {fieldDefs.length > 0 && (
                  <details className="rounded-lg border border-[#D4D8EA] dark:border-[#2E4066] overflow-hidden">
                    <summary className="px-4 py-3 text-sm font-medium cursor-pointer bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors select-none">
                      Preview JSON (what will be stored)
                    </summary>
                    <pre className="p-4 text-xs font-mono overflow-x-auto bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 max-h-64 overflow-y-auto">
                      {JSON.stringify(fieldDefs, null, 2)}
                    </pre>
                  </details>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <Button
                    type="button"
                    onClick={handleSaveFieldDefs}
                    disabled={savingFields}
                    className="w-[220px]"
                  >
                    {savingFields
                      ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving Fields…</>
                      : "Save Field Definitions"
                    }
                  </Button>

                  {fieldsSaveMsg && (
                    <p className={`text-sm ${
                      fieldsSaveMsg.includes("Error") ? "text-red-600" : "text-green-600"
                    }`}>
                      {fieldsSaveMsg}
                    </p>
                  )}
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}