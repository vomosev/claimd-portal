// components/TeamUserIdList.tsx
"use client";

import { useEffect, useState } from "react";
import {
  Users, RefreshCw, Mail, Search, X,
  CheckSquare, Square, ChevronLeft, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Types ──────────────────────────────────────────────────────────────────────
interface UserRecord {
  userid:    string;
  email?:    string;
  username?: string;
}

interface TeamUserIdListProps {
  worldId:           string;
  selectedRecipient: string | null;
  onSelectRecipient: (r: string | null) => void;
  search:            string;
  onSearchChange:    (v: string) => void;
  onUsersLoaded?:    (users: UserRecord[]) => void;
}

const PAGE_SIZE = 10;

// ── Component ──────────────────────────────────────────────────────────────────
export default function TeamUserIdList({
  worldId,
  selectedRecipient,
  onSelectRecipient,
  search,
  onSearchChange,
  onUsersLoaded,
}: TeamUserIdListProps) {

  const [users,   setUsers]   = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [page,    setPage]    = useState(1);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchUsers = async (id: string) => {
    if (!id) {
      setUsers([]);
      setPage(1);
      if (onUsersLoaded) onUsersLoaded([]);
      return;
    }

    setLoading(true);
    setError(null);
    setPage(1);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/teamregistrants/${encodeURIComponent(id)}`
      );
      if (!response.ok) throw new Error("Failed to fetch registrants");

      const data = await response.json();

      const normalised: UserRecord[] = Array.isArray(data)
        ? data.map((item) =>
            typeof item === "string"
              ? { userid: item }
              : {
                  userid:   item.userid   || item.id  || "",
                  email:    item.email,
                  username: item.username,
                }
          )
        : [];

      setUsers(normalised);
      if (onUsersLoaded) onUsersLoaded(normalised);

    } catch (err) {
      console.error("Error fetching streetteam registrants:", err);
      setError("Failed to load registrants.");
      setUsers([]);
      if (onUsersLoaded) onUsersLoaded([]);
    } finally {
      setLoading(false);
    }
  };

  // ── Fetch when worldId changes ─────────────────────────────────────────────
  useEffect(() => {
    onSelectRecipient(null);
    onSearchChange("");
    fetchUsers(worldId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [worldId]);

  // ── Reset page when search changes ────────────────────────────────────────
  useEffect(() => {
    setPage(1);
  }, [search]);

  // ── Filter — same predictive approach as UserIdList ───────────────────────
  // Matches against userid, username and email so the search feels instant
  const filtered = users.filter((u) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      (u.userid   || "").toLowerCase().includes(term) ||
      (u.username || "").toLowerCase().includes(term) ||
      (u.email    || "").toLowerCase().includes(term)
    );
  });

  // ── Pagination derived values ─────────────────────────────────────────────
  const totalPages    = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated     = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-[#5871A7]" />
          <span className="text-sm font-medium">Registrant List</span>
          {users.length > 0 && (
            <span className="text-xs bg-[#5871A7] text-white rounded-full px-2 py-0.5">
              {users.length.toLocaleString()}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {users.length > 0 && (
            <span className="text-xs text-gray-500">
              Page {page} of {totalPages}
            </span>
          )}
          {worldId && (
            <button
              type="button"
              onClick={() => fetchUsers(worldId)}
              className="flex items-center gap-1 text-xs text-[#5871A7] hover:underline"
            >
              <RefreshCw size={11} />
              Refresh
            </button>
          )}
        </div>
      </div>

      {/* ── Search bar ──────────────────────────────────────────────────── */}
      {users.length > 0 && (
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by username or email…"
              className="
                w-full pl-9 pr-8 py-2 text-sm rounded-lg
                border border-gray-300 dark:border-[#2D385B]
                bg-gray-50 dark:bg-[#1A2235]
                text-gray-900 dark:text-white
                focus:outline-none focus:ring-2 focus:ring-[#5871A7]
              "
            />
            {search && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={12} />
              </button>
            )}
          </div>
          {/* Predictive result count — updates as the user types */}
          {search && (
            <p className="text-xs text-gray-400 mt-1.5 pl-1">
              {filtered.length === 0
                ? `No results for "${search}"`
                : `${filtered.length} match${filtered.length !== 1 ? "es" : ""} for "${search}"`
              }
            </p>
          )}
        </div>
      )}

      {/* ── Selected recipient hint ──────────────────────────────────────── */}
      {selectedRecipient && (
        <div className="flex items-center justify-between px-4 py-2 bg-[#5871A7]/5 dark:bg-[#5871A7]/10 border-b border-[#5871A7]/20">
          <span className="text-xs text-[#5871A7] font-medium flex items-center gap-1.5">
            <CheckSquare size={13} />
            Sending to:{" "}
            <span className="font-mono">{selectedRecipient}</span>
          </span>
          <button
            type="button"
            onClick={() => onSelectRecipient(null)}
            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
          >
            <X size={11} /> Deselect
          </button>
        </div>
      )}

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div className="min-h-[120px]">

        {/* No worldId */}
        {!worldId && (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
            <Users size={28} className="text-gray-300" />
            <p className="text-sm text-gray-400">
              Select a Dropsite above to see its registered Street Team users.
            </p>
          </div>
        )}

        {/* Loading */}
        {worldId && loading && (
          <div className="flex items-center justify-center py-8 gap-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#5871A7]" />
            <span className="text-sm text-gray-500">Loading registrants…</span>
          </div>
        )}

        {/* Error */}
        {worldId && !loading && error && (
          <div className="flex items-center justify-between px-4 py-5">
            <p className="text-sm text-red-500">{error}</p>
            <button
              type="button"
              onClick={() => fetchUsers(worldId)}
              className="flex items-center gap-1.5 text-xs text-[#5871A7] hover:underline"
            >
              <RefreshCw size={12} />
              Retry
            </button>
          </div>
        )}

        {/* No users */}
        {worldId && !loading && !error && users.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
            <Users size={28} className="text-gray-300" />
            <p className="text-sm text-gray-500">
              No registered users found for Dropsite{" "}
              <span className="font-mono font-medium">{worldId}</span>.
            </p>
          </div>
        )}

        {/* No search results */}
        {worldId && !loading && !error && users.length > 0 && filtered.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-gray-400">
              No results for "<span className="font-medium">{search}</span>"
            </p>
          </div>
        )}

        {/* User rows — paginated */}
        {!loading && !error && paginated.length > 0 && (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {paginated.map((user, index) => {
              const key        = user.userid || String(index);
              const displayId  = user.username || user.userid;
              const isSelected = selectedRecipient === displayId;
              const rowNumber  = (page - 1) * PAGE_SIZE + index + 1;

              return (
                <label
                  key={key}
                  className={`
                    flex items-center gap-3 px-4 py-2.5 cursor-pointer select-none
                    transition-colors
                    ${isSelected
                      ? "bg-[#5871A7]/8 dark:bg-[#5871A7]/15"
                      : "bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    }
                  `}
                >
                  {/* Checkbox icon */}
                  <span className="flex-shrink-0">
                    {isSelected
                      ? <CheckSquare size={16} className="text-[#5871A7]" />
                      : <Square     size={16} className="text-gray-300 dark:text-gray-600" />
                    }
                  </span>

                  {/* Hidden real checkbox */}
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={isSelected}
                    onChange={() => onSelectRecipient(isSelected ? null : displayId)}
                  />

                  {/* Avatar */}
                  <div className="w-7 h-7 rounded-full bg-[#5871A7]/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-[#5871A7]">
                      {(displayId || "?").charAt(0).toUpperCase()}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className={`
                      text-sm font-mono truncate
                      ${isSelected
                        ? "text-[#5871A7] font-semibold"
                        : "text-gray-800 dark:text-gray-200"
                      }
                    `}>
                      {displayId}
                    </p>
                    {user.email && (
                      <p className="text-xs text-gray-400 flex items-center gap-1 truncate">
                        <Mail size={10} />
                        {user.email}
                      </p>
                    )}
                  </div>

                  {/* Row number / selected badge */}
                  {isSelected ? (
                    <span className="text-[10px] bg-[#5871A7] text-white px-2 py-0.5 rounded-full flex-shrink-0">
                      Selected
                    </span>
                  ) : (
                    <span className="text-xs text-gray-300 dark:text-gray-600 flex-shrink-0">
                      #{rowNumber}
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Pagination ───────────────────────────────────────────────────── */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="h-7 px-2"
          >
            <ChevronLeft size={14} />
          </Button>

          <span className="text-xs text-gray-600 dark:text-gray-400">
            Showing {(page - 1) * PAGE_SIZE + 1}–
            {Math.min(page * PAGE_SIZE, filtered.length)} of{" "}
            {filtered.length.toLocaleString()}
            {search ? ` (filtered from ${users.length.toLocaleString()})` : ""}
          </span>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="h-7 px-2"
          >
            <ChevronRight size={14} />
          </Button>
        </div>
      )}

      {/* Overflow hint */}
      {!loading && users.length > PAGE_SIZE && totalPages <= 1 && (
        <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800">
          <p className="text-xs text-gray-400 text-center">
            Showing all {users.length.toLocaleString()} recipients
          </p>
        </div>
      )}

    </div>
  );
}