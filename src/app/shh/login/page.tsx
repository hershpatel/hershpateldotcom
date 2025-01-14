"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { type AuthResponse } from "~/lib/auth/types";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      setError("Password is required");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/shh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      const data = (await response.json()) as AuthResponse;

      if (!response.ok) {
        switch (response.status) {
          case 429:
            setError("too many attempts. please try again later.");
            break;
          case 401:
            setError("invalid password");
            break;
          default:
            setError(data.error ?? "An error occurred");
        }
        return;
      }

      // On success, navigate to return URL
      const returnTo = searchParams.get("from") ?? "/shh";
      router.push(returnTo);
    } catch {
      setError("Failed to connect to server");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh]">
      <div className="w-full max-w-[54rem]">
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-4">
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setError("");
                setPassword(e.target.value);
              }}
              className="w-full px-4 py-2 text-[1.6rem] border rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400"
              disabled={isLoading}
              autoComplete="current-password"
            />
            {error && (
              <p className="text-red-500 text-[1.4rem] text-center" role="alert">{error}</p>
            )}
          </div>
          <div className="flex justify-center">
            <button
              type="submit"
              disabled={isLoading || !password.trim()}
              className="px-8 py-2 text-[1.6rem] bg-gray-900 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "..." : "->"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-white text-[#413F3D] flex items-center justify-center">
      <div className="container mx-auto max-w-[1320px] px-4">
        <Suspense fallback={
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-600"></div>
          </div>
        }>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
