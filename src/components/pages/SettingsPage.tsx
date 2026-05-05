// src/components/page/SettingsPage.tsx
"use client";
import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import {
  Mail,
  Trash2,
  User,
  RotateCcw,
  Link,
  Check,
  X,
  Loader2,
  SlidersHorizontal,
} from "lucide-react";
import toast from "react-hot-toast";

const API_URL             = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";
const WORLD_ID            = process.env.NEXT_PUBLIC_WORLDID || "0";
const DEFAULT_PROFILE_IMAGE = "/default-profile.png";

// ── Types ──────────────────────────────────────────────────────────────────────

/** A single dynamic field definition stored in worldsettings.jsoncolumns */
interface DynamicFieldDef {
  key:          string;
  label:        string;
  type?:        string;       // text | email | number | select | textarea
  placeholder?: string;
  required?:    boolean;
  options?:     string[];     // for type === "select"
}

// ── Dynamic field renderer ─────────────────────────────────────────────────────
// ⚠️  This component is rendered OUTSIDE the <Form> context so we must NOT
//     use FormItem / FormControl / FormLabel — they call useFormContext()
//     internally and will throw if there is no provider above them.
//     Plain HTML + Tailwind classes are used instead.

interface DynamicFieldProps {
  def:      DynamicFieldDef;
  value:    string;
  onChange: (key: string, value: string) => void;
  disabled: boolean;
}

function DynamicField({ def, value, onChange, disabled }: DynamicFieldProps) {
  const inputClass =
    "w-full px-3 py-2 text-sm rounded-lg border border-input bg-background " +
    "focus:outline-none focus:ring-2 focus:ring-[#5871A7] focus:border-transparent " +
    "disabled:opacity-60 disabled:cursor-not-allowed";

  const label = (
    <label className="text-sm font-medium leading-none">
      {def.label}
      {def.required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );

  if (def.type === "textarea") {
    return (
      <div className="space-y-1.5">
        {label}
        <textarea
          rows={3}
          placeholder={def.placeholder || def.label}
          value={value}
          onChange={(e) => onChange(def.key, e.target.value)}
          disabled={disabled}
          required={def.required}
          className={`${inputClass} resize-y`}
        />
      </div>
    );
  }

  if (def.type === "select" && def.options?.length) {
    return (
      <div className="space-y-1.5">
        {label}
        <select
          value={value}
          onChange={(e) => onChange(def.key, e.target.value)}
          disabled={disabled}
          required={def.required}
          className={inputClass}
        >
          <option value="">Select {def.label}…</option>
          {def.options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
    );
  }

  // Default: text / email / number
  return (
    <div className="space-y-1.5">
      {label}
      <Input
        type={def.type || "text"}
        placeholder={def.placeholder || def.label}
        value={value}
        onChange={(e) => onChange(def.key, e.target.value)}
        disabled={disabled}
        required={def.required}
      />
    </div>
  );
}

// ── Static form schema ─────────────────────────────────────────────────────────
const schema = z.object({
  userId:       z.string().min(1, "User ID is required"),
  accountType:  z.string().min(1, "Account type is required"),
  profileImage: z.any().optional(),
});

// ── Main component ─────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [preview,        setPreview]        = useState<string | null>(null);
  const [selectedFile,   setSelectedFile]   = useState<File | null>(null);
  const [isSubmitting,   setIsSubmitting]   = useState(false);
  const [isRemoving,     setIsRemoving]     = useState(false);
  const [username,       setUsername]       = useState<string>("");
  const [imageurl,       setImageurl]       = useState<string | null>(null);
  const [role,           setUserrole]       = useState<string>("user");
  const [fileInputKey,   setFileInputKey]   = useState(Date.now());
  const [isImageRemoved, setIsImageRemoved] = useState(false);

  // Display name
  const [displayName,            setDisplayName]            = useState("");
  const [currentDisplayName,     setCurrentDisplayName]     = useState("");
  const [isCheckingDisplayName,  setIsCheckingDisplayName]  = useState(false);
  const [isDisplayNameAvailable, setIsDisplayNameAvailable] = useState<boolean | null>(null);
  const [isSavingDisplayName,    setIsSavingDisplayName]    = useState(false);
  const [displayNameMessage,     setDisplayNameMessage]     = useState<string | null>(null);
  const [checkTimeout,           setCheckTimeout]           = useState<NodeJS.Timeout | null>(null);

  // ── Dynamic fields ──────────────────────────────────────────────────────────
  const [dynamicFields,   setDynamicFields]   = useState<DynamicFieldDef[]>([]);
  const [dynamicValues,   setDynamicValues]   = useState<Record<string, string>>({});
  const [fieldsLoading,   setFieldsLoading]   = useState(false);
  const [isSavingDynamic, setIsSavingDynamic] = useState(false);
  const [dynamicSaveMsg,  setDynamicSaveMsg]  = useState<string | null>(null);

  // ── Read username from localStorage ────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem("username");
    if (stored) setUsername(stored);
  }, []);

  // ── Fetch profile image ────────────────────────────────────────────────────
  useEffect(() => {
    if (!username) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/getdisplaypic/${username}`)
      .then((r) => r.json())
      .then((d) => { setImageurl(d.imageurl); setIsImageRemoved(false); })
      .catch(() => setImageurl(null));
  }, [username]);

  // ── Fetch user role ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!username) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/getuserrole/${username}`)
      .then((r) => r.text())
      .then((t) => { if (t) setUserrole(JSON.parse(t).role || "user"); })
      .catch(console.error);
  }, [username]);

  // ── Fetch current display name ─────────────────────────────────────────────
  useEffect(() => {
    if (!username) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/${username}/display-name`)
      .then((r) => r.json())
      .then((d) => {
        const v = d.displayName || "";
        setCurrentDisplayName(v);
        setDisplayName(v);
      })
      .catch(() => { setCurrentDisplayName(""); setDisplayName(""); });
  }, [username]);

  // ── Fetch dynamic field definitions from worldsettings ────────────────────
  useEffect(() => {
    const fetchFields = async () => {
      if (!WORLD_ID) return;
      setFieldsLoading(true);
      try {
        const res  = await fetch(
          `${API_URL}/worldsettings/jsoncolumns/${WORLD_ID}`
        );
        if (!res.ok) return;
        const data = await res.json();
        const raw  = data?.jsoncolumns;
        if (!raw) return;
        const parsed: DynamicFieldDef[] =
          typeof raw === "string" ? JSON.parse(raw) : raw;
        if (!Array.isArray(parsed) || parsed.length === 0) return;
        setDynamicFields(parsed);
        const init: Record<string, string> = {};
        parsed.forEach((f) => { init[f.key] = ""; });
        setDynamicValues(init);
      } catch (err) {
        console.error("Error fetching dynamic fields:", err);
      } finally {
        setFieldsLoading(false);
      }
    };
    fetchFields();
  }, []);

  // ── Load existing dynamic values from userdata ─────────────────────────────
  useEffect(() => {
    if (!username || dynamicFields.length === 0) return;
    const fetchSaved = async () => {
      try {
        const res = await fetch(
          `${API_URL}/userdatabyworldid/jsoncolumns/${username}/${WORLD_ID}`
        );
        if (!res.ok) return;
        const data = await res.json();
        const raw  = data?.jsoncolumns;
        if (!raw) return;
        const saved: Record<string, string> =
          typeof raw === "string" ? JSON.parse(raw) : raw;
        setDynamicValues((prev) => {
          const next = { ...prev };
          dynamicFields.forEach((f) => {
            if (saved[f.key] !== undefined) next[f.key] = saved[f.key];
          });
          return next;
        });
      } catch (err) {
        console.error("Error loading saved dynamic values:", err);
      }
    };
    fetchSaved();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, dynamicFields]);

  // ── Cleanup timeout ────────────────────────────────────────────────────────
  useEffect(() => {
    return () => { if (checkTimeout) clearTimeout(checkTimeout); };
  }, [checkTimeout]);

  // ── Form ───────────────────────────────────────────────────────────────────
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { userId: "", accountType: "user", profileImage: undefined },
  });

  useEffect(() => { if (username) form.setValue("userId",      username); }, [username, form]);
  useEffect(() => { if (role)     form.setValue("accountType", role);     }, [role,     form]);

  // ── Dynamic field change handler ───────────────────────────────────────────
  const handleDynamicChange = (key: string, value: string) => {
    setDynamicValues((prev) => ({ ...prev, [key]: value }));
  };

  // ── Save dynamic fields ────────────────────────────────────────────────────
  const handleSaveDynamicFields = async () => {
    if (dynamicFields.length === 0) return;

    for (const f of dynamicFields) {
      if (f.required && !dynamicValues[f.key]?.trim()) {
        toast.error(`Please fill in the "${f.label}" field`);
        return;
      }
    }

    const payload: Record<string, string> = {};
    dynamicFields.forEach((f) => {
      if (dynamicValues[f.key]?.trim()) {
        payload[f.key] = dynamicValues[f.key].trim();
      }
    });

    setIsSavingDynamic(true);
    setDynamicSaveMsg(null);
    try {
      const res = await fetch(`${API_URL}/userdatabyworldid/jsoncolumns`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          userid:      username,
          worldid:      WORLD_ID,
          jsoncolumns: JSON.stringify(payload),
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      toast.success("Additional details saved!");
      setDynamicSaveMsg("Saved successfully!");
      setTimeout(() => setDynamicSaveMsg(null), 3000);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save additional details.");
      setDynamicSaveMsg("Error saving. Please try again.");
    } finally {
      setIsSavingDynamic(false);
    }
  };

  // ── Display name helpers ───────────────────────────────────────────────────
  const checkDisplayNameAvailability = async (handle: string) => {
    if (!handle || handle === currentDisplayName) {
      setIsDisplayNameAvailable(null);
      return;
    }
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(handle)) {
      setIsDisplayNameAvailable(false);
      return;
    }
    setIsCheckingDisplayName(true);
    try {
      const r    = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/users/check-display-name/${handle}`
      );
      const data = await r.json();
      setIsDisplayNameAvailable(data.available);
    } catch {
      setIsDisplayNameAvailable(false);
    } finally {
      setIsCheckingDisplayName(false);
    }
  };

  const handleDisplayNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setDisplayName(v);
    setDisplayNameMessage(null);
    if (checkTimeout) clearTimeout(checkTimeout);
    const t = setTimeout(() => checkDisplayNameAvailability(v), 500);
    setCheckTimeout(t);
  };

  const handleSaveDisplayName = async () => {
    if (!displayName || !isDisplayNameAvailable) return;
    setIsSavingDisplayName(true);
    try {
      const r = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/users/${username}/display-name`,
        {
          method:  "PUT",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ displayName }),
        }
      );
      if (!r.ok) throw new Error();
      setCurrentDisplayName(displayName);
      setDisplayNameMessage("Display name saved successfully!");
      toast.success("Display name saved successfully!");
      setTimeout(() => setDisplayNameMessage(null), 3000);
    } catch {
      setDisplayNameMessage("Error saving display name. Please try again.");
      toast.error("Error saving display name. Please try again.");
    } finally {
      setIsSavingDisplayName(false);
    }
  };

  const getDisplayNameStatusIcon = () => {
    if (isCheckingDisplayName)         return <Loader2 className="h-4 w-4 animate-spin text-gray-500" />;
    if (isDisplayNameAvailable === true)  return <Check className="h-4 w-4 text-green-500" />;
    if (isDisplayNameAvailable === false) return <X     className="h-4 w-4 text-red-500"   />;
    return null;
  };

  const getDisplayNameHelperText = () => {
    if (!displayName)                       return "Choose a unique handle for your public mantlepiece";
    if (displayName === currentDisplayName) return "This is your current display name";
    if (isCheckingDisplayName)              return "Checking availability...";
    if (isDisplayNameAvailable === true)    return "This handle is available!";
    if (isDisplayNameAvailable === false) {
      return !/^[a-zA-Z0-9_]{3,30}$/.test(displayName)
        ? "Handle must be 3-30 characters, letters, numbers, and underscores only"
        : "This handle is already taken";
    }
    return "";
  };

  const canSaveDisplayName =
    displayName &&
    isDisplayNameAvailable &&
    displayName !== currentDisplayName &&
    !isSavingDisplayName;

  // ── Image helpers ──────────────────────────────────────────────────────────
  const getDisplayImageUrl = () => {
    if (preview) return preview;
    if (!isImageRemoved && imageurl) return imageurl;
    return DEFAULT_PROFILE_IMAGE;
  };

  const isShowingDefault  = !preview && (isImageRemoved || !imageurl);
  const isShowingOriginal = !isImageRemoved && imageurl && !preview;
  const isShowingNew      = preview && preview.startsWith("blob:");

  const handleRemovePicture = async () => {
    setIsRemoving(true);
    try {
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
      setPreview(null);
      setSelectedFile(null);
      setIsImageRemoved(true);
      setFileInputKey(Date.now());
      form.setValue("profileImage", undefined);
      toast.success("Profile picture will be removed when you save settings");
    } catch {
      toast.error("Failed to remove profile picture");
    } finally {
      setIsRemoving(false);
    }
  };

  const handleImageChange = (file: File | undefined) => {
    if (!file) { setPreview(null); setSelectedFile(null); return; }
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      toast.error("Please select a PNG or JPG file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    setSelectedFile(file);
    setIsImageRemoved(false);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    setPreview(null);
    setSelectedFile(null);
    form.setValue("profileImage", undefined);
    setFileInputKey(Date.now());
  };

  const handleRestoreOriginal = () => {
    if (!imageurl) return;
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    setPreview(null);
    setSelectedFile(null);
    setIsImageRemoved(false);
    setFileInputKey(Date.now());
    form.setValue("profileImage", undefined);
    toast.success("Restored to original profile picture");
  };

  // ── Main form submit (profile image only) ──────────────────────────────────
  async function onSubmit(values: z.infer<typeof schema>) {
    setIsSubmitting(true);
    try {
      if (!selectedFile && !isImageRemoved) {
        toast.success("Settings saved successfully!");
        return;
      }

      const formData = new FormData();
      formData.append("userId",      values.userId);
      formData.append("accountType", values.accountType || "user");

      if (isImageRemoved) {
        const r    = await fetch(DEFAULT_PROFILE_IMAGE);
        const blob = await r.blob();
        formData.append(
          "file",
          new File([blob], "default-profile.png", { type: blob.type || "image/png" })
        );
        formData.append("fileName", "default-profile.png");
      } else if (selectedFile) {
        formData.append("file",     selectedFile);
        formData.append("fileName", selectedFile.name);
      } else {
        toast.success("Settings saved successfully!");
        return;
      }

      const res = await fetch(`${API_URL}/dpupload`, { method: "POST", body: formData });
      if (res.ok) {
        toast.success("Settings saved successfully!");
        window.location.reload();
      } else {
        toast.error("Failed to save settings");
      }
    } catch (err) {
      toast.error(
        `Network error: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 lg:w-[85%]">
      <h1 className="text-3xl font-semibold">Settings</h1>
      <hr className="border-[#D4D8EA] dark:border-[#2E4066]" />

      {/* ── Profile image + static fields (inside Form context) ─────────── */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold flex items-center gap-2.5 mb-6">
              <User className="text-geodrops" /> Your Details
            </h2>

            {/* Profile image */}
            <FormField
              name="profileImage"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      <img
                        src={getDisplayImageUrl()}
                        alt="Profile"
                        className={`rounded-full object-cover w-20 h-20 border-2 ${
                          isShowingDefault
                            ? "border-gray-300 dark:border-gray-600"
                            : "border-gray-200 dark:border-gray-700"
                        }`}
                        onError={(e) => {
                          const t = e.target as HTMLImageElement;
                          if (t.src !== DEFAULT_PROFILE_IMAGE) t.src = DEFAULT_PROFILE_IMAGE;
                        }}
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <div>
                        <p className="text-lg font-semibold">Upload Image</p>
                        <p className="text-sm text-[#61667A] dark:text-gray-400">
                          PNG or JPG (max 5MB, recommended 600x600px)
                        </p>
                        <div className="mt-1">
                          {isShowingNew      && <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">New image selected</span>}
                          {isShowingOriginal && <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">Current profile picture</span>}
                          {isShowingDefault  && <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">Default profile picture</span>}
                        </div>
                      </div>

                      <div className="flex mt-1 gap-2 flex-wrap">
                        <label className="inline-block cursor-pointer bg-white dark:bg-[#1C2541] px-4 py-2 rounded-[8px] hover:bg-muted-foreground/10 dark:hover:bg-white/10 w-fit border border-gray-200 dark:border-[#2E4066]">
                          <span className="text-black dark:text-white font-semibold">
                            {preview ? "Change" : "Upload"}
                          </span>
                          <Input
                            key={fileInputKey}
                            type="file"
                            accept="image/png, image/jpeg"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              field.onChange(f);
                              handleImageChange(f);
                            }}
                            className="hidden"
                          />
                        </label>
                        {!isShowingDefault && (
                          <Button
                            type="button"
                            variant="outline"
                            className="text-base"
                            disabled={isRemoving}
                            onClick={handleRemovePicture}
                          >
                            {isRemoving ? "Removing..." : "Remove Picture"}
                          </Button>
                        )}
                        {imageurl && (preview || isImageRemoved) && (
                          <Button
                            type="button"
                            variant="outline"
                            className="text-base flex items-center gap-2"
                            onClick={handleRestoreOriginal}
                          >
                            <RotateCcw size={16} /> Restore Original
                          </Button>
                        )}
                        {(preview || selectedFile) && (
                          <Button
                            type="button"
                            variant="ghost"
                            className="w-fit bg-transparent text-[#61667A] dark:text-gray-400 shadow-none flex text-base gap-2"
                            onClick={handleRemoveImage}
                          >
                            <Trash2 size={16} /> Remove Selected
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </FormItem>
              )}
            />

            {/* User ID */}
            <FormField
              name="userId"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>User ID</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail
                        size={20}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5871A7]"
                      />
                      <Input
                        className="px-10"
                        placeholder={username || "No user ID set"}
                        {...field}
                        disabled
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Account type */}
            <FormField
              name="accountType"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Type</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User
                        size={20}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5871A7]"
                      />
                      <Input
                        className="px-10"
                        placeholder={role || "Checking..."}
                        {...field}
                        disabled
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Display name */}
            <div className="space-y-4">
              <FormLabel className="text-base font-medium">Public Handle</FormLabel>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                This will be your public URL:{" "}
                <a
                  href={`${process.env.NEXT_PUBLIC_GEO_URL}/${displayName || "yourhandle"}`}
                  target={displayName ? "_blank" : undefined}
                  rel={displayName ? "noopener noreferrer" : undefined}
                >
                  {process.env.NEXT_PUBLIC_GEO_URL}/{displayName || "yourhandle"}
                </a>
              </p>
              <div className="relative">
                <Link
                  size={20}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5871A7]"
                />
                <Input
                  className="px-10 pr-10"
                  type="text"
                  value={displayName}
                  onChange={handleDisplayNameChange}
                  placeholder="Enter your handle"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  {getDisplayNameStatusIcon()}
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {getDisplayNameHelperText()}
              </p>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  onClick={handleSaveDisplayName}
                  disabled={!canSaveDisplayName}
                  className="bg-clgeodrops hover:opacity-60 duration-200 ease-in-out text-white"
                >
                  {isSavingDisplayName ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
                  ) : (
                    "Save Handle"
                  )}
                </Button>
                {displayNameMessage && (
                  <p className={`text-sm ${
                    displayNameMessage.includes("Error") ? "text-red-600" : "text-green-600"
                  }`}>
                    {displayNameMessage}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Save profile image */}
          <div className="flex gap-4">
            <Button
              type="submit"
              className="w-[200px] text-base"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save Settings"}
            </Button>
            <Button
              type="button"
              className="text-base"
              variant="outline"
              onClick={() => {
                if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
                form.reset();
                setPreview(null);
                setSelectedFile(null);
                setIsImageRemoved(false);
                setFileInputKey(Date.now());
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Form>

      {/* ── Dynamic fields section ─────────────────────────────────────────── */}
      {/* ⚠️  This section is intentionally OUTSIDE <Form> so that             */}
      {/*     DynamicField can safely use plain HTML without form context.      */}
      {(fieldsLoading || dynamicFields.length > 0) && (
        <>
          <hr className="border-[#D4D8EA] dark:border-[#2E4066]" />

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold flex items-center gap-2.5 mb-6">
              <SlidersHorizontal className="text-geodrops" /> Additional Details
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              These fields are specific to this platform. Fill them in and click Save below.
            </p>

            {fieldsLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-gray-400" />
                Loading fields…
              </div>
            ) : (
              <div className="space-y-4">
                {dynamicFields.map((def) => (
                  <DynamicField
                    key={def.key}
                    def={def}
                    value={dynamicValues[def.key] ?? ""}
                    onChange={handleDynamicChange}
                    disabled={isSavingDynamic}
                  />
                ))}

                <div className="flex items-center gap-3 pt-2">
                  <Button
                    type="button"
                    onClick={handleSaveDynamicFields}
                    disabled={isSavingDynamic}
                    className="w-[200px] text-base"
                  >
                    {isSavingDynamic ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</>
                    ) : (
                      "Save Additional Details"
                    )}
                  </Button>

                  {dynamicSaveMsg && (
                    <p className={`text-sm ${
                      dynamicSaveMsg.includes("Error") ? "text-red-600" : "text-green-600"
                    }`}>
                      {dynamicSaveMsg}
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