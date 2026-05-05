'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { X, Music, Image, Upload, Plus, Minus } from 'lucide-react';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────
type ReleaseType = 'single' | 'album';

interface TrackMeta {
  title:           string;
  featuredArtists: string[];
  producers:       string[];
  songwriters:     string[];
  contributors:    string[];
}

interface MusicFormData {
  releaseType:     ReleaseType;
  title:           string;
  releaseDate:     string;
  artist:          string;
  featuredArtists: string[];
  genre:           string;
  subgenre:        string;
  songwriters:     string[];
  producers:       string[];
  others:          string[];
  collaborators:   string[];
  artworkFile:     File | null;
  audioFiles:      File[];
}

interface ValidationErrors {
  [key: string]: string;
}

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────
const GENRES = [
  'Pop', 'Rock', 'Hip-Hop', 'R&B', 'Electronic', 'Dance',
  'Jazz', 'Classical', 'Country', 'Folk', 'Soul', 'Reggae',
  'Metal', 'Punk', 'Blues', 'Latin', 'Alternative', 'Indie',
  'Gospel', 'World', 'Ambient', 'Other'
];

const SUBGENRES: Record<string, string[]> = {
  'Pop':        ['Synth-Pop', 'Indie Pop', 'Dream Pop', 'Art Pop', 'K-Pop', 'Power Pop'],
  'Rock':       ['Classic Rock', 'Hard Rock', 'Progressive Rock', 'Psychedelic Rock', 'Garage Rock'],
  'Hip-Hop':    ['Trap', 'Boom Bap', 'Lo-fi Hip-Hop', 'Drill', 'Cloud Rap', 'Conscious Hip-Hop'],
  'R&B':        ['Contemporary R&B', 'Neo Soul', 'Quiet Storm', 'New Jack Swing'],
  'Electronic': ['House', 'Techno', 'Drum and Bass', 'Dubstep', 'Ambient', 'IDM', 'Trance'],
  'Dance':      ['EDM', 'Disco', 'Electro', 'Nu-Disco', 'Tech House'],
  'Jazz':       ['Bebop', 'Cool Jazz', 'Fusion', 'Swing', 'Free Jazz', 'Smooth Jazz'],
  'Classical':  ['Baroque', 'Romantic', 'Contemporary Classical', 'Minimalism', 'Opera'],
  'Country':    ['Bluegrass', 'Outlaw Country', 'Country Pop', 'Alt-Country', 'Country Rock'],
  'Folk':       ['Contemporary Folk', 'Folk Rock', 'Celtic Folk', 'Anti-Folk'],
  'Metal':      ['Heavy Metal', 'Death Metal', 'Black Metal', 'Thrash Metal', 'Doom Metal'],
  'Other':      ['Other']
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://nodejs.gridiron-app.com';

// ──────────────────────────────────────────────
// Default track meta factory
// ──────────────────────────────────────────────
const defaultTrackMeta = (): TrackMeta => ({
  title:           '',
  featuredArtists: [],
  producers:       [],
  songwriters:     [],
  contributors:    [],
});

// ──────────────────────────────────────────────
// Helper: Dynamic string array field
// ──────────────────────────────────────────────
const StringArrayField = ({
  label,
  values,
  onChange,
  placeholder,
  small = false,
}: {
  label:        string;
  values:       string[];
  onChange:     (values: string[]) => void;
  placeholder:  string;
  small?:       boolean;
}) => {
  const addItem    = () => onChange([...values, '']);
  const removeItem = (i: number) => onChange(values.filter((_, idx) => idx !== i));
  const updateItem = (i: number, val: string) => {
    const updated = [...values];
    updated[i] = val;
    onChange(updated);
  };

  return (
    <div className={small ? 'mb-3' : 'mb-4'}>
      <label className={`block font-medium mb-1 ${small ? 'text-xs text-gray-600 dark:text-gray-400' : 'text-sm'}`}>
        {label}
      </label>
      {values.map((val, i) => (
        <div key={i} className='flex gap-2 mb-1'>
          <input
            type='text'
            value={val}
            onChange={(e) => updateItem(i, e.target.value)}
            placeholder={placeholder}
            className={`flex-1 rounded-lg border border-gray-300 dark:border-[#2D385B]
              bg-white dark:bg-[#0F1628] text-gray-900 dark:text-white
              focus:ring-2 focus:ring-blue-500 focus:border-transparent
              ${small ? 'px-3 py-1.5 text-sm' : 'px-4 py-2'}`}
          />
          <button
            type='button'
            onClick={() => removeItem(i)}
            className={`text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors
              ${small ? 'p-1.5' : 'p-2'}`}
          >
            <Minus className={small ? 'h-3 w-3' : 'h-4 w-4'} />
          </button>
        </div>
      ))}
      <button
        type='button'
        onClick={addItem}
        className={`flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline mt-1
          ${small ? 'text-xs' : 'text-sm gap-2'}`}
      >
        <Plus className={small ? 'h-3 w-3' : 'h-4 w-4'} />
        Add {label}
      </button>
    </div>
  );
};

// ──────────────────────────────────────────────
// Track Meta Card (album only)
// ──────────────────────────────────────────────
const TrackMetaCard = ({
  index,
  file,
  meta,
  onUpdate,
  onRemove,
}: {
  index:    number;
  file:     File;
  meta:     TrackMeta;
  onUpdate: (index: number, updated: TrackMeta) => void;
  onRemove: (index: number) => void;
}) => {
  const updateMeta = (field: keyof TrackMeta, value: any) => {
    onUpdate(index, { ...meta, [field]: value });
  };

  return (
    <div className='p-4 bg-gray-50 dark:bg-[#1A2235] rounded-lg border border-gray-200 dark:border-[#2D385B]'>

      {/* ── File header ── */}
      <div className='flex items-center gap-3 mb-4'>
        <div className='flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold flex-shrink-0'>
          {index + 1}
        </div>
        <Music className='h-4 w-4 text-blue-500 flex-shrink-0' />
        <div className='flex-1 min-w-0'>
          <p className='text-sm font-medium truncate'>{file.name}</p>
          <p className='text-xs text-gray-500'>{(file.size / 1024 / 1024).toFixed(1)} MB</p>
        </div>
        <button
          type='button'
          onClick={() => onRemove(index)}
          className='p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors flex-shrink-0'
        >
          <X className='h-4 w-4' />
        </button>
      </div>

      {/* ── Track title ── */}
      <div className='mb-3'>
        <label className='block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1'>
          Track Title <span className='text-red-500'>*</span>
        </label>
        <input
          type='text'
          value={meta.title}
          onChange={(e) => updateMeta('title', e.target.value)}
          placeholder={`e.g. Track ${index + 1} title`}
          className='w-full px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-[#2D385B]
            bg-white dark:bg-[#0F1628] text-gray-900 dark:text-white
            focus:ring-2 focus:ring-blue-500 focus:border-transparent'
        />
      </div>

      {/* ── Track-level credits ── */}
      <StringArrayField
        small
        label='Featured Artists'
        values={meta.featuredArtists}
        onChange={(v) => updateMeta('featuredArtists', v)}
        placeholder='e.g. Drake'
      />

      <StringArrayField
        small
        label='Producers'
        values={meta.producers}
        onChange={(v) => updateMeta('producers', v)}
        placeholder='e.g. Metro Boomin'
      />

      <StringArrayField
        small
        label='Songwriters'
        values={meta.songwriters}
        onChange={(v) => updateMeta('songwriters', v)}
        placeholder='e.g. John Lennon'
      />

      <StringArrayField
        small
        label='Contributors'
        values={meta.contributors}
        onChange={(v) => updateMeta('contributors', v)}
        placeholder='e.g. Mixing Engineer'
      />

    </div>
  );
};

// ──────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────
const MusicUploadForm = () => {
  const router = useRouter();

  const [releaseType, setReleaseType]         = useState<ReleaseType>('single');
  const [uploading, setUploading]             = useState(false);
  const [uploadProgress, setUploadProgress]   = useState(0);
  const [artworkPreview, setArtworkPreview]   = useState<string | null>(null);
  const [artworkDimensions, setArtworkDimensions] = useState<{ width: number; height: number } | null>(null);
  const [errors, setErrors]                   = useState<ValidationErrors>({});
  const [trackMeta, setTrackMeta]             = useState<TrackMeta[]>([]);

  const artworkInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef   = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<MusicFormData>({
    releaseType:     'single',
    title:           '',
    releaseDate:     '',
    artist:          '',
    featuredArtists: [],
    genre:           '',
    subgenre:        '',
    songwriters:     [],
    producers:       [],
    others:          [],
    collaborators:   [],
    artworkFile:     null,
    audioFiles:      [],
  });

  // ── Field update helper ──
  const updateField = (field: keyof MusicFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => { const e = { ...prev }; delete e[field]; return e; });
    }
  };

  // ── Track meta helpers ──
  const updateTrackMeta = (index: number, updated: TrackMeta) => {
    setTrackMeta(prev => {
      const copy  = [...prev];
      copy[index] = updated;
      return copy;
    });
  };

  // ── Artwork upload & validation ──
  const handleArtworkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setErrors(prev => ({ ...prev, artwork: 'Artwork must be a JPG or PNG file' }));
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, artwork: 'Artwork must be under 10MB' }));
      return;
    }

    const img = document.createElement('img');
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const { width, height } = img;
      URL.revokeObjectURL(url);

      if (width !== height) {
        setErrors(prev => ({ ...prev, artwork: `Artwork must be square. Your image is ${width}x${height}px` }));
        return;
      }
      if (width < 1400) {
        setErrors(prev => ({ ...prev, artwork: `Artwork must be at least 1400x1400px. Your image is ${width}x${height}px` }));
        return;
      }

      setArtworkDimensions({ width, height });
      setArtworkPreview(URL.createObjectURL(file));
      updateField('artworkFile', file);
      setErrors(prev => { const e = { ...prev }; delete e.artwork; return e; });
    };
    img.src = url;
  };

  // ── Audio file handling ──
  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (releaseType === 'single' && files.length > 1) {
      setErrors(prev => ({ ...prev, audio: 'Singles can only have one audio file' }));
      return;
    }

    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/flac', 'audio/aiff', 'audio/x-aiff'];
    const invalid    = files.find(f => !validTypes.includes(f.type));
    if (invalid) {
      setErrors(prev => ({ ...prev, audio: `Invalid file type: ${invalid.name}. Use MP3, WAV, FLAC or AIFF` }));
      return;
    }

    updateField('audioFiles', [...formData.audioFiles, ...files]);

    // Add a default meta entry for each new file (album only)
    if (releaseType === 'album') {
      setTrackMeta(prev => [...prev, ...files.map(() => defaultTrackMeta())]);
    }

    if (errors.audio) {
      setErrors(prev => { const e = { ...prev }; delete e.audio; return e; });
    }
  };

  const removeAudioFile = (index: number) => {
    updateField('audioFiles', formData.audioFiles.filter((_, i) => i !== index));
    if (releaseType === 'album') {
      setTrackMeta(prev => prev.filter((_, i) => i !== index));
    }
  };

  // ── Validation ──
  const validate = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (!formData.title.trim())       newErrors.title      = 'Title is required';
    if (!formData.artist.trim())      newErrors.artist     = 'Artist name is required';
    if (!formData.genre)              newErrors.genre      = 'Genre is required';
    if (!formData.artworkFile)        newErrors.artwork    = 'Artwork is required';
    if (formData.audioFiles.length === 0) newErrors.audio  = 'At least one audio file is required';
    if (releaseType === 'album' && formData.audioFiles.length < 2)
      newErrors.audio = 'Albums must have at least 2 tracks';

    if (!formData.releaseDate) {
      newErrors.releaseDate = 'Release date is required';
    } else {
      const minDate    = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
      const chosenDate = new Date(formData.releaseDate);
      if (chosenDate < minDate) newErrors.releaseDate = 'Release date must be at least 5 days from today';
    }

    // Validate each album track has a title
    if (releaseType === 'album') {
      trackMeta.forEach((meta, i) => {
        if (!meta.title.trim()) {
          newErrors[`track_title_${i}`] = `Track ${i + 1} title is required`;
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Submit ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      toast.error('Please fix the errors before submitting');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const data = new FormData();

      data.append('releaseType',     releaseType);
      data.append('title',           formData.title);
      data.append('artist',          formData.artist);
      data.append('genre',           formData.genre);
      data.append('subgenre',        formData.subgenre);
      data.append('releaseDate',     formData.releaseDate);
      data.append('featuredArtists', JSON.stringify(formData.featuredArtists.filter(Boolean)));
      data.append('songwriters',     JSON.stringify(formData.songwriters.filter(Boolean)));
      data.append('producers',       JSON.stringify(formData.producers.filter(Boolean)));
      data.append('others',          JSON.stringify(formData.others.filter(Boolean)));
      data.append('collaborators',   JSON.stringify(formData.collaborators.filter(Boolean)));

      // Track-level meta (album only)
      if (releaseType === 'album') {
        data.append('trackMeta', JSON.stringify(trackMeta));
      }

      if (formData.artworkFile) {
        data.append('artwork', formData.artworkFile);
      }

      formData.audioFiles.forEach((file) => {
        data.append('audio', file);
      });

      const route = releaseType === 'single' ? '/addsingle' : '/addalbum';

      const response = await axios.post(`${apiUrl}${route}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
          setUploadProgress(percent);
        },
      });

      if (response.data.success) {
        toast.success(`${releaseType === 'single' ? 'Single' : 'Album'} uploaded successfully!`);
        router.push('/dashboard');
      } else {
        toast.error(response.data.message || 'Upload failed');
      }

    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error?.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // ──────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────
  return (
    <div className='min-h-screen py-8'>
      <div className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8'>

        {/* Header */}
        <div className='mb-8'>
          <h1 className='text-3xl font-semibold mb-2'>Add Music</h1>
          <p className='text-gray-500 dark:text-gray-400'>
            Upload your {releaseType} to the platform
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>

            {/* ────────────────────────────────
                Left Column
            ──────────────────────────────── */}
            <div className='space-y-6'>

              {/* Release Type Toggle */}
              <div className='bg-white dark:bg-[#151E3A] dark:border dark:border-[#2D385B] rounded-xl shadow-sm p-6'>
                <h3 className='text-lg font-semibold mb-4'>Release Type</h3>
                <div className='flex gap-3'>
                  {(['single', 'album'] as ReleaseType[]).map((type) => (
                    <button
                      key={type}
                      type='button'
                      onClick={() => {
                        setReleaseType(type);
                        updateField('releaseType', type);
                        updateField('audioFiles', []);
                        setTrackMeta([]);
                      }}
                      className={`flex-1 py-3 px-4 rounded-lg font-medium capitalize transition-colors ${
                        releaseType === type
                          ? 'bg-gray-900 text-white'
                          : 'bg-gray-100 dark:bg-[#1A2235] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#2D385B]'
                      }`}
                    >
                      {type === 'single' ? 'Single' : 'Album'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Release Info */}
              <div className='bg-white dark:bg-[#151E3A] dark:border dark:border-[#2D385B] rounded-xl shadow-sm p-6'>
                <h3 className='text-lg font-semibold mb-4'>Release Info</h3>

                <div className='mb-4'>
                  <label className='block text-sm font-medium mb-2'>
                    {releaseType === 'single' ? 'Track Title' : 'Album Title'}
                    <span className='text-red-500 ml-1'>*</span>
                  </label>
                  <input
                    type='text'
                    value={formData.title}
                    onChange={(e) => updateField('title', e.target.value)}
                    placeholder={releaseType === 'single' ? 'e.g. Blinding Lights' : 'e.g. After Hours'}
                    className={`w-full px-4 py-2 rounded-lg border ${
                      errors.title ? 'border-red-500' : 'border-gray-300 dark:border-[#2D385B]'
                    } bg-white dark:bg-[#1A2235] text-gray-900 dark:text-white
                      focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  />
                  {errors.title && <p className='text-red-500 text-sm mt-1'>{errors.title}</p>}
                </div>

                <div className='mb-4'>
                  <label className='block text-sm font-medium mb-2'>
                    Release Date <span className='text-red-500'>*</span>
                  </label>
                  <input
                    type='date'
                    value={formData.releaseDate}
                    onChange={(e) => updateField('releaseDate', e.target.value)}
                    min={new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                    className={`w-full px-4 py-2 rounded-lg border ${
                      errors.releaseDate ? 'border-red-500' : 'border-gray-300 dark:border-[#2D385B]'
                    } bg-white dark:bg-[#1A2235] text-gray-900 dark:text-white
                      focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  />
                  <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                    Release date must be at least 5 days from today
                  </p>
                  {errors.releaseDate && <p className='text-red-500 text-sm mt-1'>{errors.releaseDate}</p>}
                </div>
              </div>

              {/* Artists */}
              <div className='bg-white dark:bg-[#151E3A] dark:border dark:border-[#2D385B] rounded-xl shadow-sm p-6'>
                <h3 className='text-lg font-semibold mb-4'>Artists</h3>

                <div className='mb-4'>
                  <label className='block text-sm font-medium mb-2'>
                    Artist <span className='text-red-500'>*</span>
                  </label>
                  <input
                    type='text'
                    value={formData.artist}
                    onChange={(e) => updateField('artist', e.target.value)}
                    placeholder='e.g. The Weeknd'
                    className={`w-full px-4 py-2 rounded-lg border ${
                      errors.artist ? 'border-red-500' : 'border-gray-300 dark:border-[#2D385B]'
                    } bg-white dark:bg-[#1A2235] text-gray-900 dark:text-white
                      focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  />
                  {errors.artist && <p className='text-red-500 text-sm mt-1'>{errors.artist}</p>}
                </div>

                <StringArrayField
                  label='Featured Artists'
                  values={formData.featuredArtists}
                  onChange={(v) => updateField('featuredArtists', v)}
                  placeholder='e.g. Drake'
                />
              </div>

              {/* Genre */}
              <div className='bg-white dark:bg-[#151E3A] dark:border dark:border-[#2D385B] rounded-xl shadow-sm p-6'>
                <h3 className='text-lg font-semibold mb-4'>Genre</h3>

                <div className='mb-4'>
                  <label className='block text-sm font-medium mb-2'>
                    Genre <span className='text-red-500'>*</span>
                  </label>
                  <select
                    value={formData.genre}
                    onChange={(e) => {
                      updateField('genre', e.target.value);
                      updateField('subgenre', '');
                    }}
                    className={`w-full px-4 py-2 rounded-lg border ${
                      errors.genre ? 'border-red-500' : 'border-gray-300 dark:border-[#2D385B]'
                    } bg-white dark:bg-[#1A2235] text-gray-900 dark:text-white
                      focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  >
                    <option value=''>Select genre...</option>
                    {GENRES.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                  {errors.genre && <p className='text-red-500 text-sm mt-1'>{errors.genre}</p>}
                </div>

                {formData.genre && SUBGENRES[formData.genre] && (
                  <div className='mb-4'>
                    <label className='block text-sm font-medium mb-2'>Subgenre</label>
                    <select
                      value={formData.subgenre}
                      onChange={(e) => updateField('subgenre', e.target.value)}
                      className='w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-[#2D385B]
                        bg-white dark:bg-[#1A2235] text-gray-900 dark:text-white
                        focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                    >
                      <option value=''>Select subgenre...</option>
                      {SUBGENRES[formData.genre].map((sg) => (
                        <option key={sg} value={sg}>{sg}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

            </div>

            {/* ────────────────────────────────
                Right Column
            ──────────────────────────────── */}
            <div className='space-y-6'>

              {/* Artwork Upload */}
              <div className='bg-white dark:bg-[#151E3A] dark:border dark:border-[#2D385B] rounded-xl shadow-sm p-6'>
                <h3 className='text-lg font-semibold mb-2'>Artwork</h3>
                <p className='text-sm text-gray-500 dark:text-gray-400 mb-4'>
                  Must be JPG or PNG, square format, minimum 1400×1400px (recommended 3000×3000px)
                </p>

                {artworkPreview ? (
                  <div className='relative mb-4'>
                    <img
                      src={artworkPreview}
                      alt='Artwork preview'
                      className='w-full aspect-square object-cover rounded-lg border-2 border-gray-200 dark:border-[#2D385B]'
                    />
                    {artworkDimensions && (
                      <div className='absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded'>
                        {artworkDimensions.width}×{artworkDimensions.height}px ✓
                      </div>
                    )}
                    <button
                      type='button'
                      onClick={() => {
                        setArtworkPreview(null);
                        setArtworkDimensions(null);
                        updateField('artworkFile', null);
                        if (artworkInputRef.current) artworkInputRef.current.value = '';
                      }}
                      className='absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600'
                    >
                      <X className='h-4 w-4' />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => artworkInputRef.current?.click()}
                    className={`w-full aspect-square flex flex-col items-center justify-center border-2 border-dashed ${
                      errors.artwork
                        ? 'border-red-400 bg-red-50 dark:bg-red-900/10'
                        : 'border-gray-300 dark:border-[#2D385B] hover:border-blue-400 dark:hover:border-blue-500'
                    } rounded-lg cursor-pointer transition-colors`}
                  >
                    <Image className='h-12 w-12 text-gray-400 mb-3' />
                    <p className='text-sm text-gray-500'>Click to upload artwork</p>
                    <p className='text-xs text-gray-400 mt-1'>JPG or PNG, square format</p>
                  </div>
                )}

                <input
                  ref={artworkInputRef}
                  type='file'
                  accept='image/jpeg,image/png'
                  onChange={handleArtworkChange}
                  className='hidden'
                />
                {errors.artwork && <p className='text-red-500 text-sm mt-2'>{errors.artwork}</p>}
              </div>

              {/* Audio Upload */}
              <div className='bg-white dark:bg-[#151E3A] dark:border dark:border-[#2D385B] rounded-xl shadow-sm p-6'>
                <h3 className='text-lg font-semibold mb-2'>
                  {releaseType === 'single' ? 'Audio File' : 'Track Files'}
                </h3>
                <p className='text-sm text-gray-500 dark:text-gray-400 mb-4'>
                  {releaseType === 'single'
                    ? 'Upload one audio file (MP3, WAV, FLAC or AIFF)'
                    : 'Upload all tracks for the album (MP3, WAV, FLAC or AIFF)'}
                </p>

                {/* ── Single: simple file row ── */}
                {releaseType === 'single' && formData.audioFiles.length > 0 && (
                  <div className='mb-4 space-y-2'>
                    {formData.audioFiles.map((file, i) => (
                      <div key={i} className='flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#1A2235] rounded-lg'>
                        <Music className='h-5 w-5 text-blue-500 flex-shrink-0' />
                        <div className='flex-1 min-w-0'>
                          <p className='text-sm font-medium truncate'>{file.name}</p>
                          <p className='text-xs text-gray-500'>{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                        </div>
                        <button
                          type='button'
                          onClick={() => removeAudioFile(i)}
                          className='p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors'
                        >
                          <X className='h-4 w-4' />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Album: track meta cards ── */}
                {releaseType === 'album' && formData.audioFiles.length > 0 && (
                  <div className='mb-4 space-y-4'>
                    {formData.audioFiles.map((file, i) => (
                      <div key={i}>
                        <TrackMetaCard
                          index={i}
                          file={file}
                          meta={trackMeta[i] || defaultTrackMeta()}
                          onUpdate={updateTrackMeta}
                          onRemove={removeAudioFile}
                        />
                        {errors[`track_title_${i}`] && (
                          <p className='text-red-500 text-xs mt-1 ml-1'>
                            {errors[`track_title_${i}`]}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type='button'
                  onClick={() => audioInputRef.current?.click()}
                  disabled={releaseType === 'single' && formData.audioFiles.length >= 1}
                  className='w-full py-3 border-2 border-dashed border-gray-300 dark:border-[#2D385B]
                    hover:border-blue-400 dark:hover:border-blue-500 rounded-lg
                    flex items-center justify-center gap-2 text-sm text-gray-500
                    disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                >
                  <Upload className='h-4 w-4' />
                  {releaseType === 'single' ? 'Select Audio File' : 'Add Track'}
                </button>

                <input
                  ref={audioInputRef}
                  type='file'
                  accept='audio/mpeg,audio/wav,audio/flac,audio/aiff,audio/x-aiff'
                  multiple={releaseType === 'album'}
                  onChange={handleAudioChange}
                  className='hidden'
                />
                {errors.audio && <p className='text-red-500 text-sm mt-2'>{errors.audio}</p>}
              </div>

              {/* Release-level Credits */}
              <div className='bg-white dark:bg-[#151E3A] dark:border dark:border-[#2D385B] rounded-xl shadow-sm p-6'>
                <h3 className='text-lg font-semibold mb-1'>
                  {releaseType === 'album' ? 'Album Credits' : 'Credits'}
                </h3>
                {releaseType === 'album' && (
                  <p className='text-xs text-gray-500 dark:text-gray-400 mb-4'>
                    These apply to the whole album. Track-level credits are entered above on each track.
                  </p>
                )}

                <StringArrayField
                  label='Songwriters'
                  values={formData.songwriters}
                  onChange={(v) => updateField('songwriters', v)}
                  placeholder='e.g. John Lennon'
                />
                <StringArrayField
                  label='Producers'
                  values={formData.producers}
                  onChange={(v) => updateField('producers', v)}
                  placeholder='e.g. Rick Rubin'
                />
                <StringArrayField
                  label='Collaborators'
                  values={formData.collaborators}
                  onChange={(v) => updateField('collaborators', v)}
                  placeholder='e.g. Session musician'
                />
                <StringArrayField
                  label='Others'
                  values={formData.others}
                  onChange={(v) => updateField('others', v)}
                  placeholder='e.g. Mixing Engineer'
                />
              </div>

            </div>
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className='mt-6 bg-white dark:bg-[#151E3A] dark:border dark:border-[#2D385B] rounded-xl shadow-sm p-6'>
              <p className='text-sm font-medium mb-2'>
                Uploading {releaseType === 'single' ? 'single' : 'album'}... {uploadProgress}%
              </p>
              <div className='w-full bg-gray-200 dark:bg-[#2D385B] rounded-full h-2'>
                <div
                  className='bg-blue-600 h-2 rounded-full transition-all duration-300'
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Submit */}
          <div className='mt-8 flex gap-4'>
            <Button
              type='button'
              variant='outline'
              onClick={() => router.back()}
              className='px-8'
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              type='submit'
              disabled={uploading}
              className='flex-1 text-white disabled:opacity-50'
            >
              {uploading
                ? `Uploading... ${uploadProgress}%`
                : `Upload ${releaseType === 'single' ? 'Single' : 'Album'}`}
            </Button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default MusicUploadForm;