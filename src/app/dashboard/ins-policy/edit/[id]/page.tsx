// dashboard/ins-policy/edit/[id]/page.tsx
"use client";

import { use } from "react";
import PolicyForm from "@/components/PolicyForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditPolicyPage({ params }: PageProps) {
  const { id } = use(params);

  if (!id || id.trim() === "") {
    return (
      <div className="p-6 lg:p-8">
        <p className="text-red-500">Invalid policy ID.</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <PolicyForm mode="edit" policyId={id} />
    </div>
  );
}