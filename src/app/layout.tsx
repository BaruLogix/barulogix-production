import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BaruLogix",
  description: "Plataforma SaaS para gestión logística de bodegas independientes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg?v=4" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico?v=4" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png?v=4" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png?v=4" />
        <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48.png?v=4" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=4" />
        <link rel="shortcut icon" href="/favicon.ico?v=4" />
        <script dangerouslySetInnerHTML={{
          __html: `
            // Forzar favicon dinámicamente
            function setFavicon() {
              // Remover todos los favicons existentes
              const existingIcons = document.querySelectorAll('link[rel*="icon"]');
              existingIcons.forEach(icon => icon.remove());
              
              // Añadir nuevo favicon
              const link = document.createElement('link');
              link.rel = 'icon';
              link.type = 'image/svg+xml';
              link.href = '/favicon.svg?v=' + Date.now();
              document.head.appendChild(link);
              
              // Fallback ICO
              const linkIco = document.createElement('link');
              linkIco.rel = 'shortcut icon';
              linkIco.type = 'image/x-icon';
              linkIco.href = '/favicon.ico?v=' + Date.now();
              document.head.appendChild(linkIco);
            }
            
            // Ejecutar cuando el DOM esté listo
            if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', setFavicon);
            } else {
              setFavicon();
            }
          `
        }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
