"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminPage() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<'upload' | 'delete' | null>(null);

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
          className="text-[1.6rem] link-style mb-8"
        >
          logout
        </button>

        <div className="flex gap-16 mt-12">
          {/* Left navigation */}
          <div className="flex flex-col space-y-8">
            <button
              onClick={() => setActiveSection('upload')}
              className={`text-[1.6rem] link-style text-left ${activeSection === 'upload' ? 'underline' : ''}`}
            >
              upload images
            </button>
            <button
              onClick={() => setActiveSection('delete')}
              className={`text-[1.6rem] link-style text-left ${activeSection === 'delete' ? 'underline' : ''}`}
            >
              delete images
            </button>
          </div>

          {/* Right content */}
          <div className="flex-1">
            {activeSection === 'upload' && (
              <p className="text-lg">Butterfly dance through summer breeze</p>
            )}

            {activeSection === 'delete' && (
              <p className="text-lg">Mountain peaks touch cloudy sky high</p>
            )}

            {!activeSection && (
              <p className="text-gray-500 text-lg">
                Select a section from the left to get started
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
