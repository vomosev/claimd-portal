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
} from "lucide-react";
import toast from "react-hot-toast";

// Add your API URL - adjust this to match your actual API endpoint
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

// Default profile image path
const DEFAULT_PROFILE_IMAGE = "/default-profile.png";

// Fix: Make the schema fields required to match the form type
const schema = z.object({
  userId: z.string().min(1, "User ID is required"),
  accountType: z.string().min(1, "Account type is required"),
  profileImage: z.any().optional(),
});

export default function SettingsPage() {
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [username, setUsername] = useState<string>("");
  const [imageurl, setImageurl] = useState<string | null>(null);
  const [role, setUserrole] = useState<string>("user");
  const [fileInputKey, setFileInputKey] = useState(Date.now()); // For resetting file input
  const [isImageRemoved, setIsImageRemoved] = useState(false); // Track if image was explicitly removed

  // Display name states
  const [displayName, setDisplayName] = useState("");
  const [currentDisplayName, setCurrentDisplayName] = useState("");
  const [isCheckingDisplayName, setIsCheckingDisplayName] = useState(false);
  const [isDisplayNameAvailable, setIsDisplayNameAvailable] = useState<
    boolean | null
  >(null);
  const [isSavingDisplayName, setIsSavingDisplayName] = useState(false);
  const [displayNameMessage, setDisplayNameMessage] = useState<string | null>(
    null
  );
  const [checkTimeout, setCheckTimeout] = useState<NodeJS.Timeout | null>(null);

  // Handle localStorage access safely
  useEffect(() => {
    const storedUsername = localStorage.getItem("username");
    if (storedUsername) {
      setUsername(storedUsername);
    }
  }, []);

  useEffect(() => {
    if (username) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/getdisplaypic/${username}`)
        .then((res) => res.json())
        .then((data) => {
          setImageurl(data.imageurl);
          // Reset removal state when we get the original image
          setIsImageRemoved(false);
        })
        .catch((err) => {
          console.error("Error fetching profile image:", err);
          setImageurl(null);
        });
    }
  }, [username]);

  useEffect(() => {
    if (username) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/getuserrole/${username}`)
        .then((res) => {
          if (!res.ok) throw new Error("Network response was not ok");
          return res.text();
        })
        .then((text) => {
          if (!text) return;
          const data = JSON.parse(text);
          setUserrole(data.role || "user");
        })
        .catch((err) => console.error("Error fetching user role:", err));
    }
  }, [username]);

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
      if (checkTimeout) {
        clearTimeout(checkTimeout);
      }
    };
  }, [checkTimeout]);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      userId: "",
      accountType: "user",
      profileImage: undefined,
    },
  });

  // Update form values when data is loaded
  useEffect(() => {
    if (username) {
      form.setValue("userId", username);
    }
  }, [username, form]);

  useEffect(() => {
    if (role) {
      form.setValue("accountType", role);
    }
  }, [role, form]);

  // Check display name availability with debounce
  const checkDisplayNameAvailability = async (handle: string) => {
    if (!handle || handle === currentDisplayName) {
      setIsDisplayNameAvailable(null);
      return;
    }

    // Validate handle format (alphanumeric and underscores only, 3-30 chars)
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

  // Handle display name input change with debounce
  const handleDisplayNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDisplayName(value);
    setDisplayNameMessage(null);

    // Clear existing timeout
    if (checkTimeout) {
      clearTimeout(checkTimeout);
    }

    // Set new timeout for checking availability
    const timeout = setTimeout(() => {
      checkDisplayNameAvailability(value);
    }, 500);

    setCheckTimeout(timeout);
  };

  // Save display name
  const handleSaveDisplayName = async () => {
    if (!displayName || !isDisplayNameAvailable) return;

    setIsSavingDisplayName(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/users/${username}/display-name`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ displayName }),
        }
      );

      if (response.ok) {
        setCurrentDisplayName(displayName);
        setDisplayNameMessage("Display name saved successfully!");
        toast.success("Display name saved successfully!");

        // Clear success message after 3 seconds
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
    if (isCheckingDisplayName) {
      return <Loader2 className="h-4 w-4 animate-spin text-gray-500" />;
    }
    if (isDisplayNameAvailable === true) {
      return <Check className="h-4 w-4 text-green-500" />;
    }
    if (isDisplayNameAvailable === false) {
      return <X className="h-4 w-4 text-red-500" />;
    }
    return null;
  };

  const getDisplayNameHelperText = () => {
    if (!displayName) {
      return "Choose a unique handle for your public mantlepiece";
    }
    if (displayName === currentDisplayName) {
      return "This is your current display name";
    }
    if (isCheckingDisplayName) {
      return "Checking availability...";
    }
    if (isDisplayNameAvailable === true) {
      return "This handle is available!";
    }
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

  // Function to get the display image URL
  const getDisplayImageUrl = () => {
    // Priority: 1. New uploaded image preview, 2. Original image (if not removed), 3. Default
    if (preview) {
      return preview;
    }

    if (!isImageRemoved && imageurl) {
      return imageurl;
    }

    return DEFAULT_PROFILE_IMAGE;
  };

  // Check if we're showing the default image
  const isShowingDefault = !preview && (isImageRemoved || !imageurl);
  const isShowingOriginal = !isImageRemoved && imageurl && !preview;
  const isShowingNew = preview && preview.startsWith("blob:");

  async function onSubmit(values: z.infer<typeof schema>) {
    setIsSubmitting(true);

    try {
      // Validate required fields
      if (!values.userId) {
        toast.error("Please enter a User ID");
        return;
      }

      if (!values.accountType) {
        toast.error("Please select an Account Type");
        return;
      }

      // If no image changes, skip the upload
      if (!selectedFile && !isImageRemoved) {
        toast.success("Settings saved successfully!");
        setIsSubmitting(false);
        return;
      }

      // Create FormData to send the file and other data
      const formData = new FormData();

      // Add form fields
      formData.append("userId", values.userId);
      formData.append("accountType", values.accountType || "user");

      // Handle image removal or upload
      if (isImageRemoved) {
        try {
          // Fetch the default image from public folder and convert to file
          const response = await fetch(DEFAULT_PROFILE_IMAGE);
          if (!response.ok) {
            throw new Error("Failed to fetch default image");
          }

          const blob = await response.blob();
          const defaultImageFile = new File([blob], "default-profile.png", {
            type: blob.type || "image/png",
          });

          // Send the default image as the new profile picture
          formData.append("file", defaultImageFile);
          formData.append("fileName", "default-profile.png");
        } catch (error) {
          console.error("Error fetching default image:", error);
          toast.error("Failed to load default image");
          setIsSubmitting(false);
          return;
        }
      } else if (selectedFile) {
        // Send new image file
        formData.append("file", selectedFile);
        formData.append("fileName", selectedFile.name);
      } else {
        // No changes to image, don't call the upload endpoint
        toast.success("Settings saved successfully!");
        setIsSubmitting(false);
        return;
      }

      // Debug logs
      console.log("API_URL:", API_URL);
      console.log("Submitting to:", `${API_URL}/dpupload`);
      console.log("Form values:", values);
      console.log("Selected file:", selectedFile);
      console.log("Image removed:", isImageRemoved);

      const response = await fetch(`${API_URL}/dpupload`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        toast.success("Settings saved successfully!");
        window.location.reload();
      } else {
        const errorText = await response.text();
        console.error(
          "Upload failed:",
          `Failed to save settings ${API_URL}/dpupload: ${response.status} - ${errorText}`
        );
        toast.error("Failed to save settings");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error(
        `Network error occurred: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  // Complete handleRemovePicture implementation
  const handleRemovePicture = async () => {
    setIsRemoving(true);

    try {
      // Clean up the blob URL to prevent memory leaks
      if (preview && preview.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }

      // Reset all image-related states
      setPreview(null);
      setSelectedFile(null);
      setIsImageRemoved(true);

      // Force file input to reset
      setFileInputKey(Date.now());

      // Clear the form field
      form.setValue("profileImage", undefined);

      toast.success("Profile picture will be removed when you save settings");
    } catch (error) {
      console.error("Error removing picture:", error);
      toast.error("Failed to remove profile picture");
    } finally {
      setIsRemoving(false);
    }
  };

  function handleImageChange(file: File | undefined) {
    if (!file) {
      setPreview(null);
      setSelectedFile(null);
      return;
    }

    // Validate file type and size
    const validTypes = ["image/jpeg", "image/png"];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!validTypes.includes(file.type)) {
      toast.error("Please select a PNG or JPG file");
      return;
    }

    if (file.size > maxSize) {
      toast.error("File size must be less than 5MB");
      return;
    }

    // Clean up previous preview URL
    if (preview && preview.startsWith("blob:")) {
      URL.revokeObjectURL(preview);
    }

    // Store the actual file for upload
    setSelectedFile(file);
    setIsImageRemoved(false); // Reset removal flag when new image is selected

    // Create preview
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  function handleRemoveImage() {
    // Clean up blob URL
    if (preview && preview.startsWith("blob:")) {
      URL.revokeObjectURL(preview);
    }

    setPreview(null);
    setSelectedFile(null);
    form.setValue("profileImage", undefined);

    // Reset file input
    setFileInputKey(Date.now());
  }

  // Function to restore original image
  const handleRestoreOriginal = () => {
    if (imageurl) {
      // Clean up current preview
      if (preview && preview.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }

      setPreview(null);
      setSelectedFile(null);
      setIsImageRemoved(false);
      setFileInputKey(Date.now());
      form.setValue("profileImage", undefined);

      toast.success("Restored to original profile picture");
    }
  };

  return (
    <div className="space-y-8 lg:w-[85%]">
      <h1 className="text-3xl font-semibold">Settings</h1>
      <hr className="border-[#D4D8EA] dark:border-[#2E4066]" />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold flex items-center gap-2.5 mb-6">
              <User className="text-geodrops" /> Your Details
            </h2>

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
                          // Fallback to default if image fails to load
                          const target = e.target as HTMLImageElement;
                          if (target.src !== DEFAULT_PROFILE_IMAGE) {
                            target.src = DEFAULT_PROFILE_IMAGE;
                          }
                        }}
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <div>
                        <p className="text-lg font-semibold">Upload Image</p>
                        <p className="text-sm text-[#61667A] dark:text-gray-400">
                          PNG or JPG (max 5MB, recommended 600x600px)
                        </p>

                        {/* Status indicator */}
                        <div className="mt-1">
                          {isShowingNew && (
                            <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">
                              New image selected
                            </span>
                          )}
                          {isShowingOriginal && (
                            <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                              Current profile picture
                            </span>
                          )}
                          {isShowingDefault && (
                            <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                              Default profile picture
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex mt-1 gap-2 flex-wrap">
                        {/* Upload/Change button */}
                        <label className="inline-block cursor-pointer bg-white dark:bg-[#1C2541] px-4 py-2 rounded-[8px] hover:bg-muted-foreground/10 dark:hover:bg-white/10 w-fit border border-gray-200 dark:border-[#2E4066]">
                          <span className="text-black dark:text-white font-semibold">
                            {preview ? "Change" : "Upload"}
                          </span>
                          <Input
                            key={fileInputKey} // Forces reset when key changes
                            type="file"
                            accept="image/png, image/jpeg"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              field.onChange(file);
                              handleImageChange(file);
                            }}
                            className="hidden"
                          />
                        </label>

                        {/* Remove Picture button */}
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

                        {/* Restore Original button */}
                        {imageurl && (preview || isImageRemoved) && (
                          <Button
                            type="button"
                            variant="outline"
                            className="text-base flex items-center gap-2"
                            onClick={handleRestoreOriginal}
                          >
                            <RotateCcw size={16} />
                            Restore Original
                          </Button>
                        )}

                        {/* Remove selected file button */}
                        {(preview || selectedFile) && (
                          <Button
                            type="button"
                            variant="ghost"
                            className="w-fit bg-transparent text-[#61667A] dark:text-gray-400 shadow-none flex text-base gap-2"
                            onClick={handleRemoveImage}
                          >
                            <Trash2 size={16} />
                            Remove Selected
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </FormItem>
              )}
            />

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

            {/* Display Name Section */}
            <div className="space-y-4">
              <FormLabel className="text-base font-medium">
                Public Handle
              </FormLabel>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                This will be your public URL: <a 
                  href={`${process.env.NEXT_PUBLIC_GEO_URL}/${displayName || "yourhandle"}`}
                  target={displayName ? "_blank" : undefined}
                  rel={displayName ? "noopener noreferrer" : undefined}
                >
                  {process.env.NEXT_PUBLIC_GEO_URL}/{displayName || "yourhandle"}</a>
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
                  <p
                    className={`text-sm ${
                      displayNameMessage.includes("Error")
                        ? "text-red-600"
                        : "text-green-600"
                    }`}
                  >
                    {displayNameMessage}
                  </p>
                )}
              </div>
            </div>
          </section>

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
                // Clean up any blob URLs
                if (preview && preview.startsWith("blob:")) {
                  URL.revokeObjectURL(preview);
                }

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
    </div>
  );
}
