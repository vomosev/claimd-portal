'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import GeoDropCard from '../shared/GeoDropCard';
import PublicGeoDropCard from '../shared/PublicGeoDropCard';
import { Award, geoDropsApi } from '@/services/api';
import { Loader2, Search } from 'lucide-react';

const HomePage = () => {
  const [awards, setAwards] = useState<Award[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');

  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') || '';

  let currentView = "public";
  if (window.location.pathname.includes("/dashboard")) {
    currentView = "dashboard";
  }

  // Initialize search input with current query
  useEffect(() => {
    setSearchInput(query);
  }, [query]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      router.push(
        `/${currentView}/search?q=${encodeURIComponent(
          searchInput.trim().toLocaleLowerCase()
        )}`
      );
    } else {
      router.push(`/${currentView}/search`);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
  };

  // Single useEffect to handle both search and fetch all awards
  useEffect(() => {
    const fetchAwards = async () => {
      try {
        setLoading(true);
        setError(null);

        let response;

        if (query) {
          // If there's a query, search for awards
          response = await geoDropsApi.searchAwards(query);
          console.log('Search API Response:', response);
        } else {
          // If no query, fetch all awards
          console.log('Fetching all awards from API...');
          response = await geoDropsApi.getAllAwards();
          console.log('getAllAwards API Response:', response);
        }

        if (response.success && response.data) {
          setAwards(response.data as Award[]);
        } else {
          console.error('API call failed:', response.error);
          setError(
            query ? 'Failed to search awards' : 'Failed to fetch awards'
          );
        }
      } catch (err) {
        console.error('Error fetching awards:', err);
        setError(query ? 'Error searching awards' : 'Error loading awards');
      } finally {
        setLoading(false);
      }
    };

    fetchAwards();
  }, [query]);

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <div className='flex flex-col items-center gap-4'>
          <Loader2 className='h-8 w-8 animate-spin text-geodrops' />
          <p className='text-gray-600'>
            {query ? 'Searching Geo-Drops...' : 'Loading latest Drops...'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        {/* Search Field */}
        <div className='mb-8'>
          <form onSubmit={handleSearch} className='relative max-w-md'>
            <input
              type='text'
              value={searchInput}
              onChange={handleInputChange}
              placeholder='Enter a search query to find Drops'
              className='w-full pl-4 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent'
            />
            <button
              type='submit'
              className='absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-gray-400 hover:text-geodrops transition-colors'
            >
              <Search className='h-5 w-5' />
            </button>
          </form>
        </div>

        <div className='text-center py-12'>
          <p className='text-red-600 mb-4'>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className='text-geodrops hover:underline'
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className='text-3xl font-semibold'>
        {query ? `Search Results for "${query}"` : 'Find Drops'}
      </h1>

      {/* Search Field - Always show */}
      <div className='my-8'>
        <form onSubmit={handleSearch} className='relative max-w-md'>
          <input
            type='text'
            value={searchInput}
            onChange={handleInputChange}
            placeholder='Enter a search query to find Drops'
            className='w-full pl-4 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent'
          />
          <button
            type='submit'
            className='absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-gray-400 hover:text-geodrops transition-colors'
          >
            <Search className='h-5 w-5' />
          </button>
        </form>
      </div>

      {/* Awards Grid */}
      {/* <div className='mt-6 grid md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4'>
        {awards.map((award) => (
          <GeoDropCard key={award.awardid} award={award} />
        ))}
      </div> */}

      {/* Awards Grid */}
      <div className='mt-6 grid md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4'>
        {awards.map((award) => (
          <React.Fragment key={award.awardid}>
            {currentView === "dashboard" && (
              <GeoDropCard award={award} />
            )}
            {currentView === "public" && (
              <PublicGeoDropCard award={award} />
            )}
          </React.Fragment>
        ))}
      </div>

      {awards.length === 0 && !loading && (
        <div className='text-center py-12'>
          <p className='text-gray-600'>
            {query
              ? `No Drops found for "${query}".`
              : 'No Drops available.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default HomePage;
