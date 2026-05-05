'use client';

import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useEffect, useRef } from 'react';

import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Box, Route, MapPin, Loader2, Navigation } from 'lucide-react';

const schema = z.object({
  source: z.string().min(1, 'Source address is required'),
  destination: z.string()
    .min(1, 'Destination address is required')
    .refine(
      (value) => {
        // Allow postal codes (various formats) or street addresses
        const postalCodePattern = /^[A-Za-z0-9\s-]{3,10}$/;
        const streetAddressPattern = /^[A-Za-z0-9\s,.-]+$/;
        return postalCodePattern.test(value) || streetAddressPattern.test(value);
      },
      'Please enter a valid street address or postal code'
    ),
});

interface Coordinates {
  lat: number;
  lng: number;
}

interface RouteData {
  distance: string;
  duration: string;
  coordinates: Coordinates[];
}

export default function RoutesForm() {
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [isInitialLocationLoad, setIsInitialLocationLoad] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [sourceCoords, setSourceCoords] = useState<Coordinates | null>(null);
  const [destCoords, setDestCoords] = useState<Coordinates | null>(null);
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      source: '',
      destination: '',
    },
  });

  // Auto-populate source address on component mount
  useEffect(() => {
    getCurrentLocation(true);
  }, []);

  // Initialize Google Maps
  useEffect(() => {
    if (showMap && mapRef.current && !mapInstanceRef.current) {
      initializeMap();
    }
  }, [showMap]);

  const initializeMap = () => {
    if (!mapRef.current) return;

    // Initialize map
    mapInstanceRef.current = new google.maps.Map(mapRef.current, {
      zoom: 13,
      center: { lat: -34.397, lng: 150.644 }, // Default center
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });

    // Initialize directions service and renderer
    directionsServiceRef.current = new google.maps.DirectionsService();
    directionsRendererRef.current = new google.maps.DirectionsRenderer({
      draggable: false,
      panel: undefined,
    });

    directionsRendererRef.current.setMap(mapInstanceRef.current);
  };

  // Function to get address suggestions
  const getAddressSuggestions = async (query: string) => {
    if (query.length < 3) {
      setAddressSuggestions([]);
      return;
    }
    
    try {
      const response = await fetch(
        `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(query)}&key=${process.env.NEXT_PUBLIC_OPENCAGE_API_KEY}&limit=5`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch suggestions');
      }
      
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        // Define the interface at the top of your file
        interface GeocodeResult {
          formatted: string;
          // add other properties if needed
        }
        interface GeocodeResponse {
          results: GeocodeResult[];
        }
        // Then use it:
        const suggestions = data.results.map((result: GeocodeResult) => result.formatted);
        setAddressSuggestions(suggestions);
      } else {
        setAddressSuggestions([]);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setAddressSuggestions([]);
    }
  };

  // Enhanced geocoding function with better error handling
  const geocodeAddress = async (address: string): Promise<Coordinates | null> => {
    try {
      // Check if address is already coordinates
      const coordPattern = /^-?\d+\.?\d*\s*,\s*-?\d+\.?\d*$/;
      if (coordPattern.test(address.trim())) {
        const [lat, lng] = address.split(',').map(coord => parseFloat(coord.trim()));
        if (!isNaN(lat) && !isNaN(lng)) {
          return { lat, lng };
        }
      }

      // Check if API key is available
      if (!process.env.NEXT_PUBLIC_OPENCAGE_API_KEY) {
        console.error('OpenCage API key is not configured');
        return null;
      }

      // Use OpenCage API for geocoding with better parameters
      const response = await fetch(
        `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(address)}&key=${process.env.NEXT_PUBLIC_OPENCAGE_API_KEY}&limit=1&no_annotations=1&language=en`
      );
      
      if (!response.ok) {
        console.error(`Geocoding API error: ${response.status} ${response.statusText}`);
        return null;
      }
      
      const data = await response.json();
      
      if (data.status && data.status.code !== 200) {
        console.error('OpenCage API error:', data.status.message);
        return null;
      }
      
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        const { lat, lng } = result.geometry;
        
        // Validate coordinates
        if (typeof lat === 'number' && typeof lng === 'number' && 
            !isNaN(lat) && !isNaN(lng) && 
            lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          return { lat, lng };
        }
      }
      
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  };

  // Enhanced route calculation with better error handling
  const calculateRoute = async (source: string, destination: string) => {
    if (!directionsServiceRef.current || !directionsRendererRef.current) {
      setRouteError('Map services not initialized');
      return;
    }

    setIsLoadingRoute(true);
    setRouteError(null);

    try {
      console.log('Geocoding addresses:', { source, destination });
      
      // Geocode addresses to get coordinates with detailed logging
      const sourceCoordinates = await geocodeAddress(source);
      console.log('Source coordinates:', sourceCoordinates);
      
      const destCoordinates = await geocodeAddress(destination);
      console.log('Destination coordinates:', destCoordinates);

      if (!sourceCoordinates) {
        throw new Error('Could not find the source address. Please check the address or try using your current location again.');
      }
      
      if (!destCoordinates) {
        throw new Error('Could not find the destination address. Please check the address or postal code and try again.');
      }

      setSourceCoords(sourceCoordinates);
      setDestCoords(destCoordinates);

      // Create directions request
      const request: google.maps.DirectionsRequest = {
        origin: new google.maps.LatLng(sourceCoordinates.lat, sourceCoordinates.lng),
        destination: new google.maps.LatLng(destCoordinates.lat, destCoordinates.lng),
        travelMode: google.maps.TravelMode.DRIVING,
        unitSystem: google.maps.UnitSystem.METRIC,
        avoidHighways: false,
        avoidTolls: false,
      };

      console.log('Calculating route with request:', request);

      // Calculate route
      directionsServiceRef.current.route(request, (result, status) => {
        console.log('Directions result:', { status, result });
        
        if (status === 'OK' && result) {
          // Display route on map
          directionsRendererRef.current?.setDirections(result);

          // Extract route information
          const route = result.routes[0];
          const leg = route.legs[0];
          
          setRouteData({
            distance: leg.distance?.text || 'Unknown',
            duration: leg.duration?.text || 'Unknown',
            coordinates: route.overview_path.map(point => ({
              lat: point.lat(),
              lng: point.lng()
            }))
          });

          // Center map on route
          if (mapInstanceRef.current && route.bounds) {
            mapInstanceRef.current.fitBounds(route.bounds);
          }

          setIsLoadingRoute(false);
        } else {
          setIsLoadingRoute(false);
          let errorMessage = 'Failed to calculate route';
          
          switch (status) {
            case 'NOT_FOUND':
              errorMessage = 'One or both locations could not be found';
              break;
            case 'ZERO_RESULTS':
              errorMessage = 'No route could be found between these locations';
              break;
            case 'MAX_WAYPOINTS_EXCEEDED':
              errorMessage = 'Too many waypoints in the request';
              break;
            case 'INVALID_REQUEST':
              errorMessage = 'Invalid route request';
              break;
            case 'OVER_QUERY_LIMIT':
              errorMessage = 'Service quota exceeded. Please try again later';
              break;
            case 'REQUEST_DENIED':
              errorMessage = 'Service request denied';
              break;
            case 'UNKNOWN_ERROR':
              errorMessage = 'Unknown error occurred. Please try again';
              break;
            default:
              errorMessage = `Directions request failed: ${status}`;
          }
          
          setRouteError(errorMessage);
        }
      });

    } catch (error) {
      console.error('Route calculation error:', error);
      setRouteError(error instanceof Error ? error.message : 'Failed to calculate route');
      setIsLoadingRoute(false);
    }
  };

  // Enhanced geolocation function
  const getCurrentLocation = async (isInitial = false) => {
    if (!navigator.geolocation) {
      const error = 'Geolocation is not supported by this browser';
      setLocationError(error);
      if (isInitial) setIsInitialLocationLoad(false);
      return;
    }

    if (isInitial) setIsInitialLocationLoad(true);
    setIsLoadingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          console.log('Got location:', { latitude, longitude });
          
          // Reverse geocoding to get address from coordinates
          const response = await fetch(
            `https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=${process.env.NEXT_PUBLIC_OPENCAGE_API_KEY}&no_annotations=1&language=en`
          );
          
          if (!response.ok) {
            throw new Error('Failed to get address from coordinates');
          }
          
          const data = await response.json();
          
          if (data.results && data.results.length > 0) {
            const address = data.results[0].formatted;
            form.setValue('source', address);
            console.log('Set source address:', address);
          } else {
            // Fallback to coordinates if address lookup fails
            const coordString = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
            form.setValue('source', coordString);
            console.log('Used coordinates as fallback:', coordString);
          }
        } catch (error) {
          console.error('Error getting address:', error);
          // Use coordinates as fallback
          const { latitude, longitude } = position.coords;
          const coordString = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
          form.setValue('source', coordString);
          console.log('Error fallback to coordinates:', coordString);
        } finally {
          setIsLoadingLocation(false);
          if (isInitial) setIsInitialLocationLoad(false);
        }
      },
      (error) => {
        setIsLoadingLocation(false);
        if (isInitial) setIsInitialLocationLoad(false);
        
        let errorMessage = 'An unknown error occurred';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied by user. Please enable location access or enter your address manually.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable. Please enter your address manually.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Please try again or enter your address manually.';
            break;
        }
        setLocationError(errorMessage);
        console.error('Geolocation error:', errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000, // Increased timeout
        maximumAge: 60000,
      }
    );
  };

  async function onSubmit(values: z.infer<typeof schema>) {
    console.log('Routing from', values.source, 'to', values.destination);
    setShowMap(true);
    setShowSuggestions(false);
    
    // Wait for map to initialize if it hasn't already
    setTimeout(() => {
      calculateRoute(values.source, values.destination);
    }, 100);
  }

  const resetRoute = () => {
    setShowMap(false);
    setRouteData(null);
    setRouteError(null);
    setSourceCoords(null);
    setDestCoords(null);
    setAddressSuggestions([]);
    setShowSuggestions(false);
    form.reset();
    
    // Clear directions
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setDirections({ routes: [] } as any);
    }
    
    // Re-get current location
    getCurrentLocation(true);
  };

  return (
    <div className="p-6 bg-white h-full overflow-hidden flex flex-col">
      <div className={showMap ? 'flex-shrink-0' : 'flex-1'}>
        <h2 className="text-xl font-extrabold mb-1 text-center dark:text-[#282B35]">
          Get direct route to the drop!
        </h2>
        <p className="text-muted-foreground mb-4 text-center mx-auto">
          Add your source address and select <br /> your destination, we'll do the
          rest
        </p>
        <hr className="mb-6 scale-x-150 border-[#EEEFF3]" />
        
        {/* Initial location loading */}
        {isInitialLocationLoad && (
          <div className="text-center py-4 mb-4">
            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Getting your location...</p>
          </div>
        )}
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-extrabold dark:text-[#282B35]">
                    Source Address
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        <Box className="w-4 h-4" />
                      </span>
                      <Input
                        placeholder="Enter source address"
                        {...field}
                        className="pl-10 pr-12 dark:bg-white dark:border-[#EEEFF3] dark:placeholder:text-[#8E91A0] dark:text-[#151E3A]"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => getCurrentLocation(false)}
                        disabled={isLoadingLocation}
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-100"
                        title="Use current location"
                      >
                        {isLoadingLocation ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <MapPin className="w-4 h-4 text-clgeodrops" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  {locationError && (
                    <p className="text-sm text-red-500 mt-1">{locationError}</p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="destination"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-extrabold dark:text-[#282B35]">
                    Destination Address
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        <Route className="w-4 h-4 rotate-90" />
                      </span>
                      <Input
                        placeholder="Enter destination address or postal code"
                        {...field}
                        className="pl-10 dark:bg-white dark:border-[#EEEFF3] dark:placeholder:text-[#8E91A0] dark:text-[#151E3A]"
                        onChange={(e) => {
                          field.onChange(e);
                          getAddressSuggestions(e.target.value);
                          setShowSuggestions(e.target.value.length > 2);
                        }}
                        onFocus={() => setShowSuggestions(field.value.length > 2)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      />
                      
                      {/* Address suggestions dropdown */}
                      {showSuggestions && addressSuggestions.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                          {addressSuggestions.map((suggestion, index) => (
                            <div
                              key={index}
                              className="px-3 py-2 cursor-pointer hover:bg-gray-100 text-sm"
                              onClick={() => {
                                form.setValue('destination', suggestion);
                                setShowSuggestions(false);
                              }}
                            >
                              {suggestion}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={isLoadingRoute || isInitialLocationLoad}
                className="flex-1 text-base h-13 rounded-[12px] bg-clgeodrops hover:opacity-60 text-white"
              >
                {isLoadingRoute ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Calculating Route...
                  </>
                ) : (
                  <>
                    <Navigation className="w-4 h-4 mr-2" />
                    Start Route
                  </>
                )}
              </Button>
              
              {showMap && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetRoute}
                  className="px-4 h-13 rounded-[12px] border-[#00C1CE] text-clgeodrops hover:bg-clgeodrops hover:text-white"
                >
                  Reset
                </Button>
              )}
            </div>
          </form>
        </Form>

        {routeError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{routeError}</p>
          </div>
        )}

        {routeData && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-semibold text-green-800 mb-2">Route Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-green-600 font-medium">Distance:</span>
                <p className="text-green-800">{routeData.distance}</p>
              </div>
              <div>
                <span className="text-green-600 font-medium">Duration:</span>
                <p className="text-green-800">{routeData.duration}</p>
              </div>
            </div>
          </div>
        )}

        {!showMap && !isInitialLocationLoad && (
          <p className="text-[#8E91A0] mt-4 text-center">
            Logged in as{' '}
            <span className="text-clgeodrops font-semibold underline">
              #TODO: ADD THE CURRENT USER
            </span>
          </p>
        )}
      </div>

      {/* Map Container */}
      {showMap && (
        <div className="flex-1 mt-4 border rounded-lg overflow-hidden">
          <div 
            ref={mapRef} 
            className="w-full h-full min-h-[400px]"
          />
        </div>
      )}
    </div>
  );
}