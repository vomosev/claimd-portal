"use client";

import { use } from "react";
import EditAwardPage from "@/components/pages/EditAwardPage";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function EditAward({ params }: PageProps) {
  const resolvedParams = use(params);
  const awardId = parseInt(resolvedParams.id);

  if (isNaN(awardId)) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Invalid award ID</p>
      </div>
    );
  }

  return <EditAwardPage awardId={awardId} />;
}
