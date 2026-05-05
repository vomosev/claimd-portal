// dashboard/emailworld-broadcasts/new/page.tsx
import EmailWorldBroadcastForm from "@/components/EmailWorldBroadcastForm";

export default function NewEmailWorldBroadcastPage() {
  return (
    <div className="p-6 lg:p-8">
      <EmailWorldBroadcastForm mode="new" />
    </div>
  );
}