"use client";

import {
  useEffect,
  useState,
  useRef,
  useCallback
} from "react";

import { useRouter } from "next/navigation";

import {
  RefreshCw,
  Navigation,
  Route,
  Truck,
} from "lucide-react";

declare global {
  interface Window {
    google: any;
  }
}

interface Stop {

  id?: string | number;

  latitude: number | string;

  longitude: number | string;

  label?: string;

  address?: string;
}

export default function LogisticsRoutePlanner({
  shipmentId
}: any) {

  const router =
    useRouter();

  // =====================================================
  // REFS
  // =====================================================

  const mapRef =
    useRef<HTMLDivElement>(null);

  const mapInstanceRef =
    useRef<any>(null);

  const directionsServiceRef =
    useRef<any>(null);

  const directionsRendererRef =
    useRef<any>(null);

  const vehicleMarkerRef =
    useRef<any>(null);

  const stopMarkersRef =
    useRef<any[]>([]);

  // =====================================================
  // STATE
  // =====================================================

  const [stops, setStops] =
    useState<Stop[]>([]);

  const [currentPosition, setCurrentPosition] =
    useState<any>(null);

  const [currentHeading, setCurrentHeading] =
    useState<number | null>(null);

  const [eta, setEta] =
    useState("");

  const [distanceRemaining, setDistanceRemaining] =
    useState("");

  const [speed, setSpeed] =
    useState<number>(0);

  const [currentUsername, setCurrentUsername] = useState("");

  // =====================================================
  // HELPERS
  // =====================================================

  const isValid = (
    lat: any,
    lng: any
  ) => {

    return (
      !isNaN(Number(lat)) &&
      !isNaN(Number(lng))
    );
  };

  // =====================================================
  // LOAD GOOGLE MAPS
  // =====================================================

  const loadMaps = async () => {

    if (window.google) {
      return;
    }

    await new Promise<void>((resolve) => {

      const script =
        document.createElement("script");

      script.src =
        `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_MAPS_API_KEY}`;

      script.async = true;

      script.defer = true;

      script.onload = () => resolve();

      document.body.appendChild(script);
    });
  };

  // =====================================================
  // FETCH STOPS
  // =====================================================

  const fetchStops =
    useCallback(async () => {

      try {

        const response =
          await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/planner/${shipmentId}`
          );

        const data =
          await response.json();

        setStops(
          Array.isArray(data)
            ? data
            : data.stops || []
        );

      } catch (err) {

        console.error(
          "[STOP FETCH ERROR]",
          err
        );
      }

    }, [shipmentId]);

  // =====================================================
  // INIT MAP
  // =====================================================

  useEffect(() => {

    async function initialise() {

      await loadMaps();

      if (
        !mapRef.current ||
        mapInstanceRef.current
      ) {
        return;
      }

      const map =
        new window.google.maps.Map(
          mapRef.current,
          {

            center: {
              lat: 51.5,
              lng: -0.1,
            },

            zoom: 17,

            tilt: 45,

            mapTypeControl: false,

            fullscreenControl: false,

            streetViewControl: false,
          }
        );

      mapInstanceRef.current =
        map;

      directionsServiceRef.current =
        new window.google.maps.DirectionsService();

      directionsRendererRef.current =
        new window.google.maps.DirectionsRenderer({

          suppressMarkers: true,

          preserveViewport: true,

          polylineOptions: {

            strokeColor: "#10B981",

            strokeWeight: 6,
          }
        });

      directionsRendererRef.current.setMap(
        map
      );
    }

    initialise();

  }, []);

  // ── Read username ────────────────────────────────────────────────────────────
  useEffect(() => {
    const username = localStorage.getItem("username") ?? "";
    setCurrentUsername(username);
  }, []);

  // =====================================================
  // FETCH STOPS
  // =====================================================

  useEffect(() => {

    fetchStops();

  }, [fetchStops]);

  // =====================================================
  // LIVE GPS TRACKING
  // =====================================================

  useEffect(() => {

    if (
      !navigator.geolocation
    ) {

      console.error(
        "Geolocation unsupported"
      );

      return;
    }

    const watchId =
      navigator.geolocation.watchPosition(

        (position) => {

          const coords =
            position.coords;

          const pos = {

            lat:
              coords.latitude,

            lng:
              coords.longitude,
          };

          setCurrentPosition(pos);

          if (
            coords.heading !== null
          ) {

            setCurrentHeading(
              coords.heading
            );
          }

          if (
            coords.speed !== null
          ) {

            setSpeed(
              Math.round(
                coords.speed * 2.23694
              )
            );
          }

    try {
      const username = localStorage.getItem("username") ?? "";
      const res = fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/location`,
        {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            username:   username, 
            shipmentId: shipmentId,
            latitude:   coords.latitude,
            longitude:  coords.longitude,
            speed:      coords.speed   ?? 0,
            heading:    coords.heading ?? 0,
          }),
        }
      );
    } catch (err) {
      console.error("[FleetMap] location POST error:", err);
    }

          console.log(
            "[GPS UPDATE]",
            pos
          );
        },

        (err) => {

          console.error(
            "[GPS ERROR]",
            err
          );
        },

        {

          enableHighAccuracy: true,

          maximumAge: 0,

          timeout: 10000,
        }
      );

    return () => {

      navigator.geolocation.clearWatch(
        watchId
      );
    };

  }, []);

  // =====================================================
  // DRAW STOPS
  // =====================================================

  useEffect(() => {

    if (
      !window.google ||
      !mapInstanceRef.current
    ) {
      return;
    }

    stopMarkersRef.current.forEach(
      m => m.setMap(null)
    );

    stopMarkersRef.current = [];

    const map =
      mapInstanceRef.current;

    stops.forEach((stop, index) => {

      if (
        !isValid(
          stop.latitude,
          stop.longitude
        )
      ) {
        return;
      }

      const marker =
        new window.google.maps.Marker({

          position: {

            lat:
              Number(stop.latitude),

            lng:
              Number(stop.longitude),
          },

          map,

          title:
            stop.label || `Stop ${index + 1}`,
        });

      stopMarkersRef.current.push(
        marker
      );
    });

  }, [stops]);

  // =====================================================
  // LIVE DRIVER MARKER
  // =====================================================

  useEffect(() => {

    if (
      !window.google ||
      !mapInstanceRef.current ||
      !currentPosition
    ) {
      return;
    }

    const map =
      mapInstanceRef.current;

    // const truckSvg = `
    //   <svg xmlns="http://www.w3.org/2000/svg"
    //     width="56"
    //     height="56"
    //     viewBox="0 0 56 56">
    //     <circle
    //       cx="28"
    //       cy="28"
    //       r="28"
    //       fill="#5871A7"
    //     />
    //     <path
    //       d="M16 18h18v12h7l5 6v6h-3a5 5 0 01-10 0H25a5 5 0 01-10 0h-3V18h4z"
    //       fill="white"
    //     />
    //   </svg>
    // `;
    const truckSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="18" fill="#5871A7"/>
        <svg x="6" y="6" width="24" height="24" viewBox="0 0 24 24"
          fill="none" stroke="white" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round">
          <rect x="1" y="3" width="15" height="13" rx="1"/>
          <path d="M16 8h4l3 5v4h-7V8z"/>
          <circle cx="5.5"  cy="18.5" r="2.5"/>
          <circle cx="18.5" cy="18.5" r="2.5"/>
        </svg>
      </svg>
    `;

    const icon = {

      url:
        `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(truckSvg)}`,

      scaledSize:
        new window.google.maps.Size(
          56,
          56
        ),

      anchor:
        new window.google.maps.Point(
          28,
          28
        ),
    };

    // =====================================================
    // CREATE OR UPDATE MARKER
    // =====================================================

    if (
      !vehicleMarkerRef.current
    ) {

      vehicleMarkerRef.current =
        new window.google.maps.Marker({

          position:
            currentPosition,

          map,

          zIndex: 999,

          icon,
        });

    } else {

      vehicleMarkerRef.current.setPosition(
        currentPosition
      );
    }

    // =====================================================
    // FOLLOW DRIVER
    // =====================================================

    map.panTo(
      currentPosition
    );

    // =====================================================
    // ROTATE MAP
    // =====================================================

    if (
      currentHeading !== null
    ) {

      map.setHeading(
        currentHeading
      );
    }

  }, [
    currentPosition,
    currentHeading,
  ]);

  // =====================================================
  // LIVE ROUTE RECALCULATION
  // =====================================================

  useEffect(() => {

    if (
      !window.google ||
      !currentPosition ||
      !stops.length ||
      !directionsServiceRef.current
    ) {
      return;
    }

    const validStops =
      stops.filter(
        s =>
          isValid(
            s.latitude,
            s.longitude
          )
      );

    if (
      !validStops.length
    ) {
      return;
    }

    const waypoints =
      validStops
        .slice(0, -1)
        .map((s) => ({

          location: {

            lat:
              Number(s.latitude),

            lng:
              Number(s.longitude),
          },

          stopover: true,
        }));

    directionsServiceRef.current.route(

      {

        origin:
          currentPosition,

        destination: {

          lat:
            Number(
              validStops[
                validStops.length - 1
              ].latitude
            ),

          lng:
            Number(
              validStops[
                validStops.length - 1
              ].longitude
            ),
        },

        waypoints,

        travelMode:
          window.google.maps.TravelMode.DRIVING,

        drivingOptions: {

          departureTime:
            new Date(),

          trafficModel:
            "bestguess",
        }
      },

      (
        result: any,
        status: any
      ) => {

        if (
          status === "OK"
        ) {

          directionsRendererRef.current.setDirections(
            result
          );

          const leg =
            result.routes?.[0]?.legs?.[0];

          if (leg) {

            setEta(
              leg.duration?.text || ""
            );

            setDistanceRemaining(
              leg.distance?.text || ""
            );
          }
        }
      }
    );

  }, [
    currentPosition,
    stops,
  ]);

  // =====================================================
  // RECENTRE
  // =====================================================

  const handleRecentre = () => {

    if (
      mapInstanceRef.current &&
      currentPosition
    ) {

      mapInstanceRef.current.panTo(
        currentPosition
      );

      mapInstanceRef.current.setZoom(
        17
      );
    }
  };

  // =====================================================
  // UI
  // =====================================================

  return (

    <div className="space-y-4">

      {/* HEADER */}

      <div className="flex items-center justify-between flex-wrap gap-3">

        <div>

          <h1 className="text-xl font-semibold text-gray-800 dark:text-white">View Route {shipmentId}</h1>

          <p className="
            text-sm
            text-gray-500
          ">
            Real-time satnav tracking
          </p>

        </div>

        {typeof window !== "undefined" && window.innerWidth < 768 && <hr />}

        <div className="
          flex
          items-center
          gap-2
        ">

            <button
                onClick={fetchStops}
                className="
                inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm
                border border-gray-200 dark:border-[#2E4066]
                text-gray-500 hover:text-[#5871A7] hover:border-[#5871A7]/40
                transition-colors
                "
            >
                <RefreshCw size={13} />
                Refresh

            </button>

            <button
                onClick={() =>
                    router.push(
                    `/logistics/transportlist/${shipmentId}`
                    )
            }
                className="
                    inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold
                    bg-[#5871A7] hover:bg-[#4560A0] text-white
                    disabled:opacity-40 disabled:cursor-not-allowed
                    transition-colors
                "
            >

                <Route size={18} />

                Plan Route

            </button>

            <button
                onClick={handleRecentre}
                className="
                    inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold
                    bg-[#5871A7] hover:bg-[#4560A0] text-white
                    disabled:opacity-40 disabled:cursor-not-allowed
                    transition-colors
                "
            >

                <Navigation size={13} />

                Re-centre

            </button>

        </div>

      </div>

      {/* STATUS */}

      <div className="
        grid
        grid-cols-1
        md:grid-cols-3
        gap-4
      ">

        <div className="
            text-md
            font-bold
            ">
            ETA: {eta || "--"} Remaining: {distanceRemaining || "--"} Speed: {speed} mph
        </div>

        {/* <div className="
            text-md
            font-bold
            ">
            ETA: {eta || "--"} Remaining: { distanceRemaining ? `${(Number(distanceRemaining) * 0.621371).toFixed(1)} mi (${Number(distanceRemaining).toFixed(1)} km)` : "--" } Speed: {speed ? `${speed} mph (${(Number(speed) * 1.60934).toFixed(1)} km/h)` : "--"}
        </div> */}

      </div>

      {/* MAP */}

      <div
        ref={mapRef}
        className="
          w-full
          h-[650px]
          rounded-3xl
          overflow-hidden
        "
      />

      {/* FOOTER */}

      <div className="
        flex
        justify-end
      ">

      </div>

    </div>
  );
}