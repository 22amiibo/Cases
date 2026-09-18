import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Casework — Case Interview Practice",
  description:
    "Build consulting problem-solving skills through deterministic drills and interactive cases.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
