import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Machine Science — Portal",
  description: "Editorial & author portal for the Machine Science journal (AzTU).",
};

// Apply the saved colour theme before first paint to avoid a flash.
// Default (no attribute) is the dark palette defined on :root.
const themeBoot = `(function(){try{var t=localStorage.getItem('msj-admin-theme');if(t)document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
