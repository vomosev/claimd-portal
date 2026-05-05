// services/emailWorldBroadcastApi.ts

const EMAIL_API_BASE = process.env.NEXT_PUBLIC_API_URL;

export interface WorldSearchResult {
  worldid: string;
  worldname?: string;
  description?: string;
  worldimg?: string;
  tenant?: string;
}

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

export interface SaveDraftPayload {
  id?: number;
  userid: string;
  awardid: string;
  worldid: string;
  endpoint: string;
  tenant: string;
  subject: string;
  htmltext: string;
  listid?: string;
  listname?: string;
  sentstatus: 0;
}

export interface SendEmailPayload {
  id: number;
  userid: string;
  worldid: string;
  subject: string;
  htmltext: string;
  recipients?: string[];
}

export const emailWorldBroadcastApi = {
  // ── Search worlds by criteria ──────────────────────────────────────────────
  searchWorlds: async (query: string): Promise<WorldSearchResult[]> => {
    try {
      const username = localStorage.getItem("username") ?? "";
      const response = await fetch(
        `${EMAIL_API_BASE}/searchworldsbycriteria?q=${encodeURIComponent(query)}&search=${encodeURIComponent(query)}&userid=${encodeURIComponent(username)}`
      );
      if (!response.ok) throw new Error("Failed to search worlds");
      const data = await response.json();
      return Array.isArray(data) ? data : data.worlds || data.results || [];
    } catch (error) {
      console.error("Error searching worlds:", error);
      return [];
    }
  },

  // ── Get users registered to a world ───────────────────────────────────────
  getWorldRegistrants: async (worldId: string): Promise<string[]> => {
    try {
      const username = localStorage.getItem("username") ?? "";
      const response = await fetch(
        `${EMAIL_API_BASE}/worldregistrants/${encodeURIComponent(worldId)}/${username}`
      );
      if (!response.ok) throw new Error("Failed to fetch registrants");
      const data = await response.json();
      return Array.isArray(data) ? data : data.users || data.registrants || [];
    } catch (error) {
      console.error("Error fetching world registrants:", error);
      return [];
    }
  },

  // ── Save draft ─────────────────────────────────────────────────────────────
  saveDraft: async (
    payload: SaveDraftPayload
  ): Promise<{ success: boolean; id?: number; error?: string }> => {
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

  // ── Send email ─────────────────────────────────────────────────────────────
  sendEmail: async (
    payload: SendEmailPayload
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const username = localStorage.getItem("username") ?? "";
      const response = await fetch(`${EMAIL_API_BASE}/sendemailworld`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Failed to send email");
      return { success: true };
    } catch (error) {
      console.error("Error sending email:", error);
      return { success: false, error: String(error) };
    }
  },
};