"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from 'next/navigation';
import axios from "axios";
import { Award } from "@/services/api";
import { Button } from "@/components/ui/button";
import toast from 'react-hot-toast';
import dummyImg from "@/assets/dummy-card-image.png";
import moment from "moment";
import { ChevronLeft, X } from 'lucide-react';

// import "./css/HomePage.css"; // external CSS 
// Conditionally import CSS only if file exists
try {
  require("./css/HomePage.css");
} catch (error) {
  console.warn("HomePage.css not found, skipping import");
}

interface SpotifyLinkDetail {
  link_id: number;
  spotify_id: string;
  link_type: "artist" | "track";
  spotify_url: string;
  display_name: string;
  image_url?: string;
  track_title?: string;
  created_at: string;
}

interface UploadedFile {
  url: string;
  filename: string;
  uploadDate?: string;
  size?: number;
}

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://nodejs.gridiron-app.com";

// Add EXIF type declaration
declare const EXIF: any;

const PublicAwardDetailsPage = () => {
  const isCorrectUrl = /\bhttps?:\/\/(?:www\.)?[^\s/$.?#].[^\s]*\b/;
  const params = useParams();
  const router = useRouter();

  const [award, setAward] = useState<Award | null>(null);
  const [loading, setLoading] = useState(true);
  const [spotifyLinks, setSpotifyLinks] = useState<SpotifyLinkDetail[]>([]);
  const [loadingSpotifyLinks, setLoadingSpotifyLinks] = useState(false);
  const [currentName, setCurrentName] = useState<string | null>(null);
  const [currentPrice, setCurrentPrice] = useState<string | null>(null);
  const [currentCurrency, setCurrentCurrency] = useState<string | null>(null);
  const [currentActive, setCurrentActive] = useState<string | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<string | null>(null);
  const [cssLoading, setCssLoading] = useState(false);
  const currentUsername = localStorage.getItem('username') ?? '';

  const awardId = params?.id;
  const displayName = params?.displayname;

  // Media states
  const [uploadedImages, setUploadedImages] = useState<UploadedFile[]>([]);
  const [uploadedVideos, setUploadedVideos] = useState<UploadedFile[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<{ type: 'image' | 'video'; url: string } | null>(null);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [mediaLocation, setMediaLocation] = useState<{
    latitude: number;
    longitude: number;
    type: string;
  } | null>(null);

  const [modelExists, setModelExists] = useState(false);
  const [checkingModel, setCheckingModel] = useState(true);
  const [modelGLBExists, setGLBModelExists] = useState(false);
  const [checkingGLBModel, setCheckingGLBModel] = useState(true);
  const [modelUSDZExists, setUSDZModelExists] = useState(false);
  const [checkingUSDZModel, setCheckingUSDZModel] = useState(true);

  const worldId = process.env.NEXT_PUBLIC_WORLDID || "0";

  // Function to inject entire stylesheet dynamically into the page
  const injectCSS = async (cssText: string) => {
    try {
      const styleElement = document.createElement('style');
      styleElement.textContent = cssText;
      document.head.appendChild(styleElement);
      console.log(`Stylesheet injected successfully`);
    } catch (error) {
      console.error('Error injecting stylesheet:', error);
    }
  };

  const fetchAndApplyCSS = async () => {
    setCssLoading(true);
    try {
      const response = await fetch(`${apiUrl}/target-css/${worldId}`, {
        headers: {
          'Accept': 'text/css,*/*',
        },
      });
      
      const cssText = await response.text();
      const cleanCssText = cssText.replace(/<[^>]*>/g, '');
      injectCSS(cleanCssText);
      console.log('>>>>>>>>>> CSS injected successfully');
    } catch (error) {
      console.error('Error fetching CSS:', error);
    } finally {
      setCssLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hostname !== 'app.geo-drops.com') {
      fetchAndApplyCSS();
    }
  }, []);

  // Fetch current user's plan - FIXED: now depends on username state
  useEffect(() => {
    if (currentUsername) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/getawardsubscription/${currentUsername}/${awardId}`)
        .then((res) => res.json())
        .then((data) => {
          setCurrentSubscription(data.currentsubscription);
          console.error(">>>>>>>>>> subscription:", data.currentsubscription);
        })
        .catch((err) => {
          console.error("Error fetching subscription:", err);
          // setCurrentSubscription('freemium');
        });
    }
  }, [currentUsername]); // Added currentUsername as dependency

  // Get the subscription type for the award - FIXED: now depends on awardId
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/getsubscriptiontype/${awardId}`)
      .then((res) => res.json())
      .then((data) => {
        setCurrentName(data.billingname);
        setCurrentPrice(data.price);
        setCurrentCurrency(data.currency);
        setCurrentActive(data.billingactive);
        console.log(">>>>>>>>>> billingname:", data.billingname);
        console.log(">>>>>>>>>> price:", data.price);
        console.log(">>>>>>>>>> currency:", data.currency);
        console.log(">>>>>>>>>> billingactive:", data.billingactive);
      })
      .catch((err) => {
        console.error("Error fetching subscription:", err);
      });
  }, []);

  const fetchAward = async () => {
    if (!awardId) {
      setLoading(false);
      return;
    }
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/awards/list/${awardId}`
      );
      setAward(response.data ?? null);
    } catch (error) {
      console.error("Error fetching award:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSpotifyLinks = async () => {
    if (!awardId) return;

    setLoadingSpotifyLinks(true);
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/award-spotify-links/${awardId}`
      );

      if (response.data.success) {
        setSpotifyLinks(response.data.details || []);
      }
    } catch (error) {
      console.error("Error fetching Spotify links:", error);
    } finally {
      setLoadingSpotifyLinks(false);
    }
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    } else {
      return `${(meters / 1000).toFixed(1)}km`;
    }
  };

  const fetchUploadedFiles = async (userId: string, awardId: string) => {
    setLoadingMedia(true);
    try {
      const [imagesResponse, videosResponse] = await Promise.all([
        axios.get(`${apiUrl}/getfiles/${awardId}/${userId}/image`),
        axios.get(`${apiUrl}/getfiles/${awardId}/${userId}/video`)
      ]);

      const images = (imagesResponse.data.results || []).map((file: any) => {
        let url = file.publicurl;
        return {
          url,
          awardId: file.awardid,
          filename: url.split('/').pop() || 'unknown',
          uploadDate: file.uploadDate || new Date().toISOString(),
          size: file.size || 0
        };
      });

      const videos = (videosResponse.data.results || []).map((file: any) => {
        let url = file.publicurl;
        return {
          url,
          awardId: file.awardid,
          filename: url.split('/').pop() || 'unknown',
          uploadDate: file.uploadDate || new Date().toISOString(),
          size: file.size || 0
        };
      });

      setUploadedImages(images);
      setUploadedVideos(videos);

    } catch (error) {
      console.error('Error fetching files:', error);
      setUploadedImages([]);
      setUploadedVideos([]);
    } finally {
      setLoadingMedia(false);
    }
  };

  // Check if model files exist
  useEffect(() => {
    const checkModelUrl = async () => {
      if (!award?.userid || !award?.awardid) {
        setCheckingModel(false);
        return;
      }

      const modelUrl = `${apiUrl}/images/Award_${award.userid}-${award.awardid}.glb`;
      
      try {
        const response = await fetch(modelUrl, { method: 'HEAD', cache: 'no-cache' });
        setModelExists(response.ok);
        console.log(`Model check: ${modelUrl} - ${response.ok ? 'EXISTS' : 'NOT FOUND'}`);
      } catch (error) {
        console.error('Error checking model URL:', error);
        setModelExists(false);
      } finally {
        setCheckingModel(false);
      }
    };

    checkModelUrl();
  }, [award?.userid, award?.awardid]);

  useEffect(() => {
    const checkGLBModelUrl = async () => {
      if (!award?.assetglburl) {
        setCheckingGLBModel(false);
        return;
      }

      try {
        const response = await fetch(award.assetglburl, { method: 'HEAD', cache: 'no-cache' });
        setGLBModelExists(response.ok);
      } catch (error) {
        console.error('Error checking GLB model URL:', error);
        setGLBModelExists(false);
      } finally {
        setCheckingGLBModel(false);
      }
    };

    checkGLBModelUrl();
  }, [award?.assetglburl]);

  useEffect(() => {
    const checkUSDZModelUrl = async () => {
      if (!award?.assetusdzurl) {
        setCheckingUSDZModel(false);
        return;
      }

      try {
        const response = await fetch(award.assetusdzurl, { method: 'HEAD', cache: 'no-cache' });
        setUSDZModelExists(response.ok);
      } catch (error) {
        console.error('Error checking USDZ model URL:', error);
        setUSDZModelExists(false);
      } finally {
        setCheckingUSDZModel(false);
      }
    };

    checkUSDZModelUrl();
  }, [award?.assetusdzurl]);

  useEffect(() => {
    if (awardId) {
      fetchAward();
    }
  }, [awardId]);

  useEffect(() => {
    if (displayName && awardId) {
      fetchUploadedFiles(displayName.toString(), awardId.toString());
    }
  }, [displayName, awardId]);

  useEffect(() => {
    if (award) {
      fetchSpotifyLinks();
    }
  }, [award]);

  // Load model-viewer script
  useEffect(() => {
    if (!document.querySelector('script[src*="model-viewer"]')) {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.3.0/model-viewer.min.js';
      document.head.appendChild(script);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading award details...</p>
        </div>
      </div>
    );
  }

  if (!award) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Geo Drop Not Found</h1>
          <p className="mb-6">The award you're looking for doesn't exist.</p>
          <button
            onClick={() => window.open('/public', '_self')}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Latest Drops
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen py-8 lg:mt-6">
        <div className="mx-auto sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-6">
          {/* <Button
            onClick={() => router.push(displayName === "public" ? `/signup?id=${award.awardid}` : `/${displayName}`)}
            variant="outline"
            className="flex items-center mb-4"
          >
            {displayName === 'public' ? 'Sign up to find out more' : `${displayName}'s profile`}
          </Button> */}

            <h1 className='text-3xl font-semibold flex items-center justify-between mb-4 logo-wrapper'>
              {award.assetname} • {award.locationname}
              <Button
                onClick={() => window.open('/public', '_self')}
                variant='outline'
                className='flex items-center ml-4'
              >
                Latest Drops
              </Button>
              {/* <Button
                onClick={() => router.back()}
                variant='outline'
                className='flex items-center ml-4'
              >
                <ChevronLeft />
                Back
              </Button> */}
            </h1>

            {award.description && (<p className='text-lg'>{award.description}</p>)}

            {/* <p className="mt-2">
              Welcome to this Geo-Drop!
            </p>
            <p className="mt-2">
              A Geo-Drop is a special collectible card that rewards you for going to events and shows. Create an account to get more rewards!
            </p> */}

          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="space-y-6">

              {/* 3D Badge Downloads */}
              {/* {!checkingGLBModel && modelGLBExists && (award.assetglburl || award.assetusdzurl) && ( */}
                <div className='bg-white dark:bg-[#151E3A] dark:border dark:border-[#2D385B] rounded-xl shadow-sm p-6'>

                  {/* <h3 className='text-lg font-semibold mb-4'>Get Rewards</h3>
                  <h3 className='text-lg font-semibold mb-4'>For clothing drops, tickets, shows and events login to find out more!</h3> */}

                  {currentName && !currentSubscription && currentCurrency && currentPrice && award.geolocation !== "locked" && (
                    <Button
                      type="button"
                      variant='outline'
                      disabled={award.geolocation === "locked"}
                      onClick={() => {
                        router.push(`/singlepayment/${awardId}?id=${awardId}`);
                      }}
                      // onClick={() => handleCheckout(`${award.awardid}`)}
                      className="rounded-full w-full text-base"
                    >
                      Pay {currentCurrency?.toLocaleUpperCase()} {currentPrice} to buy this ticket/pass.
                    </Button>
                  )}

                  {currentName && !currentSubscription && award.geolocation === "locked" && (
                      <h2 className="text-lg p-4 text-center">This drop is now unavailable.</h2>
                  )}

                  {currentName && !currentSubscription && (<br />)}

                  {currentName && currentSubscription && currentCurrency && currentPrice && (
                    <h2 className="text-lg p-4 text-center">
                      You have paid for this drop.
                      {/* You have paid {currentCurrency?.toLocaleUpperCase()} {currentPrice} for this drop. */}
                    </h2>
                  )}

                  {currentName && !currentSubscription && (<br />)}

                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    <Button
                      onClick={() => router.push(`/signup?id=${award.awardid}`)}
                      // variant='outline'
                      className='rounded-full w-full disabled:opacity-50 disabled:cursor-not-allowed geo-claim-button bg-clgeodrops hover:opacity-60 duration-200 ease-in-out text-white'
                    >
                      {'Sign up to find out more'}
                    </Button>
                  </p>

                  {/* {!checkingModel && modelExists && (
                    <div 
                      style={{ width: '100%', height: '400px' }}
                      dangerouslySetInnerHTML={{
                        __html: `
                          <model-viewer
                            src="${apiUrl}/images/Award_${award.userid}-${award.awardid}.glb"
                            auto-rotate
                            rotation-per-second="90deg"
                            auto-rotate-delay="0"
                            interaction-prompt="none"
                            tone-mapping="neutral"
                            shadow-intensity="1"
                            style="width: 100%; height: 100%; pointer-events: none;"
                            alt="3D model"
                          ></model-viewer>
                        `
                      }}
                    />
                  )} */}

                  {/* <h3 className='text-lg font-semibold mb-4'>Selfie Badge</h3>
                  <p className='text-lg mb-4'>Download and share it with friends or take selfies with it.</p> */}

                  {!checkingGLBModel && modelGLBExists && (
                    <div style={{ width: '100%', height: '400px' }}>
                      {React.createElement('model-viewer', {
                        src: award.assetglburl,
                        'auto-rotate': true,
                        'rotation-per-second': '90deg',
                        'auto-rotate-delay': '0',
                        'interaction-prompt': 'none',
                        'tone-mapping': 'neutral',
                        'shadow-intensity': '1',
                        style: { width: '100%', height: '100%', 'pointer-events': 'none'}
                      })}
                    </div>
                  )}

                  <div className='flex flex-col sm:flex-row justify-between gap-3 mt-4'>
                    {/Android/.test(navigator.userAgent) && award.assetglburl && !checkingGLBModel && modelGLBExists && (
                      <Button
                        variant='outline'
                        className='rounded-full hover:bg-[#151E3A] dark:text-[#5871A7] hover:text-white w-full'
                      >
                        <a
                          href={
                            isCorrectUrl.test(award.assetglburl)
                              ? award.assetglburl
                              : apiUrl + award.assetglburl
                          }
                          target='_blank'
                          rel='noopener noreferrer'
                          className='w-full p-4'
                        >
                          📱 Download Badge
                        </a>
                      </Button>
                    )}
                    
                    {/iPad|iPhone|iPod|Mac/.test(navigator.userAgent) && award.assetusdzurl && !checkingUSDZModel && modelUSDZExists && (
                      <Button
                        variant='outline'
                        className='rounded-full hover:bg-[#151E3A] dark:text-[#5871A7] hover:text-white w-full'
                      >
                        <a
                          href={
                            isCorrectUrl.test(award.assetusdzurl)
                              ? award.assetusdzurl
                              : apiUrl + award.assetusdzurl
                          }
                          target='_blank'
                          rel='noopener noreferrer'
                          className='w-full p-4'
                        >
                          🥽 Download Badge
                        </a>
                      </Button>
                    )}
                  </div>

                </div>
              {/* )} */}
    
              {/* Uploaded Images */}
              {loadingMedia ? (
                <div className='mb-6'>
                  <h4 className='text-md font-semibold mb-3'>Loading Images...</h4>
                  <div className='flex gap-3'>
                    {[1, 2, 3].map((i) => (
                      <div key={i} className='w-32 h-32 bg-gray-200 rounded-lg animate-pulse' />
                    ))}
                  </div>
                </div>
              ) : uploadedImages.length > 0 ? (
                <div className="bg-white dark:bg-[#151E3A] dark:border dark:border-[#2D385B] rounded-xl shadow-sm p-6">
                  <h4 className='text-md font-semibold mb-3'>
                    Uploaded Images ({uploadedImages.length})
                  </h4>
                  <div className='flex gap-3 overflow-x-auto pb-4'>
                    {uploadedImages.map((image, index) => (
                      <div 
                        key={index} 
                        className='flex-shrink-0 relative group cursor-pointer'
                        onClick={() => {
                          setSelectedMedia({ type: 'image', url: image.url });
                          setMediaLocation(null);
                        }}
                      >
                        <img
                          src={image.url}
                          alt={image.filename || `Uploaded ${index + 1}`}
                          className='w-32 h-32 object-cover rounded-lg border-2 border-gray-200 hover:border-blue-500 transition-all'
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = dummyImg.src;
                          }}
                        />
                        <div className='absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity truncate'>
                          {image.filename}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
    
              {/* Uploaded Videos */}
              {loadingMedia ? (
                <div className='mb-6'>
                  <h4 className='text-md font-semibold mb-3'>Loading Videos...</h4>
                  <div className='flex gap-3'>
                    {[1, 2].map((i) => (
                      <div key={i} className='w-32 h-32 bg-gray-200 rounded-lg animate-pulse' />
                    ))}
                  </div>
                </div>
              ) : uploadedVideos.length > 0 ? (
                <div className="bg-white dark:bg-[#151E3A] dark:border dark:border-[#2D385B] rounded-xl shadow-sm p-6">
                  <h4 className='text-md font-semibold mb-3'>
                    Uploaded Videos ({uploadedVideos.length})
                  </h4>
                  <div className='flex gap-3 overflow-x-auto pb-4'>
                    {uploadedVideos.map((video, index) => (
                      <div 
                        key={index} 
                        className='flex-shrink-0 relative group cursor-pointer'
                        onClick={() => {
                          setSelectedMedia({ type: 'video', url: video.url });
                          setMediaLocation(null);
                        }}
                      >
                        <video
                          src={video.url}
                          className='w-32 h-32 object-cover rounded-lg border-2 border-gray-200 hover:border-green-500 transition-all'
                        />
                        <div className='absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded-lg'>
                          <svg className='w-8 h-8 text-white' fill='currentColor' viewBox='0 0 20 20'>
                            <path d='M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z' />
                          </svg>
                        </div>
                        <div className='absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity truncate'>
                          {video.filename}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Award Video */}
              {award.videolocation && (
                <div className="bg-white dark:bg-[#151E3A] dark:border dark:border-[#2D385B] rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-semibold mb-4">Video</h3>
                  <video
                    controls
                    className="w-full rounded-lg"
                    poster={
                      award.awardimg
                        ? award.awardimg.includes("https")
                          ? award.awardimg
                          : `${process.env.NEXT_PUBLIC_API_URL}/${award.awardimg}`
                        : dummyImg.src
                    }
                  >
                    <source
                      src={
                        award.videolocation
                          ? award.videolocation.includes("https")
                            ? award.videolocation
                            : `${process.env.NEXT_PUBLIC_API_URL}/${award.videolocation}`
                          : process.env.NEXT_PUBLIC_DEFAULT_VIDEO_URL
                      }
                      type="video/mp4"
                    />
                    Your browser does not support the video tag.
                  </video>
                </div>
              )}

              {/* Spotify Links */}
              {!loadingSpotifyLinks && spotifyLinks.length > 0 && (
                <div className='bg-white dark:bg-[#151E3A] dark:border dark:border-[#2D385B] rounded-xl shadow-sm p-6'>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z" />
                    </svg>
                    Spotify Links
                  </h3>

                  <div className="space-y-3">
                    {spotifyLinks.map((link) => (
                      <div
                        key={link.link_id}
                        className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#1A2235] rounded-lg hover:bg-gray-100 dark:hover:bg-[#1F2937] transition-colors"
                      >
                        <div className="flex-shrink-0">
                          <img
                            src={link.image_url || "/images/music-track.jpg"}
                            alt={link.display_name}
                            className="w-12 h-12 rounded-md object-cover bg-gray-200"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = "/images/music-track.jpg";
                            }}
                          />
                        </div>

                        <div className="flex-grow min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm truncate">
                              {link.display_name}
                            </h4>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                              {link.link_type}
                            </span>
                          </div>
                          {link.track_title && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                              {link.track_title}
                            </p>
                          )}
                        </div>

                        <div className="flex-shrink-0">
                          <a
                            href={link.spotify_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center w-10 h-10 bg-green-500 hover:bg-green-600 text-white rounded-full transition-colors"
                            title="Open in Spotify"
                          >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z" />
                            </svg>
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Right Column */}
            <div className="space-y-6">
              
              {/* Main Image */}
              <div className="bg-white dark:bg-[#151E3A] dark:border dark:border-[#2D385B] rounded-xl shadow-sm overflow-hidden">
                <img
                  src={
                    award.awardimg
                      ? award.awardimg.includes("https")
                        ? award.awardimg
                        : `${process.env.NEXT_PUBLIC_API_URL}/${award.awardimg}`
                      : dummyImg.src
                  }
                  alt={award.assetname}
                  className="w-full h-64 object-cover"
                />
              </div>

              {/* Status Card */}
              {/* <div className="bg-white dark:bg-[#151E3A] dark:border dark:border-[#2D385B] rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-4 flex-wrap">
                  <h3 className="text-lg font-semibold">Public View</h3>
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    Read Only
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Login to unlock more rewards from brands and share content with friends.
                </p> */}
                {/* <div className="mb-4">
                  <p className="text-sm">Unlock Radius:</p>
                  <p className="text-2xl font-bold">
                    {formatDistance(Number(award.allowed_radius))}
                  </p>
                </div> */}
              {/* </div> */}

              {/* Geo-Drop Details */}
              {/* <div className="bg-white dark:bg-[#151E3A] dark:border dark:border-[#2D385B] rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Geo-Drop Details</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium">Description</p>
                    <p>{award.description || "No description available"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Type</p>
                    <p>{award.type || "TBC"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Vertical</p>
                    <p>{award.vertical || "TBC"}</p>
                  </div>
                </div>
              </div> */}

              {/* Location Info */}
              <div className="bg-white dark:bg-[#151E3A] dark:border dark:border-[#2D385B] rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Address</h3>
                <div className="space-y-3">
                  {award.address && (
                    <div>
                      <p>{award.address}</p>
                    </div>
                  )}
                  {award.start_from_date && award.finish_date && (
                    <p className='text-lg'>
                      From: {moment(award.start_from_date).format('MMM Do, YYYY')}
                      {award.start_from_time && award.start_from_time !== '00:00:00'
                        ? ` at ${moment(award.start_from_time, 'HH:mm:ss').format('h:mm A')}`
                        : ''}
                      {' '}Until: {moment(award.finish_date).format('MMM Do, YYYY')}
                      {award.finish_time && award.finish_time !== '00:00:00'
                        ? ` at ${moment(award.finish_time, 'HH:mm:ss').format('h:mm A')}`
                        : ''}
                    </p>
                  )}
                  {/* <div className="flex justify-between">
                    <span>Coordinates:</span>
                    <span>
                      {award.latitude}, {award.longitude}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Unlock Radius:</span>
                    <span>{formatDistance(Number(award.allowed_radius))}</span>
                  </div> */}
                </div>

                <div className="mt-4 flex flex-col sm:flex-row gap-3">
                  <div className='flex w-full'>
                    <Button
                      variant="outline"
                      className="rounded-full hover:bg-[#151E3A] dark:text-[#5871A7] hover:text-white w-full"
                    >
                      <a
                        href={`https://www.google.com/maps?q=${award.latitude},${award.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full"
                      >
                        📍 Open in Maps
                      </a>
                    </Button>
                  </div>
                  <div className='flex w-full'>
                    <Button
                      variant="outline"
                      className="rounded-full hover:bg-[#151E3A] dark:text-[#5871A7] hover:text-white w-full"
                    >
                      <a
                        href={`https://www.google.com/maps?q=&layer=c&cbll=${award.latitude},${award.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full"
                      >
                        🗺️ Street View
                      </a>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Token/NFT Info */}
              {award.tokenurl && (
                <div className="bg-white dark:bg-[#151E3A] dark:border dark:border-[#2D385B] rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-semibold mb-4">NFT Token</h3>
                  <Button
                    variant="outline"
                    className="rounded-full hover:bg-[#151E3A] dark:text-[#5871A7] hover:text-white w-full"
                  >
                    <a
                      href={award.tokenurl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full"
                    >
                      🏆 View Token on OpenSea
                    </a>
                  </Button>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      {/* Media Preview Modal with Location Detection */}
      {selectedMedia && (
        <div 
          className='fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4'
          onClick={() => {
            setSelectedMedia(null);
            setMediaLocation(null);
          }}
        >
          <button
            onClick={() => {
              setSelectedMedia(null);
              setMediaLocation(null);
            }}
            className='absolute top-4 right-4 text-white hover:text-gray-300 z-10'
          >
            <X className='h-8 w-8' />
          </button>
          <div className='max-w-4xl w-full' onClick={(e) => e.stopPropagation()}>
            {selectedMedia.type === 'image' ? (
              <div className='relative'>
                <img
                  src={selectedMedia.url}
                  alt='Preview'
                  className='w-full h-auto max-h-[80vh] object-contain rounded-lg'
                  onLoad={(e: React.SyntheticEvent<HTMLImageElement>) => {
                    const imgElement = e.currentTarget;
                    setMediaLocation(null);
                    fetch(imgElement.src).then(r => r.blob()).then(blob => {
                      const newImg = document.createElement('img');
                      newImg.src = URL.createObjectURL(blob);
                      newImg.onload = () => {
                        // @ts-ignore
                        EXIF.getData(newImg, function() {
                          // @ts-ignore
                          const lat = EXIF.getTag(this, "GPSLatitude");
                          // @ts-ignore
                          const lon = EXIF.getTag(this, "GPSLongitude");
                          if (lat && lon) {
                            // @ts-ignore
                            const latRef = EXIF.getTag(this, "GPSLatitudeRef");
                            // @ts-ignore
                            const lonRef = EXIF.getTag(this, "GPSLongitudeRef");
                            const latitude = lat[0] + lat[1]/60 + lat[2]/3600 * (latRef === 'S' ? -1 : 1);
                            const longitude = lon[0] + lon[1]/60 + lon[2]/3600 * (lonRef === 'W' ? -1 : 1);
                            
                            setMediaLocation({
                              latitude,
                              longitude,
                              type: 'Image'
                            });
                          }
                        });
                      };
                    });
                  }}
                />
                
                {mediaLocation && (
                  <div className="absolute bottom-4 left-4 max-w-sm bg-black/80 text-white px-4 py-3 rounded-lg backdrop-blur-sm">
                    <p className="font-semibold mb-1 flex items-center gap-2">
                      📍 {mediaLocation.type} Location
                    </p>
                    <p className="text-sm mb-1">
                      Lat: {mediaLocation.latitude.toFixed(6)}, Lon: {mediaLocation.longitude.toFixed(6)}
                    </p>
                    <a 
                      href={`https://www.google.com/maps?q=${mediaLocation.latitude},${mediaLocation.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 text-sm underline inline-flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View on Google Maps →
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className='relative'>
                <video
                  src={selectedMedia.url}
                  controls
                  autoPlay
                  className='w-full h-auto max-h-[80vh] rounded-lg'
                  onLoadedMetadata={(e: React.SyntheticEvent<HTMLVideoElement>) => {
                    const videoElement = e.currentTarget;
                    setMediaLocation(null);
                    fetch(videoElement.src).then(r => r.arrayBuffer()).then(buffer => {
                      const view = new DataView(buffer.slice(0, 100000));
                      let offset = 0;
                      
                      while (offset < view.byteLength - 8) {
                        const size = view.getUint32(offset);
                        const type = String.fromCharCode(view.getUint8(offset+4), view.getUint8(offset+5), view.getUint8(offset+6), view.getUint8(offset+7));
                        if (type === '©xyz') {
                          const gps = new TextDecoder().decode(buffer.slice(offset + 16, offset + size));
                          const match = gps.match(/([+-]\d+\.\d+)([+-]\d+\.\d+)/);
                          if (match) {
                            const latitude = parseFloat(match[1]);
                            const longitude = parseFloat(match[2]);
                            
                            setMediaLocation({
                              latitude,
                              longitude,
                              type: 'Video'
                            });
                          }
                          break;
                        }
                        offset += size || 8;
                      }
                    });
                  }}
                />
                
                {mediaLocation && (
                  <div className="absolute bottom-4 left-4 max-w-sm bg-black/80 text-white px-4 py-3 rounded-lg backdrop-blur-sm">
                    <p className="font-semibold mb-1 flex items-center gap-2">
                      📍 {mediaLocation.type} Location
                    </p>
                    <p className="text-sm mb-1">
                      Lat: {mediaLocation.latitude.toFixed(6)}, Lon: {mediaLocation.longitude.toFixed(6)}
                    </p>
                    <a 
                      href={`https://www.google.com/maps?q=${mediaLocation.latitude},${mediaLocation.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 text-sm underline inline-flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View on Google Maps →
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default PublicAwardDetailsPage;
