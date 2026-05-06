// admin/ins-claim/new/page.tsx
import FNOLForm from "@/components/FNOLForm";

export default function NewFNOLPage() {
  return (
    <div className="p-6 lg:p-8">
      <FNOLForm mode="new" />
    </div>
  );
}