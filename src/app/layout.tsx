import type { Metadata, Viewport } from "next";
import Link from "next/link";
import NavAuth from "@/components/NavAuth";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Banger Tunes", template: "%s · Banger Tunes" },
  description:
    "Regarde des DJ mixer en direct et repère chaque vinyle qu'ils passent, en vente sur Discogs.",
};

export const viewport: Viewport = {
  themeColor: "#0e0e0c",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <nav className="site-nav">
          <Link href="/" className="logo">
            Banger<span>Tunes</span>
          </Link>
          <div className="nav-links">
            <Link href="/#a-venir">Lives</Link>
            <Link href="/tarifs">Tarifs</Link>
            <Link href="/guide">Guide</Link>
            <NavAuth />
          </div>
        </nav>
        <main>{children}</main>
        <footer className="site-footer">
          <span>Banger Tunes</span>
          <span>Les ventes se font sur Discogs.</span>
        </footer>
      </body>
    </html>
  );
}
