// dashboard/ins-policy/new/page.tsx
import PolicyForm from "@/components/PolicyForm";

export default function NewFNOLPage() {
  return (
    <div className="p-6 lg:p-8">
      <PolicyForm mode="new" />
    </div>
  );
}