// dashboard/ins-claim/edit/[id]/page.tsx
"use client";

import { use } from "react";
import FNOLForm from "@/components/FNOLForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditFNOLPage({ params }: PageProps) {
  const { id } = use(params);

  if (!id || id.trim() === "") {
    return (
      <div className="p-6 lg:p-8">
        <p className="text-red-500">Invalid claim ID.</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <FNOLForm mode="edit" claimId={id} />
    </div>
  );
}