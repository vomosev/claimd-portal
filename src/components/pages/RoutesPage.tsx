'use client';

import { MapPin } from 'lucide-react';
import React, { useEffect, useRef } from 'react';
import RoutesForm from '../shared/RoutesForm';


const RoutesPage = () => {
  const mapRef = useRef(null);

  useEffect(() => {
    const initMap = () => {
      // @ts-ignore
      if (window.google && mapRef.current) {
        // @ts-ignore
        new window.google.maps.Map(mapRef.current, {
          center: { lat: 52.4862, lng: -1.8904 }, // Birmimgham default
          zoom: 13,
        });
      }
    };

    const loadGoogleMapsScript = () => {
      if (!document.getElementById('googleMaps')) {
        const script = document.createElement('script');
        script.id = 'googleMaps';
        script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_MAPS_API_KEY}`;
        script.async = true;
        script.defer = true;
        script.onload = initMap;
        document.body.appendChild(script);
      } else {
        initMap();
      }
    };

    loadGoogleMapsScript();
  }, []);

  return (
    <div>
      <div className="flex justify-between items-end">
        <h1 className="text-xl md:text-3xl font-semibold">Routes</h1>
        <div className="flex gap-1 bg-white dark:bg-[#1C2541] dark:border dark:border-[#2E4066] items-center rounded-[10px] p-3">
          <MapPin className="text-geodrops" />
          <span> My Location (100m)</span>
        </div>
      </div>
      <div className="w-full h-[500px] bg-white overflow-hidden mt-6 rounded-3xl flex">
        <div className="w-[38%] h-full">
          <RoutesForm />
        </div>
        <div ref={mapRef} className="w-[62%] h-full" />
      </div>
    </div>
  );
};

export default RoutesPage;
