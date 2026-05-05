// DropsitesListPage.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Globe, MapPin, Plus, Search, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";

interface Dropsite {
  worldid: string;
  worldname: string;
  description: string;
  publicurl: string;
  localaddress: string;
  latitude: number;
  longitude: number;
  allowed_radius: string;
  public: string;
  worldimg: string;
  userid: string;
  updated_at: string;
}

export default function DropsitesListPage() {
  const router = useRouter();
  const [dropsites, setDropsites] = useState<Dropsite[]>([]);
  const [filteredDropsites, setFilteredDropsites] = useState<Dropsite[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUsername, setCurrentUsername] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [allowedDropsites, setAllowedDropsites] = useState<number | 0>(0);
  const [currentDropsites, setCurrentDropsites] = useState<number | 0>(0);

  useEffect(() => {
    const username = localStorage.getItem("username") ?? "";
    setCurrentUsername(username);

    if (username) {

      fetch(`${process.env.NEXT_PUBLIC_API_URL}/getuserrole/${username}`)
        .then((res) => res.json())
        .then((data) => {
          if ((String(data.role).includes("admin")) || (String(data.role).includes("superuser"))) {
            setIsAdmin(true);
            fetchDropsites();
          } else {
            toast.error("Access denied. Admin privileges required.");
            router.push("/dashboard");
          }
        })
        .catch((err) => {
          console.error("Error checking admin status:", err);
          router.push("/dashboard");
        });
    }
  }, [router]);

  const fetchDropsites = async () => {
    // ── Guard: don't fire if username is empty ─────────────────────────────────
    const username = localStorage.getItem("username") ?? "";
    if (!username) return;
    setLoading(true);
    try {

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/worldawards/listbyuser/${username}`
      );
      setDropsites(response.data);
      setFilteredDropsites(response.data);

      const allowedworlds = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/allowedworlds/${username}`
      );
      setAllowedDropsites(allowedworlds.data.allowedworlds);
      console.log("allowedworlds:", allowedworlds.data.allowedworlds);

      setCurrentDropsites(allowedworlds.data.currentworlds);
      console.log("currentworlds:", allowedworlds.data.currentworlds);

    } catch (error) {
      console.error("Error fetching dropsites:", error);
      toast.error("Failed to load dropsites");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredDropsites(dropsites);
    } else {
      const filtered = dropsites.filter(
        (dropsite) =>
          dropsite.worldname
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          dropsite.description
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          dropsite.localaddress?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredDropsites(filtered);
    }
  }, [searchQuery, dropsites]);

  const handleAddNew = async () => {
    setIsNavigating(true);
    await new Promise((resolve) => setTimeout(resolve, 300));
    router.push("/dashboard/add-dropsite");
  };

  const handleEdit = async (worldId: string) => {
    setEditingId(worldId);
    const username = localStorage.getItem("username") ?? "";

    if (!username) return;

    try {
      // this checks distinct(role) from rbac where userid = ?
      const res  = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/getuserrolebyworld/${username}/${worldId}`);
      const data = await res.json();

      if (
        String(data.role).includes("admin") ||
        String(data.role).includes("superuser")
      ) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        router.push(`/dashboard/edit-dropsite/${worldId}`);
      } else {
        toast.error("Access denied. Admin privileges required.");
        router.push("/dashboard/dropsites");
      }
    } catch (err) {
      console.error("Error checking admin status:", err);
      router.push("/dashboard");
    } finally {
      setEditingId(null);
    }
  };

const handleDelete = async (worldId: string, worldname: string) => {
  setDeletingId(worldId);

  try {
    const username = localStorage.getItem("username");
    if (!username) {
      toast.error("Not authenticated");
      return;
    }

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/getuserrolebyworld/${username}/${worldId}`
    );

    const data = await res.json();
    const role = String(data.role).toLowerCase();

    if (role !== "admin" && role !== "superuser") {
      toast.error("Access denied. Admin privileges required.");
      return;
    }

    if (!confirm(`Are you sure you want to delete "${worldname}"?`)) {
      return;
    }

    const response = await axios.delete(
      `${process.env.NEXT_PUBLIC_API_URL}/worlds/delete/${worldId}`
    );

    if (response.data.success) {
      toast.success("Dropsite deleted successfully");
      fetchDropsites();
    } else {
      toast.error(response.data.message || "Failed to delete dropsite");
    }

  } catch (error) {
    console.error("Delete error:", error);
    toast.error("Something went wrong");
  } finally {
    setDeletingId(null);
  }
};

  // const handleDelete = async (worldId: string, worldname: string) => {

  //   setDeletingId(worldId);
  //   const username = localStorage.getItem("username") ?? "";

  //   if (!username) return;

  //   try {
  //     const res  = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/getuserrolebyworld/${username}/${worldId}`);
  //     const data = await res.json();

  //     console.log("role found", String(data.role));
  //     console.log("role found", String(data.role));

  //     if (
  //       String(data.role).includes("admin") ||
  //       String(data.role).includes("superuser")
  //     ) {
  //       try {
  //         if (!confirm(`Are you sure you want to delete "${worldname}"?`)) {
  //           return;
  //         }
  //         const response = await axios.delete(
  //           `${process.env.NEXT_PUBLIC_API_URL}/worlds/delete/${worldId}`
  //         );

  //         if (response.data.success) {
  //           toast.success("Dropsite deleted successfully");
  //           fetchDropsites();
  //         } else {
  //           toast.error(response.data.message || "Failed to delete dropsite");
  //         }
  //       } catch (error) {
  //         console.error("Error deleting dropsite:", error);
  //         toast.error("Failed to delete dropsite");
  //       } finally {
  //         setDeletingId(null);
  //       }
  //     } else {
  //       toast.error("Access denied. Admin privileges required.");
  //       router.push("/dashboard/dropsites");
  //     }

  //   } catch (err) {
  //     console.error("Error checking admin status:", err);
  //     router.push("/dashboard");
  //   }
  // };

  const handleCardClick = (publicurl: string) => {
    if (publicurl) {
      window.open(publicurl, "_blank", "noopener,noreferrer");
    } else {
      toast.error("No public URL available for this dropsite");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-clgeodrops" />
          <p className="text-gray-600 dark:text-gray-400">
            Loading dropsites...
          </p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="w-full mx-auto p-6 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Manage Dropsites
        </h1>
        {currentDropsites < allowedDropsites && (
          <Button
            onClick={handleAddNew}
            disabled={isNavigating}
            className="bg-clgeodrops hover:opacity-60 duration-200 ease-in-out text-white flex items-center gap-2 px-4 py-2 rounded-full disabled:opacity-50 disabled:cursor-not-allowed geo-claim-button"
          >
            {isNavigating ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <Plus size={18} />
                Add New Dropsite
              </>
            )}
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <p>You created {currentDropsites} of {allowedDropsites} allowed Dropsites (others shown were created by other users). Click <a href="http://cms.geo-drops.com:5757/index.html" target="_blank"><u>HERE</u></a> to administer styling using the same credentials.</p>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Input
          type="text"
          placeholder="Enter a search term to find Dropsites"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-4 pr-12 py-3 border border-gray-300 dark:border-[#2D385B] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C1CE] focus:border-transparent bg-white dark:bg-[#151E3A]"
        />
        <button
          type="button"
          className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-gray-400 hover:text-clgeodrops transition-colors"
        >
          <Search className="h-5 w-5" />
        </button>
      </div>

      {/* Dropsites Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredDropsites.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            {searchQuery
              ? "No dropsites found matching your search."
              : "No dropsites available."}
          </div>
        ) : (
          filteredDropsites.map((dropsite) => (
            <div
              key={dropsite.worldid}
              onClick={() => handleCardClick(dropsite.publicurl)}
              className="bg-white dark:bg-[#151E3A] dark:border dark:border-[#2D385B] rounded-[10px] p-4 w-full transition-all duration-200 cursor-pointer hover:shadow-lg hover:scale-105"
              style={{
                opacity: deletingId === dropsite.worldid ? 0.5 : 1,
              }}
            >
              {/* Image */}
              <div className="overflow-hidden rounded-[10px] mb-4">
                {dropsite.worldimg ? (
                  <img
                    src={dropsite.worldimg}
                    alt={dropsite.worldname}
                    className="w-full aspect-square object-cover"
                  />
                ) : (
                  <div className="w-full aspect-square flex items-center justify-center bg-gray-100 dark:bg-[#2D385B]">
                    <Globe
                      size={40}
                      className="text-gray-300 dark:text-gray-600"
                    />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="space-y-3">
                <div>
                  <h3 className="font-extrabold tracking-normal leading-[1.2] pr-10">
                    {dropsite.worldname}
                  </h3>
                </div>

                {/* Location and IP */}
                <div className="space-y-2">
                  {dropsite.latitude && dropsite.longitude && (
                    <div className="flex items-start gap-2 text-xs text-[#8E91A0] dark:text-[#9CB0DA]">
                      <MapPin
                        size={14}
                        className="text-clgeodrops flex-shrink-0 mt-0.5"
                      />
                      <span className="truncate">
                        {dropsite.latitude.toFixed(4)},{" "}
                        {dropsite.longitude.toFixed(4)}
                      </span>
                    </div>
                  )}
                  {dropsite.localaddress && (
                    <div className="flex items-start gap-2 text-xs text-[#8E91A0] dark:text-[#9CB0DA]">
                      <Globe
                        size={14}
                        className="text-clgeodrops flex-shrink-0 mt-0.5"
                      />
                      <span className="truncate">{dropsite.localaddress}</span>
                    </div>
                  )}
                </div>

                {/* Date and Status */}
                <div className="text-xs text-[#8E91A0] dark:text-[#9CB0DA]">
                  <p>
                    {new Date(dropsite.updated_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                    })}{" "}
                    -{" "}
                    {new Date(dropsite.updated_at).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-1.5 justify-between items-center pt-2">
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(dropsite.worldid);
                      }}
                      disabled={
                        editingId === dropsite.worldid ||
                        deletingId === dropsite.worldid
                      }
                      className="bg-clgeodrops hover:opacity-60 duration-200 ease-in-out text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed geo-claim-button"
                    >
                      {editingId === dropsite.worldid ? (
                        <>
                          <Loader2 size={14} className="animate-spin mr-1" />
                          Loading...
                        </>
                      ) : (
                        "Edit"
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(dropsite.worldid, dropsite.worldname);
                      }}
                      disabled={
                        deletingId === dropsite.worldid ||
                        editingId === dropsite.worldid
                      }
                      className="rounded-full text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-300 dark:border-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deletingId === dropsite.worldid ? (
                        <>
                          <Loader2 size={14} className="animate-spin mr-1" />
                          Deleting...
                        </>
                      ) : (
                        "Delete"
                      )}
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full pointer-events-none"
                  >
                    {dropsite.public === "1" ? "Public" : "Private"}
                  </Button>
                </div>

                <p className="text-xs text-[#8E91A0] dark:text-[#9CB0DA]">
                  Radius: {dropsite.allowed_radius}m
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
