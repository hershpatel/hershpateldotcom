import { Playfair_Display } from "next/font/google";
import "~/styles/globals.css";
import { type Metadata } from "next";
import { Suspense } from "react";

import { TRPCReactProvider } from "~/trpc/react";
import { PHProvider, PostHogPageview } from "~/components/providers/posthog";

const font = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "hersh patel",
  description: "about hersh",
  icons: [
    { rel: "icon", url: "/favicon_io/favicon.ico" },
    { rel: "icon", type: "image/png", sizes: "32x32", url: "/favicon_io/favicon-32x32.png" },
    { rel: "icon", type: "image/png", sizes: "16x16", url: "/favicon_io/favicon-16x16.png" },
    { rel: "apple-touch-icon", sizes: "180x180", url: "/favicon_io/apple-touch-icon.png" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <Suspense>
        <PostHogPageview />
      </Suspense>
      <PHProvider>
        <body className={font.className}>
          <TRPCReactProvider>{children}</TRPCReactProvider>
        </body>
      </PHProvider>
    </html>
  );
}
