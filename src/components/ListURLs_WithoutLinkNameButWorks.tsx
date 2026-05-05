// components/ListURLs.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, ExternalLink, Link, Globe, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

// ── Types ──────────────────────────────────────────────────────────────────────
interface UrlRecord {
  id: number;
  userid: string;
  worldid?: string;
  tenant?: string;
  name: string;
  linkname: string;
  url: string;
  created_at: string;
  updated_at: string;
}

interface GroupedUrlRecord {
  groupId: number; // id of the first row in the group
  worldid?: string;
  urls: UrlRecord[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Group flat URL rows by worldid (or by individual id if no worldid) */
function groupUrls(rows: UrlRecord[]): GroupedUrlRecord[] {
  const map = new Map<string, GroupedUrlRecord>();

  for (const row of rows) {
    const key = row.worldid ? `world_${row.worldid}` : `id_${row.id}`;

    if (!map.has(key)) {
      map.set(key, {
        groupId: row.id,
        worldid: row.worldid,
        urls: [],
      });
    }
    map.get(key)!.urls.push(row);
  }

  return Array.from(map.values());
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function ListURLs() {
  const router = useRouter();

  // Auth state
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [accessChecked, setAccessChecked] = useState(false);
  const [adminStatus, setAdminStatus] = useState(false);
  const displayname = localStorage.getItem("displayname") ?? "";

  // Data state
  const [groups, setGroups] = useState<GroupedUrlRecord[]>([]);
  const [loading, setLoading] = useState(true);

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
      setLoading(false);
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
          setLoading(false);
          router.push("/dashboard");
        }
      })
      .catch(() => {
        setAdminStatus(false);
        setAccessChecked(true);
        setLoading(false);
        router.push("/dashboard");
      });
  }, [currentUsername, router]);

  // ── Step 3: Fetch URLs for current user ────────────────────────────────────
  useEffect(() => {
    if (!accessChecked || !adminStatus || !currentUsername) return;

    const fetchUrls = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/urls?userid=${encodeURIComponent(currentUsername)}`
        );

        if (!response.ok) throw new Error("Failed to fetch URLs");

        const data: UrlRecord[] = await response.json();
        setGroups(groupUrls(Array.isArray(data) ? data : []));
      } catch (error) {
        console.error("Error fetching URLs:", error);
        toast.error("Failed to load your links.");
      } finally {
        setLoading(false);
      }
    };

    fetchUrls();
  }, [accessChecked, adminStatus, currentUsername]);

  // ── Render guards ──────────────────────────────────────────────────────────
  if (currentUsername === null || (!accessChecked && loading)) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-2">
          <Loader2 className="animate-spin h-8 w-8 text-[#5871A7] mx-auto" />
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

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Manage Links</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage the links displayed on your profile page.
          </p>
        </div>

        <Button
          onClick={() => window.open("/" + displayname + "/me", "_blank")}
          className="ml-auto bg-[#5871A7] hover:bg-[#4560A0] text-white flex items-center gap-2 mr-2"
        >
          <Link size={16} />
          Public Links 
        </Button>
        <Button
          onClick={() => router.push("/dashboard/add-url")}
          className="bg-[#5871A7] hover:bg-[#4560A0] text-white flex items-center gap-2"
        >
          <Plus size={16} />
          Add URL
        </Button>
      </div>

      <hr className="border-[#D4D8EA] dark:border-[#2E4066]" />

      {/* ── Loading skeleton ─────────────────────────────────────────────── */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-lg border border-[#D4D8EA] dark:border-[#2E4066] p-5 animate-pulse space-y-3"
            >
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
              <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
              <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/3" />
            </div>
          ))}
        </div>
      )}

      {/* ── Empty state ──────────────────────────────────────────────────── */}
      {!loading && groups.length === 0 && (
        <div className="flex flex-col items-center justify-center min-h-[300px] rounded-lg border border-dashed border-[#D4D8EA] dark:border-[#2E4066] p-10 text-center space-y-4">
          <div className="rounded-full bg-[#5871A7]/10 p-4">
            <Link size={28} className="text-[#5871A7]" />
          </div>
          <div>
            <p className="font-medium text-gray-700 dark:text-gray-300">
              No links yet
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Add your first link page to get started.
            </p>
          </div>
          <Button
            onClick={() => router.push("/dashboard/add-url")}
            className="bg-[#5871A7] hover:bg-[#4560A0] text-white"
          >
            <Plus size={16} className="mr-2" />
            Add URL
          </Button>
        </div>
      )}

      {/* ── URL group cards ───────────────────────────────────────────────── */}
      {!loading && groups.length > 0 && (
        <div className="space-y-4">
          {groups.map((group) => (
            <div
              key={group.groupId}
              className="rounded-lg border border-[#D4D8EA] dark:border-[#2E4066] bg-white dark:bg-gray-900 overflow-hidden"
            >
              {/* Card header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#D4D8EA] dark:border-[#2E4066] bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Globe size={15} className="text-[#5871A7]" />
                  {group.worldid ? (
                    <span>
                      Dropsite:{" "}
                      <span className="font-mono font-medium text-gray-800 dark:text-gray-200">
                        {group.worldid}
                      </span>
                    </span>
                  ) : (
                    <span className="italic text-gray-400">No dropsite</span>
                  )}
                  <span className="ml-2 text-xs bg-[#5871A7]/10 text-[#5871A7] rounded-full px-2 py-0.5">
                    {group.urls.length} {group.urls.length === 1 ? "link" : "links"}
                  </span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    router.push(`/dashboard/edit-url/${group.groupId}`)
                  }
                  className="flex items-center gap-1.5 text-[#5871A7] border-[#5871A7] hover:bg-[#5871A7]/10"
                >
                  <Pencil size={13} />
                  Edit
                </Button>
              </div>

              {/* URL rows */}
              <div className="divide-y divide-[#D4D8EA] dark:divide-[#2E4066]">
                {group.urls.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between px-5 py-3"
                  >
                    {/* Name */}
                    <div className="flex items-center gap-2 min-w-0">
                      <Link
                        size={14}
                        className="text-[#5871A7] flex-shrink-0"
                      />
                      <span className="text-sm font-medium truncate">
                        Site name: {entry.name} Link name: {entry.linkname}
                      </span>
                    </div>

                    {/* URL + visit link */}
                    <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                      <span className="text-xs text-gray-400 font-mono hidden sm:block max-w-[220px] truncate">
                        {entry.url}
                      </span>
                      <a
                        href={entry.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#5871A7] hover:text-[#4560A0] flex items-center gap-1 text-xs whitespace-nowrap"
                      >
                        Visit <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>

              {/* Card footer — timestamps */}
              <div className="px-5 py-2 bg-gray-50 dark:bg-gray-800/30 border-t border-[#D4D8EA] dark:border-[#2E4066]">
                <p className="text-xs text-gray-400">
                  Last updated:{" "}
                  {new Date(
                    group.urls[group.urls.length - 1].updated_at
                  ).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}