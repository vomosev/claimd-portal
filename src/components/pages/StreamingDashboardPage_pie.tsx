'use client';

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import {
  ChartPie,
  BarChart2,
  Loader2,
  X,
  Search,
  Filter,
  RefreshCw,
  Music,
  Disc,
  TrendingUp,
  PieChart as PieIcon,
  LineChart as LineIcon,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────
type ReleaseType = 'all' | 'single' | 'album';
type ChartView   = 'pie' | 'line';

interface StreamingRecord {
  id:           number;
  artist:       string;
  trackTitle?:  string;
  albumTitle?:  string;
  releaseType:  'single' | 'album';
  streams:      number;
  date:         string;
  platform?:    string;
}

interface Filters {
  search:      string;
  artist:      string;
  trackTitle:  string;
  albumTitle:  string;
  dateFrom:    string;
  dateTo:      string;
  releaseType: ReleaseType;
}

interface PieEntry {
  name:  string;
  value: number;
  color: string;
}

interface LineEntry {
  date: string;
  [key: string]: string | number;
}

interface StreamingDataProps {
  username?: string;
}

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────
const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

const PIE_COLORS = [
  '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B',
  '#10B981', '#EF4444', '#06B6D4', '#F97316',
  '#6366F1', '#84CC16', '#14B8A6', '#F43F5E',
];

const LINE_COLORS = [
  '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B',
  '#10B981', '#EF4444', '#06B6D4', '#F97316',
];

const EMPTY_FILTERS: Filters = {
  search:      '',
  artist:      '',
  trackTitle:  '',
  albumTitle:  '',
  dateFrom:    '',
  dateTo:      '',
  releaseType: 'all',
};

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────
function fmtNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function buildPieData(records: StreamingRecord[]): PieEntry[] {
  const map = new Map<string, number>();
  for (const r of records) {
    const label = r.trackTitle || r.albumTitle || r.artist;
    map.set(label, (map.get(label) ?? 0) + r.streams);
  }
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([name, value], i) => ({
      name,
      value,
      color: PIE_COLORS[i % PIE_COLORS.length],
    }));
}

function buildLineData(records: StreamingRecord[]): {
  data: LineEntry[];
  keys: string[];
} {
  const dates  = [...new Set(records.map(r => r.date.slice(0, 10)))].sort();
  const labels = [
    ...new Set(records.map(r => r.trackTitle || r.albumTitle || r.artist)),
  ].slice(0, 8);

  const data: LineEntry[] = dates.map(date => {
    const entry: LineEntry = { date };
    for (const label of labels) {
      entry[label] = records
        .filter(r =>
          r.date.slice(0, 10) === date &&
          (r.trackTitle || r.albumTitle || r.artist) === label
        )
        .reduce((sum, r) => sum + r.streams, 0);
    }
    return entry;
  });

  return { data, keys: labels };
}

// ──────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────
const StatCard = ({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  icon:  React.ElementType;
  color: string;
}) => (
  <div className="bg-white dark:bg-[#151E3A] dark:border dark:border-[#2D385B] rounded-xl shadow-sm p-5 flex items-center gap-4">
    <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
      <Icon size={20} className="text-white" />
    </div>
    <div>
      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">
        {label}
      </p>
      <p className="text-2xl font-bold text-gray-800 dark:text-white mt-0.5">
        {value}
      </p>
    </div>
  </div>
);

const EmptyState = ({
  message,
  isError,
  onRetry,
}: {
  message:  string;
  isError?: boolean;
  onRetry?: () => void;
}) => (
  <div className="flex flex-col items-center justify-center py-20 gap-4">
    <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
      isError
        ? 'bg-red-100 dark:bg-red-900/30 text-red-500'
        : 'bg-gray-100 dark:bg-[#1A2235] text-gray-400'
    }`}>
      {isError ? <AlertCircle size={26} /> : <BarChart2 size={26} />}
    </div>
    <p className="text-gray-500 dark:text-gray-400 text-sm text-center max-w-xs">
      {message}
    </p>
    {onRetry && (
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw size={14} className="mr-2" />
        Retry
      </Button>
    )}
  </div>
);

const ChartTabs = ({
  active,
  onChange,
}: {
  active:   ChartView;
  onChange: (v: ChartView) => void;
}) => (
  <div className="flex gap-1 p-1 bg-gray-100 dark:bg-[#1A2235] rounded-lg w-fit">
    {([
      { id: 'pie',  icon: PieIcon,  label: 'Pie Chart'  },
      { id: 'line', icon: LineIcon, label: 'Line Graph' },
    ] as { id: ChartView; icon: React.ElementType; label: string }[]).map(tab => (
      <button
        key={tab.id}
        type="button"
        onClick={() => onChange(tab.id)}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors
          ${active === tab.id
            ? 'bg-white dark:bg-[#151E3A] text-blue-600 dark:text-blue-400 shadow-sm'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }
        `}
      >
        <tab.icon size={15} />
        {tab.label}
      </button>
    ))}
  </div>
);

const CustomPieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0].payload;
  return (
    <div className="bg-white dark:bg-[#1A2235] border border-gray-200 dark:border-[#2D385B] rounded-lg px-3 py-2 shadow-lg text-sm">
      <p className="font-medium text-gray-800 dark:text-white">{name}</p>
      <p className="text-blue-600 dark:text-blue-400">{fmtNumber(value)} streams</p>
    </div>
  );
};

const CustomLineTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-[#1A2235] border border-gray-200 dark:border-[#2D385B] rounded-lg px-3 py-2 shadow-lg text-sm min-w-[160px]">
      <p className="font-medium text-gray-600 dark:text-gray-300 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }} className="text-xs">
          {p.dataKey}: {fmtNumber(p.value)}
        </p>
      ))}
    </div>
  );
};

// ──────────────────────────────────────────────
// Pie label renderer — typed correctly to avoid
// "name is possibly undefined" TS error
// ──────────────────────────────────────────────
interface PieLabelProps {
  name?:    string;
  percent?: number;
}

function renderPieLabel({ name, percent }: PieLabelProps): string {
  if (!name || percent == null) return '';
  const truncated = name.length > 14 ? `${name.slice(0, 14)}…` : name;
  return `${truncated} (${(percent * 100).toFixed(1)}%)`;
}

// ──────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────
const StreamingDashboard = ({ username: propUsername }: StreamingDataProps) => {

  const [currentUsername, setCurrentUsername] = useState('');

  useEffect(() => {
    const stored = propUsername || localStorage.getItem('username') || '';
    setCurrentUsername(stored);
  }, [propUsername]);

  const [records,    setRecords]    = useState<StreamingRecord[]>([]);
  const [isLoading,  setIsLoading]  = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  const [filters,     setFilters]     = useState<Filters>(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);

  const activeFilterCount =
    [filters.artist, filters.trackTitle, filters.albumTitle, filters.dateFrom, filters.dateTo]
      .filter(Boolean).length +
    (filters.releaseType !== 'all' ? 1 : 0);

  const [chartView, setChartView] = useState<ChartView>('pie');

  const pieData  = buildPieData(records);
  const lineData = buildLineData(records);

  const totalStreams = records.reduce((s, r) => s + r.streams, 0);
  const totalTracks  = new Set(records.map(r => r.trackTitle || r.albumTitle)).size;
  const totalSingles = records.filter(r => r.releaseType === 'single').length;
  const totalAlbums  = records.filter(r => r.releaseType === 'album').length;

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params: Record<string, string> = { username: currentUsername };

      if (filters.search)                    params.search      = filters.search;
      if (filters.artist)                    params.artist      = filters.artist;
      if (filters.trackTitle)                params.trackTitle  = filters.trackTitle;
      if (filters.albumTitle)                params.albumTitle  = filters.albumTitle;
      if (filters.dateFrom)                  params.dateFrom    = filters.dateFrom;
      if (filters.dateTo)                    params.dateTo      = filters.dateTo;
      if (filters.releaseType !== 'all')     params.releaseType = filters.releaseType;

      const res = await axios.get(`${API_URL}/streamingdata_pie`, { params });
      const raw = Array.isArray(res.data)
        ? res.data
        : res.data?.data || res.data?.records || [];

      setRecords(raw);
      setHasFetched(true);
    } catch (err: any) {
      setError(
        err?.response?.data?.error   ||
        err?.response?.data?.message ||
        'Failed to load streaming data. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [currentUsername, filters]);

  // useEffect(() => {
  //   if (currentUsername) fetchData();
  // }, [currentUsername]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateFilter = (key: keyof Filters, value: string) =>
    setFilters(prev => ({ ...prev, [key]: value }));

  const clearFilters = () => setFilters(EMPTY_FILTERS);

  // ──────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────
  return (
    <div className="lg:w-[85%] space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold mb-1 flex items-center gap-3">
            {/* <ChartPie className="text-blue-600 dark:text-blue-400" size={28} /> */}
            Streams Pie Chart
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Type in at least one search criteria to view streaming data for your singles and albums
            {/* {currentUsername && (
              <span className="ml-1 text-gray-400 dark:text-gray-500">
                · <span className="font-medium text-gray-600 dark:text-gray-300">{currentUsername}</span>
              </span>
            )} */}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={fetchData}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          Refresh
        </Button>
      </div>

      {/* ── Search + filter bar ──────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#151E3A] dark:border dark:border-[#2D385B] rounded-xl shadow-sm p-4 space-y-4">
        <div className="flex items-center gap-3 flex-wrap">

          {/* Global search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={filters.search}
              onChange={e => updateFilter('search', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchData()}
              placeholder="Search artist, track or album..."
              className="
                w-full pl-9 pr-4 py-2.5 rounded-lg border
                border-gray-300 dark:border-[#2D385B]
                bg-gray-50 dark:bg-[#1A2235]
                text-gray-900 dark:text-white text-sm
                placeholder-gray-400 dark:placeholder-gray-500
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              "
            />
            {filters.search && (
              <button
                type="button"
                onClick={() => updateFilter('search', '')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Release type toggle */}
          <div className="flex gap-1 p-1 bg-gray-100 dark:bg-[#1A2235] rounded-lg">
            {(['all', 'single', 'album'] as ReleaseType[]).map(type => (
              <button
                key={type}
                type="button"
                onClick={() => updateFilter('releaseType', type)}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors
                  ${filters.releaseType === type
                    ? 'bg-white dark:bg-[#151E3A] text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }
                `}
              >
                {type === 'single'  && <Music    size={12} />}
                {type === 'album'   && <Disc     size={12} />}
                {type === 'all'     && <BarChart2 size={12} />}
                {type === 'all' ? 'All' : type === 'single' ? 'Singles' : 'Albums'}
              </button>
            ))}
          </div>

          {/* Advanced filters toggle */}
          <button
            type="button"
            onClick={() => setShowFilters(v => !v)}
            className={`
              flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors
              ${showFilters || activeFilterCount > 0
                ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-300 dark:border-[#2D385B] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1A2235]'
              }
            `}
          >
            <Filter size={14} />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-0.5 w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Apply */}
          <Button
            type="button"
            size="sm"
            onClick={fetchData}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isLoading
              ? <Loader2 size={14} className="animate-spin mr-1.5" />
              : <Search  size={14} className="mr-1.5" />
            }
            Apply
          </Button>
        </div>

        {/* Advanced filters */}
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-gray-100 dark:border-[#2D385B]">

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                Artist
              </label>
              <input
                type="text"
                value={filters.artist}
                onChange={e => updateFilter('artist', e.target.value)}
                placeholder="e.g. The Weeknd"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-[#2D385B] bg-gray-50 dark:bg-[#1A2235] text-gray-900 dark:text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                Track Title
              </label>
              <input
                type="text"
                value={filters.trackTitle}
                onChange={e => updateFilter('trackTitle', e.target.value)}
                placeholder="e.g. Blinding Lights"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-[#2D385B] bg-gray-50 dark:bg-[#1A2235] text-gray-900 dark:text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                Album Title
              </label>
              <input
                type="text"
                value={filters.albumTitle}
                onChange={e => updateFilter('albumTitle', e.target.value)}
                placeholder="e.g. After Hours"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-[#2D385B] bg-gray-50 dark:bg-[#1A2235] text-gray-900 dark:text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                Date Range
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Calendar size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={e => updateFilter('dateFrom', e.target.value)}
                    className="w-full pl-8 pr-2 py-2 rounded-lg border border-gray-300 dark:border-[#2D385B] bg-gray-50 dark:bg-[#1A2235] text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <span className="text-gray-400 text-xs flex-shrink-0">to</span>
                <div className="relative flex-1">
                  <Calendar size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={e => updateFilter('dateTo', e.target.value)}
                    className="w-full pl-8 pr-2 py-2 rounded-lg border border-gray-300 dark:border-[#2D385B] bg-gray-50 dark:bg-[#1A2235] text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {activeFilterCount > 0 && (
              <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1"
                >
                  <X size={12} />
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Loading ──────────────────────────────────────────────────────── */}
      {isLoading && (
        <div className="flex items-center justify-center py-20 gap-3">
          <Loader2 className="animate-spin text-blue-500" size={24} />
          <p className="text-gray-500 dark:text-gray-400 text-sm">Loading streaming data...</p>
        </div>
      )}

      {/* ── Error ────────────────────────────────────────────────────────── */}
      {!isLoading && error && (
        <div className="bg-white dark:bg-[#151E3A] dark:border dark:border-[#2D385B] rounded-xl shadow-sm">
          <EmptyState message={error} isError onRetry={fetchData} />
        </div>
      )}

      {/* ── No data ──────────────────────────────────────────────────────── */}
      {!isLoading && !error && hasFetched && records.length === 0 && (
        <div className="bg-white dark:bg-[#151E3A] dark:border dark:border-[#2D385B] rounded-xl shadow-sm">
          <EmptyState message="No streaming data found for the selected filters or none were supplied. Try adjusting your search." />
        </div>
      )}

      {/* ── Main content ─────────────────────────────────────────────────── */}
      {!isLoading && !error && records.length > 0 && (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Streams"   value={fmtNumber(totalStreams)} icon={TrendingUp} color="bg-blue-600"   />
            <StatCard label="Tracks / Albums" value={String(totalTracks)}    icon={Music}      color="bg-purple-600" />
            <StatCard label="Single Rows"         value={String(totalSingles)}   icon={Music}      color="bg-pink-600"   />
            <StatCard label="Albums Rows"          value={String(totalAlbums)}    icon={Disc}       color="bg-amber-500"  />
          </div>

          {/* Chart panel */}
          <div className="bg-white dark:bg-[#151E3A] dark:border dark:border-[#2D385B] rounded-xl shadow-sm p-6 space-y-5">
            {/* <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                  {chartView === 'pie' ? 'Streams by Track / Album' : 'Streams Over Time'}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {records.length.toLocaleString()} records · {fmtNumber(totalStreams)} total streams
                </p>
              </div>
              <ChartTabs active={chartView} onChange={setChartView} />
            </div> */}

            {/* ── Pie chart ───────────────────────────────────────────────── */}
            {chartView === 'pie' && (
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={150}
                    innerRadius={60}
                    paddingAngle={2}
                    dataKey="value"
                    // ── Fixed: name and percent are guarded before use ──────
                    label={renderPieLabel}
                    labelLine={false}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={`cell-${i}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                  <Legend
                    formatter={(value) =>
                      <span className="text-xs text-gray-600 dark:text-gray-300">{value}</span>
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
            )}

            {/* ── Line chart ──────────────────────────────────────────────── */}
            {/* {chartView === 'line' && (
              <ResponsiveContainer width="100%" height={400}>
                <LineChart
                  data={lineData.data}
                  margin={{ top: 10, right: 20, left: 0, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" className="dark:stroke-[#2D385B]" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: '#9CA3AF' }}
                    angle={-35}
                    textAnchor="end"
                    height={60}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#9CA3AF' }}
                    tickFormatter={fmtNumber}
                    width={55}
                  />
                  <Tooltip content={<CustomLineTooltip />} />
                  <Legend
                    wrapperStyle={{ paddingTop: '16px' }}
                    formatter={(value) =>
                      <span className="text-xs text-gray-600 dark:text-gray-300">{value}</span>
                    }
                  />
                  {lineData.keys.map((key, i) => (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      stroke={LINE_COLORS[i % LINE_COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 3, fill: LINE_COLORS[i % LINE_COLORS.length] }}
                      activeDot={{ r: 5 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )} */}
          </div>

          {/* Data table */}
          <div className="bg-white dark:bg-[#151E3A] dark:border dark:border-[#2D385B] rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-[#2D385B]">
              <h2 className="font-semibold text-gray-800 dark:text-white">Raw Data</h2>
              {records.length <= 50 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Showing {records.length.toLocaleString()} records
                </p>
              )}
              {records.length > 50 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Showing first 50 of {records.length.toLocaleString()} records. Refine your filters to see more.
                </p>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-[#1A2235] border-b border-gray-100 dark:border-[#2D385B]">
                    {['Artist', 'Title', 'Type', 'Streams', 'Date', 'Platform'].map(h => (
                      <th
                        key={h}
                        className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#2D385B]">
                  {records.slice(0, 50).map(r => (
                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-[#1A2235] transition-colors">
                      <td className="px-5 py-3 font-medium text-gray-800 dark:text-white">{r.artist}</td>
                      <td className="px-5 py-3 text-gray-600 dark:text-gray-300">{r.trackTitle || r.albumTitle || '—'}</td>
                      <td className="px-5 py-3">
                        <span className={`
                          inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium
                          ${r.releaseType === 'single'
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                            : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                          }
                        `}>
                          {r.releaseType === 'single' ? <Music size={10} /> : <Disc size={10} />}
                          {r.releaseType}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-mono text-gray-700 dark:text-gray-300">{r.streams.toLocaleString()}</td>
                      <td className="px-5 py-3 text-gray-500 dark:text-gray-400">{r.date.slice(0, 10)}</td>
                      <td className="px-5 py-3 text-gray-500 dark:text-gray-400">{r.platform || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {records.length <= 50 && (
                <div className="px-5 py-3 border-t border-gray-100 dark:border-[#2D385B] text-xs text-gray-400 dark:text-gray-500">
                  Showing {records.length.toLocaleString()} records
                </div>
              )}
              {records.length > 50 && (
                <div className="px-5 py-3 border-t border-gray-100 dark:border-[#2D385B] text-xs text-gray-400 dark:text-gray-500">
                  Showing first 50 of {records.length.toLocaleString()} records. Refine your filters to see more.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default StreamingDashboard;