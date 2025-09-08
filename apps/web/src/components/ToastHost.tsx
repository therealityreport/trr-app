"use client";

import { useEffect, useState } from "react";

export default function ToastHost() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const m = sessionStorage.getItem("toastMessage");
    if (m) {
      setMessage(m);
      sessionStorage.removeItem("toastMessage");
      const t = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(t);
    }
  }, []);

  if (!message) return null;
  return (
    <div className="fixed top-3 left-0 right-0 flex justify-center z-50">
      <div className="max-w-md w-full mx-3 rounded bg-black text-white py-2 px-3 text-sm shadow">
        {message}
      </div>
    </div>
  );
}

