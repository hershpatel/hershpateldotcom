"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { type AuthResponse } from "~/lib/auth/types";

interface TerminalInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
}

function TerminalInput({
  value,
  onChange,
  disabled = false,
  placeholder = "",
  type = "text",
  autoComplete,
}: TerminalInputProps) {
  return (
    <div className="relative flex justify-center">
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-center bg-transparent text-[1.6rem] border-none focus:outline-none caret-transparent"
        disabled={disabled}
        autoComplete={autoComplete}
        autoFocus
        placeholder={placeholder}
      />
      <span 
        className="absolute top-1/2 -translate-y-1/2 left-[50%] translate-x-[calc((var(--num-chars)*0.7rem)/2)] w-[2px] h-[1.6rem] bg-gray-500 animate-[blink_1s_infinite]" 
        style={{ '--num-chars': value.length } as React.CSSProperties} 
      />
    </div>
  );
}

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
            setError(data.error ?? "an error occurred");
        }
        return;
      }

      // On success, navigate to return URL
      const returnTo = searchParams.get("from") ?? "/shh";
      router.push(returnTo);
    } catch {
      setError("failed to connect to server");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh]">
      <div className="w-full max-w-[14rem]">
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-[1.6rem] text-center">
                <span className="animate-pulse">⌛</span>
              </div>
            ) : (
              <TerminalInput
                type="password"
                value={password}
                onChange={(value) => {
                  setError("");
                  setPassword(value);
                }}
                disabled={isLoading}
                autoComplete="current-password"
                placeholder=""
              />
            )}
            {error && (
              <p className="text-red-500 text-[1.4rem] text-center mt-4" role="alert">{error}</p>
            )}
          </div>
          <button type="submit" className="hidden">Submit</button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-white text-[#413F3D] flex items-center justify-center">
      <style jsx global>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
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
