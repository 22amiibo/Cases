import type { Metadata } from "next";
import { PrimaryNavigation } from "@/components/navigation/PrimaryNavigation";
import "./globals.css";

export const metadata: Metadata = {
  title: "Casework — Case Interview Practice",
  description:
    "Learn consulting skills, practice focused labs, and work deterministic interactive cases.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <PrimaryNavigation />
        {children}
      </body>
    </html>
  );
}
