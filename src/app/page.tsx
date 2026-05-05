'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.push(process.env.NEXT_PUBLIC_DEFAULT_PAGE || '/public');
  }, []);

  return null;
}
