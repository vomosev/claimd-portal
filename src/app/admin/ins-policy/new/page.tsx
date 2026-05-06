// admin/ins-policy/new/page.tsx
import AdminPolicyForm from "@/components/AdminPolicyForm";

export default function NewPolicyPage() {
  return (
    <div className="p-6 lg:p-8">
      <AdminPolicyForm mode="new" />
    </div>
  );
}