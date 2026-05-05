// services/emailBroadcastApi.ts
export interface EmailBroadcast {
  id: number;
  userid: string;
  awardid: string;
  worldid: string;
  endpoint: string;
  tenant: string;
  subject: string;
  htmltext: string;
  sentstatus: 0 | 1;
  created_at: string;
  updated_at: string;
}

export interface AwardSearchResult {
  awardid: string | number;
  assetname: string;
  name: string;
  description: string;
  awardimg: string;
  userid?: string;
  worldid?: string;
}

export interface SaveDraftPayload {
  id?: number;
  userid: string;
  awardid: string;
  worldid?: string;
  endpoint: string;
  tenant?: string;
  subject: string;
  htmltext: string;
  listid?: string;
  listname?: string;
  sentstatus: 0 | 1;
}

export interface SendEmailPayload {
  id: number;
  userid: string;
  awardid: string;
  subject: string;
  htmltext: string;
  recipients?: string[];
}

const EMAIL_API_BASE = "https://nodejs.gridiron-app.com";

export const emailBroadcastApi = {
  // Search awards by criteria
  searchAwards: async (query: string): Promise<AwardSearchResult[]> => {
    try {
      const username = localStorage.getItem("username") ?? "";
      const response = await fetch(
        `${EMAIL_API_BASE}/searchawardsbycriteria?q=${encodeURIComponent(query)}&userid=${encodeURIComponent(username)}`
      );
      if (!response.ok) throw new Error("Failed to search awards");
      const data = await response.json();
      return Array.isArray(data) ? data : data.awards || data.results || [];
    } catch (error) {
      console.error("Error searching awards:", error);
      return [];
    }
  },

  // Get all email broadcasts // EMAIL_TODO
  getEmailBroadcasts: async (): Promise<EmailBroadcast[]> => {
    try {
      const username = localStorage.getItem("username") ?? "";
      const response = await fetch(`${EMAIL_API_BASE}/emailbroadcasts/${username}`);
      if (!response.ok) throw new Error("Failed to fetch email broadcasts");
      const data = await response.json();
      return Array.isArray(data) ? data : data.broadcasts || [];
    } catch (error) {
      console.error("Error fetching email broadcasts:", error);
      return [];
    }
  },

  // Get single email broadcast // EMAIL_TODO
  getEmailBroadcast: async (id: number): Promise<EmailBroadcast | null> => {
    try {
      const username = localStorage.getItem("username") ?? "";
      const response = await fetch(`${EMAIL_API_BASE}/emailbroadcasts/${id}/${username}`);
      if (!response.ok) throw new Error("Failed to fetch email broadcast");
      const data = await response.json();
      return data.broadcast || data || null;
    } catch (error) {
      console.error("Error fetching email broadcast:", error);
      return null;
    }
  },

  // Save draft
  saveDraft: async (payload: SaveDraftPayload): Promise<{ success: boolean; id?: number; error?: string }> => {
    try {
      const username = localStorage.getItem("username") ?? "";
      const response = await fetch(`${EMAIL_API_BASE}/savedraft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Failed to save draft");
      const data = await response.json();
      return { success: true, id: data.id || data.insertId };
    } catch (error) {
      console.error("Error saving draft:", error);
      return { success: false, error: String(error) };
    }
  },

  // Send email
  sendEmail: async (payload: SendEmailPayload): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(`${EMAIL_API_BASE}/sendemail`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });

      let data: any = {};
      try {
        data = await response.json();
      } catch {
        data = { error: response.statusText || `HTTP ${response.status}` };
      }

      if (!response.ok) {
        const msg = data?.error || data?.message || `Server error ${response.status}`;
        console.error("sendEmail failed:", response.status, data);
        return { success: false, error: msg };
      }

      return { success: true };

    } catch (error) {
      console.error("sendEmail network error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },

  // Send notification
  sendNotification: async (payload: SendEmailPayload): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(`${EMAIL_API_BASE}/sendnotification`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });

      // ── Always read the body so we can surface the real error message ──────
      let data: any = {};
      try {
        data = await response.json();
      } catch {
        data = { error: response.statusText || `HTTP ${response.status}` };
      }

      if (!response.ok) {
        const msg = data?.error || data?.message || `Server error ${response.status}`;
        console.error("sendNotification failed:", response.status, data);
        return { success: false, error: msg };
      }

      return { success: true };

    } catch (error) {
      // Pure network failure
      console.error("sendNotification network error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },

  // Get users who claimed an award
  getAwardClaimants: async (awardId: string): Promise<string[]> => {
    try {
      const response = await fetch(
        `${EMAIL_API_BASE}/awardclaimants/${awardId}`
      );
      if (!response.ok) throw new Error("Failed to fetch claimants");
      const data = await response.json();
      return Array.isArray(data) ? data : data.users || data.claimants || [];
    } catch (error) {
      console.error("Error fetching award claimants:", error);
      return [];
    }
  },

  // Get users who claimed an award by serialnumbers
  getAwardSerialNumbers: async (awardId: string): Promise<string[]> => {
    try {
      const response = await fetch(
        `${EMAIL_API_BASE}/awardserialnumbers/${awardId}`
      );
      if (!response.ok) throw new Error("Failed to fetch claimants");
      const data = await response.json();
      return Array.isArray(data) ? data : data.users || data.claimants || [];
    } catch (error) {
      console.error("Error fetching award claimants:", error);
      return [];
    }
  },

};