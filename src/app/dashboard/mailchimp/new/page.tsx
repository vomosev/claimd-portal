// dashboard/emailmailinglist-broadcasts/new/page.tsx
import EmailMailingListBroadcastForm from "@/components/EmailMailingListBroadcastForm";

export default function NewEmailMailingListBroadcastPage() {
  return (
    <div className="p-6 lg:p-8">
      <EmailMailingListBroadcastForm mode="new" />
    </div>
  );
}