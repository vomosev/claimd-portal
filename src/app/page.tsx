'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // router.push(process.env.NEXT_PUBLIC_DEFAULT_PAGE || '/public');
    const datarole = localStorage.getItem("datarole");
    console.log("---------- datarole:", datarole);
    if (Number(process.env.NEXT_PUBLIC_INSURANCE) === 1 && String(datarole).includes("admin")) {
      window.location.href = "/admin/ins-policy";
    } else if (Number(process.env.NEXT_PUBLIC_INSURANCE) === 1 && String(datarole).includes("user")) {
      window.location.href = "/dashboard/ins-policy";
    } else if (Number(process.env.NEXT_PUBLIC_INSURANCE) === 1 && String(datarole).includes("subscriber")) {
      window.location.href = "/logistics/subscriber";
    } else if (Number(process.env.NEXT_PUBLIC_INSURANCE) === 1 && String(datarole).includes("driver")) {
      window.location.href = "/logistics/shipments";
    } else if (Number(process.env.NEXT_PUBLIC_INSURANCE) === 1 && String(datarole).includes("logisticsadmin")) {
      window.location.href = "/logistics/transportmap/fleet";
    }

  }, []);

  return null;
}
