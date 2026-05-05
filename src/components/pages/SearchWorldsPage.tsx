'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import WorldCard from '../shared/WorldCard';
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

  // Initialize search input with current query
  useEffect(() => {
    setSearchInput(query);
  }, [query]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      router.push(
        `/dashboard/searchworlds?q=${encodeURIComponent(searchInput.trim())}`
      );
    } else {
      router.push('/dashboard/searchworlds');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
  };

  // Run getAllWorlds on page launch only
  useEffect(() => {
    const fetchAllWorlds = async () => {
      try {
        console.log('Fetching all awards on page launch...');
        const response = await geoDropsApi.getAllWorlds();
        console.log('getAllWorlds Response:', response);

        if (response.success && response.data) {
          setAwards(response.data as Award[]);
        } else {
          console.error('getAllWorlds failed:', response.error);
          setError('Failed to fetch all awards');
        }
      } catch (err) {
        console.error('Error fetching all awards:', err);
        setError('Error loading all awards');
      } finally {
        setLoading(false);
      }
    };

    fetchAllWorlds();
  }, []); // Empty dependency array = runs only on mount

  // Handle search queries
  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!query) return; // Don't search if no query

      try {
        console.log('Searching for:', query);
        setLoading(true);

        const response = await geoDropsApi.searchWorlds(query);
        console.log('Search Response:', response);

        if (response.success && response.data) {
          setAwards(response.data as Award[]);
        } else {
          console.error('Search failed:', response.error);
          setError('Failed to search awards');
        }
      } catch (err) {
        console.error('Error searching awards:', err);
        setError('Error searching awards');
      } finally {
        setLoading(false);
      }
    };

    // Only run search if there's a query, otherwise keep the original getAllWorlds results
    if (query) {
      fetchSearchResults();
    }
  }, [query]); // Only runs when query changes

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <div className='flex flex-col items-center gap-4'>
          <Loader2 className='h-8 w-8 animate-spin text-geodrops' />
          <p className='text-gray-600'>
            {query ? 'Searching worlds...' : 'Loading worlds...'}
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
              placeholder='Enter a search query to find dropsites'
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
        {query ? `Search Results for "${query}"` : 'Find Dropsites'}
      </h1>

      {/* Search Field - Always visible */}
      <div className='mt-6 mb-8'>
        <form onSubmit={handleSearch} className='relative max-w-md'>
          <input
            type='text'
            value={searchInput}
            onChange={handleInputChange}
            placeholder='Enter a search query to find dropsites'
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

      {/* Results Grid */}
      <div className='grid md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4'>
        {awards.map((award) => (
          <WorldCard key={award.worldid} award={award} />
        ))}
      </div>

      {awards.length === 0 && !loading && (
        <div className='text-center py-12'>
          <p className='text-gray-600'>
            {query ? `No dropsites found for "${query}".` : 'No dropsites available - check back soon as more brands are onboarded.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default HomePage;
