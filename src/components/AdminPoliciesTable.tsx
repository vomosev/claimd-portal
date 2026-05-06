// components/PoliciesTable.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
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
  XCircle,
  FileText,
  DollarSign,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import toast from "react-hot-toast";

const PAGE_SIZE = 10;

// ── Types ──────────────────────────────────────────────────────────────────────
type PolicyStatus = "active" | "pending" | "cancelled" | "expired" | "lapsed";

interface InsPolicy {
  id:              number;
  userid:          string;
  productType:     string;
  premium:         number;
  coverage_limit:  number;
  excess:          number;
  postcode:        string;
  asset_value:     number;
  status:          PolicyStatus;
  created_at:      string;
  updated_at:      string;
}

// ── Status config ──────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<PolicyStatus, {
  label:   string;
  icon:    React.ElementType;
  classes: string;
}> = {
  active:    { label: "Active",    icon: CheckCircle,   classes: "bg-green-100  dark:bg-green-900/30  text-green-700  dark:text-green-400"  },
  pending:   { label: "Pending",   icon: Clock,         classes: "bg-blue-100   dark:bg-blue-900/30   text-blue-700   dark:text-blue-400"   },
  cancelled: { label: "Cancelled", icon: XCircle,       classes: "bg-red-100    dark:bg-red-900/30    text-red-700    dark:text-red-400"    },
  expired:   { label: "Expired",   icon: AlertTriangle, classes: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400" },
  lapsed:    { label: "Lapsed",    icon: AlertTriangle, classes: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400" },
};

function StatusBadge({ status }: { status: PolicyStatus }) {
  const cfg  = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
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

// ── Product type display helper ────────────────────────────────────────────────
function formatProductType(raw: string): string {
  return raw
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Currency formatter ─────────────────────────────────────────────────────────
function fmtGBP(value: number | null | undefined): string {
  if (value == null) return "—";
  return `£ ${Number(value).toLocaleString("en-GB", { minimumFractionDigits: 2 })}`;
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function PoliciesTable() {
  const router = useRouter();

  // Auth
  const [currentUsername, setCurrentUsername] = useState("");
  const [adminStatus,     setAdminStatus]     = useState(false);
  const [accessChecked,   setAccessChecked]   = useState(false);

  // Data
  const [policies,   setPolicies]   = useState<InsPolicy[]>([]);
  const [filtered,   setFiltered]   = useState<InsPolicy[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);

  // Filters
  const [searchQuery,   setSearchQuery]   = useState("");
  const [statusFilter,  setStatusFilter]  = useState<PolicyStatus | "all">("all");
  const [productFilter, setProductFilter] = useState("");

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

  // ── Load policies ────────────────────────────────────────────────────────────
  const loadPolicies = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else           setLoading(true);

    try {
      console.log(`running ${process.env.NEXT_PUBLIC_API_URL}/ins_policy/adminlist`);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/ins_policy/adminlist`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setPolicies(Array.isArray(data) ? data : data.policies ?? []);
    } catch (err) {
      console.error("Failed to load policies:", err);
      toast.error("Failed to load policies.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (accessChecked && adminStatus) loadPolicies();
  }, [accessChecked, adminStatus, loadPolicies]);

  // ── Filter logic ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let result = [...policies];

    if (statusFilter !== "all") {
      result = result.filter((p) => p.status === statusFilter);
    }

    if (productFilter) {
      result = result.filter((p) =>
        p.productType?.toLowerCase().includes(productFilter.toLowerCase())
      );
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((p) =>
        String(p.id).includes(q)                             ||
        `pol-${String(p.id).padStart(6, "0")}`.includes(q)  ||
        p.userid?.toLowerCase().includes(q)                  ||
        p.productType?.toLowerCase().includes(q)             ||
        p.postcode?.toLowerCase().includes(q)
      );
    }

    setFiltered(result);
    setPage(1);
  }, [policies, searchQuery, statusFilter, productFilter]);

  // ── Pagination ────────────────────────────────────────────────────────────────
  const totalPages    = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginatedRows = filtered.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  // ── Summary stats ─────────────────────────────────────────────────────────────
  const totalPremium = policies.reduce((s, p) => s + (Number(p.premium) || 0), 0);

  const stats = [
    { label: "Total",     value: policies.length,                                                    color: "text-gray-700  dark:text-gray-200"   },
    { label: "Active",    value: policies.filter((p) => p.status === "active").length,               color: "text-green-600  dark:text-green-400"  },
    { label: "Pending",   value: policies.filter((p) => p.status === "pending").length,              color: "text-blue-600   dark:text-blue-400"   },
    { label: "Cancelled", value: policies.filter((p) => p.status === "cancelled").length,            color: "text-red-600    dark:text-red-400"    },
    { label: "GWP",       value: `£${Math.round(totalPremium).toLocaleString("en-GB")}`,             color: "text-[#5871A7]"                       },
  ];

  // ── Unique product types for the filter dropdown ───────────────────────────
  const productTypes = Array.from(
    new Set(policies.map((p) => p.productType).filter(Boolean))
  ).sort();

  // ── Render guards ─────────────────────────────────────────────────────────────
  if (!accessChecked || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5871A7] mx-auto" />
          <p className="text-gray-500 text-sm">
            {!accessChecked ? "Checking permissions…" : "Loading policies…"}
          </p>
        </div>
      </div>
    );
  }

  if (!adminStatus) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500">Redirecting…</p>
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
            <Shield className="text-[#5871A7]" size={28} />
            Policies Admin
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            All issued policies — view and manage
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadPolicies(true)}
            disabled={refreshing}
          >
            <RefreshCw
              size={14}
              className={`mr-1.5 ${refreshing ? "animate-spin" : ""}`}
            />
            {refreshing ? "Refreshing…" : "Refresh"}
          </Button>
          {/* <Button
            onClick={() => router.push("/dashboard/ins-policy/new")}
            className="bg-[#5871A7] hover:bg-[#4560A0] text-white"
          >
            <Plus size={15} className="mr-1.5" />
            New Policy
          </Button> */}
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
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <Input
            className="pl-9"
            placeholder="Search policy no., user, postcode…"
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

        {/* Product type filter */}
        <div className="relative">
          <FileText
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <select
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            className="
              w-full pl-9 pr-4 h-10 text-sm rounded-md
              border border-gray-200 dark:border-gray-700
              bg-white dark:bg-gray-900
              text-gray-700 dark:text-gray-200
              focus:outline-none focus:ring-2 focus:ring-[#5871A7]
            "
          >
            <option value="">All product types</option>
            {productTypes.map((pt) => (
              <option key={pt} value={pt}>
                {formatProductType(pt)}
              </option>
            ))}
          </select>
        </div>

        {/* Status filter pills */}
        <div className="flex rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden h-10">
          {([
            { value: "all",       label: "All"       },
            { value: "active",    label: "Active"    },
            { value: "pending",   label: "Pending"   },
            { value: "cancelled", label: "Cancelled" },
            { value: "expired",   label: "Expired"   },
          ] as const).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStatusFilter(opt.value)}
              className={`
                flex-1 text-xs font-medium transition-colors
                border-r border-gray-200 dark:border-gray-700 last:border-r-0
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
                  "Policy No.",
                  "User",
                  "Product",
                  "Postcode",
                  "Asset Value",
                  "Premium",
                  "Limit",
                  "Excess",
                  "Status",
                  "Created",
                  "Actions",
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
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-16 text-gray-400">
                    {policies.length === 0
                      ? "No policies yet. Create your first policy to get started."
                      : "No policies match your current filters."
                    }
                  </td>
                </tr>
              ) : (
                paginatedRows.map((policy) => (
                  <tr
                    key={policy.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >

                    {/* Policy number */}
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-semibold text-[#5871A7]">
                        POL-{String(policy.id).padStart(6, "0")}
                      </span>
                    </td>

                    {/* User */}
                    <td className="px-4 py-3 max-w-[160px]">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <User
                          size={13}
                          className="text-gray-400 flex-shrink-0"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                          {policy.userid}
                        </span>
                      </div>
                    </td>

                    {/* Product type */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs bg-[#5871A7]/10 text-[#5871A7] px-2 py-0.5 rounded-full font-medium">
                        {formatProductType(policy.productType)}
                      </span>
                    </td>

                    {/* Postcode */}
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-1.5 py-0.5 rounded tracking-widest">
                        {policy.postcode}
                      </span>
                    </td>

                    {/* Asset value */}
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-300">
                      {fmtGBP(policy.asset_value)}
                    </td>

                    {/* Premium */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-semibold text-gray-800 dark:text-white">
                        {fmtGBP(policy.premium)}
                      </span>
                      <span className="text-[10px] text-gray-400 ml-1">pa</span>
                    </td>

                    {/* Coverage limit */}
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-300">
                      {fmtGBP(policy.coverage_limit)}
                    </td>

                    {/* Excess */}
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-300">
                      {fmtGBP(policy.excess)}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <StatusBadge status={(policy.status ?? "pending") as PolicyStatus} />
                    </td>

                    {/* Created date */}
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(policy.created_at).toLocaleDateString("en-GB", {
                        day:   "2-digit",
                        month: "short",
                        year:  "numeric",
                      })}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {/* View */}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            router.push(`/dashboard/ins-policy/edit/${policy.id}`)
                          }
                          className="h-7 px-2 text-xs text-gray-500"
                          title="View policy"
                        >
                          <Eye size={12} className="mr-1" />
                          View/Download
                        </Button>

                        {/* Edit — only for non-cancelled/expired policies */}
                        {(policy.status === "active" || policy.status === "pending") && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              router.push(`/dashboard/ins-policy/edit/${policy.id}`)
                            }
                            className="h-7 px-2 text-xs border-[#5871A7] text-[#5871A7] hover:bg-[#5871A7]/10"
                            title="Edit policy"
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
              {filtered.length} polic{filtered.length !== 1 ? "ies" : "y"}
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

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if      (totalPages <= 5)        pageNum = i + 1;
                  else if (page <= 3)              pageNum = i + 1;
                  else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                  else                             pageNum = page - 2 + i;
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