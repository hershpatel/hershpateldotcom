"use client";

import { useRouter } from "next/navigation";

export default function AdminPage() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/shh/logout", { method: "POST" });
      router.push("/shh/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <main className="min-h-screen bg-white p-8">
      <div className="max-w-[75%] mx-auto">
        <button
          onClick={handleLogout}
          className="text-[1.6rem] text-gray-600 hover:text-gray-900"
        >
          logout
        </button>
      </div>
    </main>
  );
}
