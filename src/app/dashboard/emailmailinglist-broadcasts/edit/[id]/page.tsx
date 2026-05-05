// dashboard/emailmailinglist-broadcasts/edit/[id]/page.tsx
"use client";

import { use } from "react";
import EmailMailingListBroadcastForm from "@/components/EmailMailingListBroadcastForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditEmailMailingListBroadcastPage({ params }: PageProps) {
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
      <EmailMailingListBroadcastForm mode="edit" broadcastId={broadcastId} />
    </div>
  );
}