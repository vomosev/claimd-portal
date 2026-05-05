'use client';

import React, { useEffect, useState, useRef } from 'react';
import { ChevronLeft, Heart, MessageCircle, Send, Bookmark, MoreHorizontal, X, Play } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
// import "./css/HomePage.css";

declare const EXIF: any;

interface GalleryImage {
  id?: number;
  url: string;
  filename: string;
  timestamp: string;
  size: number;
  awardid: string;
  userid: string;
  type?: string;
  likes?: number;
  comments?: number;
  caption?: string;
  imageurl?: string;
  isLiked?: boolean;
}

interface MediaLocation {
  latitude: number;
  longitude: number;
  type: string;
}

interface Comment {
  id: number;
  comment: string;
  userid: string;
  displayname: string;
  imageurl: string;
  timestamp: string;
  awardid: string;
  galleryid: string;
}

const InstagramGallery = () => {
  const router = useRouter();

  const worldId = process.env.NEXT_PUBLIC_WORLDID || "0";
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://nodejs.gridiron-app.com';
  
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [mediaLocation, setMediaLocation] = useState<MediaLocation | null>(null);
  const [exifLoaded, setExifLoaded] = useState(false);
  const [cssLoading, setCssLoading] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const currentUser = localStorage.getItem('username') ?? '';
  const [totalLikesCount, setTotalLikesCount] = useState<number>(0);
  const [totalCommentsCount, setTotalCommentsCount] = useState<number>(0);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const params = useParams();
  const awardId = params?.id as string;
  const observerTarget = useRef<HTMLDivElement>(null);
  const isFetchingRef = useRef(false);
  const [dropName, setDropName] = useState<string>('Drop Memories');

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
        headers: { 'Accept': 'text/css,*/*' },
      });
      const cssText = await response.text();
      const cleanCssText = cssText.replace(/<[^>]*>/g, '');
      injectCSS(cleanCssText);
    } catch (error) {
      console.error('Error fetching CSS:', error);
    } finally {
      setCssLoading(false);
    }
  };

  useEffect(() => {
    // fetchAndApplyCSS();
  }, []);

  useEffect(() => {
    if (awardId) {
      getDropName(awardId).then(name => setDropName(name));
    }
  }, [awardId]);

  useEffect(() => {
    const existingScript = document.querySelector('script[src*="exif-js"]');
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/exif-js';
      script.async = true;
      script.onload = () => setExifLoaded(true);
      document.body.appendChild(script);
    } else {
      setExifLoaded(true);
    }
  }, []);

  // Prevent body scroll when modal is open and handle keyboard
  useEffect(() => {
    if (selectedImage) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';

      // Handle input focus for mobile keyboard
      const handleResize = () => {
        if (document.activeElement === inputRef.current) {
          setTimeout(() => {
            inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 300);
        }
      };

      window.addEventListener('resize', handleResize);
      
      return () => {
        const scrollY = document.body.style.top;
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [selectedImage]);

  const isVideo = (url: string) => {
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi'];
    return videoExtensions.some(ext => url.toLowerCase().includes(ext));
  };

  // Fetch asset name for the award (for header)
  const getDropName = async (awardid: string): Promise<string> => {
    try {
      const response = await fetch(`${apiUrl}/awards/list/${awardid}`);
      const data = await response.json();
      return `${data?.assetname}`;
    } catch (error) {
      console.error('Error fetching drop name:', error);
      return 'Drop Memories';
    }
  };

  // Fetch likes count for specific gallery image
  const fetchLikesCountForGallery = async (galleryid: number) => {
    try {
      const response = await fetch(`${apiUrl}/getlikes?galleryid=${galleryid}`);
      const data = await response.json();
      return data.success ? (data.total || 0) : 0;
    } catch (error) {
      console.error('Error fetching likes for gallery:', error);
      return 0;
    }
  };

  // Fetch comments count for specific gallery image
  const fetchCommentsCountForGallery = async (galleryid: number) => {
    try {
      const response = await fetch(`${apiUrl}/getcomments/count?galleryid=${galleryid}`);
      const data = await response.json();
      return data.success ? (data.count || 0) : 0;
    } catch (error) {
      console.error('Error fetching comments count for gallery:', error);
      return 0;
    }
  };

  // Check if user has liked this specific gallery image
  const checkIfLikedForGallery = async (galleryid: number) => {
    try {
      const response = await fetch(`${apiUrl}/getlikes?galleryid=${galleryid}&userid=${currentUser}`);
      const data = await response.json();
      return data.success && data.total && data.total > 0;
    } catch (error) {
      console.error('Error checking like status:', error);
      return false;
    }
  };

  // Fetch total likes count for entire award (for header)
  const fetchTotalLikesCount = async (awardid: string) => {
    try {
      const response = await fetch(`${apiUrl}/getlikes?awardid=${awardid}`);
      const data = await response.json();
      return data.success ? (data.total || 0) : 0;
    } catch (error) {
      console.error('Error fetching total likes:', error);
      return 0;
    }
  };

  // Fetch total comments count for entire award (for header)
  const fetchTotalCommentsCount = async (awardid: string) => {
    try {
      const response = await fetch(`${apiUrl}/getcomments/count?awardid=${awardid}`);
      const data = await response.json();
      return data.success ? (data.count || 0) : 0;
    } catch (error) {
      console.error('Error fetching total comments count:', error);
      return 0;
    }
  };

  const fetchImages = async (currentPage: number) => {
    if (!awardId || isFetchingRef.current) return;

    isFetchingRef.current = true;
    setLoading(true);

    try {
      const url = `${apiUrl}/getgallery?awardid=${awardId}&page=${currentPage}&limit=20`;
      const response = await fetch(url);
      const result = await response.json();

      if (result.success && result.data) {
        let dataArray = Array.isArray(result.data) ? result.data : [result.data];
        
        // Fetch likes and comments for each individual gallery image
        const imagesWithCounts = await Promise.all(
          dataArray.map(async (item: any) => {
            const galleryId = item.id;
            
            const [likesCount, commentsCount, isLiked] = await Promise.all([
              fetchLikesCountForGallery(galleryId),
              fetchCommentsCountForGallery(galleryId),
              checkIfLikedForGallery(galleryId)
            ]);

            return {
              id: item.id,
              url: item.publicurl || item.imageurl,
              filename: item.filename,
              userid: item.displayname || item.userid || 'anonymous',
              awardid: item.awardid,
              type: isVideo(item.publicurl || item.imageurl) ? 'video' : 'image',
              timestamp: item.timestamp,
              size: item.size || 0,
              likes: likesCount,
              comments: commentsCount,
              caption: item.caption || item.title || 'Check out this amazing moment!',
              imageurl: `https://ui-avatars.com/api/?name=${item.displayname || item.userid}&background=random`,
              isLiked: isLiked
            };
          })
        );

        setImages(prev => currentPage === 1 ? imagesWithCounts : [...prev, ...imagesWithCounts]);
        setHasMore(result.pagination?.hasNextPage || false);

        // Update total counts for header (only on first page)
        if (currentPage === 1) {
          const [totalLikes, totalComments] = await Promise.all([
            fetchTotalLikesCount(awardId),
            fetchTotalCommentsCount(awardId)
          ]);
          setTotalLikesCount(totalLikes);
          setTotalCommentsCount(totalComments);
        }
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      setHasMore(false);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  // Fetch comments for specific gallery image
  const fetchComments = async (galleryid: number) => {
    setCommentsLoading(true);
    try {
      const response = await fetch(`${apiUrl}/getcomments?galleryid=${galleryid}&page=1&limit=50`);
      const data = await response.json();
      
      if (data.success && data.data) {
        setComments(data.data);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setCommentsLoading(false);
    }
  };

  // Add a new comment
  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedImage?.awardid || !selectedImage?.id) {
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/addcomment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comment: newComment,
          imageurl: `https://ui-avatars.com/api/?name=${currentUser}&background=random`,
          title: dropName,
          userid: currentUser,
          publicurl: selectedImage.url,
          awardid: selectedImage.awardid,
          caption: selectedImage.caption,
          galleryid: selectedImage.id
        })
      });

      const result = await response.json();

      if (result.success) {
        const newCommentObj: Comment = {
          id: result.data.id || Date.now(),
          comment: newComment,
          userid: currentUser,
          displayname: currentUser,
          galleryid: String(selectedImage.id),
          awardid: selectedImage.awardid,
          imageurl: `https://ui-avatars.com/api/?name=${currentUser}&background=random`,
          timestamp: new Date().toISOString()
        };
        
        setComments(prev => [...prev, newCommentObj]);
        setNewComment('');

        // Blur input to hide keyboard
        inputRef.current?.blur();

        // Scroll to bottom after adding comment
        setTimeout(() => {
          commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);

        // Update comment count
        const newCommentsCount = (selectedImage.comments || 0) + 1;
        
        setImages(prev => prev.map(img => 
          img.id === selectedImage.id 
            ? { ...img, comments: newCommentsCount }
            : img
        ));

        setSelectedImage({
          ...selectedImage,
          comments: newCommentsCount
        });

        setTotalCommentsCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  // Toggle like
  const handleLike = async (image: GalleryImage) => {
    if (!image.awardid || !image.id) return;

    try {
      if (image.isLiked) {
        const response = await fetch(`${apiUrl}/deletelike`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            galleryid: image.id,
            awardid: image.awardid,
            userid: currentUser
          })
        });

        if (response.ok) {
          const newLikesCount = Math.max(0, (image.likes || 0) - 1);
          
          setImages(prev => prev.map(img => 
            img.id === image.id 
              ? { ...img, likes: newLikesCount, isLiked: false }
              : img
          ));

          if (selectedImage && selectedImage.id === image.id) {
            setSelectedImage({
              ...selectedImage,
              likes: newLikesCount,
              isLiked: false
            });
          }

          setTotalLikesCount(prev => Math.max(0, prev - 1));
        }
      } else {
        const response = await fetch(`${apiUrl}/addlike`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            awardid: image.awardid,
            galleryid: image.id,
            userid: currentUser,
            displayname: currentUser,
            publicurl: image.url,
            imageurl: `${apiUrl}/getdp/?name=${currentUser}&background=random`
          })
        });

        const result = await response.json();

        if (result.success) {
          const newLikesCount = (image.likes || 0) + 1;
          
          setImages(prev => prev.map(img => 
            img.id === image.id 
              ? { ...img, likes: newLikesCount, isLiked: true }
              : img
          ));

          if (selectedImage && selectedImage.id === image.id) {
            setSelectedImage({
              ...selectedImage,
              likes: newLikesCount,
              isLiked: true
            });
          }

          setTotalLikesCount(prev => prev + 1);
        }
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  useEffect(() => {
    if (awardId) {
      setImages([]);
      setPage(1);
      setTotalLikesCount(0);
      setTotalCommentsCount(0);
      fetchImages(1);
    }
  }, [awardId]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading && !isFetchingRef.current) {
          setPage(prev => {
            const nextPage = prev + 1;
            fetchImages(nextPage);
            return nextPage;
          });
        }
      },
      { threshold: 0.1 }
    );

    const target = observerTarget.current;
    if (target) observer.observe(target);

    return () => {
      if (target) observer.unobserve(target);
    };
  }, [hasMore, loading]);

  const extractImageLocation = (imgSrc: string) => {
    if (!exifLoaded || typeof EXIF === 'undefined') return;

    setMediaLocation(null);

    fetch(imgSrc)
      .then(r => r.blob())
      .then(blob => {
        const img = document.createElement('img');
        img.src = URL.createObjectURL(blob);
        
        img.onload = () => {
          EXIF.getData(img, function(this: any) {
            const lat = EXIF.getTag(this, "GPSLatitude");
            const lon = EXIF.getTag(this, "GPSLongitude");
            
            if (lat && lon) {
              const latRef = EXIF.getTag(this, "GPSLatitudeRef");
              const lonRef = EXIF.getTag(this, "GPSLongitudeRef");
              const latitude = lat[0] + lat[1]/60 + lat[2]/3600 * (latRef === 'S' ? -1 : 1);
              const longitude = lon[0] + lon[1]/60 + lon[2]/3600 * (lonRef === 'W' ? -1 : 1);
              
              setMediaLocation({ latitude, longitude, type: 'Image' });
            }
            URL.revokeObjectURL(img.src);
          });
        };
      })
      .catch(err => console.error('EXIF error:', err));
  };

  const handleImageClick = (image: GalleryImage) => {
    setSelectedImage(image);
    setMediaLocation(null);
    setComments([]);
    
    if (image.id) {
      fetchComments(image.id);
    }
    
    if (image.type === 'image') {
      setTimeout(() => extractImageLocation(image.url), 100);
    }
  };

  const handleCloseModal = () => {
    setSelectedImage(null);
    setMediaLocation(null);
    setComments([]);
  };

  const timeAgo = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return seconds + "s";
    if (seconds < 3600) return Math.floor(seconds / 60) + "m";
    if (seconds < 86400) return Math.floor(seconds / 3600) + "h";
    if (seconds < 2592000) return Math.floor(seconds / 86400) + "d";
    if (seconds < 31536000) return Math.floor(seconds / 2592000) + "mo";
    return Math.floor(seconds / 31536000) + "y";
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-semibold">{dropName}</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Heart className="h-5 w-5" />
              <span>{(totalLikesCount || 0).toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MessageCircle className="h-5 w-5" />
              <span>{(totalCommentsCount || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1 md:gap-2">
          {images.map((image, index) => (
            <div
              key={image.id || `${image.filename}-${index}`}
              className="relative aspect-square bg-gray-200 dark:bg-gray-700 cursor-pointer group overflow-hidden"
              onClick={() => handleImageClick(image)}
            >
              {image.type === 'video' ? (
                <>
                  <video
                    src={image.url}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors pointer-events-none">
                    <Play className="h-12 w-12 text-white" fill="white" />
                  </div>
                </>
              ) : (
                <img
                  src={image.url}
                  alt={image.filename}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => (e.currentTarget.src = 'https://www.ega-tech.co.uk/wp-content/uploads/2025/06/Frame-57.svg')}
                />
              )}
              
              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                <div className="flex gap-6 text-white">
                  <div className="flex items-center gap-2">
                    <Heart className="h-6 w-6" fill={image.isLiked ? "white" : "none"} />
                    <span className="font-semibold">{(image.likes || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-6 w-6" fill="white" />
                    <span className="font-semibold">{(image.comments || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {loading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100" />
          </div>
        )}

        <div ref={observerTarget} className="h-10" />

        {!hasMore && images.length > 0 && <div className="text-center py-8 text-gray-500">You've reached the end</div>}
        {!loading && images.length === 0 && <div className="text-center py-20 text-gray-500 text-lg">No images found</div>}
      </div>

      {/* Instagram-Style Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black/95 z-[100]"
          onClick={handleCloseModal}
          style={{ 
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100dvh', // Use dvh for dynamic viewport height
            overflow: 'hidden'
          }}
        >
          {/* Close button - Top right corner */}
          <button 
            onClick={handleCloseModal}
            className="absolute top-2 right-2 md:top-4 md:right-4 z-[110] text-white hover:text-gray-300 bg-black/50 hover:bg-black/70 rounded-full p-2 transition-all touch-manipulation"
            aria-label="Close"
          >
            <X className="h-6 w-6 md:h-8 md:w-8" strokeWidth={2.5} />
          </button>

          <div 
            className="w-full h-full md:max-w-7xl md:max-h-[90vh] md:mx-auto flex flex-col md:flex-row bg-black"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxHeight: '100dvh',
              height: '100dvh',
              maxWidth: '100vw',
              overflow: 'hidden'
            }}
          >
            {/* Left: Media */}
            <div className="flex-1 flex items-center justify-center bg-black relative overflow-hidden h-[40vh] md:h-auto">
              {selectedImage.type === 'video' ? (
                <video
                  src={selectedImage.url}
                  controls
                  autoPlay
                  playsInline
                  controlsList="nodownload"
                  className="w-full h-full object-contain"
                />
              ) : (
                <img
                  src={selectedImage.url}
                  alt={selectedImage.filename}
                  className="w-full h-full object-contain"
                />
              )}
              
              {mediaLocation && (
                <div className="absolute bottom-4 left-4 bg-black/80 text-white px-4 py-3 rounded-lg backdrop-blur-sm z-10">
                  <p className="font-semibold mb-1">📍 Location</p>
                  <p className="text-sm">{mediaLocation.latitude.toFixed(6)}, {mediaLocation.longitude.toFixed(6)}</p>
                </div>
              )}
            </div>

            {/* Right: Comments Sidebar */}
            <div 
              className="w-full md:w-[400px] bg-white dark:bg-gray-800 flex flex-col"
              style={{ 
                height: '60vh',
                maxHeight: '60dvh'
              }}
            >
              {/* Header */}
              <div className="flex items-center gap-3 p-4 border-b dark:border-gray-700 flex-shrink-0">
                <img 
                  src={selectedImage.imageurl} 
                  alt={selectedImage.userid} 
                  className="w-10 h-10 rounded-full object-cover"
                  onError={(e) => (e.currentTarget.src = 'https://www.ega-tech.co.uk/wp-content/uploads/2025/06/Frame-57.svg')}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{selectedImage.userid}</p>
                  <p className="text-xs text-gray-500">{timeAgo(selectedImage.timestamp)}
                    <button 
                    onClick={handleCloseModal}
                    className="md:hidden text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 rounded-full p-1 transition-all touch-manipulation"
                    aria-label="Close"
                    >
                    <X className="h-6 w-6" strokeWidth={2.5} />
                    </button>
                  </p>
                </div>
              </div>

              {/* Comments Area (Scrollable) */}
              <div 
                className="flex-1 overflow-y-auto p-4 space-y-4 overscroll-contain"
                style={{ 
                  WebkitOverflowScrolling: 'touch',
                  scrollbarWidth: 'thin'
                }}
              >
                {/* Original Caption */}
                <div className="flex gap-3">
                  <img 
                    src={selectedImage.imageurl} 
                    alt={selectedImage.userid} 
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm break-words">
                      <span className="font-semibold mr-2">{selectedImage.userid}</span>
                      {selectedImage.caption}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{timeAgo(selectedImage.timestamp)}</p>
                  </div>
                </div>

                {/* Loading Comments */}
                {commentsLoading && (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-gray-100" />
                  </div>
                )}

                {/* Comments List */}
                {comments.map(comment => (
                  <div key={comment.id} className="flex gap-3">
                    <img 
                      src={comment.imageurl} 
                      alt={comment.displayname} 
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                      onError={(e) => (e.currentTarget.src = 'https://www.ega-tech.co.uk/wp-content/uploads/2025/06/Frame-57.svg')}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm break-words">
                        <span className="font-semibold mr-2">{comment.displayname}</span>
                        {comment.comment}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{timeAgo(comment.timestamp)}</p>
                    </div>
                  </div>
                ))}

                {/* No Comments */}
                {!commentsLoading && comments.length === 0 && (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    No comments yet. Be the first to comment!
                  </div>
                )}
                
                {/* Scroll anchor */}
                <div ref={commentsEndRef} />
              </div>

              {/* Location Info */}
              {mediaLocation && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-t dark:border-gray-700 flex-shrink-0">
                  <p className="font-semibold mb-2 text-sm">📍 Location</p>
                  <p className="text-xs mb-2">
                    {mediaLocation.latitude.toFixed(6)}, {mediaLocation.longitude.toFixed(6)}
                  </p>
                  <a 
                    href={`https://www.google.com/maps?q=${mediaLocation.latitude},${mediaLocation.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 text-xs underline"
                  >
                    View on Google Maps →
                  </a>
                </div>
              )}

              {/* Actions Footer - Fixed at bottom with safe-area-inset */}
              <div 
                className="border-t dark:border-gray-700 flex-shrink-0 bg-white dark:bg-gray-800"
                style={{
                  paddingBottom: 'env(safe-area-inset-bottom, 0px)'
                }}
              >
                <div className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-4">
                    <button onClick={() => handleLike(selectedImage)} className="touch-manipulation">
                      <Heart 
                        className={`h-6 w-6 transition-colors ${selectedImage.isLiked ? 'fill-red-500 text-red-500' : ''}`}
                      />
                    </button>
                    <span className="text-sm">{(selectedImage.likes || 0).toLocaleString()} likes</span>
                    <span className="text-sm text-gray-500">{(selectedImage.comments || 0).toLocaleString()} comments</span>
                  </div>
                </div>

                {/* Add Comment Input */}
                <div className="flex items-center gap-2 p-3 border-t dark:border-gray-700">
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Add a comment..."
                    className="flex-1 bg-transparent outline-none text-sm dark:text-white min-w-0"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddComment();
                      }
                    }}
                  />
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleAddComment();
                    }}
                    disabled={!newComment.trim()}
                    className={`font-semibold text-sm px-3 py-2 rounded touch-manipulation flex-shrink-0 ${newComment.trim() ? 'text-blue-500 hover:text-blue-600 active:text-blue-700' : 'text-gray-400 cursor-not-allowed'}`}
                  >
                    Post
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstagramGallery;
