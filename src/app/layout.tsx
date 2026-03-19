import "./global.css"; 
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  // Update Title agar lebih profesional untuk verifikasi
  title: "Tumbuh AI - Smart Business Automation",
  description: "Platform SaaS AI Chatbot Multi-Tenant untuk UMKM & Enterprise. Dikelola oleh Bryan Jacquellino.",
  icons: {
    // File logo Bos harus ada di folder /public dengan nama favicon.ico atau icon.png
    icon: "/favicon.ico?v=2", 
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png", // Opsional jika ada logo untuk iPhone
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Verifikasi Meta/Facebook Bos */}
        <meta name="facebook-domain-verification" content="en2a6nn4xuoe70jdw20u1sa7ordef6" />
      </head>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}