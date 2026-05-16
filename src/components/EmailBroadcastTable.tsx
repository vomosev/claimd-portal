// components/EmailBroadcastTable.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Mail,
  Plus,
  Edit2,
  Eye,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  RefreshCw,
  CheckCircle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  emailBroadcastApi,
  EmailBroadcast,
  AwardSearchResult,
} from "@/services/emailBroadcastApi";
import AwardSearchBox from "./AwardSearchBox";
import toast from "react-hot-toast";

const PAGE_SIZE = 10;

export default function EmailBroadcastTable() {
  const router = useRouter();

  // Auth
  const [currentUsername, setCurrentUsername] = useState("");
  const [adminStatus, setAdminStatus] = useState(false);
  const [accessChecked, setAccessChecked] = useState(false);

  // Data
  const [broadcasts, setBroadcasts] = useState<EmailBroadcast[]>([]);
  const [filtered, setFiltered] = useState<EmailBroadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);

  // Search / Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [awardFilter, setAwardFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"all" | "0" | "1">("all");

  // Load username
  useEffect(() => {
    const username = localStorage.getItem("username") ?? "";
    setCurrentUsername(username);
  }, []);

  // Check access
  useEffect(() => {
    if (!currentUsername) return;

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

  // Load broadcasts
  const loadBroadcasts = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await emailBroadcastApi.getEmailBroadcasts();
      setBroadcasts(data);
    } catch {
      toast.error("Failed to load email broadcasts.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (accessChecked && adminStatus) {
      loadBroadcasts();
    }
  }, [accessChecked, adminStatus, loadBroadcasts]);

  // Filter logic
  useEffect(() => {
    let result = [...broadcasts];

    if (awardFilter) {
      result = result.filter((b) =>
        b.awardid?.toLowerCase().includes(awardFilter.toLowerCase())
      );
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (b) =>
          b.subject?.toLowerCase().includes(q) ||
          b.awardid?.toLowerCase().includes(q) ||
          b.userid?.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== "all") {
      result = result.filter(
        (b) => String(b.sentstatus) === statusFilter
      );
    }

    setFiltered(result);
    setPage(1);
  }, [broadcasts, searchQuery, awardFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginatedRows = filtered.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  const handleAwardSearchSelect = (award: AwardSearchResult) => {
    setAwardFilter(String(award.awardid));
  };

  const clearAwardFilter = () => {
    setAwardFilter("");
  };

  // ----- Render guards -----
  if (!accessChecked || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5871A7] mx-auto" />
          <p className="text-gray-500 text-sm">
            {!accessChecked ? "Checking permissions..." : "Loading broadcasts..."}
          </p>
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

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-3xl font-semibold flex items-center gap-2.5">
            {/* <Mail className="text-geodrops" /> */}
            Send Updates
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage and send push/email campaigns to recipients
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => router.push("/dashboard/import-list")}
            className="bg-[#5871A7] hover:bg-[#4560A0] text-white"
          >
            Import Mailing List
          </Button>
          <Button
            onClick={() => router.push("/dashboard/export-list")}
            className="bg-[#5871A7] hover:bg-[#4560A0] text-white"
          >
            Export Lists
          </Button>
        </div>
      </div>

      <hr className="border-[#D4D8EA] dark:border-[#2E4066]" />

<div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
  <div className="flex items-center gap-2 min-w-max pb-1">
    <Button
      variant="outline"
      size="sm"
      onClick={() => loadBroadcasts(true)}
      disabled={refreshing}
    >
      <RefreshCw
        size={14}
        className={refreshing ? "animate-spin mr-1" : "mr-1"}
      />
      {refreshing ? "Refreshing..." : "Refresh"}
    </Button>
    <Button
      onClick={() => router.push("/dashboard/email-broadcasts/single")}
      className="bg-[#5871A7] hover:bg-[#4560A0] text-white"
    >
      Push
    </Button>
    <Button
      onClick={() => router.push("/dashboard/email-broadcasts/new")}
      className="bg-[#5871A7] hover:bg-[#4560A0] text-white"
    >
      Drop
    </Button>
    <Button
      onClick={() => router.push("/dashboard/emailworld-broadcasts/new")}
      className="bg-[#5871A7] hover:bg-[#4560A0] text-white"
    >
      Dropsite
    </Button>
    <Button
      onClick={() => router.push("/dashboard/emailmailinglist-broadcasts/new")}
      className="bg-[#5871A7] hover:bg-[#4560A0] text-white"
    >
      List
    </Button>
    <Button
      onClick={() => router.push("/dashboard/emailteam-broadcasts/new")}
      className="bg-[#5871A7] hover:bg-[#4560A0] text-white"
    >
      Team
    </Button>
    <Button
      onClick={() => router.push("/dashboard/emailrewards-broadcasts/new")}
      className="bg-[#5871A7] hover:bg-[#4560A0] text-white"
    >
      Rewards
    </Button>
    {/* <Button
      onClick={() => router.push("/dashboard/eventbrite")}
      className="bg-[#5871A7] hover:bg-[#4560A0] text-white"
    >
      <Mail size={16} className="mr-1" />
      Eventbrite
    </Button>
    <Button
      onClick={() => router.push("/dashboard/mailchimp")}
      className="bg-[#5871A7] hover:bg-[#4560A0] text-white"
    >
      <Mail size={16} className="mr-1" />
      Mailchimp
    </Button> */}
  </div>
</div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Text search */}
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <Input
            className="pl-9"
            placeholder="Search description, user ID, drop..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Drop ID predictive search */}
        <div className="relative">
          {awardFilter ? (
            <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
              <span className="text-sm text-[#5871A7] flex-1 truncate">
                Drop: {awardFilter}
              </span>
              <button
                type="button"
                onClick={clearAwardFilter}
                className="text-gray-400 hover:text-gray-600 flex-shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <AwardSearchBox
              onSelect={handleAwardSearchSelect}
              placeholder="Filter by Drop ID or description..."
            />
          )}
        </div>

        {/* Status filter */}
        <div className="flex rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden h-10">
          {(
            [
              { value: "all", label: "All" },
              { value: "0", label: "Drafts" },
              { value: "1", label: "Sent" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStatusFilter(opt.value)}
              className={`flex-1 text-sm font-medium transition-colors ${
                statusFilter === opt.value
                  ? "bg-[#5871A7] text-white"
                  : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total", value: broadcasts.length, color: "text-gray-700" },
          {
            label: "Drafts",
            value: broadcasts.filter((b) => b.sentstatus === 0).length,
            color: "text-yellow-600",
          },
          {
            label: "Sent",
            value: broadcasts.filter((b) => b.sentstatus === 1).length,
            color: "text-green-600",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-center"
          >
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  ID
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  Drop/Site ID
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  User ID
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">
                  Subject
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  Status
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  Created
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  Updated
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="text-center py-16 text-gray-400"
                  >
                    {broadcasts.length === 0
                      ? "No email broadcasts yet. Create your first one!"
                      : "No broadcasts match your current filters."}
                  </td>
                </tr>
              ) : (
                paginatedRows.map((broadcast) => (
                  <tr
                    key={broadcast.id}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">
                      #{broadcast.id} {broadcast.endpoint}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                        {broadcast.awardid || broadcast.worldid || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 max-w-[150px] truncate">
                      {broadcast.userid || "—"}
                    </td>
                    <td className="px-4 py-3 max-w-[250px]">
                      <p className="truncate" title={broadcast.subject}>
                        {broadcast.subject || (
                          <span className="text-gray-400 italic">
                            No subject
                          </span>
                        )}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {broadcast.sentstatus === 1 ? (
                        <span className="inline-flex items-center gap-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">
                          <CheckCircle size={10} /> Sent
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-0.5 rounded-full font-medium">
                          <Clock size={10} /> Draft
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(broadcast.created_at).toLocaleDateString(
                        "en-GB",
                        {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        }
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(broadcast.updated_at).toLocaleDateString(
                        "en-GB",
                        {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        }
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {broadcast.sentstatus === 0 ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            router.push(
                              `/dashboard/${broadcast.endpoint || "email"}-broadcasts/edit/${broadcast.id}`
                            )
                          }
                          className="h-7 px-3 text-xs border-[#5871A7] text-[#5871A7] hover:bg-[#5871A7]/10"
                        >
                          <Edit2 size={12} className="mr-1" />
                          Edit
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            router.push(
                              `/dashboard/${broadcast.endpoint || "email"}-broadcasts/edit/${broadcast.id}`
                            )
                          }
                          className="h-7 px-3 text-xs text-gray-500"
                        >
                          <Eye size={12} className="mr-1" />
                          View
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            <span className="text-sm text-gray-600">
              Showing {(page - 1) * PAGE_SIZE + 1}–
              {Math.min(page * PAGE_SIZE, filtered.length)} of{" "}
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="h-8 px-2"
              >
                <ChevronLeft size={14} />
              </Button>

              {/* Page numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setPage(pageNum)}
                      className={`w-8 h-8 text-sm rounded-md transition-colors ${
                        pageNum === page
                          ? "bg-[#5871A7] text-white font-medium"
                          : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="h-8 px-2"
              >
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}