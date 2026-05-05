Develop the following script

Requirement: Design a Geo-Drops CMS Email Feature

This describes the development requirement for an email sending feature needed at the Geo-Drops CMS platform at http://cms.geo-drops.com:5757/login.html.

It will be capable of sending a drafted email to the list of users that have claimed an award ID/drop.

Table View

This should have the following.

Paginated View
This shows a tabular, paginated view of the existing email drafts with data rows that list all of the relevant emailbroadcasts columns, but only records with a sentstatus value of 0 will be allowed to be edited and sent onscreen.

The emailbroadcasts fields in the MySQL database are as follows.

CREATE TABLE `emailbroadcasts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `userid` varchar(200) DEFAULT NULL,
  `awardid` varchar(200) DEFAULT NULL,
  `worldid` varchar(200) DEFAULT NULL,
  `tenant` varchar(200) DEFAULT '',
  `subject` text,
  `htmltext` text,
  `sentstatus` int(1) DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

This will also have a search box so that users can search for an Award ID field, which should predictively show the available awards. This search box will use the API GET call https://nodejs.gridiron-app.com/searchawardsbycriteria.

There will be an Edit Email button on each row. Clicking on the Edit button next to each row shown will launch the following window with all of the email’s fields and details.

There will also be a New Email button at the top of the screen that shows all the email’s fields. Both buttons will launch the following screen but the Edit Email button will populate its fields with the existing email being edited, while the New Email button will not have any data to populate the fields currently.

New/Edit View

After the user selects an award from the tabular window, its details should then show the following fields onscreen.

•	Assetname
•	Name
•	Description
•	Awardimg
•	UserID List: it should also show a READ ONLY paginated list of userids (email addresses) that have signed up to this drop or award, just to show the email broadcast list onscreen.
•	Subject
•	Email: the user can draft and edit the email that will be sent, it should be capable of editing HTML.

There should also be the following buttons.

•	Save Draft: so that the email awardid, subject, draft, version, sentstatus and date fields can be saved to Geo-Drops using the API POST call https://nodejs.gridiron-app.com/savedraft. All drafts will have a sentstatus value of 0 until the email is sent, at which stage this value will change to 1 instead. This call updates a table called emailbroadcasts in the Geo-Drops database.
•	Send: so that the final email version can be send to this broadcast list using the API POST call https://nodejs.gridiron-app.com/sendemail. This will update the sentstatus value of that specific record to 1 on Geo-Drops.

Using the following script as a template

"use client";

import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Music, ExternalLink } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
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

interface AwardFormProps {
  mode: "add" | "edit";
  awardId?: number;
}

// Nominatim API response interface
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
  worldid: number;
  worldname: string;
  description?: string;
  latitude?: number;
  longitude?: number;
}

// Helper function to ensure file URL has the correct base URL
function getFileUrl(filePath: string | undefined): string {
  if (!filePath) return "";

  let fullUrl: string;

  // Check if the file path already includes http/https
  if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
    fullUrl = filePath;
  } else {
    // Otherwise, prepend the API URL
    // Make sure we don't double-slash if filePath starts with /
    const cleanPath = filePath.startsWith("/") ? filePath : `/${filePath}`;
    fullUrl = `${process.env.NEXT_PUBLIC_API_URL}${cleanPath}`;
  }

  return fullUrl;
}

// Extract a user-friendly location name from Nominatim response
function extractLocationName(response: NominatimResponse): string {
  // Priority 1: Use the 'name' field if available (often the best name)
  if (response.name) {
    return response.name;
  }

  // Priority 2: Look for specific venue/building names in address object
  if (response.address) {
    const { amenity, building, shop, tourism, leisure, historic } =
      response.address;

    // Return specific place names if available
    if (amenity) return amenity;
    if (building) return building;
    if (shop) return shop;
    if (tourism) return tourism;
    if (leisure) return leisure;
    if (historic) return historic;

    // Priority 3: Use neighborhood/suburb with optional road
    const { neighbourhood, suburb, road, city, town, village } =
      response.address;

    if (neighbourhood || suburb) {
      const area = neighbourhood || suburb;
      if (road) {
        return `${road}, ${area}`;
      }
      return area ?? "Unknown Location";
    }

    if (road && (city || town || village)) {
      const place = city || town || village;
      return `${road}, ${place}`;
    }
  }

  // Priority 5: Fallback to a shortened version of display_name
  if (response.display_name) {
    // Take the first two parts of the display name
    const parts = response.display_name.split(",").map((part) => part.trim());
    if (parts.length >= 2) {
      return `${parts[0]}, ${parts[1]}`;
    }
    return parts[0];
  }

  return "Unknown Location";
}

export default function AwardForm({ mode, awardId }: AwardFormProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [awardData, setAwardData] = useState<AwardType | null>(null);
  const [findingCoords, setFindingCoords] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [originalValues, setOriginalValues] = useState<any>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingGlb, setUploadingGlb] = useState(false);
  const [validatingVideo, setValidatingVideo] = useState(false);
  const [videoValid, setVideoValid] = useState<boolean | null>(null);
  const [spotifyLinks, setSpotifyLinks] = useState<string[]>([]);
  const [dropsites, setDropsites] = useState<Dropsite[]>([]);
  const [loadingDropsites, setLoadingDropsites] = useState(false);
  const [showSpotifySection, setShowSpotifySection] = useState(false);
  const [uploadingUsdz, setUploadingUsdz] = useState(false);
  const [showSpotifyModal, setShowSpotifyModal] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{
    awardImg?: string;
    assetGlb?: string;
    assetUsdz?: string;
    video?: string;
  }>({});
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [videoUploadMode, setVideoUploadMode] = useState<"url" | "upload">(
    "url"
  );
  const [selectedFiles, setSelectedFiles] = useState<{
    awardImg?: File;
    assetGlb?: File;
    assetUsdz?: File;
    video?: File;
  }>({});

  // Admin access control states
  const [, setUserrole] = useState(null);
  const [adminStatus, setAdminStatus] = useState(false);
  const [currentUsername, setCurrentUsername] = useState("");
  const [spotifyLinksChanged, setSpotifyLinksChanged] = useState(false);
  const [accessChecked, setAccessChecked] = useState(false);

  const router = useRouter();

  // Handle localStorage access safely
  useEffect(() => {
    const username = localStorage.getItem("username") ?? "";
    setCurrentUsername(username);
  }, []);

  // Fetch user role when username is available
  useEffect(() => {
    if (currentUsername) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/getuserrole/${currentUsername}`)
        .then((res) => res.json())
        .then((data) => {
          setUserrole(data.role);
          if ((String(data.role).includes("admin")) || (String(data.role).includes("superuser"))) {
            setAdminStatus(true);
            if (mode === "add") {
              setLoading(false); // Allow page to load for admin in add mode
            }
          } else {
            setAdminStatus(false);
            // Redirect non-admin users to dashboard
            if (mode === "add") {
              alert('This account does not have Create Geo-Drop permissions. Contact support@geo-drops.com to request these permissions.');
              router.push("/dashboard");
            }
          }
          setAccessChecked(true);
        })
        .catch((err) => {
          console.error("Error fetching user role:", err);
          setAdminStatus(false);
          setAccessChecked(true);
          // Redirect on error as well
          if (mode === "add") {
            router.push("/dashboard");
          }
        });
    }
  }, [currentUsername, router, mode]);

  // Redirect non-admin users (for edit mode)
  useEffect(() => {
    if (accessChecked && !adminStatus && mode === "edit") {
      toast.error("Access denied. Admin privileges required.");
      router.push("/dashboard");
    }
  }, [accessChecked, adminStatus, router, mode]);

  const schema = z
    .object({
      userId: z.string().email(),
      assetName: z.string().min(1),
      awardName: z.string().min(1),
      awardType: z.string().min(1),
      worldId: z.string().optional(),
      certifyingBody: z.string().optional(),
      description: z.string().optional(),
      htmlContent: z.string().max(10000).optional(),
      awardFile: z.any().optional(),
      locationName: z.string().optional(),
      dropPrice: z.string().optional(),
      dropCurrency: z.string().optional(),
      videoLocation: z
        .string()
        .optional()
        .refine(
          (val) => {
            if (!val || val.trim() === "") return true; // Optional field

            // Must be .mp4 file
            if (!val.toLowerCase().endsWith(".mp4")) return false;

            // If it's a URL, validate the pattern
            if (val.startsWith("http://") || val.startsWith("https://")) {
              const urlPattern =
                /^https:\/\/nodejs\.gridiron-app\.com\/images\/.+\.mp4$/;
              return urlPattern.test(val);
            }

            // If it's a file path/name, just check it ends with .mp4
            return true;
          },
          {
            message:
              "Video must be .mp4 format. URLs must be: https://nodejs.gridiron-app.com/images/[filename].mp4",
          }
        ),
      address: z.string().optional(),
      latitude: z.string().optional(),
      longitude: z.string().optional(),
      allowedRadius: z.string().optional(),
      locationType: z.string().optional(),
      textbook: z.string().optional(),
      challenge: z.string().optional(),
      modelGlb: z.any().optional(),
      modelUsdz: z.any().optional(),
      isPublic: z.boolean().optional(),
      awardImg: z.string().optional(),
      assetGlb: z.string().optional(),
      assetUsdz: z.string().optional(),
      start_from_date:
        mode === "edit" ? z.string().optional() : z.string().date(),
      start_from_time: z.string().optional(),
      finish_date: mode === "edit" ? z.string().optional() : z.string().date(),
      finish_time: z.string().optional(),
    })
    .refine(
      (data) => {
        // Custom validation logic
        if (!data.start_from_date || !data.finish_date) {
          return true; // Skip validation if dates are empty
        }

        const startDateTime = moment(
          `${data.start_from_date || ""} ${data.start_from_time || ""}`,
          "YYYY-MM-DD HH:mm"
        );
        const finishDateTime = moment(
          `${data.finish_date || ""} ${data.finish_time || ""}`,
          "YYYY-MM-DD HH:mm"
        );

        return finishDateTime.isAfter(startDateTime);
      },
      {
        message: "Finish date and time must be after start date and time",
        path: ["finish_date"], // Shows error on finish_date field
      }
    );

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      userId: "",
      assetName: "",
      awardName: "",
      awardType: "",
      dropPrice: "",
      dropCurrency: "",
      certifyingBody: "",
      description: "",
      htmlContent: "",
      awardFile: undefined,
      videoLocation: "",
      locationName: "",
      address: "",
      latitude: "",
      longitude: "",
      allowedRadius: "100",
      locationType: "",
      textbook: "",
      challenge: "",
      modelGlb: undefined,
      modelUsdz: undefined,
      isPublic: false,
      awardImg: "",
      worldId: "",
      assetGlb: "",
      assetUsdz: "",
      start_from_date: "",
      start_from_time: "",
      finish_date: "",
      finish_time: "",
    },
  });

  // Update form with username when available
  useEffect(() => {
    if (currentUsername) {
      form.setValue("userId", currentUsername);
    }
  }, [currentUsername, form]);

  useEffect(() => {
    if (mode === "edit" && awardId && accessChecked && adminStatus) {
      // Fetch existing Spotify links for this award
      const fetchSpotifyLinks = async () => {
        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/award-spotify-links/${awardId}`
          );
          if (response.ok) {
            const data = await response.json();
            setSpotifyLinks(data.links || []);
          }
        } catch (error) {
          console.error("Error fetching Spotify links:", error);
        }
      };
      fetchSpotifyLinks();
    }
  }, [awardId, mode, accessChecked, adminStatus]);

  useEffect(() => {
    const fetchDropsites = async () => {
      setLoadingDropsites(true);
      try {

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/worldawards/listbyuser/${currentUsername}`);

        if (response.ok) {
          const data = await response.json();
          if (data && data.length > 0) {
            setDropsites(data);
          } else {
            setDropsites([]);
          }
        } else {
          console.error("Failed to fetch dropsites");
          // toast.error("Failed to load dropsites");
        }

      } catch (error) {
        console.error("Error fetching dropsites:", error);
        // toast.error("Error loading dropsites");
      } finally {
        setLoadingDropsites(false);
      }
    };

    // Only fetch if admin access is confirmed
    if (accessChecked && adminStatus) {
      fetchDropsites();
    }
  }, [accessChecked, adminStatus]);

  const handleValidateVideoUrl = async (url: string) => {
    if (!url || url.trim() === "") {
      setVideoValid(null);
      return;
    }

    setValidatingVideo(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL;
      const fullUrl = url.startsWith("http") ? url : `${baseUrl}${url}`;
      // Check if URL is reachable
      const response = await fetch(fullUrl, {
        method: "HEAD",
        mode: "no-cors", // Avoid CORS issues
      });

      // Since we're using no-cors, we can't check status
      // We'll just check if the fetch doesn't throw an error
      setVideoValid(true);
      toast.success("Video URL is valid and reachable");
    } catch (error) {
      setVideoValid(false);
      toast.error("Video URL may not be reachable");
    } finally {
      setValidatingVideo(false);
    }
  };

  const handleLaunchSpotifySearch = () => {
    setShowSpotifyModal(true);
  };

  // Helper function to fetch Spotify links
  const fetchSpotifyLinks = async () => {
    if (!awardId) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/award-spotify-links/${awardId}`
      );
      if (response.ok) {
        const data = await response.json();
        setSpotifyLinks(data.links || []);
        // Set flag to indicate Spotify links were updated
        setSpotifyLinksChanged(true);
      }
    } catch (error) {
      console.error("Error fetching Spotify links:", error);
    }
  };

  // Use Next.js useSearchParams to get URL params
  const searchParams = useSearchParams();

  // Load existing data for edit mode
  useEffect(() => {
    // Only fetch award data if user has admin access
    if (mode === "edit" && awardId && accessChecked && adminStatus) {
      const fetchAwardData = async () => {
        try {
          const response =
            searchParams.get("my-geo-drops") === "true"
              ? await geoDropsApi.getAdminAward(
                  currentUsername,
                  awardId.toString()
                )
              : await geoDropsApi.getAward(awardId.toString());
          if (response.success && response.data) {
            const award = response.data as AwardType;

            setAwardData(award);

            // Prepare form values
            const formValues = {
              userId: currentUsername || "",
              assetName: award.assetname || "",
              awardName: award.name || "",
              awardType: award.type || "",
              dropPrice: award.price || "",
              dropCurrency: award.currency || "",
              certifyingBody: award.certifyingbody || "",
              description: award.description || "",
              htmlContent: award.htmltext || "",
              locationName: award.locationname || "",
              address: award.address || "",
              latitude: award.latitude?.toString() || "",
              longitude: award.longitude?.toString() || "",
              allowedRadius: award.allowed_radius?.toString() || "100",
              locationType: award.locationtype || "",
              textbook: award.textbook || "",
              challenge: award.challenge || "",
              isPublic: Number(award.public) === 1,
              worldId:
                award.worldid && award.worldid !== 0
                  ? award.worldid.toString()
                  : "none",
              awardImg: award.awardimg || "",
              videoLocation: award.videolocation || "",
              assetGlb: award.assetglburl || "",
              assetUsdz: award.assetusdzurl || "",
              start_from_date: award.start_from_date
                ? moment(award.start_from_date).format("YYYY-MM-DD")
                : "",
              start_from_time: award.start_from_time || "",
              finish_date: award.finish_date
                ? moment(award.finish_date).format("YYYY-MM-DD")
                : "",
              finish_time: award.finish_time || "",
            };

            // Store original values for comparison
            setOriginalValues(formValues);

            // Populate form with existing data
            form.reset(formValues);
          } else {
            console.error("Failed to fetch award:", response.error);
            toast.error("Failed to load award data");
          }
        } catch (error) {
          console.error("Error fetching award data:", error);
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

  // const handleAddPricing = async (awardid: string) => {
  //   try {
  //     toast.success('Paying Subscription.');
  //     const formData = {
  //       userid: currentUsername,
  //       awardid: awardid,
  //       customiseurl: "",
  //       successurl: "",
  //       name: "Get Your EE 5G Ultra Unlimited eSIM",
  //       price: 14.99,
  //       description: "Get your Get Your EE 5G Ultra Unlimited eSIM offer only available to Geo-Drops members. Present this drop'\''s pass at the counter in any EE store to receive this offer.",
  //       currency: "usd"
  //     };

  //     // `${apiUrl}/singlepayment/create`
  //     const response = await fetch(`/singlepayment/create`, {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify(formData)
  //     });

  //     if (response.ok) {
  //       const contentType = response.headers.get('content-type');
  //       const data = await response.json();
  //       console.log('JSON response:', data);
  //       console.log('JSON response:', data);
  //     } else {
  //       toast.success('Could not generate payment.');
  //       console.error('Failed to generate payment');
  //     }
  //   } catch (error) {
  //     console.error('Error generating payment:', error);
  //   }
  // };

  const handleVideoUpload = async (file: File) => {
    const maxSize = 100 * 1024 * 1024; // 100MB max for videos

    if (file.size > maxSize) {
      toast.error(
        `Video file size (${(file.size / 1024 / 1024).toFixed(
          2
        )}MB) exceeds the maximum limit of 100MB`
      );
      return;
    }

    // Validate file type
    if (
      !file.type.startsWith("video/mp4") &&
      !file.name.toLowerCase().endsWith(".mp4")
    ) {
      toast.error("Only MP4 video files are supported");
      return;
    }

    setUploadingVideo(true);
    setVideoUploadProgress(0);

    try {
      // Create FormData for upload
      const formData = new FormData();
      formData.append("video", file);
      formData.append("title", "geo-drop-video");
      formData.append("type", "videos");
      formData.append("id", awardId?.toString() || "new");

      // Upload to video endpoint with progress tracking
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/uploadvideo`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              setVideoUploadProgress(percentCompleted);
            }
          },
        }
      );

      if (response.data.success) {
        const videoUrl = response.data.url;

        // Update form field with the URL
        form.setValue("videoLocation", videoUrl, {
          shouldValidate: true,
          shouldDirty: true,
        });

        // Store for display
        setUploadedFiles((prev) => ({
          ...prev,
          video: response.data.filename,
        }));

        setVideoUploadProgress(100);
        toast.success(`Video uploaded successfully! (${response.data.size})`);
      } else {
        toast.error(response.data.message || "Failed to upload video");
      }
    } catch (error: any) {
      console.error("Error uploading video:", error);

      // Handle specific errors
      if (error.response?.status === 413) {
        toast.error("Video file is too large. Maximum size is 100MB");
      } else if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to upload video. Please try again.");
      }

      setVideoUploadProgress(0);
    } finally {
      setTimeout(() => {
        setUploadingVideo(false);
        setVideoUploadProgress(0);
      }, 1000); // Keep progress bar visible for 1 second after completion
    }
  };

  const handleFindCoordinates = async () => {
    const address = form.getValues("address");
    if (!address) {
      toast.error("Please enter an address first");
      return;
    }

    setFindingCoords(true);
    try {
      // Using OpenStreetMap Nominatim API (free geocoding service)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          address
        )}&limit=1`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        const locationName = extractLocationName(data[0]);

        // Update form values with proper triggering
        form.setValue("latitude", lat.toString(), {
          shouldValidate: true,
          shouldDirty: true,
        });
        form.setValue("longitude", lon.toString(), {
          shouldValidate: true,
          shouldDirty: true,
        });
        form.setValue("locationName", locationName, {
          shouldValidate: true,
          shouldDirty: true,
        });
        form.setValue("address", display_name, {
          shouldValidate: true,
          shouldDirty: true,
        });

        form.trigger(["latitude", "longitude", "locationName", "address"]);

        toast.success(`Location found: ${locationName}`);
      } else {
        toast.error("No coordinates found for this address");
      }
    } catch (error) {
      console.error("Error finding coordinates:", error);
      toast.error("Error finding coordinates. Please try again.");
    } finally {
      setFindingCoords(false);
    }
  };

  const handleFileUpload = async (
    file: File,
    type: "image" | "glb" | "usdz"
  ) => {
    // Set loading state
    if (type === "image") setUploadingImage(true);
    else if (type === "glb") setUploadingGlb(true);
    else if (type === "usdz") setUploadingUsdz(true);

    try {
      // Determine the field name based on file type
      let fieldName = "";
      if (type === "image") {
        fieldName = "awardImg";
      } else if (type === "glb") {
        fieldName = "assetGlb";
      } else if (type === "usdz") {
        fieldName = "assetUsdz";
      }

      // Validate file size
      const maxSize = type === "image" ? 5 * 1024 * 1024 : 50 * 1024 * 1024; // 5MB for images, 50MB for 3D models
      if (file.size > maxSize) {
        throw new Error(`File size exceeds limit (${maxSize / 1024 / 1024}MB)`);
      }

      // Store the file name to show it's ready for upload
      setUploadedFiles((prev) => ({
        ...prev,
        [fieldName]: file.name,
      }));

      // Store the actual file object in state
      setSelectedFiles((prev) => ({
        ...prev,
        [fieldName]: file,
      }));

      toast.success(
        `${
          type === "image" ? "Image" : type.toUpperCase()
        } file ready for upload!`
      );
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error(
        `Failed to upload ${type} file: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      // Reset loading state
      if (type === "image") setUploadingImage(false);
      else if (type === "glb") setUploadingGlb(false);
      else if (type === "usdz") setUploadingUsdz(false);
    }
  };

  const handleMyCoordinates = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by this browser");
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        // Update coordinates
        form.setValue("latitude", latitude.toString(), {
          shouldValidate: true,
          shouldDirty: true,
        });
        form.setValue("longitude", longitude.toString(), {
          shouldValidate: true,
          shouldDirty: true,
        });

        // Reverse geocode to get location name
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();

          if (data && data.display_name) {
            const locationName = extractLocationName(data);
            form.setValue("address", data.display_name, {
              shouldValidate: true,
              shouldDirty: true,
            });
            form.setValue("locationName", locationName, {
              shouldValidate: true,
              shouldDirty: true,
            });

            // Force form to recognize changes
            form.trigger(["latitude", "longitude", "address", "locationName"]);

            toast.success(`Current location: ${locationName}`);
          }
        } catch (error) {
          console.error("Error getting location name:", error);
          toast.error("Coordinates updated but couldn't get location name");
        }

        setGettingLocation(false);
      },
      (error) => {
        console.error("Error getting location:", error);
        let errorMessage = "Error getting your location. ";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += "Permission denied. Please allow location access.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += "Location unavailable.";
            break;
          case error.TIMEOUT:
            errorMessage += "Location request timed out.";
            break;
          default:
            errorMessage += "Unknown error.";
            break;
        }
        toast.error(errorMessage);
        setGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      }
    );
  };

// this does not save when public is unticked
  const hasFormChanges = (currentValues: any) => {
    if (mode === "add") return true;
    if (!originalValues) return true;

    // Check if Spotify links were modified
    if (spotifyLinksChanged) return true;

    // Check if any files have been selected in state
    const hasNewFiles =
      selectedFiles.awardImg instanceof File ||
      selectedFiles.assetGlb instanceof File ||
      selectedFiles.assetUsdz instanceof File;

    if (hasNewFiles) return true;

    const fieldsToCompare = [
      "userId",
      "assetName",
      "awardName",
      "awardType",
      "dropPrice",
      "dropCurrency",
      "certifyingBody",
      "description",
      "htmlContent",
      "locationName",
      "videoLocation",
      "address",
      "latitude",
      "longitude",
      "allowedRadius",
      "locationType",
      "worldId",
      "textbook",
      "challenge",
      "isPublic",
      "start_from_date",
      "start_from_time",
      "finish_date",
      "finish_time",
    ];

    return fieldsToCompare.some((field) => {
      const original = originalValues[field] || "";
      const current = currentValues[field] || "";
      return original.toString() !== current.toString();
    });
  };

  async function onSubmit(values: z.infer<typeof schema>) {
    if (mode === "edit" && !hasFormChanges(values)) {
      toast.error("No changes made to the Geo-Drop.");
      return;
    }

    setSaving(true);

    try {
      // Prepare data for API
      const submitData = {
        userid: values.userId,
        assetname: values.assetName,
        name: values.awardName,
        type: values.awardType,
        price: values.dropPrice,
        currency: values.dropCurrency,
        certifyingbody: values.certifyingBody,
        description: values.description,
        htmltext: values.htmlContent,
        locationname: values.locationName,
        address: values.address,
        videolocation: values.videoLocation || "/images/certifygeneric.mp4",
        latitude: values.latitude ? parseFloat(values.latitude) : 0,
        longitude: values.longitude ? parseFloat(values.longitude) : 0,
        allowed_radius: values.allowedRadius
          ? parseInt(values.allowedRadius)
          : 100,
        locationtype: values.locationType,
        textbook: values.textbook,
        challenge: values.challenge,
        public: values.isPublic ? 1 : 0,
        // Add missing fields that backend expects
        dropname: values.awardName || "", // Use award name as dropname
        worldid:
          values.worldId && values.worldId !== "none" && values.worldId !== ""
            ? parseInt(values.worldId)
            : 0,
        vertical: "", // Empty for now,-
        awardimg: values.awardImg || "",
        assetglburl: values.assetGlb || "",
        assetusdzurl: values.assetUsdz || "",
        start_from_date: values.start_from_date,
        start_from_time: values.start_from_time,
        finish_date: values.finish_date,
        finish_time: values.finish_time,
      };

      // Prepare files for upload - only if there are new files
      const files: {
        awardImg?: File;
        assetGlb?: File;
        assetUsdz?: File;
        video?: File;
      } = {};

      // Only include files that have been newly selected

      if (selectedFiles.awardImg instanceof File) {
        files.awardImg = selectedFiles.awardImg;
      }
      if (selectedFiles.assetGlb instanceof File) {
        files.assetGlb = selectedFiles.assetGlb;
      }
      if (selectedFiles.assetUsdz instanceof File) {
        files.assetUsdz = selectedFiles.assetUsdz;
      }
      if (selectedFiles.video instanceof File) {
        files.video = selectedFiles.video;
      }

      // Only pass files object if it has actual files
      const hasFiles = Object.keys(files).length > 0;

      let response;
      if (mode === "add") {
        console.log("Starting geoDropsApi.addAward");
        response = await geoDropsApi.addAward(
          submitData,
          hasFiles ? files : undefined
        );
      } else if (awardId) {
        // For edit mode, only send files if there are new ones
        // This way the backend should preserve existing files
        response = await geoDropsApi.updateAward(
          awardId,
          submitData,
          hasFiles ? files : undefined // Only send files if there are new ones
        );
      } else {
        throw new Error("Award ID is missing for update");
      }

      if (response.success) {
        toast.success(
          `Geo Drop ${mode === "add" ? "added" : "updated"} successfully!`
        );

        // Update original values to reflect the saved state
        if (mode === "edit") {
          setOriginalValues(values);
          // Clear selected files since they've been uploaded
          setSelectedFiles({});
          setUploadedFiles({});
          // Reset Spotify changes flag
          setSpotifyLinksChanged(false);
        }

        const nextUrl =
          searchParams.get("my-geo-drops") === "true"
            ? `/dashboard/my-geo-drops`
            : `/dashboard`;

        router.push(nextUrl);
      } else {
        console.error(`Failed to ${mode} award:`, response.error);
        toast.error(`Failed to ${mode} award: ` + response.error);
      }
    } catch (error) {
      console.error(`Error ${mode}ing award:`, error);
      toast.error(`Error ${mode}ing award: ` + error);
    } finally {
      setSaving(false);
    }
  }

  // Show loading while checking access or loading data
  if (!accessChecked || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p>
            {!accessChecked
              ? "Checking access permissions..."
              : mode === "edit"
              ? "Loading award data..."
              : "Loading..."}
          </p>
        </div>
      </div>
    );
  }

  // Don't render the form if user doesn't have admin access
  if (!adminStatus) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p>Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="lg:w-[85%] space-y-6">
      <div className="flex justify-center items-left flex-col md:flex-row md:justify-between">
        <h1 className="text-3xl font-semibold">
          {mode === "add" ? "Add" : "Edit"} Geo-Drop
        </h1>
        <h2 className="text-lg font-medium italic">
          {mode === "add" ? "" : "Update information"}
        </h2>
      </div>
      <hr className="border-[#D4D8EA] dark:border-[#2E4066]" />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
          {/* Award Info */}
          <section className="space-y-6">
            <h2 className="text-xl font-semibold flex items-center gap-2.5">
              <Award className="text-geodrops" /> Geo-Drops Information and Pricing
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

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
                          placeholder={currentUsername || "info@ega-tech.co"}
                          {...field}
                        />
                        <CircleHelp
                          size={20}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CB0DA]"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                name="assetName"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-2">
                      <FormLabel>Geo-Drop Asset Name</FormLabel>
                      <CustomTooltip content="This is the name that will be displayed for the Geo-Drop asset." />
                    </div>
                    <FormControl>
                      <Input placeholder="Type here" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                name="awardName"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-2">
                      <FormLabel>Geo-Drop Name</FormLabel>
                      <CustomTooltip content="This is the name that will be displayed for the Geo-Drop award." />
                    </div>
                    <FormControl>
                      <Input placeholder="Type here" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                name="dropPrice"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-2">
                      <FormLabel>Drop Price (only for paid drops)</FormLabel>
                    </div>
                    <FormControl>
                      <Input placeholder="E.g. 10.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                name="dropCurrency"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Drop Currency (only for paid drops)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Currency" {...field} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="gbp">GBP</SelectItem>
                        <SelectItem value="usd">USD</SelectItem>
                        <SelectItem value="eur">EUR</SelectItem>
                        <SelectItem value="cad">CAD</SelectItem>
                        <SelectItem value="aud">AUD</SelectItem>
                        <SelectItem value="jpy">JPY</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                name="isPublic"
                control={form.control}
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={field.value}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Make Drop Public</FormLabel>
                      <FormDescription>
                        When enabled, this Drop will be visible on
                        geo-drops.com. Keep it unchecked to keep the drop
                        private during creation/testing and/or on a dropsite.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                name="awardType"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Geo-Drop Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Geo-Drop Type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Badge">Badge</SelectItem>
                        <SelectItem value="Challenge">Challenge</SelectItem>
                        <SelectItem value="Celebrity">Celebrity</SelectItem>
                        <SelectItem value="Certificate">Certificate</SelectItem>
                        <SelectItem value="Culture">Culture</SelectItem>
                        <SelectItem value="Event">Event</SelectItem>
                        <SelectItem value="Film">Film</SelectItem>
                        <SelectItem value="Fitness">Fitness</SelectItem>
                        <SelectItem value="Location">Location</SelectItem>
                        <SelectItem value="Luxury">Luxury</SelectItem>
                        <SelectItem value="Memorabilia">Memorabilia</SelectItem>
                        <SelectItem value="Music">Music</SelectItem>
                        <SelectItem value="Nature">Nature</SelectItem>
                        <SelectItem value="Outdoors">Outdoors</SelectItem>
                        <SelectItem value="Sports">Sports</SelectItem>
                        <SelectItem value="Fashion">Fashion</SelectItem>
                        <SelectItem value="Theatre">Theatre</SelectItem>
                        <SelectItem value="Trophy">Trophy</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                name="certifyingBody"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-2">
                      <FormLabel>Certifying Body (optional)</FormLabel>
                      <CustomTooltip
                        content={`The name of the organization that is certifying the drop. E.g. 'Geo-Drops' , 'The Royal Academy of Music'`}
                      />
                    </div>
                    <FormControl>
                      <Input placeholder="Type here" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <FormField
              name="description"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormLabel>Description</FormLabel>
                    <CustomTooltip
                      content={`Briefly describe the award's purpose, background, or eligibility criteria. Highlight what makes it notable or unique. (Max 200 characters)`}
                    />
                  </div>
                  <FormControl>
                    <Textarea placeholder="Type here" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              name="htmlContent"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormLabel>HTML Content (optional)</FormLabel>
                    <CustomTooltip content="This is where you can add further information about your drop in HTML format, so that it renders onscreen. This could be embeds from sites such as Spotify and YouTube and so on." />
                  </div>
                  <FormControl>
                    <Textarea placeholder="Type here" {...field} />
                  </FormControl>
                  <div className="flex justify-between items-center mt-1">
                    <FormMessage />
                    <span className={`text-sm ${(field.value?.length || 0) > 10000 ? 'text-red-500 font-semibold' : 'text-gray-500'}`}>
                      {field.value?.length || 0} / 10000 characters
                    </span>
                  </div>
                </FormItem>
              )}
            />
            <FormField
              name="awardFile"
              control={form.control}
              render={() => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormLabel>Geo-Drop Image </FormLabel>
                    <CustomTooltip content="This is the image that will be displayed on the Geo-Drop search page. Dimension of 512 pixels by 512 pixels minimum are recommended. Maximum file size: 2MB." />
                  </div>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            await handleFileUpload(file, "image");
                          }
                        }}
                        disabled={uploadingImage}
                      />
                      {uploadingImage ? (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#5871A7]"></div>
                        </div>
                      ) : (
                        <UploadCloud
                          size={20}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5871A7]"
                        />
                      )}
                    </div>
                  </FormControl>
                  {uploadedFiles.awardImg && (
                    <FormDescription className="text-sm text-green-600">
                      ✓ Uploaded: {uploadedFiles.awardImg}
                    </FormDescription>
                  )}
                  {mode === "edit" &&
                    awardData?.awardimg &&
                    !uploadedFiles.awardImg && (
                      <>
                        <FormDescription className="text-sm text-gray-600">
                          Current file: {awardData.awardimg.split("/").pop()}
                        </FormDescription>
                        <div className="mt-2">
                          <img
                            src={getFileUrl(awardData.awardimg)}
                            alt="Current Geo-Drop image"
                            className="max-w-[200px] max-h-[200px] object-contain rounded-md border border-gray-200"
                          />
                        </div>
                      </>
                    )}
                </FormItem>
              )}
            />
          </section>
          <hr className="border-[#D4D8EA] dark:border-[#2E4066]" />

          {/* Location */}
          <section className="space-y-6">
            <h2 className="text-xl font-semibold flex items-center gap-2.5">
              <MapPin className="text-geodrops" /> Location
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <FormField
                name="locationName"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-2">
                      <FormLabel>Location Name</FormLabel>
                      <CustomTooltip content='The name of the location where the award can be claimed. E.g. "the Tower of London" ' />
                    </div>
                    <FormControl>
                      <Input placeholder="Type here" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                name="address"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <div className="flex flex-col gap-4 mb-5">
                        <Input placeholder="Search your location" {...field} />
                        <div className="flex gap-4 w-full">
                          <Button
                            type="button"
                            className="bg-[#5871A7] h-10 w-[48%]"
                            onClick={handleFindCoordinates}
                            disabled={findingCoords}
                          >
                            {findingCoords ? "Finding..." : "Find Coordinates"}
                          </Button>{" "}
                          <Button
                            type="button"
                            className="h-10 w-[48%]"
                            onClick={handleMyCoordinates}
                            disabled={gettingLocation}
                          >
                            {gettingLocation ? "Getting..." : "My Coordinates"}
                          </Button>
                        </div>
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                name="latitude"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Latitude</FormLabel>
                    <FormControl>
                      <Input placeholder="Type here" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                name="longitude"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Longitude</FormLabel>
                    <FormControl>
                      <Input placeholder="Type here" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                name="allowedRadius"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Allowed Radius (Metres)</FormLabel>
                    <FormControl>
                      <Input placeholder="Type here" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                name="locationType"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Location Type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Bar">Bar</SelectItem>
                        <SelectItem value="Celebrity">Celebrity</SelectItem>
                        <SelectItem value="Certificate">Certificate</SelectItem>
                        <SelectItem value="Club">Club</SelectItem>
                        <SelectItem value="Culture">Culture</SelectItem>
                        <SelectItem value="Event">Event</SelectItem>
                        <SelectItem value="Fashion">Fashion</SelectItem>
                        <SelectItem value="Film">Film</SelectItem>
                        <SelectItem value="Fitness">Fitness</SelectItem>
                        <SelectItem value="Luxury">Luxury</SelectItem>
                        <SelectItem value="Memorabilia">Memorabilia</SelectItem>
                        <SelectItem value="Music">Music</SelectItem>
                        <SelectItem value="Nature">Nature</SelectItem>
                        <SelectItem value="Outdoors">Outdoors</SelectItem>
                        <SelectItem value="Sports">Sports</SelectItem>
                        <SelectItem value="Store">Store</SelectItem>
                        <SelectItem value="Fashion">Fashion</SelectItem>
                        <SelectItem value="Theatre">Theatre</SelectItem>
                        <SelectItem value="Trophy">Trophy</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                name="textbook"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-2">
                      <FormLabel>Rewards/Competitions Header Text (optional)</FormLabel>
                      <CustomTooltip content="E.g. Competition Rules" />
                    </div>
                    <FormControl>
                      <Input placeholder="Type here" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                name="challenge"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-2">
                      <FormLabel>Download Pass Button Text (optional)</FormLabel>
                      <CustomTooltip content="E.g. Download pass to enter comp" />
                    </div>
                    <FormControl>
                      <Input placeholder="Type here" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                name="worldId"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-2">
                      <FormLabel>Dropsite (optional)</FormLabel>
                      <CustomTooltip content="Select a dropsite location to associate this Geo-Drop with a specific physical location. Dropsites are predefined locations from your worlds/dropsites list." />
                    </div>
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
                        {/* Change from empty string to a special value */}
                        <SelectItem value="none">None (No Dropsite)</SelectItem>

                        {dropsites.length === 0 && !loadingDropsites && (
                          <SelectItem value="no-dropsites" disabled>
                            No dropsites available - Create one first
                          </SelectItem>
                        )}

                        {dropsites.map((dropsite) => (
                          <SelectItem
                            key={dropsite.worldid}
                            value={dropsite.worldid.toString()}
                          >
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {dropsite.worldname}
                              </span>
                              {dropsite.description && (
                                <span className="text-xs text-gray-500 truncate max-w-[300px]">
                                  {dropsite.description}
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-xs">
                      {dropsites.length > 0
                        ? `${dropsites.length} dropsite${
                            dropsites.length === 1 ? "" : "s"
                          } available`
                        : "Create a dropsite in Manage Dropsites to link it here.  If Manage Dropsites is not in your menu on the screen's left, contact support@geo-drops.com to request these permissions."}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name="videoLocation"
                control={form.control}
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <div className="flex items-center gap-2">
                      <FormLabel>Video Location (optional)</FormLabel>
                      <CustomTooltip content="Provide a video URL (.mp4 only) or upload a video file (max 100MB). Videos must be MP4 format." />
                    </div>

                    {/* Toggle between URL and Upload */}
                    <div className="flex gap-2 mb-2">
                      <Button
                        type="button"
                        variant={
                          videoUploadMode === "url" ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => {
                          setVideoUploadMode("url");
                          setVideoValid(null);
                        }}
                        disabled={uploadingVideo}
                      >
                        Enter URL
                      </Button>
                      <Button
                        type="button"
                        variant={
                          videoUploadMode === "upload" ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => {
                          setVideoUploadMode("upload");
                          setVideoValid(null);
                        }}
                        disabled={uploadingVideo}
                      >
                        Upload Video
                      </Button>
                    </div>

                    <FormControl>
                      {videoUploadMode === "url" ? (
                        // URL Input Mode
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Input
                              placeholder="https://nodejs.gridiron-app.com/images/your-video.mp4"
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                setVideoValid(null);
                              }}
                              disabled={uploadingVideo}
                            />
                            {videoValid === true && (
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600">
                                ✓
                              </div>
                            )}
                            {videoValid === false && (
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-600">
                                ✗
                              </div>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                              handleValidateVideoUrl(field.value || "")
                            }
                            disabled={
                              validatingVideo || !field.value || uploadingVideo
                            }
                            className="whitespace-nowrap"
                          >
                            {validatingVideo ? "Checking..." : "Validate URL"}
                          </Button>
                        </div>
                      ) : (
                        // File Upload Mode
                        <div className="space-y-3">
                          <div className="relative">
                            <Input
                              type="file"
                              accept="video/mp4,.mp4"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  await handleVideoUpload(file);
                                }
                              }}
                              disabled={uploadingVideo}
                            />
                          </div>

                          {/* Progress Bar */}
                          {uploadingVideo && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600 dark:text-gray-400">
                                  Uploading video...
                                </span>
                                <span className="font-medium text-[#5871A7]">
                                  {videoUploadProgress}%
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                                <div
                                  className="bg-gradient-to-r from-[#5871A7] to-[#00C1CE] h-2.5 rounded-full transition-all duration-300 ease-out"
                                  style={{ width: `${videoUploadProgress}%` }}
                                >
                                  {/* Optional: Add shimmer effect */}
                                  <div className="h-full w-full bg-white/20 animate-pulse"></div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </FormControl>

                    {uploadedFiles.video &&
                      videoUploadMode === "upload" &&
                      !uploadingVideo && (
                        <FormDescription className="text-sm text-green-600 flex items-center gap-2">
                          <span>✓</span>
                          <span>Video ready: {uploadedFiles.video}</span>
                        </FormDescription>
                      )}

                    {mode === "edit" &&
                      awardData?.videolocation &&
                      !uploadedFiles.video &&
                      videoUploadMode === "url" && (
                        <FormDescription className="text-sm text-gray-600">
                          Current video:{" "}
                          <a
                            href={awardData.videolocation}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline"
                          >
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
                )}
              />
              <FormField
                name="start_from_date"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl className="flex">
                      <div>
                        <Input
                          placeholder="Select start date"
                          {...field}
                          type="date"
                          className="dark:[color-scheme:dark] w-full"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name="start_from_time"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <FormControl className="relative flex">
                      <div>
                        <Input
                          placeholder="Select start time"
                          {...field}
                          type="time"
                          className="dark:[color-scheme:dark] w-full"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name="finish_date"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Finish Date</FormLabel>
                    <FormControl className="flex">
                      <div>
                        <Input
                          placeholder="Select finish date"
                          {...field}
                          type="date"
                          className="dark:[color-scheme:dark] w-full"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name="finish_time"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Finish Time</FormLabel>
                    <FormControl className="flex">
                      <div>
                        <Input
                          placeholder="Select finish time"
                          {...field}
                          type="time"
                          className="dark:[color-scheme:dark] w-full"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </section>
          <hr className="border-[#D4D8EA] dark:border-[#2E4066]" />

          {/* 3D Assets */}
          <section className="space-y-6">
            <h2 className="text-xl font-semibold flex items-center gap-2.5">
              <Box className="text-geodrops" /> 3D Assets (optional)
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                name="modelGlb"
                control={form.control}
                render={() => (
                  <FormItem>
                    <div className="flex items-center gap-2">
                      <FormLabel>3D Model (GLB for Android)</FormLabel>
                      <CustomTooltip content="A GLB file is a 3D model format commonly used for augmented reality on Android devices. For example, you can upload a 3D model of a music award, such as a golden record or a trophy, which users can view in AR (Augmented Reality) on their Android phone or tablet. Maximum file size: 50MB." />
                    </div>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="file"
                          accept=".glb"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              await handleFileUpload(file, "glb");
                            }
                          }}
                          disabled={uploadingGlb}
                        />
                        {uploadingGlb ? (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#5871A7]"></div>
                          </div>
                        ) : (
                          <UploadCloud
                            size={20}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5871A7]"
                          />
                        )}
                      </div>
                    </FormControl>
                    {uploadedFiles.assetGlb && (
                      <FormDescription className="text-sm text-green-600">
                        ✓ Ready for upload: {uploadedFiles.assetGlb}
                      </FormDescription>
                    )}
                    {mode === "edit" &&
                      awardData?.assetglburl &&
                      !uploadedFiles.assetGlb && (
                        <>
                          <FormDescription className="text-sm text-gray-600">
                            Current file:{" "}
                            <a
                              href={getFileUrl(awardData.assetglburl)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 underline"
                            >
                              {awardData.assetglburl.split("/").pop()}
                            </a>
                          </FormDescription>
                        </>
                      )}
                  </FormItem>
                )}
              />
              <FormField
                name="modelUsdz"
                control={form.control}
                render={() => (
                  <FormItem>
                    <div className="flex items-center gap-2">
                      <FormLabel>3D Model (USDZ for iOS)</FormLabel>
                      <CustomTooltip content="A USDZ file is a 3D model format used for augmented reality on iOS devices. For example, you can upload a 3D model of a music award, such as a golden record or a trophy, which users can view in AR (Augmented Reality) on their iPhone or iPad. Maximum file size: 50MB." />
                    </div>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="file"
                          accept=".usdz"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              await handleFileUpload(file, "usdz");
                            }
                          }}
                          disabled={uploadingUsdz}
                        />
                        {uploadingUsdz ? (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#5871A7]"></div>
                          </div>
                        ) : (
                          <UploadCloud
                            size={20}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5871A7]"
                          />
                        )}
                      </div>
                    </FormControl>
                    {uploadedFiles.assetUsdz && (
                      <FormDescription className="text-sm text-green-600">
                        ✓ Ready for upload: {uploadedFiles.assetUsdz}
                      </FormDescription>
                    )}
                    {mode === "edit" &&
                      awardData?.assetusdzurl &&
                      !uploadedFiles.assetUsdz && (
                        <>
                          <FormDescription className="text-sm text-gray-600">
                            Current file:{" "}
                            <a
                              href={getFileUrl(awardData.assetusdzurl)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 underline"
                            >
                              {awardData.assetusdzurl.split("/").pop()}
                            </a>
                          </FormDescription>
                        </>
                      )}
                  </FormItem>
                )}
              />
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-xl font-semibold flex items-center gap-2.5">
              <Music className="text-geodrops" /> Spotify Links (optional)
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-2">
                    Add Spotify links to enhance your Geo-Drop with music
                    content. You can add up to 5 Spotify links (artists or
                    tracks).
                  </p>
                  {spotifyLinks.length > 0 && (
                    <p className="text-sm text-green-600">
                      Current links: {spotifyLinks.length}/5
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleLaunchSpotifySearch}
                  className="flex items-center gap-2"
                  disabled={spotifyLinks.length >= 6}
                >
                  <ExternalLink size={16} />
                  {spotifyLinks.length === 0
                    ? "Add Spotify Links"
                    : "Manage Links"}
                </Button>
              </div>

              {/* Display existing Spotify links */}
              {spotifyLinks.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h3 className="font-medium mb-3">Linked Spotify Content:</h3>
                  <div className="space-y-2">
                    {spotifyLinks.map((link, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-white dark:bg-gray-700 rounded border"
                      >
                        <span className="text-sm truncate flex-1">{link}</span>
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-600 hover:text-green-700 ml-2"
                        >
                          <ExternalLink size={14} />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {spotifyLinks.length >= 5 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    Maximum of 5 Spotify links reached. You can manage existing
                    links by clicking "Manage Links".
                  </p>
                </div>
              )}
            </div>

            {/* Add the Spotify Modal */}
            <SpotifyModal
              isOpen={showSpotifyModal}
              onClose={() => setShowSpotifyModal(false)}
              awardId={awardId}
              onLinksUpdated={fetchSpotifyLinks}
            />
          </section>
          <hr className="border-[#D4D8EA] dark:border-[#2E4066]" />

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
                console.log("🖱️ Submit button clicked");
                console.log("📋 Form valid:", form.formState.isValid);
                console.log("❌ Form errors:", form.formState.errors);
              }}>
              {saving
                ? mode === "add"
                  ? "Saving..."
                  : "Updating..."
                : mode === "add"
                ? "Save Geo-Drop Entry"
                : "Update Geo-Drop"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

