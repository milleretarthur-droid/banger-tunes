import type { Metadata, Viewport } from "next";
import Link from "next/link";
import Logo from "@/components/Logo";
import BrandStamp from "@/components/BrandStamp";
import NavAuth from "@/components/NavAuth";
import LangSwitch from "@/components/LangSwitch";
import { LangProvider } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  return {
    title: { default: "Banger Tunes", template: "%s · Banger Tunes" },
    description:
      lang === "en"
        ? "Watch DJs mix live and spot every record they play, available to buy."
        : "Regarde des DJ mixer en direct et repère chaque vinyle qu'ils passent, disponible à l'achat.",
  };
}

export const viewport: Viewport = {
  themeColor: "#0e0e0c",
};

export default async function RootLayout({ children, modal }: { children: React.ReactNode; modal: React.ReactNode }) {
  const lang = await getLang();
  return (
    <html lang={lang === "en" ? "en-GB" : "fr"}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;800&family=Space+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <LangProvider lang={lang}>
        <nav className="site-nav">
          <Logo />
          <div className="nav-links">
            <Link href="/explorer">{lang === "en" ? "Explore" : "Explorer"}</Link>
            <LangSwitch />
            <NavAuth />
          </div>
        </nav>
        <main>{children}</main>
        <footer className="site-footer">
          <BrandStamp />
          <nav className="footer-links" aria-label={lang === "en" ? "Legal" : "Informations légales"}>
            <Link href="/mentions-legales">{lang === "en" ? "Legal notice" : "Mentions légales"}</Link>
            <Link href="/cgu">{lang === "en" ? "Terms" : "CGU / CGV"}</Link>
            <Link href="/confidentialite">{lang === "en" ? "Privacy" : "Confidentialité"}</Link>
          </nav>
        </footer>
        {modal}
        </LangProvider>
      </body>
    </html>
  );
}
