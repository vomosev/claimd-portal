'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import { Award, geoDropsApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import dummyImg from '@/assets/dummy-card-image.png';
import { isWithinTimeWindow, isBeforeTimeWindow } from '@/lib/utils';
import moment from 'moment';
import { Menu, ChevronLeft, X, MapPin, Clock, AlertTriangle, Share2 } from 'lucide-react';

// import "./css/HomePage.css"; // external CSS 
// Conditionally import CSS only if file exists
try {
  require("./css/HomePage.css");
} catch (error) {
  console.warn("HomePage.css not found, skipping import");
}

// Modal Component
type AcknowledgmentModalProps = {
  isOpen: boolean;
  onClose: () => void;
  type: 'out_of_range' | 'out_of_time' | 'both_invalid' | 'after_time' | null;
  data: any;
};

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

interface UpdateClaimedAwardResponse {
  success: boolean;
  message?: string;
  data?: any;
}

interface UploadedFile {
  url: string;
  filename: string;
  uploadDate?: string;
  size?: number;
}

const AwardDetailsPage = () => {
  const isCorrectUrl = /\bhttps?:\/\/(?:www\.)?[^\s/$.?#].[^\s]*\b/;
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [currentName, setCurrentName] = useState<string | null>(null);
  const [currentPrice, setCurrentPrice] = useState<string | null>(null);
  const [currentCurrency, setCurrentCurrency] = useState<string | null>(null);
  const [currentActive, setCurrentActive] = useState<string | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<string | null>(null);

  const [award, setAward] = useState<Award | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [cssLoading, setCssLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const [distance, setDistance] = useState<number | null>(null);
  const [spotifyLinks, setSpotifyLinks] = useState<SpotifyLinkDetail[]>([]);
  const [loadingSpotifyLinks, setLoadingSpotifyLinks] = useState(false);
  const [isGeoDropsUrl, setIsGeoDropsUrl] = useState(false);
  const [imageMessage, setImageMessage] = useState('');

  const [isCarouselExpanded, setIsCarouselExpanded] = useState(false);
  const [isDownloadsExpanded, setIsDownloadsExpanded] = useState(true);
  const [isRewardsExpanded, setIsRewardsExpanded] = useState(false);
  const [isLocationExpanded, setIsLocationExpanded] = useState(false);
  const [isBadgeExpanded, setIsBadgeExpanded] = useState(false);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<
    'out_of_range' | 'out_of_time' | 'both_invalid' | 'after_time' | null
  >(null);
  const [hasAcknowledged, setHasAcknowledged] = useState(false);

  const awardId = params?.id;
  const mantlePiece = searchParams.get('mantlepiece');
  // const mantlePieceItem = mantlePiece && mantlePiece.length > 0;
  const currentUsername = localStorage.getItem('username') ?? '';
  
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Media upload states
  const [uploadedImages, setUploadedImages] = useState<UploadedFile[]>([]);
  const [uploadedVideos, setUploadedVideos] = useState<UploadedFile[]>([]);
  const [imageUploadProgress, setImageUploadProgress] = useState(0);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [selectedMedia, setSelectedMedia] = useState<{ type: 'image' | 'video'; url: string } | null>(null);
  const [loadingMedia, setLoadingMedia] = useState(false);

  const [data, setData] = useState<UpdateClaimedAwardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [modelExists, setModelExists] = useState(false);
  const [checkingModel, setCheckingModel] = useState(true);
  const [modelGLBExists, setGLBModelExists] = useState(false);
  const [checkingGLBModel, setCheckingGLBModel] = useState(true);
  const [modelUSDZExists, setUSDZModelExists] = useState(false);
  const [checkingUSDZModel, setCheckingUSDZModel] = useState(true);

  const worldId = process.env.NEXT_PUBLIC_WORLDID || "0";
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://nodejs.gridiron-app.com";
  const walletUrl = process.env.NEXT_PUBLIC_WALLET_URL || apiUrl + "/images/wallet.jpg";
  const [mantlePieceItem, setMantlepiece] = useState<string | null>(null);
  const [isGeneratingPass, setIsGeneratingPass] = useState(false);

  useEffect(() => {
    const fetchMantlepiece = async () => {
      // Try to get from URL first
      let mp = searchParams.get('mantlepiece');
      
      // If not found, fetch from API
      if (!mp) {
        console.log(">>>>>>>>>> fetching mantlepiece from API");
        try {
          const { data } = await axios.get(
            `${apiUrl}/claimedawardsbyid/list/${currentUsername}/${awardId}`
          );
          mp = data[0]?.awardid?.toString() || null;
          console.log(">>>>>>>>>> mp", mp);
        } catch (error) {
          console.error("Error fetching mantlepiece:", error);
        }
      }
      
      setMantlepiece(mp);
    };

    fetchMantlepiece();
  }, [searchParams, currentUsername]);

  // Check if the current URL is app.geo-drops.com
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      setIsGeoDropsUrl(hostname === 'app.geo-drops.com');
    }
  }, []);

  // Share to Instagram function handleShareToInstagram
  const handleShareToInstagram = () => {
    const dropUrl = `${window.location.origin}/award-details/${awardId}/public`;
    const shareText = `Check out my ${award?.assetname} Drop Memories! 📍 ${window.location.origin}`;
    
    // Try to use Web Share API if available
    if (navigator.share) {
      navigator.share({
        title: `${award?.assetname} Drop Memories`,
        text: shareText,
        url: dropUrl,
      })
      .then(() => toast.success('Share successful!'))
      .catch((error) => {
        if (error.name !== 'AbortError') {
          console.error('Error sharing:', error);
          fallbackShare(dropUrl, shareText);
        }
      });
    } else {
      fallbackShare(dropUrl, shareText);
    }
  };

  const fallbackShare = (url: string, text: string) => {
    // Copy to clipboard
    navigator.clipboard.writeText(`${text}\n${url}`)
      .then(() => {
        toast.success('Link copied to clipboard! Open Instagram to share.');
        // Try to open Instagram app on mobile
        if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
          setTimeout(() => {
            window.location.href = 'instagram://';
          }, 1000);
        }
      })
      .catch(() => {
        toast.error('Unable to copy link');
      });
  };

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/exif-js';
    script.async = true;
    document.body.appendChild(script);
    
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Load model-viewer script
  useEffect(() => {
    if (!document.querySelector('script[src*="model-viewer"]')) {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.3.0/model-viewer.min.js';
      document.head.appendChild(script);
    }
  }, []);

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

  // Fetch uploaded files
  const fetchUploadedFiles = async (userId: string, awardId: string) => {
    setLoadingMedia(true);
    try {
      const [imagesResponse, videosResponse] = await Promise.all([
        axios.get(`${apiUrl}/getfiles/${awardId}/${userId}/image`),
        axios.get(`${apiUrl}/getfiles/${awardId}/${userId}/video`)
      ]);

      console.log('Images Response:', imagesResponse.data);
      console.log('Videos Response:', videosResponse.data);

      const images = (imagesResponse.data.results || []).map((file: any) => {
        let url = file.publicurl;
        console.log('Image URL:', url);
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
        console.log('Video URL:', url);
        return {
          url,
          awardId: file.awardid,
          filename: url.split('/').pop() || 'unknown',
          uploadDate: file.uploadDate || new Date().toISOString(),
          size: file.size || 0
        };
      });

      console.log('Processed Images:', images);
      console.log('Processed Videos:', videos);

      // ADD THESE TWO LINES - Set the state!
      setUploadedImages(images);
      setUploadedVideos(videos);

    } catch (error) {
      console.error('Error fetching files:', error);
      // Set empty arrays on error
      setUploadedImages([]);
      setUploadedVideos([]);
    } finally {
      setLoadingMedia(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hostname !== 'app.geo-drops.com') {
      fetchAndApplyCSS();
    }
  }, []);

  // Refresh status of claimed award on load
  // useEffect(() => {
  //   if (currentUsername && awardId) {
  //     updateClaimedAward(currentUsername.toString(), awardId.toString(), '1');
  //   }
  // }, []);

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, message?: string) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 5MB limit`);
        continue;
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', message || award?.assetname || 'Image');
      formData.append('type', 'image');
      formData.append('id', award?.awardid?.toString() || '');
      formData.append('userid', award?.userid?.toString() || '');

      try {
        setImageUploadProgress(0);
        
        const response = await axios.post(
          `${apiUrl}/uploadgallery`,
          formData,
          {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (progressEvent) => {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / (progressEvent.total || 1)
              );
              setImageUploadProgress(percentCompleted);
            },
          }
        );

        if (response.data.success) {
          await fetchUploadedFiles(award?.userid?.toString() || '', award?.awardid?.toString() || '');
          toast.success('Image uploaded successfully!');
          setImageUploadProgress(0);
        }
      } catch (error) {
        console.error('Error uploading image:', error);
        toast.error('Failed to upload image');
        setImageUploadProgress(0);
      }
    }
    setImageMessage('');
  };

  // Handle video upload
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>, message?: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      toast.error('Video exceeds 50MB limit');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', message || award?.assetname || 'Video');
    formData.append('type', 'video');
    formData.append('id', award?.awardid?.toString() || '');
    formData.append('userid', award?.userid?.toString() || '');

    try {
      setVideoUploadProgress(0);
      
      const response = await axios.post(
        `${apiUrl}/uploadgallery`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / (progressEvent.total || 1)
            );
            setVideoUploadProgress(percentCompleted);
          },
        }
      );

      if (response.data.success) {
        await fetchUploadedFiles(award?.userid?.toString() || '', award?.awardid?.toString() || '');
        toast.success('Video uploaded successfully!');
        setVideoUploadProgress(0);
      }
    } catch (error) {
      console.error('Error uploading video:', error);
      toast.error('Failed to upload video');
      setVideoUploadProgress(0);
    }
  };

  // Handle media deletion
  const handleDeleteMedia = async (type: 'image' | 'video', index: number) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this file?');
    if (!confirmDelete) return;

    try {
      const fileList = type === 'image' ? uploadedImages : uploadedVideos;
      const file = fileList[index];
      
      await axios.get(
        `${apiUrl}/deletefile/${award?.awardid}/${award?.userid}/${file.filename}`
      );

      await fetchUploadedFiles(award?.userid?.toString() || '', award?.awardid?.toString() || '');
      toast.success('File deleted successfully');
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Failed to delete file');
    }
    await fetchUploadedFiles(award?.userid?.toString() || '', award?.awardid?.toString() || '');
    console.log('>>>>>>>>>> File delete completed');
  };

  useEffect(() => {
    if (award?.awardid) {
      fetchUploadedFiles(award?.userid?.toString() || '', award.awardid.toString());
    }
  }, [award?.awardid]);

  const updateClaimedAward = async (userid: string, awardid: string, redemptioncode: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${apiUrl}/updateclaimedaward/${userid}/${awardid}/${redemptioncode}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: UpdateClaimedAwardResponse = await response.json();
      setData(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error updating claimed award:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async (awardid: string) => {
    try {
      toast.success('Paying.');
      const formData = {
        userid: currentUsername,
        awardid: awardid
      };

      // launch locally using Singlepayment.tsx and the required awardid
      const response = await fetch(`/seatingpayment/${awardid}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        const data = await response.json();
        console.log('JSON response:', data);
        console.log('JSON response:', data);
      } else {
        toast.success('Could not generate payment.');
        console.error('Failed to generate payment');
      }
    } catch (error) {
      console.error('Error generating payment:', error);
    }
  };

  const handleGeneratePass = async (userid: string, awardid: string) => {
    try {
      setIsGeneratingPass(true);
      toast.success(`Generating card and sending to ${currentUsername}`);
      const formData = {
        userName: currentUsername,
        eventName: `Award ${awardid}`,
        userid: currentUsername,
        awardid: awardid,
        eventDate: new Date().toISOString().split('T')[0]
      };

      const response = await fetch(`${apiUrl}/wallet/pass`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          console.log('JSON response:', data);
        } else {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'wallet-pass.pkpass';
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          console.log('Pass downloaded successfully');
          toast.success(`Card generated and sent to ${currentUsername}`);
        }
      } else {
        toast.success('Could not generate card.');
        console.error('Failed to generate pass');
      }
    } catch (error) {
      console.error('Error generating pass:', error);
      toast.error('Error generating pass');
    } finally {
      setIsGeneratingPass(false);
    }
  };

  const fetchAward = async () => {
    if (!awardId) {
      setLoading(false);
      return;
    }
    try {
      const { data } = mantlePiece
        ? await geoDropsApi.getUserClaimedAwardsArray(currentUsername)
        : searchParams.get('my-geo-drops') === 'true'
        ? await geoDropsApi.getAdminAward(currentUsername, awardId.toString())
        : await geoDropsApi.getAward(awardId.toString());

      if (Array.isArray(data)) {
        const foundAward = data.find(
          (a: Award) => a.awardid.toString() === awardId
        );
        setAward(foundAward ?? null);
        return;
      } else {
        setAward(data ?? null);
      }
    } catch (error) {
      console.error('Error fetching award:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ) => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        setUserLocation({ lat: userLat, lng: userLng });

        if (award) {
          const calculatedDistance = calculateDistance(
            userLat,
            userLng,
            Number(award.latitude),
            Number(award.longitude)
          );
          setDistance(calculatedDistance);
          // add when the camara api qod is working
          // try {
          //   fetch(`${process.env.NEXT_PUBLIC_API_URL}/update-location`, {
          //     method: "POST",
          //     body: JSON.stringify({
          //       userid: currentUsername,
          //       awardid: awardId,
          //       latitude: userLat,
          //       longitude: userLng
          //     })
          //   });
          // } catch (error) {
          //   console.error('Error update-location:', error);
          // }
          //
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        toast.error('Unable to retrieve your location. Please enable location services.');
      }
    );
  };

  const handleClaimAward = async () => {
    setClaiming(true);

    try {
      const response = await axios.get(
        `${apiUrl}/updateclaimedaward/${currentUsername}/${award?.awardid}/1`
      );
      toast.success((response.data as { message: string }).message);
      window.location.href = `/dashboard/award-details/${award?.awardid}?mantlepiece=true`;
    } catch (error) {
      console.error('Error claiming award:', error);
    } finally {
      setClaiming(false);
    }
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    } else {
      return `${(meters / 1000).toFixed(1)}km`;
    }
  };

  const getTimeInfo = () => {
    let timeInfo = '';
    if (award?.start_from_date) {
      timeInfo += `${moment(award.start_from_date).format('MMM Do, YYYY')}`;
      if (award.start_from_time && award.start_from_time !== '00:00:00') {
        timeInfo += ` at ${moment(award.start_from_time, 'HH:mm:ss').format('h:mm A')}`;
      }
    }
    if (award?.finish_date) {
      if (timeInfo) timeInfo += ' ';
      timeInfo += `until ${moment(award.finish_date).format('MMM Do, YYYY')}`;
      if (award.finish_time && award.finish_time !== '00:00:00') {
        timeInfo += ` at ${moment(award.finish_time, 'HH:mm:ss').format('h:mm A')}`;
      }
    }
    return timeInfo || 'Time window restrictions apply';
  };

  const getTimeStatus = () => {
    if (!award) return 'unknown';

    const now = moment();

    if (award.finish_date) {
      const finishDateTime = moment(award.finish_date);
      if (award.finish_time && award.finish_time !== '00:00:00') {
        const [hours, minutes, seconds] = award.finish_time.split(':');
        finishDateTime
          .hour(parseInt(hours))
          .minute(parseInt(minutes))
          .second(parseInt(seconds));
      }

      if (now.isAfter(finishDateTime)) {
        return 'expired';
      }
    }

    if (award.start_from_date) {
      const startDateTime = moment(award.start_from_date);
      if (award.start_from_time && award.start_from_time !== '00:00:00') {
        const [hours, minutes, seconds] = award.start_from_time.split(':');
        startDateTime
          .hour(parseInt(hours))
          .minute(parseInt(minutes))
          .second(parseInt(seconds));
      }

      if (now.isBefore(startDateTime)) {
        return 'not_started';
      }
    }

    return 'active';
  };

  const fetchSpotifyLinks = async () => {
    if (!awardId) return;

    setLoadingSpotifyLinks(true);
    try {
      const response = await axios.get(`${apiUrl}/award-spotify-links/${awardId}`);

      if (response.data.success) {
        setSpotifyLinks(response.data.details || []);
      }
    } catch (error) {
      console.error("Error fetching Spotify links:", error);
    } finally {
      setLoadingSpotifyLinks(false);
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
    if (award && distance !== null && !hasAcknowledged && !mantlePieceItem) {

      const isWithinRadius = distance <= Number(award.allowed_radius);

      const isWithinTime = isWithinTimeWindow(award);
      const isBeforeTime = isBeforeTimeWindow(award);

      if (!isBeforeTime) {
        setModalType('after_time');
        setShowModal(true);
      } else if (!isWithinRadius && !isWithinTime) {
        setModalType('both_invalid');
        setShowModal(true);
      } else if (!isWithinRadius) {
        setModalType('out_of_range');
        setShowModal(true);
      } else if (!isWithinTime) {
        setModalType('out_of_time');
        setShowModal(true);
      }
      if (isWithinRadius && isWithinTime) {
        handleClaimAward();
      }
    }
  }, [award, distance, hasAcknowledged, mantlePieceItem]);

  // Fetch current user's plan - FIXED: now depends on username state
  useEffect(() => {
    if (currentUsername) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/getawardsubscription/${currentUsername}/${awardId}`)
        .then((res) => res.json())
        .then((data) => {
          setCurrentSubscription(data.currentsubscription);
          console.log(">>>>>>>>>> subscription:", data.currentsubscription);
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
      })
      .catch((err) => {
        console.error("Error fetching subscription:", err);
      });
  }, []);

  useEffect(() => {
    if (award) {
      fetchSpotifyLinks();
    }
  }, [award]);

  const handleModalClose = () => {
    setShowModal(false);
    setHasAcknowledged(true);
  };

  const getModalData = () => {
    if (!award || distance === null) return {};

    const currentDistance = formatDistance(distance);
    const requiredRange = formatDistance(Number(award.allowed_radius));
    const distanceToGo = formatDistance(distance - Number(award.allowed_radius));
    const timeInfo = getTimeInfo();

    return {
      currentDistance,
      requiredRange,
      distanceToGo,
      timeInfo,
      award,
    };
  };

  useEffect(() => {
    if (awardId) {
      fetchAward();
    }
  }, [awardId]);

  useEffect(() => {
    getCurrentLocation();
  }, [award]);

  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4'></div>
          <p>Loading Drop details...</p>
        </div>
      </div>
    );
  }

  if (!award) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-center'>
          <h1 className='text-2xl font-bold mb-4'>Drop Not Found or Archived</h1>
          <p className='mb-6'>The Drop you're looking for doesn't exist or has been archived.</p>
          <button
            onClick={() => window.open('/dashboard', '_self')}
            className='bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors'
          >
            Back to Drops
          </button>
        </div>
      </div>
    );
  }

  const canClaim =
    distance !== null &&
    distance <= Number(award.allowed_radius) &&
    isWithinTimeWindow(award);
  const isWithinRadius =
    distance !== null && distance <= Number(award.allowed_radius);
  const timeStatus: 'active' | 'not_started' | 'expired' | 'unknown' = getTimeStatus();
  const isWithinTime = isWithinTimeWindow(award);
  const isBeforeTime = isBeforeTimeWindow(award);
  const getStatusMessage = () => {
    if (!isBeforeTime) {
      return 'After Time';
    } else if (!isWithinRadius && !isWithinTime) {
      return 'Out of Range & Time';
    } else if (!isWithinRadius && !mantlePieceItem) {
      return 'Out of Range';
    } else if (!isWithinTime && !mantlePieceItem) {
      return 'Outside Time';
    } else if (mantlePieceItem) {
      return 'Unlocked';
    } else {
      return 'Available to Unlock';
    }
  };

  const getStatusColor = () => {
    if ((isWithinRadius && isWithinTime) || mantlePieceItem) {
      return 'bg-green-100 text-green-800';
    } else {
      return 'bg-red-100 text-red-800';
    }
  };

  return (
    <>
      <AcknowledgmentModal
        isOpen={showModal}
        onClose={handleModalClose}
        type={modalType}
        data={getModalData()}
      />

      <div className={`min-h-screen py-8 ${isGeoDropsUrl ? 'md:mt-0 mt-[-40px]' : 'md:mt-0 mt-[-100px]'}`}>

        <div className='mx-auto sm:px-6 lg:px-8'>
          
          {/* Headings */}
          <div className='mb-6'>
            <h1 className='text-xl md:text-3xl font-semibold flex items-center justify-between mb-4 logo-wrapper'>
              <span>{award.assetname} • {award.locationname}</span>
              {(process.env.NEXT_PUBLIC_DISTRIBUTION === "0") && (
                <Button
                  onClick={() => window.open('/dashboard', '_self')}
                  variant='outline'
                  className='flex items-center ml-4'
                >
                  Latest Drops
                </Button>
              )}
              {/* <Button
                onClick={() => router.back()}
                variant='outline'
                className='flex items-center ml-4'
              >
                <ChevronLeft />
                Back
              </Button> */}
            </h1>
          </div>

          <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>

            {/* Left Column */}
            <div className='space-y-6'>

              {/* Status Card - don't show for now */}
              {/* {!mantlePieceItem && (
                <div className='bg-white dark:bg-[#151E3A] dark:border dark:border-[#2D385B] rounded-xl shadow-sm p-6 bkg-card'>

                  {(!mantlePieceItem && (award.start_from_date || award.finish_date)) && (
                    <div className='mb-4 rounded-lg'>
                      {award.start_from_date && award.finish_date && (
                        <p className='text-lg font-semibold'>
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
                    </div>
                  )}

                  {(!mantlePieceItem && distance !== null) && (
                    <div className='flex items-center justify-between mb-1 flex-wrap'>
                      <div className='mb-1'>
                        {isWithinRadius && (
                          <p className='text-lg'>Within range</p>
                        )}
                        {!isWithinRadius && (
                          <p className='text-lg'>Drop distance: {formatDistance(distance)}</p>
                        )}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[11px] md:text-sm font-medium ${getStatusColor()}`}>
                        {getStatusMessage()}
                      </span>
                    </div>
                    )}

                  {(!mantlePieceItem && isWithinRadius && isWithinTime && canClaim) && (
                    <><Button
                      className={`rounded-full w-full disabled:opacity-50 disabled:cursor-not-allowed geo-claim-button ${!isWithinRadius
                          ? 'bg-gray-300'
                          : 'bg-clgeodrops hover:opacity-60 duration-200 ease-in-out text-white'}`}
                      onClick={handleClaimAward}
                      disabled={!canClaim || claiming}
                    >
                      {claiming
                        ? '🔄 Unlocking...'
                        : !isWithinTime
                          ? timeStatus === 'expired'
                            ? 'Cannot Unlock Rewards'
                            : timeStatus === 'not_started'
                              ? 'Cannot Unlock Rewards Yet'
                              : 'Time Window Closed'
                          : !isWithinRadius
                            ? 'Out of Range'
                            : 'Unlock Rewards'}
                    </Button>
                    </>
                  )}

                </div>
              )} */}

              {/* VIP Downloads - Collapsible */}
              <div className='bg-white dark:bg-[#151E3A] dark:border dark:border-[#2D385B] rounded-xl shadow-sm overflow-hidden bkg-card'>
                <div 
                  className='flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1A2235] transition-colors'
                  onClick={() => setIsDownloadsExpanded(!isDownloadsExpanded)}
                >
                  <h3 className='text-lg font-semibold'>Step 1: Download Pass</h3>
                    <span className={`px-3 py-1 rounded-full text-[11px] md:text-sm font-medium ml-auto ${getStatusColor()}`}>
                      {/* {isWithinRadius && (<p>In range, </p>)} */}
                      {getStatusMessage()}
                    </span>
                  <button
                    className='p-2 hover:bg-gray-200 dark:hover:bg-[#2D385B] rounded-lg transition-colors'
                    aria-label={isDownloadsExpanded ? 'Collapse' : 'Expand'}
                  >
                    {isDownloadsExpanded ? <X className='h-5 w-5' /> : <Menu className='h-5 w-5' />}
                  </button>
                </div>

                <div 
                  className={`transition-all duration-300 ease-in-out ${
                    isDownloadsExpanded 
                      ? 'max-h-[2000px] opacity-100' 
                      : 'max-h-0 opacity-0'
                  } overflow-hidden`}
                >

                  <div className='px-6 pb-6'>

                    {/* <p className='text-lg mb-4'>Download card to receive offers.</p> */}

                    {/* <div className='mb-4 space-y-1 md:mb-50'> */}
                       {/* Changed mb-1 to mb-4 */}
                      {/* <Button 
                        onClick={() => handleGeneratePass(`${award.userid}`, `${award.awardid}`)}
                        aria-label={`Generate wallet pass for ${award.awardid}`}
                        className="inline-block p-0 border-0 bg-transparent w-full"
                      >
                        <img 
                          src={walletUrl} 
                          alt="wallet" 
                          className="w-full md:w-[720px] md:h-[225px] mx-auto rounded-lg mb-2"
                          loading="lazy"
                        />
                      </Button> */}
                    {/* </div> */}

                    <div className='mb-4 space-y-1'>

                      {/* {mantlePieceItem && (
                        <p className='text-lg mb-4'>Add this card to your wallet to get notified of offers.</p>
                      )}
                      {!mantlePieceItem && (
                        <p className='text-lg mb-4'>Get within range/time to unlock this card.</p>
                      )} */}

                      {!downloadUrl ? (
                        <Button
                          onClick={() => handleGeneratePass(`${award.userid}`, `${award.awardid}`)}
                          disabled={!isBeforeTimeWindow(award) || !currentSubscription || award.geolocation === "locked" || isGeneratingPass}
                          // ((award.price?.length ?? 0) > 0) && ((award.currency?.length ?? 0) > 0) && 
                          className={`rounded-full w-full disabled:opacity-50 disabled:cursor-not-allowed geo-claim-button ${
                            !isWithinRadius
                              ? 'bg-clgeodrops hover:opacity-60 duration-200 ease-in-out text-white'
                              : 'bg-clgeodrops hover:opacity-60 duration-200 ease-in-out text-white'
                          }`}
                        >
                          <span className="flex items-center justify-center gap-2">

{/* Loading overlay */}
{isGeneratingPass && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
    <div className="bg-white rounded-lg p-6 flex flex-col items-center gap-3 shadow-xl">
      <br></br>
      <br></br>
      <h2>Generating your wallet pass...</h2>
      <h2>Sending a copy by email</h2>
    </div>
  </div>
)}

                            {!isGenerating && (
                              <img 
                                src={apiUrl + "/images/Add_to_Apple_Wallet_badge.svg.png"}
                                alt="Apple" 
                                style={{ height: '24px', verticalAlign: 'middle' }}
                                className="inline-block"
                              />
                            )}
                            <span>
                              {/* update the button text */}
                              {isGenerating ? 'Downloading Pass' : award.challenge || 'Download Pass to attend Drop'}
                            </span>
                            {/* <span>
                              {isGenerating ? 'Adding Pass to Apple Wallet...' : 
                                !isWithinTime && !mantlePieceItem
                                ? timeStatus === 'expired' && !mantlePieceItem
                                ? 'Cannot Add Pass'
                                : timeStatus === 'not_started' && !mantlePieceItem
                                ? 'Cannot Add Pass Yet'
                                : 'Add Pass Time Window Closed'
                                : !isWithinRadius && !mantlePieceItem
                                ? 'Add Pass Out of Range'
                                : 'Add Pass to Apple Wallet'}
                            </span> */}
                          </span>
                        </Button>
                      ) : (
                        <div className='space-y-3'>
                          <div className='p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg'>
                            <p className='text-green-800 dark:text-green-200 text-sm font-medium mb-2'>
                              ✓ Pass downloaded successfully!
                            </p>
                            <a
                              href={downloadUrl}
                              download
                              className='inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors duration-200'
                            >
                              <svg className='w-4 h-4 mr-2' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 10v6m0 0l-4-4m4 4l4-4m5-8h-5.5a2.5 2.5 0 00-2.5 2.5v1' />
                              </svg>
                              ADD NOW
                            </a>
                          </div>
                          
                          <Button
                            onClick={() => setDownloadUrl(null)}
                            disabled={!mantlePieceItem || !currentSubscription || award.geolocation === "locked"}
                            className='w-full bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200'
                          >
                            Add Pass to Apple Wallet Again
                          </Button>
                        </div>
                      )}

                      {currentName && !currentSubscription && (<br />)}

                      {currentName && !currentSubscription && currentCurrency && currentPrice && award.geolocation !== "locked" && (
                        <Button
                          type="button"
                          variant='outline'
                          disabled={award.geolocation === "locked"}
                          onClick={() => {
                            router.push(`/seatingpayment/${awardId}?id=${awardId}`);
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
                          You already paid for this ticket. <a href="/dashboard/my-activity"><u>View Tickets</u></a>
                        </h2>
                      )}

                    </div>

                  </div>

                </div>
              </div>

              {/* Rewards - Collapsible */}
              <div className='bg-white dark:bg-[#151E3A] dark:border dark:border-[#2D385B] rounded-xl shadow-sm overflow-hidden bkg-card'>
                <div 
                  className='flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1A2235] transition-colors'
                  onClick={() => setIsRewardsExpanded(!isRewardsExpanded)}
                >
                  <h3 className='text-lg font-semibold'>Step 2: {award.textbook || 'View Rewards'}</h3>
                  <button
                    className='p-2 hover:bg-gray-200 dark:hover:bg-[#2D385B] rounded-lg transition-colors'
                    aria-label={isRewardsExpanded ? 'Collapse' : 'Expand'}
                  >
                    {isRewardsExpanded ? <X className='h-5 w-5' /> : <Menu className='h-5 w-5' />}
                  </button>
                </div>
                
                <div 
                  className={`transition-all duration-300 ease-in-out ${
                    isRewardsExpanded 
                      ? 'max-h-[2000px] opacity-100' 
                      : 'max-h-0 opacity-0'
                  } overflow-hidden`}
                >
                  <div className='px-6 pb-6 space-y-3'>
                    <hr className='my-2' />
                    <div
                      dangerouslySetInnerHTML={{ 
                        __html: award.description || '' 
                      }}
                    />
                    <div
                      dangerouslySetInnerHTML={{ 
                        __html: award.htmltext || '' 
                      }}
                    />
                  </div>
                </div>

              </div>

              {/* Status Card */}
              <div className='bg-white dark:bg-[#151E3A] dark:border dark:border-[#2D385B] rounded-xl shadow-sm p-6 bkg-card'>

                {/* {(!mantlePieceItem && isWithinRadius && isWithinTime && canClaim) && (
                  <><Button
                    className={`rounded-full w-full disabled:opacity-50 disabled:cursor-not-allowed geo-claim-button ${!isWithinRadius
                        ? 'bg-gray-300'
                        : 'bg-clgeodrops hover:opacity-60 duration-200 ease-in-out text-white'}`}
                    onClick={handleClaimAward}
                    disabled={!canClaim || claiming}
                  >
                    {claiming
                      ? '🔄 Unlocking...'
                      : !isWithinTime
                        ? timeStatus === 'expired'
                          ? 'Cannot Unlock Rewards'
                          : timeStatus === 'not_started'
                            ? 'Cannot Unlock Rewards Yet'
                            : 'Time Window Closed'
                        : !isWithinRadius
                          ? 'Out of Range'
                          : 'Unlock Rewards'}
                  </Button>
                  <br className='my-2' />
                  <br className='my-2' />
                  </>
                )} */}

                {/* {distance !== null && ( */}
                  <div>

                    <><Button
                      className='rounded-full w-full disabled:opacity-50 disabled:cursor-not-allowed geo-claim-button bg-clgeodrops hover:opacity-60 duration-200 ease-in-out text-white'
                      onClick={() => {
                        router.push(`/dashboard/get-gallery/${awardId}`);
                      }}
                    >
                      View Drop Memories
                    </Button>
                  <br className='my-2' />
                  <br className='my-2' />

                    {/* Share to Instagram Button */}
                    <Button
                      className='rounded-full w-full geo-claim-button bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:opacity-80 duration-200 ease-in-out text-white flex items-center justify-center gap-2'
                      onClick={handleShareToInstagram}
                    >
                      <Share2 className='h-5 w-5' />
                      Share to Insta, Tiktok, etc
                    </Button>
                  </>

                  </div>
                {/* )} */}
              </div>

              {/* Media Upload Section - NOW COLLAPSIBLE */}
              {mantlePieceItem && (
                <div className='bg-white dark:bg-[#151E3A] dark:border dark:border-[#2D385B] rounded-xl shadow-sm overflow-hidden bkg-card'>
                  <div 
                    className='flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1A2235] transition-colors'
                    onClick={() => setIsCarouselExpanded(!isCarouselExpanded)}
                  >
                    <h3 className='text-lg font-semibold'>Upload Drop Memories</h3>
                    <button
                      className='p-2 hover:bg-gray-200 dark:hover:bg-[#2D385B] rounded-lg transition-colors'
                      aria-label={isCarouselExpanded ? 'Collapse' : 'Expand'}
                    >
                      {isCarouselExpanded ? <X className='h-5 w-5' /> : <Menu className='h-5 w-5' />}
                    </button>
                  </div>

                  <div 
                    className={`transition-all duration-300 ease-in-out ${
                      isCarouselExpanded 
                        ? 'max-h-[3000px] opacity-100' 
                        : 'max-h-0 opacity-0'
                    } overflow-hidden`}
                  >

                    {/* Message Input Box */}
                    <div className='mb-3 flex justify-center pt-2'>
                      <input
                        type='text'
                        placeholder='Start with a message for your upload (optional)'
                        value={imageMessage}
                        onChange={(e) => setImageMessage(e.target.value)}
                        className='w-4/5 px-4 py-2 rounded-lg border border-gray-300 dark:border-[#2D385B] 
                          bg-white dark:bg-[#1A2235] text-gray-900 dark:text-white
                          focus:ring-2 focus:ring-blue-500 focus:border-transparent
                          placeholder-gray-400 dark:placeholder-gray-500'
                      />
                    </div>

                    <div className='px-6 pb-6'>

                      {/* Image Upload */}
                      <div className='mb-6'>
                        <label className='block text-sm font-medium mb-2'>Upload Images (Max 5MB)</label>
                        <input
                          type='file'
                          accept='image/*'
                          multiple
                          onChange={(e) => handleImageUpload(e, imageMessage)}
                          className='block w-full text-sm text-gray-500
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-full file:border-0
                            file:text-sm file:font-semibold
                            file:bg-blue-50 file:text-blue-700
                            hover:file:bg-blue-100
                            dark:file:bg-blue-900 dark:file:text-blue-300'
                        />
                        {imageUploadProgress > 0 && imageUploadProgress < 100 && (
                          <div className='mt-2'>
                            <div className='w-full bg-gray-200 rounded-full h-2'>
                              <div 
                                className='bg-blue-600 h-2 rounded-full transition-all duration-300'
                                style={{ width: `${imageUploadProgress}%` }}
                              ></div>
                            </div>
                            <p className='text-sm text-gray-600 mt-1'>{imageUploadProgress}% uploaded</p>
                          </div>
                        )}
                      </div>

                      {/* Video Upload */}
                      <div className='mb-6'>
                        <label className='block text-sm font-medium mb-2'>Upload Video (Max 50MB)</label>
                        <input
                          type='file'
                          accept='video/*'
                          onChange={(e) => handleVideoUpload(e, imageMessage)}
                          className='block w-full text-sm text-gray-500
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-full file:border-0
                            file:text-sm file:font-semibold
                            file:bg-green-50 file:text-green-700
                            hover:file:bg-green-100
                            dark:file:bg-green-900 dark:file:text-green-300'
                        />
                        {videoUploadProgress > 0 && videoUploadProgress < 100 && (
                          <div className='mt-2'>
                            <div className='w-full bg-gray-200 rounded-full h-2'>
                              <div 
                                className='bg-green-600 h-2 rounded-full transition-all duration-300'
                                style={{ width: `${videoUploadProgress}%` }}
                              ></div>
                            </div>
                            <p className='text-sm text-gray-600 mt-1'>{videoUploadProgress}% uploaded</p>
                          </div>
                        )}
                      </div>

                      {/* Uploaded Images Carousel */}
                      {loadingMedia ? (
                        <div className='mb-6'>
                          <h4 className='text-md font-semibold mb-3'>Loading Images...</h4>
                          <div className='flex gap-3'>
                            {[1, 2, 3].map((i) => (
                              <div key={i} className='w-32 h-32 bg-gray-200 rounded-lg animate-pulse' />
                            ))}
                          </div>
                        </div>
                      ) : uploadedImages.length > 0 && (
                        <div className='mb-6'>
                          <h4 className='text-md font-semibold mb-3'>
                            Uploaded Images ({uploadedImages.length})
                          </h4>
                          <div className='flex gap-3 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200'>
                            {uploadedImages.map((image, index) => (
                              <div 
                                key={index} 
                                className='flex-shrink-0 relative group cursor-pointer'
                                onClick={() => setSelectedMedia({ type: 'image', url: image.url })}
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
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteMedia('image', index);
                                  }}
                                  className='absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-100 transition-opacity hover:bg-red-600'
                                  title='Delete image'
                                >
                                  <X className='h-4 w-4' />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Uploaded Videos Carousel */}
                      {loadingMedia ? (
                        <div className='mb-6'>
                          <h4 className='text-md font-semibold mb-3'>Loading Videos...</h4>
                          <div className='flex gap-3'>
                            {[1, 2].map((i) => (
                              <div key={i} className='w-32 h-32 bg-gray-200 rounded-lg animate-pulse' />
                            ))}
                          </div>
                        </div>
                      ) : uploadedVideos.length > 0 && (
                        <div>
                          <h4 className='text-md font-semibold mb-3'>
                            Uploaded Videos ({uploadedVideos.length})
                          </h4>
                          <div className='flex gap-3 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200'>
                            {uploadedVideos.map((video, index) => (
                              <div 
                                key={index} 
                                className='flex-shrink-0 relative group cursor-pointer'
                                onClick={() => setSelectedMedia({ type: 'video', url: video.url })}
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
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteMedia('video', index);
                                  }}
                                  className='absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-100 transition-opacity hover:bg-red-600'
                                  title='Delete video'
                                >
                                  <X className='h-4 w-4' />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Refresh Button */}
                      <Button
                        onClick={() => fetchUploadedFiles(award?.userid?.toString() || '', award.awardid.toString())}
                        className='rounded-full w-full disabled:opacity-50 disabled:cursor-not-allowed geo-claim-button bg-clgeodrops hover:opacity-60 duration-200 ease-in-out text-white mt-4'
                        disabled={loadingMedia}
                      >
                        {loadingMedia ? (
                          <>
                            <div className='animate-spin inline-block mr-2' />
                            Loading...
                          </>
                        ) : (
                          'Refresh Media'
                        )}
                      </Button>
                    
                    </div>
                  </div>
                </div>
              )}

              {/* NFT Token */}
              {award.tokenurl && (
                <div className='bg-white dark:bg-[#151E3A] dark:border dark:border-[#2D385B] rounded-xl shadow-sm p-6 bkg-card'>
                  <h3 className='text-lg font-semibold mb-4'>NFT Token</h3>
                  <Button
                    variant='outline'
                    className='rounded-full hover:bg-[#151E3A] dark:text-[#5871A7] hover:text-white w-full'
                    disabled={!award.tokenurl}
                  >
                    <a
                      href={award.tokenurl ?? ''}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='w-full p-4'
                    >
                      🏆 View Token on OpenSea
                    </a>
                  </Button>
                </div>
              )}

            </div>

            {/* Right Column */}
            <div className='space-y-6'>

              {/* 3D Badge Downloads */}
              {!checkingGLBModel && modelGLBExists && (award.assetglburl || award.assetusdzurl) && (
                <div className='bg-white dark:bg-[#151E3A] dark:border dark:border-[#2D385B] rounded-xl shadow-sm overflow-hidden bkg-card'>
                  {/* Collapsible Header */}
                  <div 
                    className='flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1A2235] transition-colors'
                    onClick={() => setIsBadgeExpanded(!isBadgeExpanded)}
                  >
                    <h3 className='text-lg font-semibold'>Selfie Badge</h3>
                    <button
                      className='p-2 hover:bg-gray-200 dark:hover:bg-[#2D385B] rounded-lg transition-colors'
                      aria-label={isBadgeExpanded ? 'Collapse' : 'Expand'}
                    >
                      {isBadgeExpanded ? <X className='h-5 w-5' /> : <Menu className='h-5 w-5' />}
                    </button>
                  </div>

                  <div 
                    className={`transition-all duration-300 ease-in-out ${
                      isBadgeExpanded 
                        ? 'max-h-[2000px] opacity-100' 
                        : 'max-h-0 opacity-0'
                    } overflow-hidden`}
                  >

                    <div className='px-6 pb-6'>
                      <p className='text-lg mb-4'>Get ultra bragging rights! Download this special badge to your phone, then click on it to launch your device's augmented reality viewer and take a selfie with it for sharing.</p>
                      {/* {mantlePieceItem && (
                      )}
                      {!mantlePieceItem && (
                        <p className='text-lg mb-4'>Get within range/time to unlock this badge.</p>
                      )} */}

                      {mantlePieceItem && (
                        // <h3 className='text-lg font-semibold'>Download Keepsake</h3>
                        <p className='text-lg mb-4'>Download this keepsake minted specially for you.</p>
                      )}
                      {/* {!mantlePieceItem && (
                        <p className='text-lg mb-4'>Get within range/time to unlock a collectible coin.</p>
                      )} */}

                      {!checkingModel && modelExists && (
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
                      )}

                      {checkingModel && (
                        <div style={{ width: '100%', height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <p>Loading 3D model...</p>
                        </div>
                      )}

                      {/* <Button 
                        onClick={() => updateClaimedAward(`${award.userid}`, `${award.awardid}`, '1')}
                        disabled={!mantlePieceItem}
                        className={`rounded-full w-full disabled:opacity-50 disabled:cursor-not-allowed geo-claim-button ${
                          !isWithinRadius
                            ? 'bg-gray-300'
                            : 'bg-clgeodrops hover:opacity-60 duration-200 ease-in-out text-white'
                        }`}
                      >
                        {loading ? 'Downloading...' : 
                          !isWithinTime && !mantlePieceItem
                          ? timeStatus === 'expired' && !mantlePieceItem
                          ? 'Collectible Coin Not Unlocked'
                          : timeStatus === 'not_started' && !mantlePieceItem
                          ? 'Collectible Coin Not Unlocked Yet'
                          : 'Coin Time Window Closed'
                          : !isWithinRadius && !mantlePieceItem
                          ? 'Coin Out of Range'
                          : '🪙 Refresh and Download Coin'}
                      </Button> */}

                      {error && <p className="text-red-500">Error: {error}</p>}
                      {mantlePieceItem && (
                        <>
                          <br />
                          {/iPad|iPhone|iPod|Mac/.test(navigator.userAgent) ? (
                            <Button
                              onClick={() => updateClaimedAward(`${award.userid}`, `${award.awardid}`, '1')}
                              variant='outline'
                              className='rounded-full hover:bg-[#151E3A] dark:text-[#5871A7] hover:text-white w-full'
                              disabled={!mantlePieceItem}
                            >
                              <a 
                                href={`${apiUrl}/images/Award_${award.userid}-${award.awardid}.usdz`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className='w-full p-4'
                              >
                                🥽 Download Coin
                              </a>
                            </Button>
                          ) : /Android/.test(navigator.userAgent) ? (
                            <Button
                              onClick={() => updateClaimedAward(`${award.userid}`, `${award.awardid}`, '1')}
                              variant='outline'
                              className='rounded-full hover:bg-[#151E3A] dark:text-[#5871A7] hover:text-white w-full'
                              disabled={!mantlePieceItem}
                            >
                              <a 
                                href={`${apiUrl}/images/Award_${award.userid}-${award.awardid}.glb`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className='w-full p-4'
                              >
                                📱 Download Coin
                              </a>
                            </Button>
                          ) : null}
                        </>
                      )}

                      {!checkingGLBModel && modelGLBExists && (
                        <div 
                          style={{ width: '100%', height: '400px' }}
                          dangerouslySetInnerHTML={{
                            __html: `
                              <model-viewer
                                src="${award.assetglburl}"
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
                      )}

                      {/* {mantlePieceItem && ( */}
                        <div className='flex flex-col sm:flex-row justify-between gap-3 mt-4'>
                          {/Android/.test(navigator.userAgent) && !checkingGLBModel && modelGLBExists && (
                            // && award.assetglburl
                            <Button
                              variant='outline'
                              className='rounded-full hover:bg-[#151E3A] dark:text-[#5871A7] hover:text-white w-full'
                              // disabled={!mantlePieceItem}
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
                          
                          {/iPad|iPhone|iPod|Mac/.test(navigator.userAgent) && !checkingUSDZModel && modelUSDZExists && (
                            // && award.assetusdzurl
                            <Button
                              variant='outline'
                              className='rounded-full hover:bg-[#151E3A] dark:text-[#5871A7] hover:text-white w-full'
                              // disabled={!mantlePieceItem && !isWithinRadius}
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
                      {/* )} */}

                    </div>
                  </div>

                </div>
              )}

              {/* Video */}
              {award.videolocation && (
                <div className='bg-white dark:bg-[#151E3A] dark:border dark:border-[#2D385B] rounded-xl shadow-sm p-6 bkg-card'>
                  <h3 className='text-lg font-semibold mb-4'>Video</h3>
                  <video
                    controls
                    className='w-full rounded-lg'
                    poster={
                      award.awardimg
                        ? award.awardimg.includes('https')
                          ? award.awardimg
                          : `${apiUrl}/${award.awardimg}`
                        : dummyImg.src
                    }
                  >
                    <source
                      src={
                        award.videolocation
                          ? award.videolocation.includes('https')
                            ? award.videolocation
                            : `${apiUrl}/${award.videolocation}`
                          : process.env.NEXT_PUBLIC_DEFAULT_VIDEO_URL
                      }
                      type='video/mp4'
                    />
                    Your browser does not support the video tag.
                  </video>
                </div>
              )}

              {/* Spotify Links */}
              {!loadingSpotifyLinks && spotifyLinks.length > 0 && (
                <div className='bg-white dark:bg-[#151E3A] dark:border dark:border-[#2D385B] rounded-xl shadow-sm p-6 bkg-card'>
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

              {/* Location Info */}
              <div className='bg-white dark:bg-[#151E3A] dark:border dark:border-[#2D385B] rounded-xl shadow-sm overflow-hidden bkg-card'>

                {/* Collapsible Header */}
                <div 
                  className='flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1A2235] transition-colors'
                  onClick={() => setIsLocationExpanded(!isLocationExpanded)}
                >
                  <h3 className='text-lg font-semibold'>Details</h3>
                  <button
                    className='p-2 hover:bg-gray-200 dark:hover:bg-[#2D385B] rounded-lg transition-colors'
                    aria-label={isLocationExpanded ? 'Collapse' : 'Expand'}
                  >
                    {isLocationExpanded ? <X className='h-5 w-5' /> : <Menu className='h-5 w-5' />}
                  </button>
                </div>

                {/* Collapsible Content */}
                {isLocationExpanded && (
                  <div className='px-6 pb-6'>

                  {(award.start_from_date || award.finish_date) && (
                    <div className='mb-4 rounded-lg'>
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
                    </div>
                  )}

                    <div className='space-y-3'>
                      {award.address && (
                        <div>
                          <p>{award.address}</p>
                        </div>
                      )}
                      <div className='flex justify-between'>
                        <span>Coordinates:</span>
                        <span>{award.latitude}, {award.longitude}</span>
                      </div>
                      <div className='flex justify-between'>
                        <span>Unlock Radius:</span>
                        <span>{formatDistance(Number(award.allowed_radius))}</span>
                      </div>
                    </div>

                    <div className='mt-4 flex flex-col sm:flex-row gap-3'>
                      <div className='flex w-full'>
                        <Button variant='outline' className='rounded-full hover:bg-[#151E3A] dark:text-[#5871A7] hover:text-white w-full'>
                          <a
                            href={`https://www.google.com/maps?q=${award.latitude},${award.longitude}`}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='p-4'
                          >
                            📍 Open in Maps
                          </a>
                        </Button>
                      </div>

                      <div className='flex w-full'>
                        <Button variant='outline' className='rounded-full hover:bg-[#151E3A] dark:text-[#5871A7] hover:text-white w-full'>
                          <a
                            href={`https://www.google.com/maps?q=&layer=c&cbll=${award.latitude},${award.longitude}`}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='p-4'
                          >
                            🗺️ Street View
                          </a>
                        </Button>
                      </div>

                    </div>
                  </div>

)}
              </div>

            </div>
          </div>
        </div>
      </div>

{/* Media Preview Modal */}
{selectedMedia && (
  <div 
    className='fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4'
    onClick={() => setSelectedMedia(null)}
  >
    <button
      onClick={() => setSelectedMedia(null)}
      className='absolute top-4 right-4 text-white hover:text-gray-300'
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
                    // // ===== GPS / LOCATION DATA =====
                    // EXIF.getTag(this, "GPSAltitude");          // Altitude in meters
                    // EXIF.getTag(this, "GPSAltitudeRef");       // 0 = above sea level, 1 = below
                    // EXIF.getTag(this, "GPSSpeed");             // Speed of movement
                    // EXIF.getTag(this, "GPSSpeedRef");          // 'K' (km/h), 'M' (mph), 'N' (knots)
                    // EXIF.getTag(this, "GPSImgDirection");      // Direction camera was pointing
                    // EXIF.getTag(this, "GPSImgDirectionRef");   // 'T' (true north), 'M' (magnetic north)
                    // // ===== CAMERA / DEVICE INFO =====
                    // EXIF.getTag(this, "Make");                 // Camera/Phone manufacturer (e.g., "Apple", "Canon")
                    // EXIF.getTag(this, "Model");                // Camera/Phone model (e.g., "iPhone 14 Pro")
                    // EXIF.getTag(this, "Software");             // Software/OS version
                    // EXIF.getTag(this, "LensModel");            // Lens model name
                    // EXIF.getTag(this, "LensMake");             // Lens manufacturer
                    // // ===== DATE & TIME =====
                    // EXIF.getTag(this, "DateTime");             // Date/time image was changed (YYYY:MM:DD HH:MM:SS)
                    // EXIF.getTag(this, "DateTimeOriginal");     // Date/time image was taken (original)
                    // EXIF.getTag(this, "DateTimeDigitized");    // Date/time image was digitized
                    // EXIF.getTag(this, "SubSecTime");           // Sub-second time (milliseconds)
                    // EXIF.getTag(this, "SubSecTimeOriginal");   // Sub-second time for original
                    // EXIF.getTag(this, "SubSecTimeDigitized");  // Sub-second time for digitized
                    // // ===== CAMERA SETTINGS =====
                    // EXIF.getTag(this, "FNumber");              // F-stop (e.g., 2.8)
                    // EXIF.getTag(this, "ExposureTime");         // Shutter speed (e.g., 1/250)
                    // EXIF.getTag(this, "ISO");                  // ISO speed (e.g., 100, 400, 3200)
                    // EXIF.getTag(this, "ISOSpeedRatings");      // ISO speed ratings (alternative)
                    // EXIF.getTag(this, "ShutterSpeedValue");    // Shutter speed in APEX units
                    // EXIF.getTag(this, "ApertureValue");        // Aperture in APEX units
                    // EXIF.getTag(this, "BrightnessValue");      // Brightness in APEX units
                    // EXIF.getTag(this, "ExposureBias");         // Exposure compensation (e.g., +0.7, -1.3)
                    // EXIF.getTag(this, "ExposureProgram");      // Exposure mode (1=Manual, 2=Normal, 3=Aperture priority)
                    // EXIF.getTag(this, "ExposureMode");         // 0=Auto, 1=Manual, 2=Auto bracket
                    // EXIF.getTag(this, "MeteringMode");         // Light metering mode
                    // EXIF.getTag(this, "Flash");                // Flash fired/not fired
                    // EXIF.getTag(this, "FocalLength");          // Focal length in mm (e.g., 50mm)
                    // EXIF.getTag(this, "FocalLengthIn35mmFilm"); // 35mm equivalent focal length
                    // EXIF.getTag(this, "WhiteBalance");         // 0=Auto, 1=Manual
                    // EXIF.getTag(this, "SceneCaptureType");     // 0=Standard, 1=Landscape, 2=Portrait, 3=Night
                    // // ===== IMAGE PROPERTIES =====
                    // EXIF.getTag(this, "PixelXDimension");      // Image width in pixels
                    // EXIF.getTag(this, "PixelYDimension");      // Image height in pixels
                    // EXIF.getTag(this, "ImageWidth");           // Image width
                    // EXIF.getTag(this, "ImageHeight");          // Image height
                    // EXIF.getTag(this, "Orientation");          // Image rotation (1-8)
                    // EXIF.getTag(this, "XResolution");          // Horizontal resolution (DPI)
                    // EXIF.getTag(this, "YResolution");          // Vertical resolution (DPI)
                    // EXIF.getTag(this, "ResolutionUnit");       // 2=inches, 3=cm
                    // EXIF.getTag(this, "ColorSpace");           // Color space (1=sRGB, 65535=Uncalibrated)
                    // EXIF.getTag(this, "Compression");          // Compression method
                    // // ===== IMAGE DESCRIPTION =====
                    // EXIF.getTag(this, "ImageDescription");     // Image title/description
                    // EXIF.getTag(this, "Artist");               // Photographer name
                    // EXIF.getTag(this, "Copyright");            // Copyright notice
                    // EXIF.getTag(this, "UserComment");          // User comments
                    // // ===== ADVANCED SETTINGS =====
                    // EXIF.getTag(this, "SensingMethod");        // Image sensor type
                    // EXIF.getTag(this, "SceneType");            // Scene type
                    // EXIF.getTag(this, "CustomRendered");       // 0=Normal, 1=Custom
                    // EXIF.getTag(this, "GainControl");          // Gain control
                    // EXIF.getTag(this, "Contrast");             // 0=Normal, 1=Low, 2=High
                    // EXIF.getTag(this, "Saturation");           // 0=Normal, 1=Low, 2=High
                    // EXIF.getTag(this, "Sharpness");            // 0=Normal, 1=Soft, 2=Hard
                    // EXIF.getTag(this, "DigitalZoomRatio");     // Digital zoom ratio
                    // EXIF.getTag(this, "SubjectDistance");      // Distance to subject in meters
                    // EXIF.getTag(this, "SubjectDistanceRange"); // 0=Unknown, 1=Macro, 2=Close, 3=Distant
                    // // ===== THUMBNAIL =====
                    // EXIF.getTag(this, "ThumbnailLength");      // Thumbnail size in bytes
                    // EXIF.getTag(this, "ThumbnailOffset");      // Thumbnail offset
                    // // ===== OTHER METADATA =====
                    // EXIF.getTag(this, "FileSource");           // 3=Digital camera
                    // EXIF.getTag(this, "SceneType");            // 1=Directly photographed
                    // EXIF.getTag(this, "CFAPattern");           // Color filter array pattern
                    // EXIF.getTag(this, "ComponentsConfiguration"); // Component configuration
                    if (lat && lon) {

                      // @ts-ignore
                      const latRef = EXIF.getTag(this, "GPSLatitudeRef");
                      // @ts-ignore
                      const lonRef = EXIF.getTag(this, "GPSLongitudeRef");
                      // @ts-ignore
                      const cGPSDateStamp = EXIF.getTag(this, "GPSDateStamp"); // Date (YYYY:MM:DD)
                      // @ts-ignore
                      const cGPSTimeStamp = EXIF.getTag(this, "GPSTimeStamp"); // Time (UTC)

                      const latitude = lat[0] + lat[1]/60 + lat[2]/3600 * (latRef === 'S' ? -1 : 1);
                      const longitude = lon[0] + lon[1]/60 + lon[2]/3600 * (lonRef === 'W' ? -1 : 1);
                      
                      // Display location on screen
                      const locationDiv = document.getElementById('media-location');

                      if (locationDiv) {
                        locationDiv.innerHTML = `
                          <div style="background: rgba(0,0,0,0.8); color: white; padding: 12px 16px; border-radius: 8px; backdrop-filter: blur(4px);">
                            <p style="font-weight: 600; margin-bottom: 4px; display: flex; align-items: center; gap: 8px;">
                              📍 Image Location
                            </p>
                            <p style="font-size: 14px; margin-bottom: 4px;">
                              Lat: ${latitude.toFixed(6)}, Lon: ${longitude.toFixed(6)}
                            </p>
                            <hr>
                              Date: ${cGPSDateStamp}, Time: ${cGPSTimeStamp}
                            <br>
                            <a 
                              href="https://www.google.com/maps?q=${latitude},${longitude}" 
                              target="_blank"
                              rel="noopener noreferrer"
                              style="color: #60a5fa; font-size: 14px; text-decoration: underline;"
                              onmouseover="this.style.color='#93c5fd'"
                              onmouseout="this.style.color='#60a5fa'"
                            >
                              View on Google Maps →
                            </a>
                          </div>
                        `;
                        console.log(`📍 Image - Lat: ${latitude.toFixed(6)}, Lon: ${longitude.toFixed(6)}`);
                      }
                    } else {
                      const locationDiv = document.getElementById('media-location');
                      if (locationDiv) {
                        locationDiv.innerHTML = `
                          <div style="background: rgba(0,0,0,0.8); color: #9ca3af; padding: 8px 16px; border-radius: 8px; backdrop-filter: blur(4px); font-size: 14px;">
                            No location data found
                          </div>
                        `;
                      }
                      console.log(`No location data found in image`);
                    }
                  });
                };
              });
            }}
          />
          <div id="media-location" style={{ position: 'absolute', bottom: '16px', left: '16px', maxWidth: '384px', zIndex: 10 }}></div>
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
              fetch(videoElement.src).then(r => r.arrayBuffer()).then(buffer => {
                const view = new DataView(buffer.slice(0, 100000));
                let offset = 0;
                let found = false;
                
                while (offset < view.byteLength - 8) {
                  const size = view.getUint32(offset);
                  const type = String.fromCharCode(view.getUint8(offset+4), view.getUint8(offset+5), view.getUint8(offset+6), view.getUint8(offset+7));
                  if (type === '©xyz') {
                    const gps = new TextDecoder().decode(buffer.slice(offset + 16, offset + size));
                    const match = gps.match(/([+-]\d+\.\d+)([+-]\d+\.\d+)/);
                    if (match) {
                      found = true;
                      const latitude = parseFloat(match[1]);
                      const longitude = parseFloat(match[2]);
                      
                      // Display location on screen
                      const locationDiv = document.getElementById('media-location-video');
                      if (locationDiv) {
                        locationDiv.innerHTML = `
                          <div style="background: rgba(0,0,0,0.8); color: white; padding: 12px 16px; border-radius: 8px; backdrop-filter: blur(4px);">
                            <p style="font-weight: 600; margin-bottom: 4px; display: flex; align-items: center; gap: 8px;">
                              📍 Video Location
                            </p>
                            <p style="font-size: 14px; margin-bottom: 4px;">
                              Lat: ${latitude.toFixed(6)}, Lon: ${longitude.toFixed(6)}
                            </p>
                            <a 
                              href="https://www.google.com/maps?q=${latitude},${longitude}" 
                              target="_blank"
                              rel="noopener noreferrer"
                              style="color: #60a5fa; font-size: 14px; text-decoration: underline;"
                              onmouseover="this.style.color='#93c5fd'"
                              onmouseout="this.style.color='#60a5fa'"
                            >
                              View on Google Maps →
                            </a>
                          </div>
                        `;
                        console.log(`📍 Video - Lat: ${latitude.toFixed(6)}, Lon: ${longitude.toFixed(6)}`);
                      }
                    }
                    break;
                  }
                  offset += size || 8;
                }
                
                if (!found) {
                  const locationDiv = document.getElementById('media-location-video');
                  if (locationDiv) {
                    locationDiv.innerHTML = `
                      <div style="background: rgba(0,0,0,0.8); color: #9ca3af; padding: 8px 16px; border-radius: 8px; backdrop-filter: blur(4px); font-size: 14px;">
                        No location data found
                      </div>
                    `;
                    console.log(`No location data found in video`);
                  }
                }
              });
            }}
          />
          <div id="media-location-video" style={{ position: 'absolute', bottom: '16px', left: '16px', maxWidth: '384px', zIndex: 10 }}></div>
        </div>
      )}
    </div>
  </div>
)}

      {/* Media Preview Modal */}
      {/* {selectedMedia && (
        <div 
          className='fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4'
          onClick={() => setSelectedMedia(null)}
        >
          <button
            onClick={() => setSelectedMedia(null)}
            className='absolute top-4 right-4 text-white hover:text-gray-300'
          >
            <X className='h-8 w-8' />
          </button>
          <div className='max-w-4xl w-full' onClick={(e) => e.stopPropagation()}>
            {selectedMedia.type === 'image' ? (
              <img
                src={selectedMedia.url}
                alt='Preview'
                className='w-full h-auto max-h-[80vh] object-contain rounded-lg' 
              />
            ) : (
              <video
                src={selectedMedia.url}
                controls
                autoPlay
                className='w-full h-auto max-h-[80vh] rounded-lg'
              />
            )}
          </div>
        </div>
      )} */}

    </>
  );
};

const AcknowledgmentModal: React.FC<AcknowledgmentModalProps> = ({
  isOpen,
  onClose,
  type,
  data,
}) => {
  if (!isOpen) return null;

  const getModalContent = () => {
    switch (type) {
      case 'out_of_range':
        return {
          icon: <MapPin className='h-12 w-12 text-red-500 mx-auto mb-4' />,
          title: "You're Out of Range",
          message: (
            <div className='text-center space-y-3'>
              <p className='text-gray-600 dark:text-gray-300'>
                You’re too far away from the Drop.
              </p>
              <div className='bg-red-50 dark:bg-red-900/20 p-4 rounded-lg space-y-2'>
                <p className='text-sm'>
                  <strong></strong> {data.distanceToGo} away
                </p>
                <p className='text-sm'>
                  <strong>Dropping:</strong> {data.timeInfo}
                </p>
              </div>
              <p className='text-sm text-gray-600 dark:text-gray-400'>
                Peek inside and come back when you're near.
              </p>
            </div>
          ),
          buttonText: 'Got It',
        };

      case 'out_of_time':
        return {
          icon: <Clock className='h-12 w-12 text-orange-500 mx-auto mb-4' />,
          title: 'Outside Time',
          message: (
            <div className='text-center space-y-3'>
              <p className='text-gray-600 dark:text-gray-300'>
                You’re in the right place but this Drop isn't live right now.
              </p>
              <div className='bg-red-50 dark:bg-red-900/20 p-4 rounded-lg space-y-2'>
                <p className='text-sm'>
                  <strong></strong> {data.distanceToGo} away
                </p>
                <p className='text-sm'>
                  <strong>Dropping:</strong> {data.timeInfo}
                </p>
              </div>
              <p className='text-sm text-gray-600 dark:text-gray-400'>
                Peek inside and come back when the Drop is open.
              </p>
            </div>
          ),
          buttonText: 'Got It',
        };

      case 'both_invalid':
        return {
          // icon: <AlertTriangle className='h-12 w-12 text-red-500 mx-auto mb-4' />,
          title: 'Almost there! 🔓✨',
          message: (
            <div className='text-center space-y-3'>
              <p className='text-gray-600 dark:text-gray-300'>
                You’re either too far away or this Drop isn't live right now.
              </p>
              <div className='bg-red-50 dark:bg-red-900/20 p-4 rounded-lg space-y-2'>
                <p className='text-sm text-gray-600 dark:text-gray-400'>
                  <strong></strong> {data.distanceToGo} away
                </p>
                <p className='text-sm text-gray-600 dark:text-gray-400'>
                  <strong>Dropping:</strong> {data.timeInfo}
                </p>
              </div>
              <p className='text-sm text-gray-600 dark:text-gray-400'>
                Peek inside and come back when the Drop is open and you're near.
              </p>
            </div>
          ),
          buttonText: 'Got It',
        };

      case 'after_time':
        return {
          icon: <Clock className='h-12 w-12 text-orange-500 mx-auto mb-4' />,
          title: 'After Time',
          message: (
            <div className='text-center space-y-3'>
              <p className='text-gray-600 dark:text-gray-300'>
                You’re in the right place but this Drop has expired.
              </p>
              <div className='bg-red-50 dark:bg-red-900/20 p-4 rounded-lg space-y-2'>
                <p className='text-sm'>
                  <strong></strong> {data.distanceToGo} away
                </p>
                <p className='text-sm'>
                  <strong>Dropped:</strong> {data.timeInfo}
                </p>
              </div>
              <p className='text-sm text-gray-600 dark:text-gray-400'>
                Peek inside and find out what it was about though.
              </p>
            </div>
          ),
          buttonText: 'Got It',
        };

      default:
        return null;
    }
  };

  const content = getModalContent();
  if (!content) return null;

  return (
    <div className='fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4'>
      <div className='bg-white dark:bg-[#151E3A] rounded-xl max-w-md w-full p-6 relative'>
        <button
          onClick={onClose}
          className='absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
        >
          <X className='h-5 w-5' />
        </button>

        {content.icon}

        <h2 className='text-xl font-bold text-center mb-4 dark:text-white'>
          {content.title}
        </h2>

        <div className='mb-6'>{content.message}</div>

        <div className='flex gap-3'>
          <Button
            onClick={onClose}
            className='flex-1 geo-claim-button'
          >
            {content.buttonText}
          </Button>

          {/* <Button
            variant='outline'
            onClick={() => {
              const url = `https://www.google.com/maps/dir/?api=1&destination=${data.award.latitude},${data.award.longitude}`;
              window.open(url, '_blank');
            }}
            className='flex-1 rounded-full'
          >
            Get Directions
          </Button> */}
        </div>
      </div>
    </div>
  );
};

export default AwardDetailsPage;