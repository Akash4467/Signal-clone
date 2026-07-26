import type { Metadata } from "next";
import "./globals.css";
import { Toasts } from "@/components/ui/Toasts";

export const metadata: Metadata = {
  title: "Signal",
  description: "Secure messaging platform — Signal clone",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `if (localStorage.getItem("theme") === "dark") document.documentElement.classList.add("dark");`,
          }}
        />
        {children}
        <Toasts />
      </body>
    </html>
  );
}
