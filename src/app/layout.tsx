import type { Metadata } from "next";
import { Fraunces, Inter, Space_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { NavBar, TopLoader } from "@/components/ui";

const fraunces = Fraunces({ subsets: ["latin"], weight: ["400", "500", "600"], style: ["normal", "italic"], variable: "--font-serif" });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-sans" });
const spaceMono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "GapMap — honest CV tailoring",
  description: "Match the job. Tell the truth.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          // wire next/font variables into the CSS custom properties globals.css expects
          ["--serif" as string]: `var(${fraunces.variable})`,
          ["--sans" as string]: `var(${inter.variable})`,
          ["--mono" as string]: `var(${spaceMono.variable})`,
        }}
        className={`${fraunces.variable} ${inter.variable} ${spaceMono.variable}`}
      >
        <TopLoader />
        <AuthProvider>
          <div className="grain" aria-hidden />
          <NavBar />
          <main className="main">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
