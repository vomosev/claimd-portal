"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { RefreshCw, Navigation, Route, CreditCard, } from "lucide-react";

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
  vehicle_id?: string | number;
  driver?: string;
  vehicle_reg?: string;
}

interface Leg {
  fromIndex: number;
  toIndex: number;
  distanceText: string;
  distanceMeters: number;
  durationText: string;
  cost: number;
  color: string;
}

// Distinct colours per stage
const STAGE_COLORS = [
  "#10B981", // green
  "#3B82F6", // blue
  "#F59E0B", // amber
  "#EF4444", // red
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#14B8A6", // teal
  "#F97316", // orange
];

// Fare model (tweak as required)
const BASE_FARE = 2.50;          // £ per leg
const RATE_PER_KM = 1.20;        // £ per kilometre

export default function LogisticsRoutePlanner({
  shipmentId
}: any) {

  const router = useRouter();

  // =====================================================
  // REFS
  // =====================================================

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const directionsServiceRef = useRef<any>(null);
  const legRenderersRef = useRef<any[]>([]);       // one renderer per stage
  const previewRendererRef = useRef<any>(null);    // current pos -> first stop preview
  const vehicleMarkerRef = useRef<any>(null);
  const stopMarkersRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);

  // =====================================================
  // STATE
  // =====================================================

  const [stops, setStops] = useState<Stop[]>([]);
  const [currentPosition, setCurrentPosition] = useState<any>(null);
  const [currentHeading, setCurrentHeading] = useState<number | null>(null);
  const [eta, setEta] = useState("");
  const [distanceRemaining, setDistanceRemaining] = useState("");
  const [speed, setSpeed] = useState<number>(0);
  const [legs, setLegs] = useState<Leg[]>([]);
  const [totalFare, setTotalFare] = useState<number>(0);
  const [creatingCheckout, setCreatingCheckout] = useState(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_KEY || "pk_live_kCkZDH2dpISTB7lLUfVAaiPy";
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  // =====================================================
  // HELPERS
  // =====================================================

  const isValid = (lat: any, lng: any) =>
    !isNaN(Number(lat)) && !isNaN(Number(lng));

  // =====================================================
  // LOAD GOOGLE MAPS
  // =====================================================

  const loadMaps = async () => {
    if (window.google) return;

    await new Promise<void>((resolve) => {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_MAPS_API_KEY}`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      document.body.appendChild(script);
    });
  };

  // =====================================================
  // FETCH STOPS
  // =====================================================

  const fetchStops = useCallback(async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/planner/${shipmentId}`
      );
      const data = await response.json();
      setStops(Array.isArray(data) ? data : data.stops || []);
    } catch (err) {
      console.error("[STOP FETCH ERROR]", err);
    }
  }, [shipmentId]);

  // =====================================================
  // INIT MAP
  // =====================================================

  useEffect(() => {
    async function initialise() {
      await loadMaps();

      if (!mapRef.current || mapInstanceRef.current) return;

      const map = new window.google.maps.Map(mapRef.current, {
        center: { lat: 51.5, lng: -0.1 },
        zoom: 17,
        tilt: 45,
        mapTypeControl: false,
        fullscreenControl: false,
        streetViewControl: false,
      });

      mapInstanceRef.current = map;
      directionsServiceRef.current = new window.google.maps.DirectionsService();
      infoWindowRef.current = new window.google.maps.InfoWindow();

      // Optional dashed preview from current pos -> first stop (not billable)
      previewRendererRef.current = new window.google.maps.DirectionsRenderer({
        suppressMarkers: true,
        preserveViewport: true,
        polylineOptions: {
          strokeColor: "#9CA3AF",
          strokeOpacity: 0,
          strokeWeight: 0,
          icons: [{
            icon: {
              path: "M 0,-1 0,1",
              strokeOpacity: 1,
              strokeColor: "#9CA3AF",
              scale: 3,
            },
            offset: "0",
            repeat: "12px",
          }],
        },
      });
      previewRendererRef.current.setMap(map);
    }

    initialise();
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
    if (!navigator.geolocation) {
      console.error("Geolocation unsupported");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const coords = position.coords;
        const pos = { lat: coords.latitude, lng: coords.longitude };

        setCurrentPosition(pos);

        if (coords.heading !== null) setCurrentHeading(coords.heading);
        if (coords.speed !== null) setSpeed(Math.round(coords.speed * 2.23694));

        try {
          const username = localStorage.getItem("username") ?? "";
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/location`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username,
              shipmentId,
              latitude: coords.latitude,
              longitude: coords.longitude,
              speed: coords.speed ?? 0,
              heading: coords.heading ?? 0,
            }),
          });
        } catch (err) {
          console.error("[FleetMap] location POST error:", err);
        }
      },
      (err) => console.error("[GPS ERROR]", err),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // =====================================================
  // DRAW STOP MARKERS + POPUPS
  // =====================================================

  useEffect(() => {
    if (!window.google || !mapInstanceRef.current) return;

    stopMarkersRef.current.forEach((m) => m.setMap(null));
    stopMarkersRef.current = [];

    const map = mapInstanceRef.current;

    stops.forEach((stop, index) => {
      if (!isValid(stop.latitude, stop.longitude)) return;

      const color = STAGE_COLORS[index % STAGE_COLORS.length];

      const marker = new window.google.maps.Marker({
        position: {
          lat: Number(stop.latitude),
          lng: Number(stop.longitude),
        },
        map,
        label: {
          text: String(index + 1),
          color: "white",
          fontWeight: "bold",
          fontSize: "12px",
        },
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          fillColor: color,
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 2,
          scale: 12,
        },
        title: stop.label || `Stop ${index + 1}`,
      });

      marker.addListener("click", () => {
        const html = `
          <div style="font-family:system-ui;min-width:200px">
            <div style="font-weight:600;margin-bottom:4px;color:${color}">
              Stop ${index + 1}${stop.label ? ` — ${stop.label}` : ""}
            </div>
            ${stop.address ? `<div style="font-size:12px;color:#555;margin-bottom:6px">${stop.address}</div>` : ""}
            <div style="font-size:13px;line-height:1.5">
              <div><b>Vehicle ID:</b> ${stop.vehicle_id ?? "—"}</div>
              <div><b>Driver:</b> ${stop.driver ?? "—"}</div>
              <div><b>Reg:</b> ${stop.vehicle_reg ?? "—"}</div>
            </div>
          </div>
        `;
        infoWindowRef.current.setContent(html);
        infoWindowRef.current.open(map, marker);
      });

      stopMarkersRef.current.push(marker);
    });
  }, [stops]);

  // =====================================================
  // LIVE DRIVER MARKER
  // =====================================================

  useEffect(() => {
    if (!window.google || !mapInstanceRef.current || !currentPosition) return;

    const map = mapInstanceRef.current;

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
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(truckSvg)}`,
      scaledSize: new window.google.maps.Size(56, 56),
      anchor: new window.google.maps.Point(28, 28),
    };

    if (!vehicleMarkerRef.current) {
      vehicleMarkerRef.current = new window.google.maps.Marker({
        position: currentPosition,
        map,
        zIndex: 999,
        icon,
      });
    } else {
      vehicleMarkerRef.current.setPosition(currentPosition);
    }

    map.panTo(currentPosition);
    if (currentHeading !== null) map.setHeading(currentHeading);
  }, [currentPosition, currentHeading]);

  // =====================================================
  // ROUTE EACH STAGE SEPARATELY (different colours)
  // Fare is computed between waypoints only.
  // =====================================================

  useEffect(() => {
    if (!window.google || !directionsServiceRef.current) return;

    const validStops = stops.filter((s) => isValid(s.latitude, s.longitude));
    if (validStops.length < 2) {
      // clear any existing leg renderers
      legRenderersRef.current.forEach((r) => r.setMap(null));
      legRenderersRef.current = [];
      setLegs([]);
      setTotalFare(0);
      return;
    }

    const map = mapInstanceRef.current;

    // clear existing leg renderers
    legRenderersRef.current.forEach((r) => r.setMap(null));
    legRenderersRef.current = [];

    const newLegs: Leg[] = [];
    let completed = 0;

    validStops.slice(0, -1).forEach((from, i) => {
      const to = validStops[i + 1];
      const color = STAGE_COLORS[i % STAGE_COLORS.length];

      const renderer = new window.google.maps.DirectionsRenderer({
        suppressMarkers: true,
        preserveViewport: true,
        polylineOptions: {
          strokeColor: color,
          strokeWeight: 6,
          strokeOpacity: 0.9,
        },
      });
      renderer.setMap(map);
      legRenderersRef.current.push(renderer);

      directionsServiceRef.current.route(
        {
          origin: { lat: Number(from.latitude), lng: Number(from.longitude) },
          destination: { lat: Number(to.latitude), lng: Number(to.longitude) },
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result: any, status: any) => {
          completed++;

          if (status === "OK") {
            renderer.setDirections(result);

            const leg = result.routes?.[0]?.legs?.[0];
            if (leg) {
              const meters = leg.distance?.value ?? 0;
              const km = meters / 1000;
              const cost = +(BASE_FARE + km * RATE_PER_KM).toFixed(2);

              newLegs.push({
                fromIndex: i,
                toIndex: i + 1,
                distanceText: leg.distance?.text || "",
                distanceMeters: meters,
                durationText: leg.duration?.text || "",
                cost,
                color,
              });
            }
          }

          // once all legs resolved, update state
          if (completed === validStops.length - 1) {
            newLegs.sort((a, b) => a.fromIndex - b.fromIndex);
            setLegs(newLegs);
            setTotalFare(
              +newLegs.reduce((sum, l) => sum + l.cost, 0).toFixed(2)
            );
          }
        }
      );
    });
  }, [stops]);

  // =====================================================
  // PREVIEW LINE: current position -> first stop (not billable)
  // Also updates ETA / remaining distance
  // =====================================================

  useEffect(() => {
    if (
      !window.google ||
      !currentPosition ||
      !stops.length ||
      !directionsServiceRef.current ||
      !previewRendererRef.current
    ) return;

    const validStops = stops.filter((s) => isValid(s.latitude, s.longitude));
    if (!validStops.length) return;

    directionsServiceRef.current.route(
      {
        origin: currentPosition,
        destination: {
          lat: Number(validStops[0].latitude),
          lng: Number(validStops[0].longitude),
        },
        travelMode: window.google.maps.TravelMode.DRIVING,
        drivingOptions: {
          departureTime: new Date(),
          trafficModel: "bestguess",
        },
      },
      (result: any, status: any) => {
        if (status === "OK") {
          previewRendererRef.current.setDirections(result);
          const leg = result.routes?.[0]?.legs?.[0];
          if (leg) {
            setEta(leg.duration?.text || "");
            setDistanceRemaining(leg.distance?.text || "");
          }
        }
      }
    );
  }, [currentPosition, stops]);

  // =====================================================
  // RECENTRE
  // =====================================================

  const handleRecentre = () => {
    if (mapInstanceRef.current && currentPosition) {
      mapInstanceRef.current.panTo(currentPosition);
      mapInstanceRef.current.setZoom(17);
    }
  };

  // =====================================================
  // STRIPE CHECKOUT
  // =====================================================

  const handleCheckout = async () => {
    if (!legs.length || totalFare <= 0) return;
    const username = localStorage.getItem("username") ?? "";
    const formData = {
      userid:        username,
      quantity:      1,
      // Pass the total so the backend can verify / create the correct line items
      totalAmount:   totalFare.toFixed(2),
      processingFee: BASE_FARE,
      successurl: `https://${process.env.NEXT_PUBLIC_DNSPREFIX}.geo-drops.com/logistics/transportmap/${shipmentId}/livetracking`,
      cancelurl:  `https://${process.env.NEXT_PUBLIC_DNSPREFIX}.geo-drops.com/logistics/transportmap/${shipmentId}/livetracking`,
    };

    const res  = await fetch(`${API_URL}/logisticspayment/create-checkout-session`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(formData),
    });
    const data = await res.json();

    if (data.url) {
      window.location.href = data.url;
    } else {
      toast.error(data.error || "Error creating payment session");
      setIsProcessing(false);
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
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
            View Route {shipmentId}
          </h1>
          <p className="text-sm text-gray-500">Real-time satnav tracking</p>
        </div>

        {typeof window !== "undefined" && window.innerWidth < 768 && <hr />}

        <div className="flex items-center gap-2">
          <button
            onClick={fetchStops}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm border border-gray-200 dark:border-[#2E4066] text-gray-500 hover:text-[#5871A7] hover:border-[#5871A7]/40 transition-colors"
          >
            <RefreshCw size={13} />
            Refresh
          </button>

          <button
            onClick={() => router.push(`/logistics/transportlist/${shipmentId}`)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-[#5871A7] hover:bg-[#4560A0] text-white transition-colors"
          >
            <Route size={18} />
            Plan Route
          </button>

          <button
            onClick={handleRecentre}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-[#5871A7] hover:bg-[#4560A0] text-white transition-colors"
          >
            <Navigation size={13} />
            Re-centre
          </button>
        </div>
      </div>

      {/* STATUS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-md font-bold">
          ETA: {eta || "--"} &nbsp;Remaining: {distanceRemaining || "--"} &nbsp;Speed: {speed} mph
        </div>
      </div>

      {/* JOURNEY BREAKDOWN + FARE */}
      {legs.length > 0 && (
        <div className="rounded-2xl border border-gray-200 dark:border-[#2E4066] p-4 bg-white dark:bg-[#0F1A2E]">
          <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white">
            Journey Stages & Fare
          </h2>

          <div className="space-y-2">
            {legs.map((l) => (
              <div
                key={`${l.fromIndex}-${l.toIndex}`}
                className="flex items-center justify-between text-sm border-b border-gray-100 dark:border-[#2E4066] py-2"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="inline-block w-3 h-3 rounded-full"
                    style={{ backgroundColor: l.color }}
                  />
                  <span className="text-gray-700 dark:text-gray-200">
                    Stop {l.fromIndex + 1} → Stop {l.toIndex + 1}
                  </span>
                </div>
                <div className="flex items-center gap-6 text-gray-600 dark:text-gray-300">
                  <span>{l.distanceText}</span>
                  <span>{l.durationText}</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    £{l.cost.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              Total: £{totalFare.toFixed(2)}
            </div>

            <button
              onClick={handleCheckout}
              disabled={creatingCheckout || totalFare <= 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-[#635BFF] hover:bg-[#5046E5] text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <CreditCard size={16} />
              {creatingCheckout ? "Redirecting..." : `Pay £${totalFare.toFixed(2)} with Stripe`}
            </button>
          </div>
        </div>
      )}

      {/* MAP */}
      <div
        ref={mapRef}
        className="w-full h-[650px] rounded-3xl overflow-hidden"
      />

    </div>
  );
}