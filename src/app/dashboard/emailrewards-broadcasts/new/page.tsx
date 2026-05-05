// dashboard/emailrewards-broadcasts/new/page.tsx
import EmailRewardBroadcastForm from "@/components/EmailRewardBroadcastForm";

export default function NewEmailRewardBroadcastPage() {
  return (
    <div className="p-6 lg:p-8">
      <EmailRewardBroadcastForm mode="new" />
    </div>
  );
}