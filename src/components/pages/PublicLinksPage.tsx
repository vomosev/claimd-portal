// app/[profile]/me/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ExternalLink, Link2, Loader2 } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────
interface UrlRecord {
  id: number;
  userid: string;
  worldid?: string;
  tenant?: string;
  name: string;
  url: string;
  created_at: string;
  updated_at: string;
}

interface GroupedUrlRecord {
  groupId: number;
  worldid?: string;
  urls: UrlRecord[];
}

interface PublicLinksPageProps {
  displayName?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function groupUrls(rows: UrlRecord[]): GroupedUrlRecord[] {
  const map = new Map<string, GroupedUrlRecord>();
  for (const row of rows) {
    const key = row.worldid ? `world_${row.worldid}` : `id_${row.id}`;
    if (!map.has(key)) {
      map.set(key, { groupId: row.id, worldid: row.worldid, urls: [] });
    }
    map.get(key)!.urls.push(row);
  }
  return Array.from(map.values());
}

function bkgUrl(worldid?: string) {
  if (!worldid) return `https://nodejs.gridiron-app.com/images/bkg_${process.env.NEXT_PUBLIC_WORLDID}.png`;
  return `https://nodejs.gridiron-app.com/images/bkg_${worldid}.png`;
}

// ── Main public page ───────────────────────────────────────────────────────────
export default function PublicLinksPage({ displayName }: PublicLinksPageProps) {
  const params  = useParams();
  const profile = displayName ?? (params?.profile as string) ?? "";

  const [groups, setGroups]     = useState<GroupedUrlRecord[]>([]);
  const [loading, setLoading]   = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [bgImgError, setBgImgError] = useState(false);

  // ── Fetch URLs ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!profile) return;

    const fetchUrls = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/dpurls?displayname=${encodeURIComponent(profile)}`
        );
        if (!res.ok) throw new Error("not found");

        const data: UrlRecord[] = await res.json();
        const grouped = groupUrls(Array.isArray(data) ? data : []);

        if (grouped.length === 0) {
          setNotFound(true);
        } else {
          setGroups(grouped);
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchUrls();
  }, [profile]);

  // ── Derived background ───────────────────────────────────────────────────────
  const primaryBg   = bkgUrl(groups[0]?.worldid);
  const resolvedBg  = primaryBg && !bgImgError ? primaryBg : null;

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f1220]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin h-8 w-8 text-white/40" />
          <p className="text-white/30 text-sm tracking-widest uppercase">
            Loading
          </p>
        </div>
      </div>
    );
  }

  // ── Not found ────────────────────────────────────────────────────────────────
  if (notFound || groups.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a1f35] via-[#2a3050] to-[#0f1220]">
        <div className="text-center space-y-3">
          <div className="text-5xl mb-2">🔗</div>
          <p className="text-white/60 font-medium text-lg">No links found</p>
          <p className="text-white/30 text-sm">
            @{profile} hasn&apos;t added any links yet.
          </p>
        </div>
      </div>
    );
  }

  // ── Main render ──────────────────────────────────────────────────────────────
  return (
    <div className="relative min-h-screen flex flex-col items-center overflow-hidden">

      {/* ── Full-page blurred background ──────────────────────────────────── */}
      {resolvedBg ? (
        <>
          <div
            className="fixed inset-0 bg-cover bg-center scale-110"
            style={{
              backgroundImage: `url(${resolvedBg})`,
              filter: "blur(28px)",
              WebkitFilter: "blur(28px)",
            }}
          />
          <div className="fixed inset-0 bg-black/55" />
        </>
      ) : (
        <div className="fixed inset-0 bg-gradient-to-br from-[#1a1f35] via-[#2a3050] to-[#0f1220]" />
      )}

      {/* ── Foreground ────────────────────────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-md mx-auto px-4 py-16 flex flex-col items-center gap-6">

        {/* ── Avatar ──────────────────────────────────────────────────────── */}
        <div className="relative">
          {/* Glow ring */}
          <div className="absolute inset-0 rounded-full bg-white/20 blur-xl scale-110" />
          <div className="relative w-56 h-56 rounded-full border-4 border-white/30 overflow-hidden shadow-2xl bg-white/10 backdrop-blur-md flex items-center justify-center">
            {resolvedBg ? (
              <img
                src={process.env.NEXT_PUBLIC_LOGO_PATH || resolvedBg}
                alt={profile}
                className="w-full h-full object-cover"
                onError={() => setBgImgError(true)}
              />
            ) : (
              <Link2 size={36} className="text-white/60" />
            )}
          </div>
        </div>

        {/* ── Username ────────────────────────────────────────────────────── */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white tracking-wide drop-shadow-lg">
            @{profile}
          </h1>
        </div>

        {/* ── All groups stacked vertically ───────────────────────────────── */}
        <div className="w-full flex flex-col gap-8">
          {groups.map((group) => (
            <div key={group.groupId} className="flex flex-col gap-3">

              {/* Group label — only shown when a worldid exists */}
              {group.worldid && (
                <p className="text-white/40 text-xs font-mono tracking-widest uppercase text-center">
                  {group.worldid}
                </p>
              )}

              {/* Link buttons */}
              {group.urls.map((entry) => (
                <a
                  key={entry.id}
                  href={entry.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="
                    group relative w-full flex items-center justify-between
                    rounded-2xl px-5 py-4
                    bg-white/10 hover:bg-white/20
                    backdrop-blur-md
                    border border-white/20 hover:border-white/40
                    text-white font-medium text-sm
                    shadow-lg hover:shadow-white/10
                    transition-all duration-200 ease-out
                    hover:-translate-y-0.5 hover:scale-[1.01]
                    active:scale-[0.99]
                  "
                >
                  {/* Link name */}
                  <span className="truncate pr-4">{entry.name}</span>

                  {/* Arrow icon */}
                  <ExternalLink
                    size={15}
                    className="flex-shrink-0 text-white/50 group-hover:text-white transition-colors"
                  />

                  {/* Shimmer sweep on hover */}
                  <span className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
                </a>
              ))}

            </div>
          ))}
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <p className="text-white/25 text-sm mt-4 tracking-widest">
          {process.env.NEXT_PUBLIC_DNSPREFIX}/geo-drops.com/{profile}/me
        </p>

      </div>
    </div>
  );
}