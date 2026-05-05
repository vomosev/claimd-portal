// src/components/shared/GeoDropsInstructionsModal.tsx
"use client";
import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { MapPin, Camera, Award, Share2, Link, Check, X, Loader2, Trophy } from "lucide-react";
import toast from "react-hot-toast";

const DEFAULT_PROFILE_IMAGE = "/default-profile.png";

const schema = z.object({
  userId:       z.string().min(1, "User ID is required"),
  accountType:  z.string().min(1, "Account type is required"),
  profileImage: z.any().optional(),
});

const GeoDropsInstructionsModal = () => {
  const [isOpen, setIsOpen]               = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  // Display name states
  const [displayName, setDisplayName]                         = useState("");
  const [currentDisplayName, setCurrentDisplayName]           = useState("");
  const [isCheckingDisplayName, setIsCheckingDisplayName]     = useState(false);
  const [isDisplayNameAvailable, setIsDisplayNameAvailable]   = useState<boolean | null>(null);
  const [isSavingDisplayName, setIsSavingDisplayName]         = useState(false);
  const [displayNameMessage, setDisplayNameMessage]           = useState<string | null>(null);
  const [checkTimeout, setCheckTimeout]                       = useState<NodeJS.Timeout | null>(null);
  const [username, setUsername]                               = useState<string>("");

  // ── Fix: single useEffect for localStorage (was duplicated) ──
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUsername = localStorage.getItem("username");
      if (storedUsername) {
        setUsername(storedUsername);
      }
    }
  }, []);

  // Fetch current display name
  useEffect(() => {
    if (username) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/${username}/display-name`)
        .then((res) => {
          if (!res.ok) throw new Error("Network response was not ok");
          return res.json();
        })
        .then((data) => {
          const displayNameValue = data.displayName || "";
          setCurrentDisplayName(displayNameValue);
          setDisplayName(displayNameValue);
        })
        .catch((err) => {
          console.error("Error fetching display name:", err);
          setCurrentDisplayName("");
          setDisplayName("");
        });
    }
  }, [username]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (checkTimeout) clearTimeout(checkTimeout);
    };
  }, [checkTimeout]);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      userId:       "",
      accountType:  "user",
      profileImage: undefined,
    },
  });

  useEffect(() => {
    if (username) {
      form.setValue("userId", username);
    }
  }, [username, form]);

  // Check display name availability with debounce
  const checkDisplayNameAvailability = async (handle: string) => {
    if (!handle || handle === currentDisplayName) {
      setIsDisplayNameAvailable(null);
      return;
    }

    const handleRegex = /^[a-zA-Z0-9_]{3,30}$/;
    if (!handleRegex.test(handle)) {
      setIsDisplayNameAvailable(false);
      return;
    }

    setIsCheckingDisplayName(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/users/check-display-name/${handle}`
      );
      const data = await response.json();
      setIsDisplayNameAvailable(data.available);
    } catch (error) {
      console.error("Error checking availability:", error);
      setIsDisplayNameAvailable(false);
    } finally {
      setIsCheckingDisplayName(false);
    }
  };

  const handleDisplayNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDisplayName(value);
    setDisplayNameMessage(null);

    if (checkTimeout) clearTimeout(checkTimeout);

    const timeout = setTimeout(() => {
      checkDisplayNameAvailability(value);
    }, 500);

    setCheckTimeout(timeout);
  };

  const handleSaveDisplayName = async () => {
    if (!displayName || !isDisplayNameAvailable) return;

    setIsSavingDisplayName(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/users/${username}/display-name`,
        {
          method:  "PUT",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ displayName }),
        }
      );

      if (response.ok) {
        setCurrentDisplayName(displayName);
        setDisplayNameMessage("Display name saved successfully!");
        toast.success("Display name saved successfully!");
        setTimeout(() => setDisplayNameMessage(null), 3000);
      } else {
        throw new Error("Failed to save display name");
      }
    } catch (error) {
      console.error("Error saving display name:", error);
      setDisplayNameMessage("Error saving display name. Please try again.");
      toast.error("Error saving display name. Please try again.");
    } finally {
      setIsSavingDisplayName(false);
    }
  };

  const getDisplayNameStatusIcon = () => {
    if (isCheckingDisplayName)        return <Loader2 className="h-4 w-4 animate-spin text-gray-500" />;
    if (isDisplayNameAvailable === true)  return <Check className="h-4 w-4 text-green-500" />;
    if (isDisplayNameAvailable === false) return <X className="h-4 w-4 text-red-500" />;
    return null;
  };

  const getDisplayNameHelperText = () => {
    if (!displayName)                     return "Choose a unique handle for your public mantlepiece";
    if (displayName === currentDisplayName) return "This is your current display name";
    if (isCheckingDisplayName)            return "Checking availability...";
    if (isDisplayNameAvailable === true)  return "This handle is available!";
    if (isDisplayNameAvailable === false) {
      const handleRegex = /^[a-zA-Z0-9_]{3,30}$/;
      if (!handleRegex.test(displayName)) {
        return "Handle must be 3-30 characters, letters, numbers, and underscores only";
      }
      return "This handle is already taken";
    }
    return "";
  };

  const canSaveDisplayName =
    displayName &&
    isDisplayNameAvailable &&
    displayName !== currentDisplayName &&
    !isSavingDisplayName;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasSeenInstructions = localStorage.getItem("geoDropsInstructionsSeen");
      if (!hasSeenInstructions) {
        setTimeout(() => setIsOpen(true), 100);
      }
    }
  }, []);

  const handleClose = () => {
    if (typeof window !== 'undefined' && dontShowAgain) {
      localStorage.setItem("geoDropsInstructionsSeen", "true");
    }
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pt-20">
        <div
          className="bg-white dark:bg-[#151E3A] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >

          {/* Header */}
          <div className="relative p-6 border-b border-gray-200 dark:border-[#2D385B]">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white pr-8">
              Welcome to Geo-Drops!
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Discover location-based rewards and event invites.
            </p>
            <button
              onClick={handleClose}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* ── Fix: all content is now correctly inside the modal div ── */}
          <div className="p-6 space-y-6">

            {/* Step 1 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-clgeodrops/10 rounded-full flex items-center justify-center">
                <MapPin className="text-clgeodrops" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  1. Find Drops You Like
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Using Map or Home views discover new Drops.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-clgeodrops/10 rounded-full flex items-center justify-center">
                <Camera className="text-clgeodrops" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  2. Download the Drop's invite for details
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Visit on the allowed dates. You must be within its range to claim its rewards.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-clgeodrops/10 rounded-full flex items-center justify-center">
                <Award className="text-clgeodrops" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  3. Attend the Drop to claim your rewards
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Follow the Drop's instructions to claim your rewards at the Drop's location.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-clgeodrops/10 rounded-full flex items-center justify-center">
                <Share2 className="text-clgeodrops" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  4. Share your profile
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Share your profile URL with friends to show off your collected Drops!
                </p>
              </div>
            </div>

            {/* Step 5 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-clgeodrops/10 rounded-full flex items-center justify-center">
                <Trophy className="text-clgeodrops" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  5. Earn points
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Drops, likes, comments and uploads earn points for additional rewards and prizes.
                </p>
              </div>
            </div>

            {/* Don't show again checkbox */}
            <div className="flex items-center gap-2 pt-4">
              <input
                type="checkbox"
                id="dontShowAgain"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-4 h-4 text-clgeodrops border-gray-300 rounded focus:ring-[#00C1CE]"
              />
              <label
                htmlFor="dontShowAgain"
                className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer"
              >
                Don't show this again
              </label>
            </div>

            {/* ── Fix: Display Name Section now correctly inside content div ── */}
            <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-[#2D385B]">
              <FormLabel className="text-base font-medium">
                Public Handle
              </FormLabel>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                This will be your public URL:{' '}
                <a
                  href={`${process.env.NEXT_PUBLIC_GEO_URL}/${displayName || "yourhandle"}`}
                  target={displayName ? "_blank" : undefined}
                  rel={displayName ? "noopener noreferrer" : undefined}
                  className="text-blue-500 hover:underline"
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
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Handle"
                  )}
                </Button>

                {displayNameMessage && (
                  <p className={`text-sm ${
                    displayNameMessage.includes("Error")
                      ? "text-red-600"
                      : "text-green-600"
                  }`}>
                    {displayNameMessage}
                  </p>
                )}
              </div>
            </div>

          </div>
          {/* ── End content div ── */}

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 dark:border-[#2D385B] flex justify-end gap-3">
            <button
              onClick={handleClose}
              className="px-6 py-2.5 rounded-full bg-clgeodrops text-white hover:opacity-80 transition-opacity font-medium geo-claim-button"
            >
              Get Started
            </button>
          </div>

        </div>
        {/* ── End modal div ── */}
      </div>
    </>
  );
};

export default GeoDropsInstructionsModal;