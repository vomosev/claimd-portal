// import axios from "axios";
import axios from "axios";
import type { AxiosRequestConfig, AxiosError } from "axios";

// import type { AxiosRequestConfig, AxiosError } from "axios";

// API base configuration
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://nodejs.gridiron-app.com";

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token and handle FormData
if (typeof window !== "undefined") {
  apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem("auth_token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // If the data is FormData, remove Content-Type to let browser set it
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }

    return config;
  });
}

// ========== TYPES ==========

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  fullName: string;
  email: string;
  password: string;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  avatar?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface Award {
  awardid: number;
  worldid?: number | null;
  awardimg: string;
  assetglburl: string;
  assetusdzurl: string;
  assetname: string;
  price?: string | null;
  currency?: string | null;
  fee?: string | null;
  latitude: number;
  longitude: number;
  allowed_radius: number;
  description: string;
  userid?: string;
  useridb?: string;
  useridc?: string;
  useridd?: string;
  certifyingbody: string;
  tokenuri: string | null;
  tokenurl: string | null;
  locationname: string;
  locationtype: string | null;
  dropname: string;
  videolocation: string;
  geolocation: string | null;
  googledrive: string | null;
  assettemplate: string;
  public: number;
  type?: string;
  name?: string | null;
  address?: string | null;
  vertical?: string | null;
  textbook?: string | null;
  challenge?: string | null;
  htmltext?: string | null;
  created_at?: string;
  updated_at?: string;
  redeemed?: number | null;
  publicurl?: string;
  privateurl?: string;
  worldname?: string;
  worldimg?: string;
  start_from_date?: string;
  start_from_time?: string;
  finish_date?: string;
  finish_time?: string;
}

export interface Songs {
  id: number;
  Catalogue: string;
  Artist: string;
  Title: string;
  Compilation: string;
  Track: string;
  Audio: string;
  EmailAddress: string;
  Genre: string;
  CatalogueAudio: string;
  NotificationSent: string;
  Information: string;
  AlbumData: string;
  TrackData: string;
}

// ========== GENERIC REQUEST WRAPPER ==========

async function apiRequest<T>(
  endpoint: string,
  options: AxiosRequestConfig = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await apiClient.request<T>({
      url: endpoint,
      ...options,
    });

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    const axiosError = error as AxiosError;
    const errorData = axiosError.response?.data as { message?: string };
    return {
      success: false,
      error: errorData?.message || axiosError.message || "Network error",
    };
  }
}

// ========== AUTH API ==========

export const authApi = {
  login: async (
    credentials: LoginRequest
  ): Promise<ApiResponse<AuthResponse>> =>
    apiRequest<AuthResponse>("/authentication", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      data: new URLSearchParams({
        username: credentials.email,
        password: credentials.password,
      }).toString(),
    }),

  signup: async (userData: SignupRequest): Promise<ApiResponse<AuthResponse>> =>
    apiRequest<AuthResponse>("/authentication", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      data: new URLSearchParams({
        username: userData.email,
        password: userData.password,
      }).toString(),
    }),

  logout: async (): Promise<ApiResponse<void>> =>
    apiRequest<void>("/auth/logout", { method: "POST" }),

  refreshToken: async (): Promise<ApiResponse<{ token: string }>> =>
    apiRequest<{ token: string }>("/auth/refresh", { method: "POST" }),

  getProfile: async (): Promise<ApiResponse<User>> =>
    apiRequest<User>("/auth/profile"),
};

// ========== ROUTES API ==========

export const routesApi = {
  calculateRoute: async (
    source: string,
    destination: string
  ): Promise<ApiResponse<{ route: string[]; distance: number }>> =>
    apiRequest("/routes/calculate", {
      method: "POST",
      data: { source, destination },
    }),
};

// ========== AWARDS API ==========

export const geoDropsApi = {

  getAllSongs: async (adminId: string): Promise<ApiResponse<Songs[]>> =>
    apiRequest<Songs[]>(`/songs/list/${adminId}`),

  getAllAwards: async (): Promise<ApiResponse<Award[]>> =>
    apiRequest<Award[]>("/awards/list"),

  getAward: async (awardId: string): Promise<ApiResponse<Award>> =>
    apiRequest<Award>(`/awards/list/${awardId}`),

  searchAwards: async (query: string): Promise<ApiResponse<Award[]>> =>
    apiRequest<Award[]>(`/searchawards?q=${encodeURIComponent(query)}`),

  getAllWorlds: async (): Promise<ApiResponse<Award[]>> =>
    apiRequest<Award[]>("/worlds/list"),

  getWorld: async (worldId: string): Promise<ApiResponse<Award>> =>
    apiRequest<Award>(`/worlds/list/${worldId}`),

  searchWorlds: async (query: string): Promise<ApiResponse<Award[]>> =>
    apiRequest<Award[]>(`/searchworlds?q=${encodeURIComponent(query)}`),

  getAllAdminAwards: async (adminId: string): Promise<ApiResponse<Award[]>> =>
    apiRequest<Award[]>(`/awards/admin/${adminId}`),

  getAdminAward: async (
    adminId: string,
    awardId: string
  ): Promise<ApiResponse<Award[]>> =>
    apiRequest<Award[]>(`/awards/admin/${adminId}/${awardId}`),

  addAward: async (
    awardData: Partial<Award>,
    files?: {
      awardImg?: File;
      assetGlb?: File;
      assetUsdz?: File;
    }
  ): Promise<ApiResponse<any>> => {
    // Create FormData to handle both data and file uploads
    const formData = new FormData();

    // Add all the award data fields (excluding file fields)
    Object.entries(awardData).forEach(([key, value]) => {
      // Skip file-related fields - these should only be in the files parameter
      if (
        key === "awardImg" ||
        key === "assetGlb" ||
        key === "assetUsdz" ||
        key === "awardFile" ||
        key === "modelGlb" ||
        key === "modelUsdz"
      ) {
        console.log(`Skipping file field: ${key}`, value);
        return;
      }

      // Also skip if value is an empty object (additional safety check)
      if (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value) &&
        Object.keys(value).length === 0
      ) {
        console.log(`Skipping empty object for field: ${key}`, value);
        return;
      }

      if (value !== undefined && value !== null) {
        console.log(`Adding field to FormData: ${key} =`, value);
        formData.append(key, String(value));
      }
    });

    // Add files if provided (only actual File objects)
    if (files) {
      if (files.awardImg instanceof File) {
        formData.append("awardImg", files.awardImg);
      }
      if (files.assetGlb instanceof File) {
        formData.append("assetGlb", files.assetGlb);
      }
      if (files.assetUsdz instanceof File) {
        formData.append("assetUsdz", files.assetUsdz);
      }
    }

    return apiRequest(`/saveaward`, {
      method: "POST",
      data: formData,
    });
  },

  updateAward: async (
    awardId: number,
    awardData: Partial<Award>,
    files?: {
      awardImg?: File;
      assetGlb?: File;
      assetUsdz?: File;
    }
  ): Promise<ApiResponse<any>> => {
    // Create FormData exactly like the EJS implementation
    const formData = new FormData();

    // Add only the non-file form fields (match EJS form fields exactly)
    const formFields = {
      userid: awardData.userid || "",
      useridb: awardData.useridb || "",
      useridc: awardData.useridc || "",
      useridd: awardData.useridd || "",
      assetname: awardData.assetname || "",
      name: awardData.name || "",
      type: awardData.type || "",
      price: awardData.price || "",
      currency: awardData.currency || "",
      fee: awardData.fee || "",
      certifyingbody: awardData.certifyingbody || "",
      description: awardData.description || "",
      htmltext: awardData.htmltext || "",
      locationname: awardData.locationname || "",
      address: awardData.address || "",
      latitude: awardData.latitude || "",
      longitude: awardData.longitude || "",
      allowed_radius: awardData.allowed_radius || "",
      locationtype: awardData.locationtype || "",
      dropname: awardData.dropname || "",
      vertical: awardData.vertical || "",
      textbook: awardData.textbook || "",
      challenge: awardData.challenge || "",
      public: awardData.public !== undefined ? awardData.public : "",
      videolocation: awardData.videolocation || "",
      awardimg: awardData.awardimg || "",
      assetglburl: awardData.assetglburl || "",
      assetusdzurl: awardData.assetusdzurl || "",
      start_from_date: awardData.start_from_date || "",
      start_from_time: awardData.start_from_time || "",
      worldid: awardData.worldid || 0,
      finish_date: awardData.finish_date || "",
      finish_time: awardData.finish_time || "",
    };

    // Add each field to FormData (only if not undefined/null)
    Object.entries(formFields).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });

    // Add _method field to match EJS implementation for updates
    formData.append("_method", "PUT");

    // Add files exactly like EJS does (if they exist)
    if (files?.awardImg instanceof File) {
      formData.append("awardImg", files.awardImg);
    }

    if (files?.assetGlb instanceof File) {
      formData.append("assetGlb", files.assetGlb);
    }

    if (files?.assetUsdz instanceof File) {
      formData.append("assetUsdz", files.assetUsdz);
    }

    // Debug: Log files being uploaded
    const fileEntries = [];
    for (let [key, value] of formData.entries()) {
      if (value instanceof File) {
        fileEntries.push(`${key}: ${value.name}`);
      }
    }
    console.log(
      "Files being uploaded:",
      fileEntries.length > 0 ? fileEntries.join(", ") : "None"
    );

    return apiRequest(`/updateaward/${awardId}`, {
      method: "POST",
      data: formData,
    });
  },

  getUserClaimedAwards: async (userId: string): Promise<ApiResponse<Award[]>> =>
    apiRequest<Award[]>(`/claimedawards/list/${userId}`),

  getUserClaimedAwardsByID: async (
    userId: string,
    awardId: string
  ): Promise<ApiResponse<Award[]>> =>
    apiRequest<Award[]>(`/claimedawardsbyid/list/${userId}/${awardId}`),

  getUserClaimedAwardsArray: async (
    userId: string
  ): Promise<ApiResponse<Award[]>> =>
    apiRequest<Award[]>(`/claimedawardsarray/list/${userId}`),

  getUserDisplayPic: async (userId: string): Promise<ApiResponse<Award[]>> =>
    apiRequest<Award[]>(`/getdisplaypic/${userId}`),
};

// ========== EXPORT ALL ==========

export default {
  auth: authApi,
  routes: routesApi,
  geodrops: geoDropsApi,
};
