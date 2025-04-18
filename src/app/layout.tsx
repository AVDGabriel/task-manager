import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthWrapper from "@/components/auth-wrapper/AuthWrapper";
import { CategoryProvider } from "@/context/CategoryContext";
import { PriorityProvider } from "@/context/PriorityContext";
import { Toaster } from "react-hot-toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Task Manager",
  description: "Simple Task App with Firebase Auth + Firestore",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} bg-zinc-900 text-white`}>
        <AuthWrapper>
          <CategoryProvider>
            <PriorityProvider>
              {children}
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#27272a',
                    color: '#fff',
                  },
                  success: {
                    iconTheme: {
                      primary: '#22c55e',
                      secondary: '#fff',
                    },
                  },
                  error: {
                    iconTheme: {
                      primary: '#ef4444',
                      secondary: '#fff',
                    },
                  },
                }}
              />
            </PriorityProvider>
          </CategoryProvider>
        </AuthWrapper>
      </body>
    </html>
  );
}
