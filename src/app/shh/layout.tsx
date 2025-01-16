'use client';

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

const sections = [
  { path: '/shh/upload', label: 'upload images' },
  { path: '/shh/tags', label: 'tags' },
  { path: '/shh/delete', label: 'delete images' },
] as const;

export default function ShhLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/shh/logout", { method: "POST" });
      router.push("/shh/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // If we're on the login page, don't show the layout
  if (pathname === '/shh/login') {
    return children;
  }

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
            {sections.map(section => (
              <Link
                key={section.path}
                href={section.path}
                className={`text-[1.2rem] sm:text-[1.3rem] md:text-[1.4rem] link-style text-left ${
                  pathname === section.path ? 'underline opacity-100' : 'opacity-40'
                }`}
              >
                {section.label}
              </Link>
            ))}
          </div>

          {/* Right content */}
          <div className="flex-1">
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}
