"use client";

import AwardForm from './AwardForm';

interface EditAwardPageProps {
  awardId: number;
}

export default function EditAwardPage({ awardId }: EditAwardPageProps) {
  return <AwardForm mode="edit" awardId={awardId} />;
}

