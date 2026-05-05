// dashboard/emailrewards-broadcasts/edit/[id]/page.tsx
"use client";

import { use } from "react";
import EmailRewardBroadcastForm from "@/components/EmailRewardBroadcastForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditEmailRewardBroadcastPage({ params }: PageProps) {
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
    <div className="p-6 lg:p-8">
      <EmailRewardBroadcastForm mode="edit" broadcastId={broadcastId} />
    </div>
  );
}