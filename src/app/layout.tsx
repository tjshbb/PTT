import type { Metadata } from "next";
import "./globals.css";
import { LocationProvider } from "@/components/LocationProvider";

export const metadata: Metadata = {
  title: "DateSpark — Paint The Town",
  description: "Personalized, bookable, on-budget date ideas.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <LocationProvider>{children}</LocationProvider>
      </body>
    </html>
  );
}
