"use client";

import { useState } from "react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Form submission will be implemented in a later task
  };

  return (
    <main className="min-h-screen bg-white text-[#413F3D] py-16">
      <div className="container mx-auto max-w-[1320px] px-4">
        <div className="flex flex-col items-center">
          <div className="w-full max-w-[54rem]">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-4">
                <label 
                  htmlFor="password" 
                  className="block text-[1.6rem] font-medium text-dark text-center"
                >
                  Enter Password
                </label>
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
                  <p className="text-red-500 text-[1.4rem] text-center">{error}</p>
                )}
              </div>
              <div className="flex justify-center">
                <button
                  type="submit"
                  disabled={isLoading || !password}
                  className="px-8 py-2 text-[1.6rem] bg-gray-900 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Verifying..." : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
} 