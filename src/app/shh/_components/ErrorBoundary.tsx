"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to your preferred logging service
    console.error("Shh UI Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-white py-16">
          <div className="container mx-auto max-w-[1320px] px-4">
            <div className="text-center space-y-4">
              <h2 className="text-[2rem] font-medium text-gray-900">Something went wrong</h2>
              <p className="text-[1.6rem] text-gray-600">
                {this.state.error?.message ?? "an unexpected error occurred"}
              </p>
              <button
                onClick={() => this.setState({ hasError: false })}
                className="px-6 py-2 text-[1.6rem] bg-gray-900 text-white rounded-md hover:bg-gray-700"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
