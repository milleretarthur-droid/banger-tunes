import type { Metadata } from "next";

// L'administration ne doit jamais apparaître dans un moteur de recherche.
export const metadata: Metadata = {
  title: "Administration",
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
