// services/emailTeamBroadcastApi.ts

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

export const emailTeamBroadcastApi = {

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
      const response = await fetch(`${EMAIL_API_BASE}/sendemailteam`, {
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