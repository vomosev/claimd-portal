// dashboard/email-broadcasts/edit/[id]/page.tsx
"use client";

import { use } from "react";
import EmailMailchimpBroadcastForm from "@/components/EmailMailchimpBroadcastForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditEmailBroadcastPage({ params }: PageProps) {
  const { id } = use(params);
  const broadcastId = parseInt(id, 10);

  if (isNaN(broadcastId)) {
    return (
      <div className="p-6 lg:p-8">
        <p className="text-red-500">Invalid broadcast ID.</p>
      </div>
    );
  }

  return (
    <EmailMailchimpBroadcastForm
      mode="edit"
      broadcastId={broadcastId}
    />
  );
}