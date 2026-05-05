// services/emailRewardBroadcastApi.ts
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

export interface RewardSearchResult {
  awardid: string | number;
  assetname: string;
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

export const emailRewardBroadcastApi = {
  // Search awards by criteria
  searchRewards: async (query: string): Promise<RewardSearchResult[]> => {
    try {
      const username = localStorage.getItem("username") ?? "";
      const response = await fetch(
        `${EMAIL_API_BASE}/searchrewardsbycriteria?q=${encodeURIComponent(query)}&userid=${encodeURIComponent(username)}`
      );
      if (!response.ok) throw new Error("Failed to search awards");
      const data = await response.json();
      return Array.isArray(data) ? data : data.awards || data.results || [];
    } catch (error) {
      console.error("Error searching awards:", error);
      return [];
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

  // Get rewards
  getRewardUsers: async (awardId: string): Promise<string[]> => {
    try {
      const response = await fetch(
        `${EMAIL_API_BASE}/rewardusers/${awardId}`
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