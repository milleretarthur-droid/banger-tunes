import type { Metadata } from "next";
import BacForm from "./BacForm";

export const metadata: Metadata = { title: "Digger — écoute le bac d'un vendeur" };

export default function BacIndexPage() {
  return <BacForm />;
}
