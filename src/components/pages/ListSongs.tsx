"use client";

import React, { useEffect, useState } from "react";
import { Songs, geoDropsApi } from "@/services/api";
import { Loader2, Music, ChevronsUpDown, ChevronUp, ChevronDown, ArrowUp, ArrowDown, Eye } from "lucide-react";
import { usePathname } from "next/navigation";
import { usePagination } from "@/hooks/usePagination";
import Pagination from "./Pagination";
import dynamic from 'next/dynamic';

const DistroInstructionsModal = dynamic(
  () => import('@/components/shared/DistroInstructionsModal'),
  { ssr: false }
);

const ListSongs = () => {
  const [musiclist, setSongs] = useState<Songs[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [sortField, setSortField] = useState<keyof Songs>('id');
  const [sortDir, setSortDir]     = useState<'asc' | 'desc'>('asc');

  const pathName        = usePathname();
  const currentUsername = localStorage.getItem("username") ?? "";

  const {
    currentPage,
    totalPages,
    paginatedData,
    goToPage,
    itemsPerPage,
    totalItems,
  } = usePagination({
    data: musiclist,
    itemsPerPage: 20,
    initialPage: 1,
  });

  // ── Fetch ──
  useEffect(() => {
    const fetchSongs = async () => {
      try {
        console.log('>>>>>>>>>> fetching songs for:', currentUsername);
        const response = await geoDropsApi.getAllSongs(currentUsername);
        console.log('>>>>>>>>>> response:', response);
        console.log('>>>>>>>>>> response.success:', response.success);
        console.log('>>>>>>>>>> response.data:', response.data);

        if (response.success && response.data) {
          setSongs(response.data as Songs[]);
        } else {
          console.error("API call failed:", response.error);
          console.error("Full response:", JSON.stringify(response, null, 2));
          setError("Failed to fetch songs");
        }
      } catch (err) {
        console.error("Error fetching songs:", err);
        setError("Error loading songs");
      } finally {
        setLoading(false);
      }
    };
    fetchSongs();
  }, []);

  useEffect(() => {
    goToPage(1);
  }, [musiclist]);

  // ── Sort ──
  const handleSort = (field: keyof Songs) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sortedData = [...paginatedData].sort((a, b) => {
    const aVal = String(a[sortField] ?? '').toLowerCase();
    const bVal = String(b[sortField] ?? '').toLowerCase();
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDir === 'asc' ?  1 : -1;
    return 0;
  });

  const SortIcon = ({ field }: { field: keyof Songs }) => {
    if (sortField !== field) return <ChevronsUpDown size={14} className="text-blue-500 ml-1 inline-flex" />;
    return <span className="text-blue-500 ml-1 inline-flex">
      {sortDir === "asc"
        ? <ChevronUp size={14} strokeWidth={2.5} />
        : <ChevronDown size={14} strokeWidth={2.5} />
      }
    </span>;
  };
 
  // ── Column definitions ──
  const columns: { key: keyof Songs; label: string; }[] = [
    // { key: 'id',          label: 'ID'          },
    { key: 'Catalogue',   label: 'Catalogue'   },
    { key: 'Artist',      label: 'Artist'      },
    { key: 'Title',       label: 'Title'       },
    // { key: 'Track',       label: 'Track'       },
    { key: 'Genre',       label: 'Genre'       },
    { key: 'Compilation', label: 'Album' },
    { key: 'EmailAddress',label: 'Email'       },
    { key: 'Information', label: 'View' },
  ];

  // ── Loading ──
  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <div className='flex flex-col items-center gap-4'>
          <Loader2 className='h-8 w-8 animate-spin text-geodrops' />
          <p className='text-gray-600 dark:text-gray-400'>Loading Songs...</p>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div className='text-center py-12'>
        <p className='text-red-600 mb-4'>{error}</p>
        <button
          onClick={() => window.location.reload()}
          className='text-geodrops hover:underline'
        >
          Try again
        </button>
      </div>
    );
  }

  // ── Render ──
  return (
    <div>
      {Number(process.env.NEXT_PUBLIC_DISTRIBUTION) === 1 && (
        <div className='hidden md:block'>
          <DistroInstructionsModal />
        </div>
      )}

      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6'>
        <h1 className='text-xl md:text-3xl font-semibold'>View Catalogue</h1>
        {musiclist.length > 0 && (
          <p className='text-sm text-gray-600 dark:text-gray-400 mt-2 sm:mt-0'>
            {totalItems} release(s)
          </p>
        )}
      </div>

      {musiclist.length === 0 ? (
        <div className='text-center py-12'>
          <Music className='h-12 w-12 text-gray-300 mx-auto mb-4' />
          <p className='text-gray-600 dark:text-gray-400'>
            No songs available at the moment.
          </p>
        </div>
      ) : (
        <>
          {/* Table wrapper */}
          <div className='bg-white dark:bg-[#151E3A] rounded-xl shadow-sm border border-gray-200 dark:border-[#2D385B] overflow-hidden'>
            <div className='overflow-x-auto'>
              <table className='w-full text-sm'>

                {/* Head */}
                <thead>
                  <tr className='bg-gray-50 dark:bg-[#1A2235] border-b border-gray-200 dark:border-[#2D385B]'>
                    {columns.map((col) => (
                      <th
                        key={col.key}
                        onClick={() => handleSort(col.key)}
                        className='px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300
                          whitespace-nowrap cursor-pointer hover:text-blue-600 dark:hover:text-blue-400
                          select-none transition-colors'
                      >
                        {col.label}
                        <SortIcon field={col.key} />
                      </th>
                    ))}
                    {/* <th className='px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap'>
                      Audio
                    </th> */}
                  </tr>
                </thead>

                {/* Body */}
                <tbody className='divide-y divide-gray-100 dark:divide-[#2D385B]'>
                  {sortedData.map((song, idx) => (
                    <tr
                      key={song.id}
                      id={`song-${song.id}`}
                      className={`
                        transition-colors hover:bg-blue-50 dark:hover:bg-[#1F2D4A]
                        ${idx % 2 === 0
                          ? 'bg-white dark:bg-[#151E3A]'
                          : 'bg-gray-50/50 dark:bg-[#1A2235]'}
                      `}
                    >
                      {/* ID */}
                      {/* <td className='px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap'>
                        {song.id}
                      </td> */}

                      {/* Catalogue */}
                      <td className='px-4 py-3 whitespace-nowrap font-mono text-xs'>
                        {song.Catalogue ? (
                          <a
                            href={`/dashboard/show-music/${song.Catalogue}`}
                            rel="noopener noreferrer"
                            className="text-[#5871A7] hover:underline"
                          >
                            {song.Catalogue}
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>

                      {/* Artist */}
                      <td className='px-4 py-3 font-medium whitespace-nowrap'>
                        {song.Artist || '—'}
                      </td>

                      {/* Title */}
                      <td className='px-4 py-3 whitespace-nowrap'>
                        {song.Title || '—'}
                      </td>

                      {/* Track */}
                      {/* <td className='px-4 py-3 text-center whitespace-nowrap'>
                        {song.Track || '—'}
                      </td> */}

                      {/* Genre */}
                      <td className='px-4 py-3 whitespace-nowrap'>
                        {song.Genre ? (
                          <span className='inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'>
                            {song.Genre}
                          </span>
                        ) : '—'}
                      </td>

                      {/* Compilation */}
                      <td className='px-4 py-3 whitespace-nowrap'>
                        {song.Compilation ? (
                          <span className='inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'>
                            {song.Compilation}
                          </span>
                        ) : '—'}
                      </td>

                      {/* Email */}
                      <td className='px-4 py-3 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400'>
                        {song.EmailAddress || '—'}
                      </td>

                      {/* Information */}
                      <td className='px-4 py-3 whitespace-nowrap text-center'>
                        {song.Catalogue ? (
                          <a
                            href={`/dashboard/show-music/${song.Catalogue}`}
                            rel="noopener noreferrer"
                            className="text-[#5871A7] hover:underline"
                          >
                          <Eye size={12} className="mr-1" />                            
                          </a>
                        ) : (
                          ''
                        )}
                      </td>

                      {/* Audio */}
                      {/* <td className='px-4 py-3 whitespace-nowrap'>
                        {song.Audio ? (
                          <audio
                            controls
                            className='h-8 w-48'
                            src={song.Audio}
                          >
                            Your browser does not support audio.
                          </audio>
                        ) : (
                          <span className='text-gray-400 text-xs'>No audio</span>
                        )}
                      </td> */}

                    </tr>
                  ))}
                </tbody>

              </table>
            </div>
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={goToPage}
            itemsPerPage={itemsPerPage}
            totalItems={totalItems}
          />
        </>
      )}
    </div>
  );
};

export default ListSongs;