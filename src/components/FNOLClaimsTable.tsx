// components/FNOLClaimsTable.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
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
  AlertTriangle,
  Shield,
  Car,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import toast from "react-hot-toast";

const PAGE_SIZE = 10;

// ── Types ──────────────────────────────────────────────────────────────────────
type ClaimStatus = "submitted" | "under_review" | "approved" | "rejected" | "closed";

interface FNOLClaim {
  id:                     number;
  claim_reference:        string | null;
  status:                 ClaimStatus;
  policy_number:          string;
  policyholder_name:      string;
  userid:                 string;
  policyholder_phone:     string | null;
  incident_date:          string;
  incident_time:          string | null;
  incident_type:          string;
  incident_description:   string;
  incident_address:       string | null;
  vehicle_registration:   string | null;
  vehicle_make:           string | null;
  vehicle_model:          string | null;
  third_party_involved:   number;
  injuries_reported:      number;
  estimated_damage:       number | null;
  currency:               string | null;
  declaration_accepted:   number;
  created_at:             string;
  updated_at:             string;
}

// ── Status config ──────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<ClaimStatus, {
  label:  string;
  icon:   React.ElementType;
  classes: string;
}> = {
  submitted:    { label: "Submitted",    icon: Clock,         classes: "bg-blue-100   dark:bg-blue-900/30   text-blue-700   dark:text-blue-400"   },
  under_review: { label: "Under Review", icon: AlertTriangle, classes: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400" },
  approved:     { label: "Approved",     icon: CheckCircle,   classes: "bg-green-100  dark:bg-green-900/30  text-green-700  dark:text-green-400"  },
  rejected:     { label: "Rejected",     icon: X,             classes: "bg-red-100    dark:bg-red-900/30    text-red-700    dark:text-red-400"     },
  closed:       { label: "Closed",       icon: Shield,        classes: "bg-gray-100   dark:bg-gray-800      text-gray-600   dark:text-gray-400"   },
};

function StatusBadge({ status }: { status: ClaimStatus }) {
  const cfg  = STATUS_CONFIG[status] ?? STATUS_CONFIG.submitted;
  const Icon = cfg.icon;
  return (
    <span className={`
      inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium
      ${cfg.classes}
    `}>
      <Icon size={10} />
      {cfg.label}
    </span>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function FNOLClaimsTable() {
  const router = useRouter();

  // Auth
  const [currentUsername, setCurrentUsername] = useState("");
  const [adminStatus,     setAdminStatus]     = useState(false);
  const [accessChecked,   setAccessChecked]   = useState(false);

  // Data
  const [claims,     setClaims]     = useState<FNOLClaim[]>([]);
  const [filtered,   setFiltered]   = useState<FNOLClaim[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);

  // Filters
  const [searchQuery,   setSearchQuery]   = useState("");
  const [statusFilter,  setStatusFilter]  = useState<ClaimStatus | "all">("all");
  const [incidentType,  setIncidentType]  = useState("");

  // ── Read username ────────────────────────────────────────────────────────────
  useEffect(() => {
    const username = localStorage.getItem("username") ?? "";
    setCurrentUsername(username);
  }, []);

  // ── Check admin access ───────────────────────────────────────────────────────
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
      })
      .catch(() => {
        setAdminStatus(false);
        setAccessChecked(true);
        router.push("/dashboard/settings");
      });
  }, [currentUsername, router]);

  // ── Load claims ──────────────────────────────────────────────────────────────
  const loadClaims = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else           setLoading(true);

    try {
      const username = localStorage.getItem("username") ?? "";
      console.log(`running ${process.env.NEXT_PUBLIC_API_URL}/ins_fnol/claimslist/${username}/admin`);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/ins_fnol/claimslist/${username}/admin`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setClaims(Array.isArray(data) ? data : data.claims ?? []);
    } catch (err) {
      console.error("Failed to load FNOL claims:", err);
      toast.error("Failed to load claims.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUsername]);

  useEffect(() => {
    if (accessChecked) loadClaims();
  }, [accessChecked, loadClaims]);

  // ── Filter logic ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let result = [...claims];

    if (statusFilter !== "all") {
      result = result.filter((c) => c.status === statusFilter);
    }

    if (incidentType) {
      result = result.filter((c) =>
        c.incident_type?.toLowerCase().includes(incidentType.toLowerCase())
      );
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((c) =>
        c.claim_reference?.toLowerCase().includes(q)       ||
        c.policy_number?.toLowerCase().includes(q)         ||
        c.policyholder_name?.toLowerCase().includes(q)     ||
        c.userid?.toLowerCase().includes(q)    ||
        c.vehicle_registration?.toLowerCase().includes(q)  ||
        c.incident_type?.toLowerCase().includes(q)         ||
        c.incident_address?.toLowerCase().includes(q)
      );
    }

    setFiltered(result);
    setPage(1);
  }, [claims, searchQuery, statusFilter, incidentType]);

  // ── Pagination ────────────────────────────────────────────────────────────────
  const totalPages    = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginatedRows = filtered.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  // ── Summary stats ─────────────────────────────────────────────────────────────
  const stats = [
    { label: "Total",        value: claims.length,                                            color: "text-gray-700  dark:text-gray-200"  },
    { label: "Submitted",    value: claims.filter((c) => c.status === "submitted").length,    color: "text-blue-600   dark:text-blue-400"  },
    { label: "Under Review", value: claims.filter((c) => c.status === "under_review").length, color: "text-yellow-600 dark:text-yellow-400"},
    { label: "Approved",     value: claims.filter((c) => c.status === "approved").length,     color: "text-green-600  dark:text-green-400" },
    { label: "Rejected",     value: claims.filter((c) => c.status === "rejected").length,     color: "text-red-600    dark:text-red-400"   },
  ];

  // ── Render guards ─────────────────────────────────────────────────────────────
  if (!accessChecked || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5871A7] mx-auto" />
          <p className="text-gray-500 text-sm">
            {!accessChecked ? "Checking permissions…" : "Loading claims…"}
          </p>
        </div>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold flex items-center gap-2.5">
            <FileText className="text-[#5871A7]" size={28} />
            FNOL Claims
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            First Notice of Loss — all submitted insurance claims
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadClaims(true)}
            disabled={refreshing}
          >
            <RefreshCw size={14} className={`mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </Button>
          <Button
            onClick={() => router.push("/dashboard/ins-claim/new")}
            className="bg-[#5871A7] hover:bg-[#4560A0] text-white"
          >
            <Plus size={15} className="mr-1.5" />
            New Claim
          </Button>
        </div>
      </div>

      <hr className="border-[#D4D8EA] dark:border-[#2E4066]" />

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-center"
          >
            <p className={`text-2xl font-bold tabular-nums ${stat.color}`}>
              {stat.value}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Text search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <Input
            className="pl-9"
            placeholder="Search reference, policy, name, reg…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Incident type filter */}
        <div className="relative">
          <Car size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <select
            value={incidentType}
            onChange={(e) => setIncidentType(e.target.value)}
            className="
              w-full pl-9 pr-4 h-10 text-sm rounded-md border border-gray-200
              dark:border-gray-700 bg-white dark:bg-gray-900
              text-gray-700 dark:text-gray-200
              focus:outline-none focus:ring-2 focus:ring-[#5871A7]
            "
          >
            <option value="">All incident types</option>
            <option value="collision">Collision / RTA</option>
            <option value="theft">Theft / Attempted Theft</option>
            <option value="vandalism">Vandalism</option>
            <option value="fire">Fire</option>
            <option value="flood">Flood / Storm</option>
            <option value="animal">Animal Strike</option>
            <option value="windscreen">Windscreen / Glass</option>
            <option value="hit_and_run">Hit and Run</option>
            <option value="personal_injury">Personal Injury</option>
            <option value="property_damage">Property Damage</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Status filter pills */}
        <div className="flex rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden h-10">
          {([
            { value: "all",          label: "All"      },
            { value: "submitted",    label: "New"      },
            { value: "under_review", label: "Review"   },
            { value: "approved",     label: "Approved" },
            { value: "rejected",     label: "Rejected" },
          ] as const).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStatusFilter(opt.value)}
              className={`
                flex-1 text-xs font-medium transition-colors border-r border-gray-200 dark:border-gray-700 last:border-r-0
                ${statusFilter === opt.value
                  ? "bg-[#5871A7] text-white"
                  : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                }
              `}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                {[
                  "Reference",
                  "Policyholder",
                  "Policy No.",
                  "Incident Type",
                  "Date",
                  "Vehicle",
                  "Damage",
                  "Status",
                  "Submitted",
                  "Actions",
                ].map((h) => (
                  <th key={h}
                    className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-16 text-gray-400">
                    {claims.length === 0
                      ? "No FNOL claims yet. Submit your first claim to get started."
                      : "No claims match your current filters."
                    }
                  </td>
                </tr>
              ) : (
                paginatedRows.map((claim) => (
                  <tr key={claim.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">

                    {/* Reference */}
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-semibold text-[#5871A7]">
                        {claim.claim_reference || `#${claim.id}`}
                      </span>
                    </td>

                    {/* Policyholder */}
                    <td className="px-4 py-3 max-w-[160px]">
                      <p className="font-medium text-gray-800 dark:text-white truncate">
                        {claim.policyholder_name}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {claim.userid}
                      </p>
                    </td>

                    {/* Policy number */}
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                        {claim.policy_number}
                      </span>
                    </td>

                    {/* Incident type */}
                    <td className="px-4 py-3 capitalize text-gray-600 dark:text-gray-300 whitespace-nowrap">
                      {claim.incident_type?.replace(/_/g, " ") || "—"}
                    </td>

                    {/* Incident date */}
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-300">
                      {claim.incident_date
                        ? new Date(claim.incident_date).toLocaleDateString("en-GB", {
                            day: "2-digit", month: "short", year: "numeric",
                          })
                        : "—"
                      }
                    </td>

                    {/* Vehicle */}
                    <td className="px-4 py-3">
                      {claim.vehicle_registration ? (
                        <div>
                          <span className="font-mono text-xs bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-700 px-1.5 py-0.5 rounded">
                            {claim.vehicle_registration}
                          </span>
                          {(claim.vehicle_make || claim.vehicle_model) && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              {[claim.vehicle_make, claim.vehicle_model].filter(Boolean).join(" ")}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs italic">—</span>
                      )}
                    </td>

                    {/* Estimated damage */}
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-300">
                      {claim.estimated_damage != null ? (
                        <span>
                          {claim.currency || "GBP"}{" "}
                          {Number(claim.estimated_damage).toLocaleString("en-GB", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic text-xs">Not assessed</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <StatusBadge status={claim.status as ClaimStatus} />
                      {/* Flags */}
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {claim.third_party_involved === 1 && (
                          <span className="text-[9px] bg-orange-100 dark:bg-orange-900/20 text-orange-600 px-1.5 py-0.5 rounded">
                            3rd party
                          </span>
                        )}
                        {claim.injuries_reported === 1 && (
                          <span className="text-[9px] bg-red-100 dark:bg-red-900/20 text-red-600 px-1.5 py-0.5 rounded">
                            Injury
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Submitted date */}
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(claim.created_at).toLocaleDateString("en-GB", {
                        day: "2-digit", month: "short", year: "numeric",
                      })}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {/* View */}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => router.push(`/dashboard/ins-claim/${claim.id}`)}
                          className="h-7 px-2 text-xs text-gray-500"
                          title="View claim"
                        >
                          <Eye size={12} className="mr-1" />
                          View
                        </Button>

                        {/* Edit — only for open claims */}
                        {(claim.status === "submitted" || claim.status === "under_review") && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`/dashboard/ins-claim/edit/${claim.id}`)}
                            className="h-7 px-2 text-xs border-[#5871A7] text-[#5871A7] hover:bg-[#5871A7]/10"
                            title="Edit claim"
                          >
                            <Edit2 size={12} className="mr-1" />
                            Edit
                          </Button>
                        )}
                      </div>
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
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Showing {(page - 1) * PAGE_SIZE + 1}–
              {Math.min(page * PAGE_SIZE, filtered.length)} of{" "}
              {filtered.length} claim{filtered.length !== 1 ? "s" : ""}
            </span>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1} className="h-8 px-2">
                <ChevronLeft size={14} />
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if      (totalPages <= 5)        pageNum = i + 1;
                  else if (page <= 3)               pageNum = i + 1;
                  else if (page >= totalPages - 2)  pageNum = totalPages - 4 + i;
                  else                              pageNum = page - 2 + i;
                  return (
                    <button key={pageNum} type="button" onClick={() => setPage(pageNum)}
                      className={`w-8 h-8 text-sm rounded-md transition-colors ${
                        pageNum === page
                          ? "bg-[#5871A7] text-white font-medium"
                          : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`}>
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <Button type="button" variant="outline" size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages} className="h-8 px-2">
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}