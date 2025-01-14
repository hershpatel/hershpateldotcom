import { type ReactNode } from "react";
import { ErrorBoundary } from "./_components/ErrorBoundary";

interface Props {
  children: ReactNode;
}

export default function ShhLayout({ children }: Props) {
  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  );
}
