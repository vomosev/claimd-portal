// components/ShowMusic.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Music, Disc, Calendar, User, Mic2, PenLine,
  Users, Tag, Hash, Clock, ArrowLeft, Loader2,
  ImageIcon, FileAudio, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// ── Types ──────────────────────────────────────────────────────────────────────
interface AudioPath {
  filename: string;
  path:     string;
}

interface AlbumData {
  releaseType:     string;
  subgenre:        string;
  releaseDate:     string;
  featuredArtists: string[];
  songwriters:     string[];
  producers:       string[];
  others:          string[];
  collaborators:   string[];
  artworkPath:     string;
  audioPaths:      AudioPath[];
  uploadedAt:      string;
}

interface TrackData {
  title:           string;
  featuredArtists: string[];
  producers:       string[];
  songwriters:     string[];
  contributors:    string[];
}

interface DistributionRow {
  id:          number;
  Catalogue:   string;
  Artist:      string;
  Title:       string;
  Compilation: string;
  Track:       string;
  Audio:       string | null;
  EmailAddress: string;
  Genre:       string;
  ISRC:        string | null;
  ISWC:        string | null;
  Information: string | null;
  AlbumData:   string | AlbumData | null;
  TrackData:   string | TrackData | null;
}

interface ParsedTrack {
  id:          number;
  trackNumber: number;
  filename:    string;
  path:        string;
  isrc:        string | null;
  iswc:        string | null;
  trackData:   TrackData | null;
}

interface ParsedRelease {
  catalogue:       string;
  artist:          string;
  title:           string;
  genre:           string;
  subgenre:        string;
  releaseType:     string;
  releaseDate:     string;
  uploadedAt:      string;
  artworkPath:     string;
  featuredArtists: string[];
  songwriters:     string[];
  producers:       string[];
  others:          string[];
  collaborators:   string[];
  tracks:          ParsedTrack[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function parseAlbumData(raw: string | AlbumData | null): AlbumData | null {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw); } catch { return null; }
}

function parseTrackData(raw: string | TrackData | null): TrackData | null {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw); } catch { return null; }
}

function buildRelease(rows: DistributionRow[]): ParsedRelease | null {
  if (!rows.length) return null;

  // Use the first row as the release-level source
  const base      = rows[0];
  const albumData = parseAlbumData(base.AlbumData);

  // Sort rows by Track number ascending
  const sorted = [...rows].sort(
    (a, b) => Number(a.Track) - Number(b.Track)
  );

  const tracks: ParsedTrack[] = sorted.map((row, i) => {
    const ad        = parseAlbumData(row.AlbumData);
    const audioPath = ad?.audioPaths?.[i] ?? ad?.audioPaths?.[0] ?? null;

    return {
      id:          row.id,
      trackNumber: Number(row.Track),
      filename:    audioPath?.filename ?? `Track ${row.Track}`,
      path:        audioPath?.path     ?? '',
      isrc:        row.ISRC  ?? null,
      iswc:        row.ISWC  ?? null,
      trackData:   parseTrackData(row.TrackData),
    };
  });

  return {
    catalogue:       base.Catalogue,
    artist:          base.Artist,
    title:           base.Title,
    genre:           base.Genre,
    subgenre:        albumData?.subgenre    ?? '',
    releaseType:     albumData?.releaseType ?? 'album',
    releaseDate:     albumData?.releaseDate ?? '',
    uploadedAt:      albumData?.uploadedAt  ?? '',
    artworkPath:     albumData?.artworkPath ?? '',
    featuredArtists: albumData?.featuredArtists ?? [],
    songwriters:     albumData?.songwriters     ?? [],
    producers:       albumData?.producers       ?? [],
    others:          albumData?.others          ?? [],
    collaborators:   albumData?.collaborators   ?? [],
    tracks,
  };
}

function fmtDate(iso: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch { return iso; }
}

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? '';

// ── Sub-components ─────────────────────────────────────────────────────────────

/** A labelled read-only field */
function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className='text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-0.5'>
        {label}
      </p>
      <p className='text-sm text-gray-800 dark:text-gray-200'>{value}</p>
    </div>
  );
}

/** A labelled list of tags (e.g. featured artists) */
function TagList({ label, items }: { label: string; items: string[] }) {
  const clean = items.filter(Boolean);
  if (!clean.length) return null;
  return (
    <div>
      <p className='text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1'>
        {label}
      </p>
      <div className='flex flex-wrap gap-1.5'>
        {clean.map((item, i) => (
          <span
            key={i}
            className='text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Single track row — expandable to show track-level credits */
function TrackRow({ track }: { track: ParsedTrack }) {
  const [open, setOpen] = useState(false);
  const td = track.trackData;
  const hasExtras =
    td &&
    (td.featuredArtists?.filter(Boolean).length ||
      td.producers?.filter(Boolean).length ||
      td.songwriters?.filter(Boolean).length ||
      td.contributors?.filter(Boolean).length);

  return (
    <div className='rounded-lg border border-gray-200 dark:border-[#2D385B] overflow-hidden'>

      {/* ── Track header ── */}
      <div className='flex items-center gap-3 px-4 py-3 bg-blue-50 dark:bg-blue-900/20'>
        <div className='flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex-shrink-0'>
          {track.trackNumber}
        </div>
        <Music className='h-4 w-4 text-blue-500 flex-shrink-0' />
        <div className='flex-1 min-w-0'>
          <p className='text-sm font-medium truncate text-gray-800 dark:text-white'>
            {td?.title || track.filename}
          </p>
          <p className='text-xs text-gray-500 font-mono truncate'>{track.filename}</p>
        </div>

        {/* ISRC badge */}
        {track.isrc && (
          <span className='hidden sm:inline text-[10px] font-mono px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 flex-shrink-0'>
            {track.isrc}
          </span>
        )}

        {/* Expand toggle */}
        {hasExtras ? (
          <button
            type='button'
            onClick={() => setOpen((v) => !v)}
            className='p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors flex-shrink-0'
          >
            {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        ) : (
          <span className='w-6' />
        )}
      </div>

      {/* ── Track-level credits (collapsible) ── */}
      {open && hasExtras && (
        <div className='px-4 py-4 bg-white dark:bg-[#1A2235] space-y-3 border-t border-gray-100 dark:border-[#2D385B]'>
          <TagList label='Featured Artists' items={td?.featuredArtists ?? []} />
          <TagList label='Producers'        items={td?.producers       ?? []} />
          <TagList label='Songwriters'      items={td?.songwriters     ?? []} />
          <TagList label='Contributors'     items={td?.contributors    ?? []} />

          {track.isrc && (
            <Field label='ISRC' value={track.isrc} />
          )}
          {track.iswc && (
            <Field label='ISWC' value={track.iswc} />
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
interface ShowMusicProps {
  /** Pass a catalogue number directly, or it is read from the URL params */
  catalogue?: string;
}

export default function ShowMusic({ catalogue: propCatalogue }: ShowMusicProps) {
  const params  = useParams();
  const router  = useRouter();

  const catalogue =
    propCatalogue ??
    (params?.catalogue as string) ??
    (params?.id       as string) ??
    '';

  const [release,  setRelease]  = useState<ParsedRelease | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [notFound, setNotFound] = useState(false);

  // ── Fetch rows for this catalogue number ─────────────────────────────────────
  useEffect(() => {
    if (!catalogue) { setLoading(false); setNotFound(true); return; }

    const fetchRelease = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${apiUrl}/distribution/catalogue/${encodeURIComponent(catalogue)}`
        );

        if (!res.ok) { setNotFound(true); return; }

        const data: DistributionRow[] = await res.json();
        const rows = Array.isArray(data) ? data : [];

        if (!rows.length) { setNotFound(true); return; }

        setRelease(buildRelease(rows));
      } catch (err) {
        console.error('Error loading release:', err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchRelease();
  }, [catalogue]);

  // ── Loading ───────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <div className='text-center space-y-2'>
          <Loader2 className='animate-spin h-8 w-8 text-blue-500 mx-auto' />
          <p className='text-gray-500 text-sm'>Loading release…</p>
        </div>
      </div>
    );
  }

  // ── Not found ─────────────────────────────────────────────────────────────────
  if (notFound || !release) {
    return (
      <div className='lg:w-[85%] space-y-6'>
        <div className='flex items-center gap-3'>
          <Button variant='outline' size='sm' onClick={() => router.back()}>
            <ArrowLeft size={16} className='mr-1' /> Back
          </Button>
        </div>
        <div className='flex flex-col items-center justify-center min-h-[300px] gap-4'>
          <Disc size={40} className='text-gray-300' />
          <p className='text-gray-500 font-medium'>Release not found</p>
          <p className='text-gray-400 text-sm font-mono'>{catalogue}</p>
        </div>
      </div>
    );
  }

  const isAlbum = release.releaseType === 'album';

  // ── Main render ───────────────────────────────────────────────────────────────
  return (
    <div className='lg:w-[85%] space-y-8'>

      {/* ── Back button ─────────────────────────────────────────────────── */}
      <div className='flex items-center gap-3'>
        <Button variant='outline' size='sm' onClick={() => router.back()}>
          <ArrowLeft size={16} className='mr-1' /> Back
        </Button>
      </div>

      {/* ── Hero: artwork + release summary ─────────────────────────────── */}
      <div className='grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 md:gap-8 items-start'>

        {/* Artwork */}
        <div className='w-full md:w-52 flex-shrink-0'>
          {release.artworkPath ? (
            <img
              src={release.artworkPath}
              alt={`${release.title} artwork`}
              className='w-full md:w-52 aspect-square object-cover rounded-xl shadow-lg border border-gray-200 dark:border-[#2D385B]'
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className='w-full md:w-52 aspect-square rounded-xl bg-gray-100 dark:bg-[#1A2235] border border-gray-200 dark:border-[#2D385B] flex items-center justify-center'>
              <ImageIcon size={40} className='text-gray-300 dark:text-gray-600' />
            </div>
          )}
        </div>

        {/* Release info */}
        <div className='space-y-4'>

          {/* Type badge */}
          <div className='flex items-center gap-2'>
            <span className={`
              inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wide
              ${isAlbum
                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
              }
            `}>
              {isAlbum ? <Disc size={11} /> : <Music size={11} />}
              {release.releaseType}
            </span>
            {release.subgenre && (
              <span className='text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full'>
                {release.subgenre}
              </span>
            )}
          </div>

          {/* Title */}
          <div>
            <h1 className='text-xl md:text-3xl font-bold text-gray-900 dark:text-white leading-tight'>
              {release.title}
            </h1>
            <p className='text-lg text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-1.5'>
              <User size={15} className='flex-shrink-0' />
              {release.artist}
            </p>
          </div>

          {/* Key metadata grid */}
          <div className='grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3'>
            <div className='flex items-start gap-2'>
              <Hash size={14} className='text-gray-400 mt-0.5 flex-shrink-0' />
              <div>
                <p className='text-[10px] text-gray-400 uppercase tracking-wide'>Catalogue</p>
                <p className='text-sm font-mono font-medium text-gray-800 dark:text-gray-200'>
                  {release.catalogue}
                </p>
              </div>
            </div>

            <div className='flex items-start gap-2'>
              <Tag size={14} className='text-gray-400 mt-0.5 flex-shrink-0' />
              <div>
                <p className='text-[10px] text-gray-400 uppercase tracking-wide'>Genre</p>
                <p className='text-sm text-gray-800 dark:text-gray-200'>{release.genre}</p>
              </div>
            </div>

            <div className='flex items-start gap-2'>
              <Calendar size={14} className='text-gray-400 mt-0.5 flex-shrink-0' />
              <div>
                <p className='text-[10px] text-gray-400 uppercase tracking-wide'>Release Date</p>
                <p className='text-sm text-gray-800 dark:text-gray-200'>
                  {fmtDate(release.releaseDate)}
                </p>
              </div>
            </div>

            <div className='flex items-start gap-2'>
              <FileAudio size={14} className='text-gray-400 mt-0.5 flex-shrink-0' />
              <div>
                <p className='text-[10px] text-gray-400 uppercase tracking-wide'>Tracks</p>
                <p className='text-sm text-gray-800 dark:text-gray-200'>{release.tracks.length}</p>
              </div>
            </div>

            {release.uploadedAt && (
              <div className='flex items-start gap-2'>
                <Clock size={14} className='text-gray-400 mt-0.5 flex-shrink-0' />
                <div>
                  <p className='text-[10px] text-gray-400 uppercase tracking-wide'>Submitted</p>
                  <p className='text-sm text-gray-800 dark:text-gray-200'>
                    {fmtDate(release.uploadedAt)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Release-level credits */}
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2'>
            <TagList label='Featured Artists' items={release.featuredArtists} />
            <TagList label='Songwriters'      items={release.songwriters}     />
            <TagList label='Producers'        items={release.producers}       />
            <TagList label='Collaborators'    items={release.collaborators}   />
            <TagList label='Others'           items={release.others}          />
          </div>

        </div>
      </div>

      {/* ── Divider ─────────────────────────────────────────────────────── */}
      <hr className='border-[#D4D8EA] dark:border-[#2E4066]' />

      {/* ── Track listing ────────────────────────────────────────────────── */}
      <div className='space-y-4'>
        <h2 className='text-xl font-semibold flex items-center gap-2.5'>
          <Music className='text-blue-500' size={20} />
          {isAlbum ? 'Track Listing' : 'Track'}
          <span className='text-sm font-normal text-gray-400'>
            ({release.tracks.length} {release.tracks.length === 1 ? 'track' : 'tracks'})
          </span>
        </h2>

        {/* <p className='text-sm text-gray-500 dark:text-gray-400'>
          Click the{' '}
          <ChevronDown size={13} className='inline' />{' '}
          icon on a track to expand its credits.
        </p> */}

        <div className='space-y-3'>
          {release.tracks.map((track) => (
            <TrackRow key={track.id} track={track} />
          ))}
        </div>
      </div>

    </div>
  );
}