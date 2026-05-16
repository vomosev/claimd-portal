"use client";

import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Music, ExternalLink, Ticket } from "lucide-react";
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
import {
  Award,
  Box,
  CircleHelp,
  Mail,
  MapPin,
  UploadCloud,
} from "lucide-react";
import { Award as AwardType, geoDropsApi } from "@/services/api";
import toast from "react-hot-toast";
import CustomTooltip from "@/components/ui/tooltip";
import moment from "moment";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import SpotifyModal from "./SpotifyModal";

// ── Types ──────────────────────────────────────────────────────────────────────

interface AwardFormProps {
  mode: "add" | "edit";
  awardId?: number;
}

interface NominatimResponse {
  name?: string;
  display_name?: string;
  lat?: string;
  lon?: string;
  address?: {
    amenity?: string;
    building?: string;
    shop?: string;
    tourism?: string;
    leisure?: string;
    historic?: string;
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    country?: string;
  };
}

interface Dropsite {
  worldid:      number;
  worldname:    string;
  description?: string;
  latitude?:    number;
  longitude?:   number;
}

/** A single row from wallet_passes */
interface WalletPass {
  id:               number;
  serial_number:    string;
  user_id:          string;
  award_id:         string;
  notification:     string | null;
  reward_claimed:   string | null;
  created_at:       string;
  updated_at:       string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getFileUrl(filePath: string | undefined): string {
  if (!filePath) return "";
  if (filePath.startsWith("http://") || filePath.startsWith("https://")) return filePath;
  const clean = filePath.startsWith("/") ? filePath : `/${filePath}`;
  return `${process.env.NEXT_PUBLIC_API_URL}${clean}`;
}

function extractLocationName(response: NominatimResponse): string {
  if (response.name) return response.name;
  if (response.address) {
    const { amenity, building, shop, tourism, leisure, historic } = response.address;
    if (amenity)  return amenity;
    if (building) return building;
    if (shop)     return shop;
    if (tourism)  return tourism;
    if (leisure)  return leisure;
    if (historic) return historic;
    const { neighbourhood, suburb, road, city, town, village } = response.address;
    if (neighbourhood || suburb) {
      const area = neighbourhood || suburb;
      return road ? `${road}, ${area}` : area ?? "Unknown Location";
    }
    if (road && (city || town || village)) return `${road}, ${city || town || village}`;
  }
  if (response.display_name) {
    const parts = response.display_name.split(",").map((p) => p.trim());
    return parts.length >= 2 ? `${parts[0]}, ${parts[1]}` : parts[0];
  }
  return "Unknown Location";
}

// ── Wallet Passes table (edit mode only) ──────────────────────────────────────

function WalletPassesTable({ awardId }: { awardId: number }) {
  const [passes,  setPasses]  = useState<WalletPass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [search,  setSearch]  = useState("");

  useEffect(() => {
    const fetchPasses = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/listpasses/${awardId}`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setPasses(Array.isArray(data) ? data : data.passes ?? []);
      } catch (err) {
        console.error("Error fetching wallet passes:", err);
        setError("Failed to load wallet passes.");
      } finally {
        setLoading(false);
      }
    };
    fetchPasses();
  }, [awardId]);

  const filtered = passes.filter(
    (p) =>
      p.user_id.toLowerCase().includes(search.toLowerCase()) ||
      p.serial_number.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold flex items-center gap-2.5">
        <Ticket className="text-geodrops" /> Wallet Passes
        {passes.length > 0 && (
          <span className="ml-2 text-sm font-normal text-gray-500">
            ({passes.length} pass{passes.length !== 1 ? "es" : ""})
          </span>
        )}
      </h2>
      <p className="text-sm text-gray-500">
        All wallet passes that have been issued for this Drop.
      </p>

      {/* Search */}
      {passes.length > 0 && (
        <div className="relative max-w-sm">
          <Input
            placeholder="Search by user or serial…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-8"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#5871A7]" />
          Loading wallet passes…
        </div>
      )}

      {!loading && error && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {!loading && !error && passes.length === 0 && (
        <div className="rounded-lg border border-dashed border-[#D4D8EA] dark:border-[#2E4066] p-6 text-center">
          <Ticket size={24} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
          <p className="text-sm text-gray-400">No wallet passes issued yet for this Drop.</p>
        </div>
      )}

      {!loading && !error && passes.length > 0 && (
        <div className="rounded-lg border border-[#D4D8EA] dark:border-[#2E4066] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-[#D4D8EA] dark:border-[#2E4066]">
                  {[
                    "ID",
                    "Serial Number",
                    "User ID",
                    "Notification",
                    "Reward Claimed",
                    "Created At",
                    "Updated At",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D4D8EA] dark:divide-[#2E4066]">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-5 text-sm text-gray-400">
                      No results for &ldquo;{search}&rdquo;
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => (
                    <tr
                      key={p.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">
                        {p.id}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300 max-w-[180px] truncate">
                        {p.serial_number}
                      </td>
                      <td className="px-4 py-3 text-gray-800 dark:text-gray-200 max-w-[160px] truncate">
                        {p.user_id}
                      </td>
                      <td className="px-4 py-3">
                        {p.notification ? (
                          <span className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                            {p.notification}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 italic">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {p.reward_claimed ? (
                          <span className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                            {p.reward_claimed}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 italic">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {new Date(p.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {new Date(p.updated_at).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {filtered.length < passes.length && (
            <div className="px-4 py-2.5 border-t border-[#D4D8EA] dark:border-[#2E4066] text-xs text-gray-400">
              Showing {filtered.length} of {passes.length} passes
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function AwardForm({ mode, awardId }: AwardFormProps) {
  const [loading,             setLoading]             = useState(true);
  const [saving,              setSaving]              = useState(false);
  const [awardData,           setAwardData]           = useState<AwardType | null>(null);
  const [findingCoords,       setFindingCoords]       = useState(false);
  const [gettingLocation,     setGettingLocation]     = useState(false);
  const [originalValues,      setOriginalValues]      = useState<any>(null);
  const [uploadingImage,      setUploadingImage]      = useState(false);
  const [uploadingGlb,        setUploadingGlb]        = useState(false);
  const [validatingVideo,     setValidatingVideo]     = useState(false);
  const [videoValid,          setVideoValid]          = useState<boolean | null>(null);
  const [spotifyLinks,        setSpotifyLinks]        = useState<string[]>([]);
  const [dropsites,           setDropsites]           = useState<Dropsite[]>([]);
  const [loadingDropsites,    setLoadingDropsites]    = useState(false);
  const [uploadingUsdz,       setUploadingUsdz]       = useState(false);
  const [showSpotifyModal,    setShowSpotifyModal]    = useState(false);
  const [uploadedFiles,       setUploadedFiles]       = useState<{
    awardImg?: string; assetGlb?: string; assetUsdz?: string; video?: string;
  }>({});
  const [uploadingVideo,      setUploadingVideo]      = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [videoUploadMode,     setVideoUploadMode]     = useState<"url" | "upload">("url");
  const [selectedFiles,       setSelectedFiles]       = useState<{
    awardImg?: File; assetGlb?: File; assetUsdz?: File; video?: File;
  }>({});

  const [,              setUserrole]      = useState(null);
  const [adminStatus,   setAdminStatus]   = useState(false);
  const [currentUsername, setCurrentUsername] = useState("");
  const [spotifyLinksChanged, setSpotifyLinksChanged] = useState(false);
  const [accessChecked, setAccessChecked] = useState(false);

  const router       = useRouter();
  const searchParams = useSearchParams();

  // ── Read username ─────────────────────────────────────────────────────────
  useEffect(() => {
    const username = localStorage.getItem("username") ?? "";
    setCurrentUsername(username);
  }, []);

  // ── Fetch user role ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUsername) return;
    let API_URL = `${process.env.NEXT_PUBLIC_API_URL}/getuserrole/${currentUsername}`;
    if (awardId && mode === "edit") {
      API_URL = `${process.env.NEXT_PUBLIC_API_URL}/getuserrolebyaward/${currentUsername}/${awardId}`;
    }
    fetch(API_URL)
      .then((r) => r.json())
      .then((data) => {
        setUserrole(data.role);
        if (
          String(data.role).includes("admin") ||
          String(data.role).includes("superuser")
        ) {
          setAdminStatus(true);
          if (mode === "add") setLoading(false);
        } else {
          setAdminStatus(false);
          if (mode === "add") {
            alert(
              "This account does not have Create Drop permissions. Contact support@geo-drops.com to request these permissions."
            );
            router.push("/dashboard");
          }
        }
        setAccessChecked(true);
      })
      .catch((err) => {
        console.error("Error fetching user role:", err);
        setAdminStatus(false);
        setAccessChecked(true);
        if (mode === "add") router.push("/dashboard");
      });
  }, [currentUsername, router, mode]);

  // ── Redirect non-admin (edit mode) ────────────────────────────────────────
  useEffect(() => {
    if (accessChecked && !adminStatus && mode === "edit") {
      toast.error("Access denied. Admin privileges required.");
      router.push("/dashboard");
    }
  }, [accessChecked, adminStatus, router, mode]);

  // ── Schema ────────────────────────────────────────────────────────────────
  const schema = z
    .object({
      assetName:       z.string().min(1),
      awardName:       z.string().min(1),
      awardType:       z.string().min(1),
      worldId:         z.string().optional(),
      certifyingBody:  z.string().optional(),
      description:     z.string().optional(),
      htmlContent:     z.string().max(10000).optional(),
      awardFile:       z.any().optional(),
      locationName:    z.string().optional(),
      dropPrice:       z.string().optional(),
      dropCurrency:    z.string().optional(),
      dropFee:         z.string().optional(),
      videoLocation: z
        .string()
        .optional()
        .refine(
          (val) => {
            console.log(`Video must be .mp4 format. URLs must be: https://nodejs.gridiron-app.com/images/[filename].mp4 - ${val}`);
            if (!val || val.trim() === "") return true;
            if (!val.toLowerCase().endsWith(".mp4")) return false;
            if (val.startsWith("http://") || val.startsWith("https://")) {
              return /^https:\/\/nodejs\.gridiron-app\.com\/images\/.+\.mp4$/.test(val);
            }
            return true;
          },
          {
            message: "Video must be .mp4 format. URLs must be: https://nodejs.gridiron-app.com/images/[filename].mp4 - {val}",
          }
        ),
      address:         z.string().optional(),
      latitude:        z.string().optional(),
      longitude:       z.string().optional(),
      allowedRadius:   z.string().optional(),
      locationType:    z.string().optional(),
      textbook:        z.string().optional(),
      challenge:       z.string().optional(),
      modelGlb:        z.any().optional(),
      modelUsdz:       z.any().optional(),
      // ── publicSetting: 0 = not shown, 1 = everywhere, 2 = dropsite only ──
      publicSetting:   z.string().optional(),
      awardImg:        z.string().optional(),
      assetGlb:        z.string().optional(),
      assetUsdz:       z.string().optional(),
      start_from_date: mode === "edit" ? z.string().optional() : z.string().date(),
      start_from_time: z.string().optional(),
      finish_date:     mode === "edit" ? z.string().optional() : z.string().date(),
      finish_time:     z.string().optional(),
      userId:          z.string().email(),
      useridb:         z.string().optional(),
      useridc:         z.string().optional(),
      useridd:         z.string().optional(),
    })
    .refine(
      (data) => {
        if (!data.start_from_date || !data.finish_date) return true;
        const start  = moment(`${data.start_from_date} ${data.start_from_time || ""}`, "YYYY-MM-DD HH:mm");
        const finish = moment(`${data.finish_date} ${data.finish_time || ""}`, "YYYY-MM-DD HH:mm");
        return finish.isAfter(start);
      },
      {
        message: "Finish date and time must be after start date and time",
        path: ["finish_date"],
      }
    );

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      assetName:       "",
      awardName:       "",
      awardType:       "",
      dropPrice:       "",
      dropCurrency:    "",
      dropFee:         "",
      certifyingBody:  "",
      description:     "",
      htmlContent:     "",
      awardFile:       undefined,
      videoLocation:   "",
      locationName:    "",
      address:         "",
      latitude:        "",
      longitude:       "",
      allowedRadius:   "100",
      locationType:    "",
      textbook:        "",
      challenge:       "",
      modelGlb:        undefined,
      modelUsdz:       undefined,
      publicSetting:   "0",
      awardImg:        "",
      worldId:         "",
      assetGlb:        "",
      assetUsdz:       "",
      start_from_date: "",
      start_from_time: "",
      finish_date:     "",
      finish_time:     "",
      userId:          "",
      useridb:         "",
      useridc:         "",
      useridd:         "",
    },
  });

  // ── Fetch Spotify links ───────────────────────────────────────────────────
  useEffect(() => {
    if (mode === "edit" && awardId && accessChecked && adminStatus) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/award-spotify-links/${awardId}`)
        .then((r) => r.json())
        .then((d) => setSpotifyLinks(d.links || []))
        .catch((err) => console.error("Error fetching Spotify links:", err));
    }
  }, [awardId, mode, accessChecked, adminStatus]);

  // ── Fetch dropsites ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!accessChecked || !adminStatus) return;
    setLoadingDropsites(true);
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/worldawards/listbyuser/${currentUsername}`)
      .then((r) => r.json())
      .then((d) => setDropsites(Array.isArray(d) && d.length > 0 ? d : []))
      .catch((err) => console.error("Error fetching dropsites:", err))
      .finally(() => setLoadingDropsites(false));
  }, [accessChecked, adminStatus, currentUsername]);

  // ── Validate video URL ────────────────────────────────────────────────────
  const handleValidateVideoUrl = async (url: string) => {
    if (!url || url.trim() === "") { setVideoValid(null); return; }
    setValidatingVideo(true);
    try {
      await fetch(url, { method: "HEAD", mode: "no-cors" });
      setVideoValid(true);
      toast.success("Video URL is valid and reachable");
    } catch {
      setVideoValid(false);
      toast.error("Video URL may not be reachable");
    } finally {
      setValidatingVideo(false);
    }
  };

  // ── Spotify helpers ───────────────────────────────────────────────────────
  const handleLaunchSpotifySearch = () => setShowSpotifyModal(true);

  const fetchSpotifyLinks = async () => {
    if (!awardId) return;
    try {
      const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/award-spotify-links/${awardId}`);
      if (r.ok) {
        const d = await r.json();
        setSpotifyLinks(d.links || []);
        setSpotifyLinksChanged(true);
      }
    } catch (err) {
      console.error("Error fetching Spotify links:", err);
    }
  };

  // ── Load award data (edit mode) ───────────────────────────────────────────
  useEffect(() => {
    if (mode === "edit" && awardId && accessChecked && adminStatus) {
      const fetchAwardData = async () => {
        try {
          const response =
            searchParams.get("my-geo-drops") === "true"
              ? await geoDropsApi.getAdminAward(currentUsername, awardId.toString())
              : await geoDropsApi.getAward(awardId.toString());

          if (response.success && response.data) {
            const award = response.data as AwardType;
            setAwardData(award);

            const formValues = {
              assetName:       award.assetname      || "",
              awardName:       award.name           || "",
              awardType:       award.type           || "",
              dropPrice:       award.price          || "",
              dropCurrency:    award.currency       || "",
              dropFee:         award.fee            || "",
              certifyingBody:  award.certifyingbody || "",
              description:     award.description    || "",
              htmlContent:     award.htmltext        || "",
              locationName:    award.locationname   || "",
              address:         award.address        || "",
              latitude:        award.latitude?.toString()       || "",
              longitude:       award.longitude?.toString()      || "",
              allowedRadius:   award.allowed_radius?.toString() || "100",
              locationType:    award.locationtype   || "",
              textbook:        award.textbook       || "",
              challenge:       award.challenge      || "",
              // Map the stored numeric public value to our 3-way string
              publicSetting:   String(award.public ?? "0"),
              worldId:
                award.worldid && award.worldid !== 0
                  ? award.worldid.toString()
                  : "none",
              awardImg:        award.awardimg       || "",
              videoLocation:   award.videolocation  || "",
              assetGlb:        award.assetglburl    || "",
              assetUsdz:       award.assetusdzurl   || "",
              start_from_date: award.start_from_date
                ? moment(award.start_from_date).format("YYYY-MM-DD")
                : "",
              start_from_time: award.start_from_time || "",
              finish_date:     award.finish_date
                ? moment(award.finish_date).format("YYYY-MM-DD")
                : "",
              finish_time:     award.finish_time      || "",
              userId:          (award as any).userid  || "",
              useridb:         (award as any).useridb || "",
              useridc:         (award as any).useridc || "",
              useridd:         (award as any).useridd || "",
            };

            setOriginalValues(formValues);
            form.reset(formValues);
          } else {
            toast.error("Failed to load award data");
          }
        } catch (err) {
          console.error("Error fetching award data:", err);
          toast.error("Error loading award data");
        } finally {
          setLoading(false);
        }
      };
      fetchAwardData();
    } else if (mode === "add" && accessChecked && adminStatus) {
      setLoading(false);
    }
  }, [awardId, form, mode, accessChecked, adminStatus, currentUsername]);

  // ── Video upload ──────────────────────────────────────────────────────────
  const handleVideoUpload = async (file: File) => {
    if (file.size > 100 * 1024 * 1024) {
      toast.error("Video file exceeds 100MB limit");
      return;
    }
    if (!file.type.startsWith("video/mp4") && !file.name.toLowerCase().endsWith(".mp4")) {
      toast.error("Only MP4 video files are supported");
      return;
    }
    setUploadingVideo(true);
    setVideoUploadProgress(0);
    try {
      const fd = new FormData();
      fd.append("video", file);
      fd.append("title", "geo-drop-video");
      fd.append("type",  "videos");
      fd.append("userid",    currentUsername);
      fd.append("awardid",    awardId?.toString() || "new");

      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/uploadvideo`,
        fd,
        {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (e) => {
            if (e.total) setVideoUploadProgress(Math.round((e.loaded * 100) / e.total));
          },
        }
      );
      if (res.data.success) {
        form.setValue("videoLocation", res.data.url, { shouldValidate: true, shouldDirty: true });
        setUploadedFiles((p) => ({ ...p, video: res.data.filename }));
        setVideoUploadProgress(100);
        toast.success(`Video uploaded! (${res.data.size})`);
      } else {
        toast.error(res.data.message || "Failed to upload video");
      }
    } catch (err: any) {
      if (err.response?.status === 413) toast.error("Video too large. Max 100MB.");
      else toast.error(err.response?.data?.message || "Failed to upload video.");
      setVideoUploadProgress(0);
    } finally {
      setTimeout(() => { setUploadingVideo(false); setVideoUploadProgress(0); }, 1000);
    }
  };

  // ── Find coordinates ──────────────────────────────────────────────────────
  const handleFindCoordinates = async () => {
    const address = form.getValues("address");
    if (!address) { toast.error("Please enter an address first"); return; }
    setFindingCoords(true);
    try {
      const res  = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
      );
      const data = await res.json();
      if (data?.length > 0) {
        const { lat, lon, display_name } = data[0];
        const loc = extractLocationName(data[0]);
        form.setValue("latitude",     lat.toString(), { shouldValidate: true, shouldDirty: true });
        form.setValue("longitude",    lon.toString(), { shouldValidate: true, shouldDirty: true });
        form.setValue("locationName", loc,            { shouldValidate: true, shouldDirty: true });
        form.setValue("address",      display_name,   { shouldValidate: true, shouldDirty: true });
        form.trigger(["latitude", "longitude", "locationName", "address"]);
        toast.success(`Location found: ${loc}`);
      } else {
        toast.error("No coordinates found for this address");
      }
    } catch {
      toast.error("Error finding coordinates. Please try again.");
    } finally {
      setFindingCoords(false);
    }
  };

  // ── File upload ───────────────────────────────────────────────────────────
  const handleFileUpload = async (file: File, type: "image" | "glb" | "usdz") => {
    if (type === "image")  setUploadingImage(true);
    else if (type === "glb")   setUploadingGlb(true);
    else if (type === "usdz")  setUploadingUsdz(true);
    try {
      const fieldName = type === "image" ? "awardImg" : type === "glb" ? "assetGlb" : "assetUsdz";
      const maxSize   = type === "image" ? 5 * 1024 * 1024 : 50 * 1024 * 1024;
      if (file.size > maxSize)
        throw new Error(`File size exceeds ${maxSize / 1024 / 1024}MB limit`);
      setUploadedFiles((p) => ({ ...p, [fieldName]: file.name }));
      setSelectedFiles((p) => ({ ...p, [fieldName]: file  }));
      toast.success(`${type === "image" ? "Image" : type.toUpperCase()} file ready for upload!`);
    } catch (err) {
      toast.error(`Failed to upload ${type}: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      if (type === "image")  setUploadingImage(false);
      else if (type === "glb")   setUploadingGlb(false);
      else if (type === "usdz")  setUploadingUsdz(false);
    }
  };

  // ── My coordinates ────────────────────────────────────────────────────────
  const handleMyCoordinates = () => {
    if (!navigator.geolocation) { toast.error("Geolocation not supported"); return; }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude, longitude } }) => {
        form.setValue("latitude",  latitude.toString(),  { shouldValidate: true, shouldDirty: true });
        form.setValue("longitude", longitude.toString(), { shouldValidate: true, shouldDirty: true });
        try {
          const res  = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await res.json();
          if (data?.display_name) {
            const loc = extractLocationName(data);
            form.setValue("address",      data.display_name, { shouldValidate: true, shouldDirty: true });
            form.setValue("locationName", loc,               { shouldValidate: true, shouldDirty: true });
            form.trigger(["latitude", "longitude", "address", "locationName"]);
            toast.success(`Current location: ${loc}`);
          }
        } catch {
          toast.error("Coordinates updated but couldn't get location name");
        }
        setGettingLocation(false);
      },
      (err) => {
        const msgs: Record<number, string> = {
          [err.PERMISSION_DENIED]:    "Permission denied.",
          [err.POSITION_UNAVAILABLE]: "Location unavailable.",
          [err.TIMEOUT]:              "Request timed out.",
        };
        toast.error("Error getting location. " + (msgs[err.code] || "Unknown error."));
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  };

  // ── Has form changes ──────────────────────────────────────────────────────
  const hasFormChanges = (currentValues: any) => {
    if (mode === "add") return true;
    if (!originalValues) return true;
    if (spotifyLinksChanged) return true;
    const hasNewFiles =
      selectedFiles.awardImg instanceof File ||
      selectedFiles.assetGlb  instanceof File ||
      selectedFiles.assetUsdz instanceof File;
    if (hasNewFiles) return true;

    const fieldsToCompare = [
      "assetName", "awardName", "awardType",
      "dropPrice", "dropCurrency", "dropFee", "certifyingBody",
      "description", "htmlContent", "locationName",
      "videoLocation", "address", "latitude", "longitude",
      "allowedRadius", "locationType", "worldId",
      "textbook", "challenge", "publicSetting",
      "start_from_date", "start_from_time", "finish_date", "finish_time",
      "userId", "useridb", "useridc", "useridd",
    ];

    return fieldsToCompare.some((f) => {
      const orig = originalValues[f] || "";
      const curr = currentValues[f]  || "";
      return orig.toString() !== curr.toString();
    });
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  async function onSubmit(values: z.infer<typeof schema>) {
    if (mode === "edit" && !hasFormChanges(values)) {
      toast.error("No changes made to the Drop.");
      return;
    }
    setSaving(true);
    try {
      const submitData = {
        assetname:       values.assetName,
        name:            values.awardName,
        type:            values.awardType,
        price:           values.dropPrice,
        currency:        values.dropCurrency,
        fee:             values.dropFee,
        certifyingbody:  values.certifyingBody,
        description:     values.description,
        htmltext:        values.htmlContent,
        locationname:    values.locationName,
        address:         values.address,
        videolocation:   values.videoLocation || "/images/certifygeneric.mp4",
        latitude:        values.latitude  ? parseFloat(values.latitude)  : 0,
        longitude:       values.longitude ? parseFloat(values.longitude) : 0,
        allowed_radius:  values.allowedRadius ? parseInt(values.allowedRadius) : 100,
        locationtype:    values.locationType,
        textbook:        values.textbook,
        challenge:       values.challenge,
        // Store as integer 0, 1 or 2
        public:          parseInt(values.publicSetting || "0"),
        dropname:        values.awardName || "",
        worldid:
          values.worldId && values.worldId !== "none" && values.worldId !== ""
            ? parseInt(values.worldId)
            : 0,
        vertical:        "",
        awardimg:        values.awardImg    || "",
        assetglburl:     values.assetGlb    || "",
        assetusdzurl:    values.assetUsdz   || "",
        start_from_date: values.start_from_date,
        start_from_time: values.start_from_time,
        finish_date:     values.finish_date,
        finish_time:     values.finish_time,
        userid:          values.userId,
        useridb:         values.useridb || "",
        useridc:         values.useridc || "",
        useridd:         values.useridd || "",
      };

      const files: { awardImg?: File; assetGlb?: File; assetUsdz?: File; video?: File } = {};
      if (selectedFiles.awardImg instanceof File) files.awardImg = selectedFiles.awardImg;
      if (selectedFiles.assetGlb  instanceof File) files.assetGlb  = selectedFiles.assetGlb;
      if (selectedFiles.assetUsdz instanceof File) files.assetUsdz = selectedFiles.assetUsdz;
      if (selectedFiles.video     instanceof File) files.video     = selectedFiles.video;
      const hasFiles = Object.keys(files).length > 0;

      let response;
      if (mode === "add") {
        response = await geoDropsApi.addAward(submitData, hasFiles ? files : undefined);
      } else if (awardId) {
        response = await geoDropsApi.updateAward(awardId, submitData, hasFiles ? files : undefined);
      } else {
        throw new Error("Award ID is missing for update");
      }

      if (response.success) {
        toast.success(`Geo Drop ${mode === "add" ? "added" : "updated"} successfully!`);
        if (mode === "edit") {
          setOriginalValues(values);
          setSelectedFiles({});
          setUploadedFiles({});
          setSpotifyLinksChanged(false);
        }
        router.push(
          searchParams.get("my-geo-drops") === "true"
            ? "/dashboard/my-geo-drops"
            : "/dashboard"
        );
      } else {
        toast.error(`Failed to ${mode} award: ` + response.error);
      }
    } catch (err) {
      toast.error(`Error ${mode}ing award: ` + err);
    } finally {
      setSaving(false);
    }
  }

  // ── Render guards ─────────────────────────────────────────────────────────
  if (!accessChecked || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p>
          {!accessChecked
            ? "Checking access permissions..."
            : mode === "edit"
            ? "Loading award data..."
            : "Loading..."}
        </p>
      </div>
    );
  }

  if (!adminStatus) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p>Redirecting to dashboard...</p>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <div className="lg:w-[85%] space-y-6">
      <div className="flex justify-center items-left flex-col md:flex-row md:justify-between">
        <h1 className="text-xl md:text-3xl font-semibold">
          {mode === "add" ? "Add" : "Edit"} Drop
        </h1>
        <h2 className="text-lg font-medium italic">
          {mode === "add" ? "" : "Update information"}
        </h2>
      </div>
      <hr className="border-[#D4D8EA] dark:border-[#2E4066]" />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">

          {/* ── Award Info ───────────────────────────────────────────────── */}
          <section className="space-y-6">
            <h2 className="text-xl font-semibold flex items-center gap-2.5">
              <Award className="text-geodrops" /> Drop Information and Pricing
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* User ID */}
              <FormField name="userId" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>User ID</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5871A7]" />
                      <Input className="px-10" placeholder="Primary user email or ID" {...field} />
                      <CircleHelp size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CB0DA]" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Secondary User ID */}
              <FormField name="useridb" control={form.control} render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormLabel>Secondary User ID (optional)</FormLabel>
                    <CustomTooltip content="An additional user or collaborator associated with this Drop." />
                  </div>
                  <FormControl>
                    <div className="relative">
                      <Mail size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5871A7]" />
                      <Input className="px-10" placeholder="Secondary user email or ID" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Third User ID */}
              <FormField name="useridc" control={form.control} render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormLabel>Third User ID (optional)</FormLabel>
                    <CustomTooltip content="A third user or collaborator associated with this Drop." />
                  </div>
                  <FormControl>
                    <div className="relative">
                      <Mail size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5871A7]" />
                      <Input className="px-10" placeholder="Third user email or ID" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Fourth User ID */}
              <FormField name="useridd" control={form.control} render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormLabel>Fourth User ID (optional)</FormLabel>
                    <CustomTooltip content="A fourth user or collaborator associated with this Drop." />
                  </div>
                  <FormControl>
                    <div className="relative">
                      <Mail size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5871A7]" />
                      <Input className="px-10" placeholder="Fourth user email or ID" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Asset Name */}
              <FormField name="assetName" control={form.control} render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormLabel>Drop Asset Name</FormLabel>
                    <CustomTooltip content="This is the name that will be displayed for the Drop asset." />
                  </div>
                  <FormControl><Input placeholder="Type here" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Award Name */}
              <FormField name="awardName" control={form.control} render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormLabel>Drop Name</FormLabel>
                    <CustomTooltip content="This is the name that will be displayed for the Drop award." />
                  </div>
                  <FormControl><Input placeholder="Type here" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Drop Price */}
              <FormField name="dropPrice" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Drop Price (only for paid drops)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="E.g. 10.00"
                      {...field}
                      disabled={mode === "edit"}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Drop Currency */}
              <FormField name="dropCurrency" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Drop Currency (only for paid drops)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={mode === "edit"}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select Currency" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="gbp">GBP</SelectItem>
                      <SelectItem value="usd">USD</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Drop Fee */}
              <FormField name="dropFee" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Optional Fee (only for paid drops)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="E.g. 1.00"
                      {...field}
                      disabled={mode === "edit"}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Certifying Body */}
              <FormField name="certifyingBody" control={form.control} render={({ field }) => (
                <FormItem>
                  <div className="flex items-center">
                    <FormLabel>Certifying Body (optional)</FormLabel>
                    <CustomTooltip content="The name of the organization that is certifying the drop." />
                  </div>
                  <FormControl><Input placeholder="Type here" {...field} /></FormControl>
                </FormItem>
              )} />

              {/* ── Public Setting — 3-way select ──────────────────────────── */}
              <FormField name="publicSetting" control={form.control} render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormLabel>Drop Visibility</FormLabel>
                    <CustomTooltip content="Control where this Drop is visible. 'Not shown' keeps it private. 'Public everywhere' shows it on geo-drops.com. 'Dropsite only' restricts it to the linked dropsite. 'Street Team only' is for the linked dropsite's street team." />
                  </div>
                  <Select onValueChange={field.onChange} value={field.value ?? "0"}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select visibility" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="0">
                        <div className="flex flex-col">
                          <span className="font-medium">Not shown</span>
                          <span className="text-xs text-gray-500">Private — not visible anywhere</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="1">
                        <div className="flex flex-col">
                          <span className="font-medium">Public everywhere</span>
                          <span className="text-xs text-gray-500">Visible on geo-drops.com</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="2">
                        <div className="flex flex-col">
                          <span className="font-medium">Dropsite only</span>
                          <span className="text-xs text-gray-500">Only visible on the linked dropsite</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="10">
                        <div className="flex flex-col">
                          <span className="font-medium">Street Team only</span>
                          <span className="text-xs text-gray-500">Only visible for the linked dropsite's street team</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-xs">
                    {field.value === "0" && "This Drop is private and will not appear publicly."}
                    {field.value === "1" && "This Drop will appear on geo-drops.com."}
                    {field.value === "2" && "This Drop will only appear on the dropsite it is linked to."}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Dropsite */}
              <FormField name="worldId" control={form.control} render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormLabel>Dropsite (optional)</FormLabel>
                    <CustomTooltip content="Select a dropsite location to associate this Drop with a specific physical location." />
                  </div>
                  <Select onValueChange={field.onChange} value={field.value} disabled={loadingDropsites}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={
                          loadingDropsites ? "Loading dropsites..." :
                          dropsites.length === 0 ? "No dropsites available" : "Select a Dropsite"
                        } />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None (No Dropsite)</SelectItem>
                      {dropsites.length === 0 && !loadingDropsites && (
                        <SelectItem value="no-dropsites" disabled>No dropsites available - Create one first</SelectItem>
                      )}
                      {dropsites.map((d) => (
                        <SelectItem key={d.worldid} value={d.worldid.toString()}>
                          <div className="flex flex-col">
                            <span className="font-medium">{d.worldname}</span>
                            {d.description && (
                              <span className="text-xs text-gray-500 truncate max-w-[300px]">{d.description}</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-xs">
                    {dropsites.length > 0
                      ? `${dropsites.length} dropsite${dropsites.length === 1 ? "" : "s"} available`
                      : "Create a dropsite in Manage Dropsites to link it here."}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Award Type */}
              <FormField name="awardType" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Drop Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select Drop Type" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {[
                        "Badge","Challenge","Celebrity","Certificate","Culture",
                        "Event","Film","Fitness","Location","Luxury","Memorabilia",
                        "Music","Nature","Outdoors","Sports","Fashion","Theatre",
                        "Trophy","Other",
                      ].map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                  {mode === "edit" && awardId && accessChecked && adminStatus && form.watch("dropPrice") && (
                    <Button
                      type="button"
                      className="bg-[#5871A7] h-10 w-[48%] mt-4"
                      onClick={() => window.open("/dashboard/seatingplan/" + awardId, "_self")}
                    >
                      Edit Seating Plan
                    </Button>
                  )}
                </FormItem>
              )} />

            </div>

            {/* Description */}
            <FormField name="description" control={form.control} render={({ field }) => (
              <FormItem>
                <div className="flex items-center gap-2">
                  <FormLabel>Description</FormLabel>
                  <CustomTooltip content="Briefly describe the award's purpose." />
                </div>
                <FormControl><Textarea placeholder="Type here" {...field} /></FormControl>
              </FormItem>
            )} />

            {/* HTML Content */}
            <FormField name="htmlContent" control={form.control} render={({ field }) => (
              <FormItem>
                <div className="flex items-center gap-2">
                  <FormLabel>HTML Content (optional)</FormLabel>
                  <CustomTooltip content="Add further information in HTML format." />
                </div>
                <FormControl><HtmlTextarea placeholder="Type here" {...field} value={field.value ?? ""} /></FormControl>
                <div className="flex justify-between items-center mt-1">
                  <FormMessage />
                  <span className={`text-sm ${(field.value?.length || 0) > 10000 ? "text-red-500 font-semibold" : "text-gray-500"}`}>
                    {field.value?.length || 0} / 10000 characters
                  </span>
                </div>
              </FormItem>
            )} />

            {/* Award Image */}
            <FormField name="awardFile" control={form.control} render={() => (
              <FormItem>
                <div className="flex items-center gap-2">
                  <FormLabel>Drop Image</FormLabel>
                  <CustomTooltip content="512×512px minimum. Max 2MB." />
                </div>
                <FormControl>
                  <div className="relative">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => { const f = e.target.files?.[0]; if (f) await handleFileUpload(f, "image"); }}
                      disabled={uploadingImage}
                    />
                    {uploadingImage
                      ? <div className="absolute right-3 top-1/2 -translate-y-1/2"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#5871A7]" /></div>
                      : <UploadCloud size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5871A7]" />}
                  </div>
                </FormControl>
                {uploadedFiles.awardImg && (
                  <FormDescription className="text-sm text-green-600">✓ Uploaded: {uploadedFiles.awardImg}</FormDescription>
                )}
                {mode === "edit" && awardData?.awardimg && !uploadedFiles.awardImg && (
                  <>
                    <FormDescription className="text-sm text-gray-600">
                      Current file: {awardData.awardimg.split("/").pop()}
                    </FormDescription>
                    <img
                      src={getFileUrl(awardData.awardimg)}
                      alt="Current Drop image"
                      className="mt-2 max-w-[200px] max-h-[200px] object-contain rounded-md border border-gray-200"
                    />
                  </>
                )}
              </FormItem>
            )} />

          </section>

          <hr className="border-[#D4D8EA] dark:border-[#2E4066]" />

          {/* ── Location ─────────────────────────────────────────────────── */}
          <section className="space-y-6">
            <h2 className="text-xl font-semibold flex items-center gap-2.5">
              <MapPin className="text-geodrops" /> Location
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">

              <FormField name="locationName" control={form.control} render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormLabel>Location Name</FormLabel>
                    <CustomTooltip content="The name of the location where the award can be claimed." />
                  </div>
                  <FormControl><Input placeholder="Type here" {...field} /></FormControl>
                </FormItem>
              )} />

              <FormField name="address" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <div className="flex flex-col gap-4 mb-5">
                      <Input placeholder="Search your location" {...field} />
                      <div className="flex gap-4 w-full">
                        <Button type="button" className="bg-[#5871A7] h-10 w-[48%]"
                          onClick={handleFindCoordinates} disabled={findingCoords}>
                          {findingCoords ? "Finding..." : "Find Coordinates"}
                        </Button>
                        <Button type="button" className="h-10 w-[48%]"
                          onClick={handleMyCoordinates} disabled={gettingLocation}>
                          {gettingLocation ? "Getting..." : "My Coordinates"}
                        </Button>
                      </div>
                    </div>
                  </FormControl>
                </FormItem>
              )} />

              <FormField name="latitude"      control={form.control} render={({ field }) => (<FormItem><FormLabel>Latitude</FormLabel><FormControl><Input placeholder="Type here" {...field} /></FormControl></FormItem>)} />
              <FormField name="longitude"     control={form.control} render={({ field }) => (<FormItem><FormLabel>Longitude</FormLabel><FormControl><Input placeholder="Type here" {...field} /></FormControl></FormItem>)} />
              <FormField name="allowedRadius" control={form.control} render={({ field }) => (<FormItem><FormLabel>Allowed Radius (Metres)</FormLabel><FormControl><Input placeholder="Type here" {...field} /></FormControl></FormItem>)} />

              <FormField name="locationType" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Location Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select Location Type" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {[
                        "Bar","Celebrity","Certificate","Club","Culture","Event","Fashion",
                        "Film","Fitness","Luxury","Memorabilia","Music","Nature","Outdoors",
                        "Sports","Store","Theatre","Trophy","Other",
                      ].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />

              <FormField name="challenge" control={form.control} render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormLabel>Download Pass Button Text (optional)</FormLabel>
                    <CustomTooltip content="E.g. Download pass to enter comp" />
                  </div>
                  <FormControl><Input placeholder="Type here" {...field} /></FormControl>
                </FormItem>
              )} />

              <FormField name="textbook" control={form.control} render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormLabel>Rewards/Competitions Header Text (optional)</FormLabel>
                    <CustomTooltip content="E.g. Competition Rules" />
                  </div>
                  <FormControl><Input placeholder="Type here" {...field} /></FormControl>
                </FormItem>
              )} />

              {/* Video Location */}
              <FormField name="videoLocation" control={form.control} render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <div className="flex items-center gap-2">
                    <FormLabel>MP4 Video Location (optional)</FormLabel>
                    <CustomTooltip content="Provide a video URL or upload a video file (.mp4 only & max 100MB)." />
                  </div>

                  <div className="flex gap-2 mb-2">
                    <Button type="button" variant={videoUploadMode === "url" ? "default" : "outline"} size="sm"
                      onClick={() => { setVideoUploadMode("url"); setVideoValid(null); }} disabled={uploadingVideo}>
                      Enter URL
                    </Button>
                    {mode === "edit" && (
                      <Button type="button" variant={videoUploadMode === "upload" ? "default" : "outline"} size="sm"
                        onClick={() => { setVideoUploadMode("upload"); setVideoValid(null); }} disabled={uploadingVideo}>
                        Upload Video
                      </Button>
                    )}
                    {mode === "add" && (
                        <p>Upload Video will be enabled after this drop is created.</p>
                    )}
                  </div>

                  <FormControl>
                    {videoUploadMode === "url" ? (
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            placeholder="https://nodejs.gridiron-app.com/images/your-video.mp4"
                            {...field}
                            onChange={(e) => { field.onChange(e); setVideoValid(null); }}
                            disabled={uploadingVideo}
                          />
                          {videoValid === true  && <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600">✓</div>}
                          {videoValid === false && <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-600">✗</div>}
                        </div>
                        <Button type="button" variant="outline"
                          onClick={() => handleValidateVideoUrl(field.value || "")}
                          disabled={validatingVideo || !field.value || uploadingVideo}
                          className="whitespace-nowrap">
                          {validatingVideo ? "Checking..." : "Validate URL"}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <Input
                          type="file"
                          accept="video/mp4,.mp4"
                          onChange={async (e) => { const f = e.target.files?.[0]; if (f) await handleVideoUpload(f); }}
                          disabled={uploadingVideo}
                        />
                        {uploadingVideo && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600 dark:text-gray-400">Uploading video...</span>
                              <span className="font-medium text-[#5871A7]">{videoUploadProgress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-[#5871A7] to-[#00C1CE] h-2.5 rounded-full transition-all duration-300"
                                style={{ width: `${videoUploadProgress}%` }}
                              >
                                <div className="h-full w-full bg-white/20 animate-pulse" />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </FormControl>

                  {uploadedFiles.video && videoUploadMode === "upload" && !uploadingVideo && (
                    <FormDescription className="text-sm text-green-600 flex items-center gap-2">
                      <span>✓</span><span>Video ready: {uploadedFiles.video}</span>
                    </FormDescription>
                  )}
                  {mode === "edit" && awardData?.videolocation && !uploadedFiles.video && videoUploadMode === "url" && (
                    <FormDescription className="text-sm text-gray-600">
                      Current video:{" "}
                      <a href={awardData.videolocation} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {awardData.videolocation.split("/").pop()}
                      </a>
                    </FormDescription>
                  )}
                  <FormDescription className="text-xs text-gray-500">
                    {videoUploadMode === "url"
                      ? "Example: https://nodejs.gridiron-app.com/images/digga_hoodie.mp4"
                      : "Maximum file size: 100MB. Only MP4 format supported."}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Dates */}
              <FormField name="start_from_date" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Start Date</FormLabel><FormControl><Input type="date" className="dark:[color-scheme:dark] w-full" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField name="start_from_time" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Start Time</FormLabel><FormControl><Input type="time" className="dark:[color-scheme:dark] w-full" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField name="finish_date" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Finish Date</FormLabel><FormControl><Input type="date" className="dark:[color-scheme:dark] w-full" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField name="finish_time" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Finish Time</FormLabel><FormControl><Input type="time" className="dark:[color-scheme:dark] w-full" {...field} /></FormControl><FormMessage /></FormItem>
              )} />

            </div>
          </section>

          <hr className="border-[#D4D8EA] dark:border-[#2E4066]" />

          {/* ── 3D Assets ────────────────────────────────────────────────── */}
          <section className="space-y-6">
            <h2 className="text-xl font-semibold flex items-center gap-2.5">
              <Box className="text-geodrops" /> 3D Assets (optional)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <FormField name="modelGlb" control={form.control} render={() => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormLabel>3D Model (GLB for Android)</FormLabel>
                    <CustomTooltip content="A GLB file for AR on Android. Max 50MB." />
                  </div>
                  <FormControl>
                    <div className="relative">
                      <Input type="file" accept=".glb"
                        onChange={async (e) => { const f = e.target.files?.[0]; if (f) await handleFileUpload(f, "glb"); }}
                        disabled={uploadingGlb} />
                      {uploadingGlb
                        ? <div className="absolute right-3 top-1/2 -translate-y-1/2"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#5871A7]" /></div>
                        : <UploadCloud size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5871A7]" />}
                    </div>
                  </FormControl>
                  {uploadedFiles.assetGlb && <FormDescription className="text-sm text-green-600">✓ Ready: {uploadedFiles.assetGlb}</FormDescription>}
                  {mode === "edit" && awardData?.assetglburl && !uploadedFiles.assetGlb && (
                    <FormDescription className="text-sm text-gray-600">
                      Current: <a href={getFileUrl(awardData.assetglburl)} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{awardData.assetglburl.split("/").pop()}</a>
                    </FormDescription>
                  )}
                </FormItem>
              )} />

              <FormField name="modelUsdz" control={form.control} render={() => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormLabel>3D Model (USDZ for iOS)</FormLabel>
                    <CustomTooltip content="A USDZ file for AR on iOS. Max 50MB." />
                  </div>
                  <FormControl>
                    <div className="relative">
                      <Input type="file" accept=".usdz"
                        onChange={async (e) => { const f = e.target.files?.[0]; if (f) await handleFileUpload(f, "usdz"); }}
                        disabled={uploadingUsdz} />
                      {uploadingUsdz
                        ? <div className="absolute right-3 top-1/2 -translate-y-1/2"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#5871A7]" /></div>
                        : <UploadCloud size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5871A7]" />}
                    </div>
                  </FormControl>
                  {uploadedFiles.assetUsdz && <FormDescription className="text-sm text-green-600">✓ Ready: {uploadedFiles.assetUsdz}</FormDescription>}
                  {mode === "edit" && awardData?.assetusdzurl && !uploadedFiles.assetUsdz && (
                    <FormDescription className="text-sm text-gray-600">
                      Current: <a href={getFileUrl(awardData.assetusdzurl)} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{awardData.assetusdzurl.split("/").pop()}</a>
                    </FormDescription>
                  )}
                </FormItem>
              )} />

            </div>
          </section>

          {/* ── Spotify ───────────────────────────────────────────────────── */}
          <section className="space-y-6">
            <h2 className="text-xl font-semibold flex items-center gap-2.5">
              <Music className="text-geodrops" /> Spotify Links (optional)
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-2">
                    Add Spotify links to enhance your Drop with music content. Up to 5 links.
                  </p>
                  {spotifyLinks.length > 0 && (
                    <p className="text-sm text-green-600">Current links: {spotifyLinks.length}/5</p>
                  )}
                </div>
                <Button type="button" variant="outline" onClick={handleLaunchSpotifySearch}
                  className="flex items-center gap-2" disabled={spotifyLinks.length >= 6}>
                  <ExternalLink size={16} />
                  {spotifyLinks.length === 0 ? "Add Spotify Links" : "Manage Links"}
                </Button>
              </div>

              {spotifyLinks.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h3 className="font-medium mb-3">Linked Spotify Content:</h3>
                  <div className="space-y-2">
                    {spotifyLinks.map((link, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-white dark:bg-gray-700 rounded border">
                        <span className="text-sm truncate flex-1">{link}</span>
                        <a href={link} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:text-green-700 ml-2">
                          <ExternalLink size={14} />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {spotifyLinks.length >= 5 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">Maximum of 5 Spotify links reached.</p>
                </div>
              )}
            </div>

            <SpotifyModal
              isOpen={showSpotifyModal}
              onClose={() => setShowSpotifyModal(false)}
              awardId={awardId}
              onLinksUpdated={fetchSpotifyLinks}
            />
          </section>

          <hr className="border-[#D4D8EA] dark:border-[#2E4066]" />

          {/* ── Actions ───────────────────────────────────────────────────── */}
          <div className="flex flex-col md:flex-row md:justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              className="md:w-[10%] order-1 md:order-none"
              onClick={() => router.push("/dashboard")}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="md:w-[45%]"
              disabled={saving}
              onClick={() => {
                console.log("Form valid:", form.formState.isValid);
                console.log("Form errors:", form.formState.errors);
              }}
            >
              {saving
                ? mode === "add" ? "Saving..."   : "Updating..."
                : mode === "add" ? "Save Drop Entry" : "Update Drop"
              }
            </Button>
          </div>

        </form>
      </Form>

      {/* ── Wallet Passes — edit mode only ─────────────────────────────── */}
      {mode === "edit" && awardId && (
        <>
          <hr className="border-[#D4D8EA] dark:border-[#2E4066]" />
          <WalletPassesTable awardId={awardId} />
        </>
      )}

    </div>
  );
}