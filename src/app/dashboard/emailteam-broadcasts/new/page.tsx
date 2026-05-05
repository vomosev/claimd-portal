// dashboard/emailteam-broadcasts/new/page.tsx
import EmailTeamBroadcastForm from "@/components/EmailTeamBroadcastForm";

export default function NewEmailTeamBroadcastPage() {
  return (
    <div className="p-6 lg:p-8">
      <EmailTeamBroadcastForm mode="new" />
    </div>
  );
}