"use client";

import { useEffect, useId, useRef, useState } from "react";
import { searchCities, type City } from "@/lib/cities";

export type CityValue = { city: string; lat: number; lng: number } | null;

type Props = {
  id?: string;
  /** Ville déjà enregistrée (affichée au départ, valide tant qu'on ne la modifie pas). */
  initial?: { city: string | null; lat: number | null; lng: number | null };
  onChange: (value: CityValue, typed: string) => void;
};

/**
 * Champ ville avec liste déroulante : on tape quelques lettres, on choisit dans la liste.
 * `onChange(null, texte)` signale un texte tapé mais pas encore choisi dans la liste.
 */
export default function CityPicker({ id, initial, onChange }: Props) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const [text, setText] = useState(initial?.city ?? "");
  const [options, setOptions] = useState<City[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [chosen, setChosen] = useState(Boolean(initial?.city && initial.lat != null && initial.lng != null));
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chosen || text.trim().length < 2) {
      setOptions([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const list = await searchCities(text, ctrl.signal);
        setOptions(list);
        setActive(-1);
        setOpen(true);
      } catch {
        /* requête annulée ou réseau indisponible */
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [text, chosen]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function pick(c: City) {
    setText(c.label);
    setChosen(true);
    setOpen(false);
    onChange({ city: c.label, lat: c.lat, lng: c.lng }, c.label);
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || options.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % options.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? options.length - 1 : i - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      pick(options[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="city-picker" ref={boxRef}>
      <input
        id={inputId}
        value={text}
        maxLength={120}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={`${inputId}-list`}
        placeholder="Tape ta ville : Nantes, Lyon, Bruxelles…"
        onChange={(e) => {
          setText(e.target.value);
          setChosen(false);
          onChange(null, e.target.value);
        }}
        onFocus={() => options.length > 0 && setOpen(true)}
        onKeyDown={onKey}
      />
      {loading && <span className="city-hint">Recherche…</span>}
      {chosen && !loading && <span className="city-hint city-ok">✓ Ville placée sur la carte</span>}
      {open && options.length > 0 && (
        <ul className="city-list" id={`${inputId}-list`} role="listbox">
          {options.map((c, i) => (
            <li key={c.label} role="option" aria-selected={i === active} className={i === active ? "is-active" : undefined}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(c)}>
                {c.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
