// components/UserIdList.tsx
"use client";

import { useState, useEffect } from "react";
import { Users, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { emailBroadcastApi } from "@/services/emailBroadcastApi";

// ── Types ──────────────────────────────────────────────────────────────────────
interface UserIdListProps {
  awardId:             string;
  onCountChange?:      (count: number)        => void;
  onRecipientsChange?: (recipients: string[]) => void;
}

const PAGE_SIZE = 10;

// ── Component ──────────────────────────────────────────────────────────────────
export default function UserIdList({
  awardId,
  onCountChange,
  onRecipientsChange,
}: UserIdListProps) {

  const [users,   setUsers]   = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [page,    setPage]    = useState(1);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!awardId) {
      setUsers([]);
      // ── explicit guards replace optional-call syntax (?.) ──────────────────
      if (onCountChange)      onCountChange(0);
      if (onRecipientsChange) onRecipientsChange([]);
      return;
    }

    const fetchUsers = async () => {
      setLoading(true);
      setError(null);
      setPage(1);

      try {
        const data = await emailBroadcastApi.getAwardClaimants(awardId);
        setUsers(data);
        if (onCountChange)      onCountChange(data.length);
        if (onRecipientsChange) onRecipientsChange(data);
      } catch {
        setError("Failed to load user list.");
        if (onCountChange)      onCountChange(0);
        if (onRecipientsChange) onRecipientsChange([]); // ← was the broken line
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [awardId]);

  const totalPages     = Math.max(1, Math.ceil(users.length / PAGE_SIZE));
  const paginatedUsers = users.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-[#5871A7]" />
          <span className="text-sm font-medium">Broadcast List</span>
          {users.length > 0 && (
            <span className="text-xs bg-[#5871A7] text-white rounded-full px-2 py-0.5">
              {users.length}
            </span>
          )}
        </div>
        {users.length > 0 && (
          <span className="text-xs text-gray-500">
            Page {page} of {totalPages}
          </span>
        )}
      </div>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div className="min-h-[120px]">

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#5871A7]" />
            <span className="ml-2 text-sm text-gray-500">Loading recipients...</span>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && users.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-gray-400">
              {awardId
                ? "No recipients found for this Drop."
                : "Select a Drop to view recipients."}
            </p>
          </div>
        )}

        {/* User rows */}
        {!loading && !error && paginatedUsers.length > 0 && (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {paginatedUsers.map((userId, index) => (
              <div
                key={`${userId}-${index}`}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <div className="w-7 h-7 rounded-full bg-[#5871A7]/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs text-[#5871A7] font-medium">
                    {userId.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                  {userId}
                </span>
              </div>
            ))}
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
          <span className="text-xs text-gray-600">
            Showing {(page - 1) * PAGE_SIZE + 1}–
            {Math.min(page * PAGE_SIZE, users.length)} of {users.length}
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

    </div>
  );
}