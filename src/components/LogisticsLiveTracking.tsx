
"use client";

import {
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";

import { useRouter } from "next/navigation";

import {
  RefreshCw,
  Navigation,
  Gauge,
  Clock3,
  MapPin,
} from "lucide-react";

declare global {
  interface Window {
    google: any;
  }
}

interface Stop {
  id?: string | number;
  latitude: number | string | null;
  longitude: number | string | null;
  label?: string;
  address?: string;
  sequence?: number;
}

function makeStopIcon(
  sequence: number,
  isFirst: boolean,
  isLast: boolean
) {

  const fill =
    isFirst
      ? "#10B981"
      : isLast
      ? "#EF4444"
      : "#5871A7";

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg"
      width="32"
      height="40"
      viewBox="0 0 32 40">

      <path
        d="M16 0C7.16 0 0 7.16 0 16c0 10 16 24 16 24s16-14 16-24C32 7.16 24.84 0 16 0z"
        fill="${fill}"
      />

      <circle
        cx="16"
        cy="16"
        r="10"
        fill="white"
        opacity="0.9"
      />

      <text
        x="16"
        y="21"
        text-anchor="middle"
        font-family="Arial,sans-serif"
        font-size="11"
        font-weight="bold"
        fill="${fill}"
      >
        ${sequence}
      </text>
    </svg>
  `;

  return {
    url:
      "data:image/svg+xml;charset=UTF-8," +
      encodeURIComponent(svg),
  };
}

export default function LogisticsRoutePlanner({
  shipmentId,
}: any) {

  const router =
    useRouter();

  const mapRef =
    useRef<HTMLDivElement>(null);

  const mapRefInstance =
    useRef<any>(null);

  const directionsServiceRef =
    useRef<any>(null);

  const directionsRendererRef =
    useRef<any>(null);

  const vehicleMarkerRef =
    useRef<any>(null);

  const stopMarkersRef =
    useRef<any[]>([]);

  const infoWindowRef =
    useRef<any>(null);

  const [stops, setStops] =
    useState<any[]>([]);

  const [currentPosition, setCurrentPosition] =
    useState<any>(null);

  const [currentHeading, setCurrentHeading] =
    useState(0);

  const [currentSpeed, setCurrentSpeed] =
    useState(0);

  const [eta, setEta] =
    useState("");

  const [distanceRemaining, setDistanceRemaining] =
    useState("");

  const [currentRoad, setCurrentRoad] =
    useState("");

  // =============================================================================
  // VALIDATE LAT LNG
  // =============================================================================

  const isValid = (
    lat: any,
    lng: any
  ) => {

    return (
      !isNaN(Number(lat)) &&
      !isNaN(Number(lng))
    );
  };

  // =============================================================================
  // INFO WINDOW
  // =============================================================================

  const openInfo = (
    map: any,
    marker: any,
    html: string
  ) => {

    if (infoWindowRef.current) {

      infoWindowRef.current.close();
    }

    const iw =
      new window.google.maps.InfoWindow({

        content:
          html,
      });

    iw.open(map, marker);

    infoWindowRef.current = iw;
  };

  // =============================================================================
  // LOAD GOOGLE MAPS
  // =============================================================================

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

      script.onload = () =>
        resolve();

      document.body.appendChild(script);
    });
  };

  // =============================================================================
  // FETCH STOPS
  // =============================================================================

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

            : data.stops ?? []
        );

      } catch (err) {

        console.error(
          "[STOP FETCH ERROR]",
          err
        );
      }

    }, [shipmentId]);

  // =============================================================================
  // LOAD STOPS
  // =============================================================================

  useEffect(() => {

    fetchStops();

  }, [fetchStops]);

  // =============================================================================
  // LIVE GPS TRACKING
  // =============================================================================

  useEffect(() => {

    if (
      !navigator.geolocation
    ) {

      console.error(
        "Geolocation not supported"
      );

      return;
    }

    const watchId =
      navigator.geolocation.watchPosition(

        async (position) => {

          const coords =
            position.coords;

          const livePosition = {

            lat:
              coords.latitude,

            lng:
              coords.longitude,
          };

          setCurrentPosition(
            livePosition
          );

          setCurrentHeading(
            coords.heading || 0
          );

          setCurrentSpeed(

            coords.speed

              ? Math.round(
                  coords.speed * 2.23694
                )

              : 0
          );

          // =====================================================
          // OPTIONAL ROAD NAME USING REVERSE GEOCODE
          // =====================================================

          try {

            if (window.google) {

              const geocoder =
                new window.google.maps.Geocoder();

              geocoder.geocode(

                {
                  location:
                    livePosition
                },

                (
                  results: any,
                  status: any
                ) => {

                  if (
                    status === "OK" &&
                    results?.length
                  ) {

                    setCurrentRoad(
                      results[0].formatted_address
                    );
                  }
                }
              );
            }

          } catch (err) {

            console.error(
              "[ROAD LOOKUP ERROR]",
              err
            );
          }

        },

        (err) => {

          console.error(
            "[GPS ERROR]",
            err
          );
        },

        {

          enableHighAccuracy:
            true,

          maximumAge:
            0,

          timeout:
            10000,
        }
      );

    return () => {

      navigator.geolocation.clearWatch(
        watchId
      );
    };

  }, []);

  // =============================================================================
  // SMOOTH MARKER MOVEMENT
  // =============================================================================

  const animateMarkerMovement = (
    marker: any,
    newPosition: any
  ) => {

    const start =
      marker.getPosition();

    if (!start) {

      marker.setPosition(
        newPosition
      );

      return;
    }

    const startLat =
      start.lat();

    const startLng =
      start.lng();

    const endLat =
      newPosition.lat;

    const endLng =
      newPosition.lng;

    let step = 0;

    const totalSteps = 60;

    const interval =
      setInterval(() => {

        step++;

        const lat =
          startLat +
          (
            (endLat - startLat) *
            step
          ) /
          totalSteps;

        const lng =
          startLng +
          (
            (endLng - startLng) *
            step
          ) /
          totalSteps;

        marker.setPosition({
          lat,
          lng,
        });

        if (
          step >= totalSteps
        ) {

          clearInterval(
            interval
          );
        }

      }, 50);
  };

  // =============================================================================
  // INIT MAP
  // =============================================================================

  const initMap =
    useCallback(async () => {

      if (!mapRef.current) {
        return;
      }

      await loadMaps();

      if (!mapRefInstance.current) {

        mapRefInstance.current =
          new window.google.maps.Map(

            mapRef.current,

            {

              center: {

                lat: 51.5,

                lng: -0.1,
              },

              zoom: 16,

              tilt: 45,

              heading:
                currentHeading,

              mapTypeControl:
                false,

              fullscreenControl:
                false,

              streetViewControl:
                false,
            }
          );

        directionsServiceRef.current =
          new window.google.maps.DirectionsService();

        directionsRendererRef.current =
          new window.google.maps.DirectionsRenderer({

            suppressMarkers:
              true,

            preserveViewport:
              true,

            polylineOptions: {

              strokeColor:
                "#10B981",

              strokeWeight:
                6,
            }
          });

        directionsRendererRef.current.setMap(
          mapRefInstance.current
        );
      }

      const map =
        mapRefInstance.current;

      // =====================================================
      // ROTATE MAP WITH HEADING
      // =====================================================

      if (
        map &&
        currentHeading
      ) {

        map.setHeading(
          currentHeading
        );
      }

      // =====================================================
      // CLEAR OLD STOP MARKERS
      // =====================================================

      stopMarkersRef.current.forEach(
        (m) => m.setMap(null)
      );

      stopMarkersRef.current = [];

      // =====================================================
      // DRAW STOPS
      // =====================================================

      stops.forEach((s, i) => {

        if (
          !isValid(
            s.latitude,
            s.longitude
          )
        ) {
          return;
        }

        const isFirst =
          i === 0;

        const isLast =
          i === stops.length - 1;

        const seq =
          s.sequence ?? i + 1;

        const iconDef =
          makeStopIcon(
            seq,
            isFirst,
            isLast
          );

        const marker =
          new window.google.maps.Marker({

            position: {

              lat:
                Number(s.latitude),

              lng:
                Number(s.longitude),
            },

            map,

            icon: {

              url:
                iconDef.url,

              scaledSize:
                new window.google.maps.Size(
                  32,
                  40
                ),

              anchor:
                new window.google.maps.Point(
                  16,
                  40
                ),
            },

            title:
              s.label ||
              `Stop ${seq}`,
          });

        marker.addListener(
          "click",
          () => {

            openInfo(

              map,

              marker,

              `
                <div style="font-family:Arial;line-height:1.5;">
                  <strong>${s.label || `Stop ${seq}`}</strong><br/>
                  ${s.address || ""}
                </div>
              `
            );
          }
        );

        stopMarkersRef.current.push(
          marker
        );
      });

      // =====================================================
      // CURRENT USER POSITION
      // =====================================================

      if (
        currentPosition &&
        isValid(
          currentPosition.lat,
          currentPosition.lng
        )
      ) {

        const truckSvg = `
          <svg xmlns="http://www.w3.org/2000/svg"
            width="56"
            height="56"
            viewBox="0 0 56 56">

            <circle
              cx="28"
              cy="28"
              r="28"
              fill="#5871A7"
            />

            <path
              d="M16 18h18v12h7l5 6v6h-3a5 5 0 01-10 0H25a5 5 0 01-10 0h-3V18h4z"
              fill="white"
            />
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

          rotation:
            currentHeading,
        };

        // =====================================================
        // CREATE OR UPDATE LIVE MARKER
        // =====================================================

        if (
          !vehicleMarkerRef.current
        ) {

          vehicleMarkerRef.current =
            new window.google.maps.Marker({

              position:
                currentPosition,

              map,

              zIndex:
                999,

              optimized:
                true,

              icon,
            });

        } else {

          animateMarkerMovement(
            vehicleMarkerRef.current,
            currentPosition
          );

          vehicleMarkerRef.current.setIcon(
            icon
          );
        }

        // =====================================================
        // FOLLOW USER
        // =====================================================

        map.panTo(
          currentPosition
        );

        // =====================================================
        // ROUTING
        // =====================================================

        if (
          stops.length > 0
        ) {

          const validStops =
            stops.filter(
              (s) =>
                isValid(
                  s.latitude,
                  s.longitude
                )
            );

          if (
            validStops.length
          ) {

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

                  stopover:
                    true,
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
                      ]?.latitude
                    ),

                  lng:
                    Number(
                      validStops[
                        validStops.length - 1
                      ]?.longitude
                    ),
                },

                waypoints,

                optimizeWaypoints:
                  false,

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

                  const route =
                    result.routes[0];

                  if (
                    route?.legs?.length
                  ) {

                    const firstLeg =
                      route.legs[0];

                    setEta(
                      firstLeg.duration?.text || ""
                    );

                    setDistanceRemaining(
                      firstLeg.distance?.text || ""
                    );
                  }
                }
              }
            );
          }
        }
      }

    }, [
      stops,
      currentPosition,
      currentHeading,
    ]);

  // =============================================================================
  // MAP INITIALISATION
  // =============================================================================

  useEffect(() => {

    initMap();

  }, [initMap]);

  // =============================================================================
  // RECENTRE
  // =============================================================================

  const handleRecentre = () => {

    if (
      mapRefInstance.current &&
      currentPosition
    ) {

      mapRefInstance.current.panTo(
        currentPosition
      );

      mapRefInstance.current.setZoom(
        17
      );
    }
  };

  // =============================================================================
  // UI
  // =============================================================================

  return (

    <div className="space-y-4">

      {/* ================================================= */}
      {/* HEADER */}
      {/* ================================================= */}

      <div className="flex items-center justify-between">

        <div>

          <h1 className="text-2xl font-bold">
            Live Driver Navigation
          </h1>

          <p className="text-sm text-gray-500">
            Real-time GPS tracking and live SATNAV navigation
          </p>

        </div>

        <div className="flex items-center gap-2">

          <button
            type="button"
            onClick={() =>
              router.push(
                `/logistics/transportlist/${shipmentId}`
              )
            }
            className="
              px-4 py-2 rounded-full
              bg-[#5871A7]
              text-white
              text-sm font-semibold
            "
          >
            Plan Route
          </button>

          <button
            type="button"
            onClick={handleRecentre}
            className="
              px-4 py-2 rounded-full
              bg-[#10B981]
              text-white
              text-sm font-semibold
              flex items-center gap-2
            "
          >
            <Navigation size={16} />
            Follow
          </button>

          <button
            type="button"
            onClick={fetchStops}
            className="
              px-4 py-2 rounded-full
              border
              text-sm
              flex items-center gap-2
            "
          >
            <RefreshCw size={15} />
            Refresh
          </button>

        </div>

      </div>

      {/* ================================================= */}
      {/* STATUS CARDS */}
      {/* ================================================= */}

      <div className="
        grid
        grid-cols-2
        lg:grid-cols-4
        gap-3
      ">

        <div className="
          p-4
          rounded-2xl
          border
          bg-white
        ">

          <div className="
            flex
            items-center
            gap-2
            text-gray-500
            text-sm
          ">
            <Gauge size={15} />
            Speed
          </div>

          <div className="
            text-2xl
            font-bold
            mt-1
          ">
            {currentSpeed} mph
          </div>

        </div>

        <div className="
          p-4
          rounded-2xl
          border
          bg-white
        ">

          <div className="
            flex
            items-center
            gap-2
            text-gray-500
            text-sm
          ">
            <Clock3 size={15} />
            ETA
          </div>

          <div className="
            text-2xl
            font-bold
            mt-1
          ">
            {eta || "--"}
          </div>

        </div>

        <div className="
          p-4
          rounded-2xl
          border
          bg-white
        ">

          <div className="
            flex
            items-center
            gap-2
            text-gray-500
            text-sm
          ">
            <MapPin size={15} />
            Distance
          </div>

          <div className="
            text-2xl
            font-bold
            mt-1
          ">
            {distanceRemaining || "--"}
          </div>

        </div>

        <div className="
          p-4
          rounded-2xl
          border
          bg-white
        ">

          <div className="
            flex
            items-center
            gap-2
            text-gray-500
            text-sm
          ">
            <Navigation size={15} />
            Current Road
          </div>

          <div className="
            text-sm
            font-semibold
            mt-1
            truncate
          ">
            {currentRoad || "Locating..."}
          </div>

        </div>

      </div>

      {/* ================================================= */}
      {/* MAP */}
      {/* ================================================= */}

      <div
        ref={mapRef}
        className="
          w-full
          h-[700px]
          rounded-3xl
          overflow-hidden
          border
        "
      />

    </div>
  );
}