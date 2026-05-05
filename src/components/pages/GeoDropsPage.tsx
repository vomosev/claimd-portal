"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import GeoDropsCard from "../shared/GeoDropCard";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Award } from "@/services/api";
import dummyImg from "@/assets/dummy-card-image.png";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

// Add TypeScript declaration for google on window
declare global {
  interface Window {
    google: any;
  }
}

const GeoDropsPage = () => {
  const mapRef = useRef(null);
  const [awards, setAwards] = useState<Award[]>([]);
  const [map, setMap] = useState<any>(null);
  const [currentInfoWindow, setCurrentInfoWindow] = useState<any>(null);
  const [userLocationMarker, setUserLocationMarker] = useState<any>(null);
  const [radiusCircle, setRadiusCircle] = useState<any>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [nearbyAwards, setNearbyAwards] = useState<Award[]>([]);
  const [nearbyMarkers, setNearbyMarkers] = useState<any[]>([]); // Store nearby award markers
  const router = useRouter();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const fetchAwards = async () => {
    try {
      let target_url = `${process.env.NEXT_PUBLIC_API_URL}/awards/list`;

      if (!navigator.geolocation) {
        toast.error("Geolocation is not supported by this browser.");
      } else {
        setIsLocating(true);

        try {
          const position = await new Promise<GeolocationPosition>(
            (resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000,
              });
            }
          );

          const userLat = position.coords.latitude;
          const userLng = position.coords.longitude;
          target_url = `${process.env.NEXT_PUBLIC_API_URL}/awards/nearest/${userLat}/${userLng}`;
        } catch (geoError) {
          console.error("Error getting location:", geoError);
          // Falls back to the default target_url (awards/list)
        } finally {
          setIsLocating(false);
        }
      }

      console.log(">>>>>>>>>> target_url:", target_url);
      const { data } = await axios.get<Award[]>(target_url);
      setAwards(data);
    } catch (error) {
      console.error(error);
    }
  };

  // Function to calculate distance between two points in meters
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371e3; // Earth's radius in meters
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

  // Function to find nearby awards within 100m radius
  const findNearbyAwards = (userLat: number, userLng: number): Award[] => {
    return awards.filter((award) => {
      const distance = calculateDistance(
        userLat,
        userLng,
        Number(award.latitude),
        Number(award.longitude)
      );
      return distance <= 100; // 100 meters radius
    });
  };

  // Function to validate if image URL is accessible
  const isValidImageUrl = (url: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!url || url.trim() === "") {
        resolve(false);
        return;
      }

      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;

      // Timeout after 3 seconds
      setTimeout(() => resolve(false), 3000);
    });
  };

  // Function to create marker for an award
  const createMarkerForAward = async (
    award: Award,
    mapInstance: any,
    offsetIndex: number = 0
  ) => {
    let markerIcon;

    // Validate image URL before using it as marker icon
    if (award.awardimg && award.awardimg.trim() !== "") {
      const fullImageUrl = award.awardimg.includes("https")
        ? award.awardimg
        : `${process.env.NEXT_PUBLIC_API_URL}${award.awardimg}`;

      const isValidImage = await isValidImageUrl(fullImageUrl);

      if (isValidImage) {
        // Use custom image icon
        markerIcon = {
          url: fullImageUrl,
          scaledSize: new window.google.maps.Size(40, 40),
          origin: new window.google.maps.Point(0, 0),
          anchor: new window.google.maps.Point(20, 20),
        };
      } else {
        console.warn(
          `Invalid or inaccessible image URL for award ${award.awardid}: ${fullImageUrl}`
        );
        // Fall back to default marker
        markerIcon = {
          url: "https://nodejs.gridiron-app.com/images/1750596128139.png",
          scaledSize: new window.google.maps.Size(40, 40),
          origin: new window.google.maps.Point(0, 0),
          anchor: new window.google.maps.Point(20, 20),
        };
      }
    } else {
      // Use default marker
      markerIcon = {
        url: "https://nodejs.gridiron-app.com/images/1750596128139.png",
        scaledSize: new window.google.maps.Size(40, 40),
        origin: new window.google.maps.Point(0, 0),
        anchor: new window.google.maps.Point(20, 20),
      };
    }

    // Apply small offset for markers with same coordinates
    const baseLatitude = Number(award.latitude);
    const baseLongitude = Number(award.longitude);

    // Small offset to prevent markers from stacking (about 5-10 meters)
    const offsetDistance = 0.00005; // roughly 5-6 meters
    const offsetLat = baseLatitude + offsetIndex * offsetDistance;
    const offsetLng =
      baseLongitude +
      offsetIndex * offsetDistance * Math.cos((baseLatitude * Math.PI) / 180);

    const marker = new window.google.maps.Marker({
      position: {
        lat: offsetLat,
        lng: offsetLng,
      },
      map: mapInstance,
      title: award.assetname,
      ...(markerIcon && { icon: markerIcon }),
    });

    // Add click listener to marker
    marker.addListener("click", () => {
      handleMarkerClick(award, marker);
    });

    return marker;
  };

  // Function to handle getting user's current location
  const handleGetUserLocation = async () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by this browser.");
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;

        if (map) {
          // Center map on user location
          const userLocation = new window.google.maps.LatLng(userLat, userLng);
          map.setCenter(userLocation);
          map.setZoom(17); // Closer zoom for better detail

          // Remove existing user location marker and circle
          if (userLocationMarker) {
            userLocationMarker.setMap(null);
          }
          if (radiusCircle) {
            radiusCircle.setMap(null);
          }

          // Remove existing nearby markers
          nearbyMarkers.forEach((marker) => marker.setMap(null));
          setNearbyMarkers([]);

          // Add user location marker
          const newUserMarker = new window.google.maps.Marker({
            position: userLocation,
            map: map,
            title: "Your Location",
          });

          // Add 100m radius circle
          const newRadiusCircle = new window.google.maps.Circle({
            strokeColor: "#4285F4",
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: "#4285F4",
            fillOpacity: 0.15,
            map: map,
            center: userLocation,
            radius: 100, // 100 meters
          });

          setUserLocationMarker(newUserMarker);
          setRadiusCircle(newRadiusCircle);

          // Find nearby awards
          const nearby = findNearbyAwards(userLat, userLng);
          setNearbyAwards(nearby);

          // Create markers for nearby awards
          const newNearbyMarkers = [];
          for (let i = 0; i < nearby.length; i++) {
            const award = nearby[i];
            const marker = await createMarkerForAward(award, map, i);
            newNearbyMarkers.push(marker);
          }
          setNearbyMarkers(newNearbyMarkers);
        }

        setIsLocating(false);
      },
      (error) => {
        console.error("Error getting location:", error);
        setIsLocating(false);

        let errorMessage = "Unable to get your location. ";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += "Please allow location access and try again.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += "Location information is unavailable.";
            break;
          case error.TIMEOUT:
            errorMessage += "Location request timed out.";
            break;
          default:
            errorMessage += "An unknown error occurred.";
            break;
        }

        toast.error(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  // Function to create InfoWindow content
  const createInfoWindowContent = (award: Award) => {
    const videoLocation = award.videolocation
      ? award.videolocation.includes("https")
        ? award.videolocation
        : `${process.env.NEXT_PUBLIC_API_URL}/${award.videolocation}`
      : process.env.NEXT_PUBLIC_DEFAULT_VIDEO_URL;

    const awardImage = award.awardimg
      ? award.awardimg.includes("https")
        ? award.awardimg
        : `${process.env.NEXT_PUBLIC_API_URL}/${award.awardimg}`
      : dummyImg.src;

    const videoSection = `<div class="text-center mb-3">
      <div class="text-center w-full">
        <video controls class="w-full max-w-[300px] border border-gray-300 rounded-lg"
         poster=${awardImage}
        >
          <source src="${videoLocation}" type="video/mp4">
          Your browser does not support the video tag.
        </video>
      </div>
    </div>
    <hr class="my-3 border-0 border-t border-gray-200">
  `;
    const claimButton = `
    <button 
      onclick="window.handleClaimAward('${award.awardid}')" 
      class="bg-clgeodrops hover:opacity-60 duration-200 ease-in-out text-white rounded-full w-full p-2 cursor-pointer geo-claim-button"
    >
      View Drop
    </button>
  `;

    // Better image handling with fallback
    const imageSection = award.awardimg
      ? `
      <div class="text-center mb-3">
        <a href="${award.assetglburl || "#"}" target="_blank">
          <img src="${awardImage}" 
               class="h-[100px] rounded-lg max-w-full object-cover" 
               alt="${award.assetname}"
               onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
          <div style="display:none;" class="h-[100px] rounded-lg bg-gray-200 flex items-center justify-center">
            <span class="text-gray-500 text-sm">No Image</span>
          </div>
        </a>
      </div>
    `
      : `
      <div class="text-center mb-3">
        <a href="${award.assetglburl || "#"}" target="_blank">
          <img src="https://nodejs.gridiron-app.com/images/1750596128139.png" 
               class="h-[100px] rounded-lg max-w-full object-cover" 
               alt="${award.assetname}"
               onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
          <div style="display:none;" class="h-[100px] rounded-lg bg-gray-200 flex items-center justify-center">
            <span class="text-gray-500 text-sm">No Image</span>
          </div>
        </a>
      </div>
    `;

    return `
    <div class="text-black max-w-[300px] font-sans leading-relaxed">
        <h5 class="text-gray-800 text-base font-bold text-center mb-3">
        ${award.assetname} - ${award.locationname || "Geo Drop"} 
        ${award.certifyingbody ? `by ${award.certifyingbody}` : ""}
      </h5>
    
      ${videoSection}
      
      <div class="my-3 p-2 bg-gray-100 rounded-md">
        <p class="my-1 text-sm"><strong>Description:</strong> ${
          award.description || "No description available"
        }</p>
        <p class="my-1 text-sm"><strong>Radius:</strong> ${
          award.allowed_radius
        }m</p>
        ${
          award.address
            ? `<p class="my-1 text-sm"><strong>Address:</strong> ${award.address}</p>`
            : ""
        }
      </div>

      <div class="my-3">
        ${claimButton}
      </div>

      <div class="mt-3 pt-2 border-t border-gray-200 text-center">
        <p class="my-1 text-xs">
          <strong>
            <a href="https://www.google.com/maps?q=${award.latitude},${
      award.longitude
    }" target="_blank" class="text-blue-500 no-underline hover:text-blue-600">
              📍 Share Location
            </a> | 
            ${
              award.tokenurl
                ? `<a href="${award.tokenurl}" target="_blank" class="text-blue-500 no-underline hover:text-blue-600">🏆 View Token</a>`
                : "Token not available"
            }
          </strong>
        </p>
        <p class="my-1 text-xs">
          <a href="https://www.google.com/maps?q=&layer=c&cbll=${
            award.latitude
          },${
      award.longitude
    }" target="_blank" class="text-blue-500 no-underline hover:text-blue-600">
            <strong>🗺️ Street View</strong>
          </a>
          <br>
          <span class="text-gray-500">Lat: ${award.latitude}, Lng: ${
      award.longitude
    }</span>
        </p>
      </div>
    </div>
  `;
  };

  // Handle marker click
  const handleMarkerClick = (award: Award, marker: any) => {
    // Close any existing InfoWindow
    if (currentInfoWindow) {
      currentInfoWindow.close();
    }

    const infoWindow = new window.google.maps.InfoWindow({
      content: createInfoWindowContent(award),
    });

    // Open InfoWindow
    infoWindow.open(map, marker);
    setCurrentInfoWindow(infoWindow);

    // Add close listener
    infoWindow.addListener("closeclick", () => {
      setCurrentInfoWindow(null);
    });
  };

  // Function to check location for selected award (can be called from InfoWindow)
  const checkLocationForAward = useCallback(
    async (awardId: string) => {
      try {
        // Get current username from localStorage or your auth context
        const currentUsername = localStorage.getItem('username') ?? '';
        
        if (!currentUsername) {
          console.error('No username found');
          router.push(`/dashboard/award-details/${awardId}`);
          return;
        }

        // Call the API to check if award is claimed
        const { data } = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/isawardidclaimed/${currentUsername}/${awardId}`);

        const isClaimed = data.claimed || false;

        console.log(`Award ${awardId} claimed status:`, isClaimed, `Count: ${data.count}`);

        // Navigate with the actual claimed status
        router.push(`/dashboard/award-details/${awardId}${isClaimed ? '?mantlepiece=true' : ''}`);

      } catch (error) {
        console.error('Error checking award claimed status:', error);
        // Fallback to false if there's an error
        router.push(`/dashboard/award-details/${awardId}`);
      }
    },
    [router]
  );

  useEffect(() => {
    fetchAwards();
  }, []);

  useEffect(() => {
    // Make the claim function globally available for InfoWindow buttons
    (window as any).handleClaimAward = checkLocationForAward;

    const initialize = async () => {
      let userLat = 51.507351; // London center
      let userLng = -0.127758;

      try {
        const position = await new Promise<GeolocationPosition>(
          (resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 60000,
            });
          }
        );
        userLat = position.coords.latitude;
        userLng = position.coords.longitude;
      } catch (geoError) {
        console.error("Error getting location:", geoError);
        // Falls back to the default
      } finally {
        setIsLocating(false);
      }

      // @ts-ignore
      if (!window.google) {
        await new Promise<void>((resolve) => {
          const existingScript = document.getElementById("googleMaps");

          if (!existingScript) {
            const script = document.createElement("script");
            script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_MAPS_API_KEY}`;
            script.id = "googleMaps";
            script.async = true;
            script.defer = true;
            script.onload = () => resolve();
            document.body.appendChild(script);
          } else {
            resolve();
          }
        });
      }

      // @ts-ignore
      if (window.google && mapRef.current) {
        // @ts-ignore
        const mapInstance = new window.google.maps.Map(mapRef.current, {
          center: { lat: userLat, lng: userLng },
          zoom: 14,
        });

        setMap(mapInstance);

        // Add click listener to map to close InfoWindow
        mapInstance.addListener("click", () => {
          if (currentInfoWindow) {
            currentInfoWindow.close();
            setCurrentInfoWindow(null);
          }
        });

        // Add markers for each award with better error handling
        for (let i = 0; i < awards.length; i++) {
          const award = awards[i];
          await createMarkerForAward(award, mapInstance, 0);
        }
      }
    };

    if (awards.length > 0) {
      initialize();
    }

    // Cleanup
    return () => {
      if ((window as any).handleClaimAward) {
        delete (window as any).handleClaimAward;
      }
      // Clean up nearby markers on unmount
      nearbyMarkers.forEach((marker) => marker.setMap(null));
    };
  }, [awards]);

  // Render main Geo-Drops view
  return (
    <div className="relative">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-semibold">Map</h1>
          <Button
            onClick={handleGetUserLocation}
            disabled={isLocating}
            className="rounded-full geo-claim-button"
          >
            {isLocating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Locating...
              </>
            ) : (
              <>My Location</>
            )}
          </Button>
        </div>
        <div
          ref={mapRef}
          className="w-full h-[500px] bg-white mt-6 rounded-[20px] relative"
        />
      </div>

      <div className="mt-20">
        <h1 className="text-3xl font-semibold">Nearest</h1>
        <div className="mt-6 grid md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {awards.slice(0, 10).map((award, i) => (
            <GeoDropsCard key={award.awardid} award={award} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default GeoDropsPage;
