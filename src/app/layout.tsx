import "./global.css"; // Pastikan namanya global.css bukan globals.css
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Tumbuh AI - Smart Clinic",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="facebook-domain-verification" content="en2a6nn4xuoe70jdw20u1sa7ordef6" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}