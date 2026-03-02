import { Geist, Geist_Mono, Caveat } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Toaster } from "react-hot-toast";
import Image from "next/image";
import LayoutClientWrapper from "@/components/LayoutClientWrapper";

const caveatFont = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Resq-Forces",
  description: "Life Saving Force",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="cupcake">
      <head>
        <link rel="icon" href="/file.jpeg" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${caveatFont.variable} antialiased flex flex-col justify-between min-h-screen relative`}
      >
        <LayoutClientWrapper>
          <main className="flex-1 relative z-10">{children}</main>
          <Toaster position="top-center" reverseOrder={false} />
        </LayoutClientWrapper>
      </body>
    </html>
  );
}
