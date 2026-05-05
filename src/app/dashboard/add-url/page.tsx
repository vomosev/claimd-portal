// dashboard/add-url/page.tsx
import UrlForm from "@/components/UrlForm";

export default function UrlFormPage() {
  return (
    <div className="p-6 lg:p-8">
      <UrlForm mode="add" />
    </div>
  );
}
