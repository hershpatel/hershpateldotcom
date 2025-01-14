"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SectionButton } from "./_components/SectionButton";
import { type SectionId, sections } from "./_components/sections";

export default function AdminPage() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<SectionId>("upload");

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/shh/logout", { method: "POST" });
      router.push("/shh/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const ActiveComponent = activeSection 
    ? sections.find(s => s.id === activeSection)?.Component 
    : null;

  return (
    <main className="min-h-screen bg-white p-8">
      <div className="w-[98%] md:max-w-[80%] lg:max-w-[50%] mx-auto">
        <button
          onClick={handleLogout}
          className="text-[1.4rem] link-style mb-8"
        >
          logout
        </button>

        <div className="flex gap-16 mt-12 min-h-[50vh]">
          {/* Left navigation */}
          <div className="flex flex-col space-y-8">
            {sections.map((section) => (
              <SectionButton
                key={section.id}
                id={section.id}
                label={section.label}
                isActive={activeSection === section.id}
                onClick={setActiveSection}
              />
            ))}
          </div>

          {/* Right content */}
          <div className="flex-1">
            {ActiveComponent && <ActiveComponent />}
          </div>
        </div>
      </div>
    </main>
  );
}
