"use client";

import { useLang } from "@/lib/i18n";
import { makeT } from "@/lib/lang";
import { useMemo, useState } from "react";

type Props = {
  /** Reçoit la date choisie (heure locale du navigateur) ou null si effacée. */
  onChange: (value: Date | null) => void;
  id?: string;
};

const WEEKDAYS = { fr: ["L", "M", "M", "J", "V", "S", "D"], en: ["M", "T", "W", "T", "F", "S", "S"] };
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 15, 30, 45];

const pad = (n: number) => String(n).padStart(2, "0");
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();


export default function DateTimePicker({ onChange, id }: Props) {
  const lang = useLang();
  const t = makeT(lang);
  const loc = lang === "en" ? "en-GB" : "fr-FR";
  const summaryFmt = new Intl.DateTimeFormat(loc, { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  const today = useMemo(() => startOfDay(new Date()), []);
  const [day, setDay] = useState<Date | null>(null);
  const [hour, setHour] = useState(21);
  const [minute, setMinute] = useState(0);
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [open, setOpen] = useState(false);

  function emit(d: Date | null, h: number, m: number) {
    if (!d) return onChange(null);
    onChange(new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m, 0, 0));
  }

  function pickDay(d: Date) {
    setDay(d);
    emit(d, hour, minute);
  }
  function pickHour(h: number) {
    setHour(h);
    emit(day, h, minute);
  }
  function pickMinute(m: number) {
    setMinute(m);
    emit(day, hour, m);
  }
  function setAll(d: Date, h: number, m: number) {
    setDay(startOfDay(d));
    setHour(h);
    setMinute(m);
    setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    emit(startOfDay(d), h, m);
  }
  function clear() {
    setDay(null);
    onChange(null);
  }

  // --- Raccourcis ---
  const now = new Date();
  const tonight = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 21, 0);
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const saturday = new Date(today);
  saturday.setDate(today.getDate() + ((6 - today.getDay() + 7) % 7 || 7));

  // --- Calendrier ---
  const first = month;
  const offset = (first.getDay() + 6) % 7; // semaine commençant le lundi
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(first.getFullYear(), first.getMonth(), i + 1)),
  ];
  const canGoPrev = first > new Date(today.getFullYear(), today.getMonth(), 1);

  const composed = day ? new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute) : null;
  const isPast = composed ? composed.getTime() < Date.now() : false;

  return (
    <div className="dtp">
      <button
        type="button"
        id={id}
        className={`dtp-toggle${composed ? " has-value" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span>{composed ? summaryFmt.format(composed) : t("Choisir une date et une heure", "Choose a date and time")}</span>
        <span aria-hidden>{open ? "▴" : "▾"}</span>
      </button>

      {open && (
        <div className="dtp-pop">
          <div className="dtp-quick">
            <button type="button" className="chip" onClick={() => setAll(new Date(now.getTime() + 60 * 60 * 1000), new Date(now.getTime() + 60 * 60 * 1000).getHours(), 0)}>
              {t("Dans 1 h", "In 1 hour")}
            </button>
            <button type="button" className="chip" disabled={tonight < now} onClick={() => setAll(tonight, 21, 0)}>
              {t("Ce soir 21 h", "Tonight 9 pm")}
            </button>
            <button type="button" className="chip" onClick={() => setAll(tomorrow, 21, 0)}>
              {t("Demain 21 h", "Tomorrow 9 pm")}
            </button>
            <button type="button" className="chip" onClick={() => setAll(saturday, 21, 0)}>
              {t("Samedi 21 h", "Saturday 9 pm")}
            </button>
            {composed && (
              <button type="button" className="chip chip-clear" onClick={clear}>
                {t("Effacer", "Clear")}
              </button>
            )}
          </div>

          <div className="dtp-cal">
            <div className="dtp-month">
              <button
                type="button"
                className="dtp-nav"
                onClick={() => setMonth(new Date(first.getFullYear(), first.getMonth() - 1, 1))}
                disabled={!canGoPrev}
                aria-label={t("Mois précédent", "Previous month")}
              >
                ‹
              </button>
              <strong>
                {new Intl.DateTimeFormat(loc, { month: "long" }).format(first)} {first.getFullYear()}
              </strong>
              <button
                type="button"
                className="dtp-nav"
                onClick={() => setMonth(new Date(first.getFullYear(), first.getMonth() + 1, 1))}
                aria-label={t("Mois suivant", "Next month")}
              >
                ›
              </button>
            </div>
            <div className="dtp-grid">
              {WEEKDAYS[lang].map((w, i) => (
                <span key={i} className="dtp-wd">
                  {w}
                </span>
              ))}
              {cells.map((d, i) =>
                d ? (
                  <button
                    key={i}
                    type="button"
                    className={`dtp-day${day && sameDay(d, day) ? " is-selected" : ""}${sameDay(d, today) ? " is-today" : ""}`}
                    disabled={d < today}
                    onClick={() => pickDay(d)}
                    aria-label={d.toLocaleDateString(loc, { weekday: "long", day: "numeric", month: "long" })}
                  >
                    {d.getDate()}
                  </button>
                ) : (
                  <span key={i} />
                ),
              )}
            </div>
          </div>

          <div className="dtp-time">
            <p className="dtp-label">{t("Heure", "Hour")}</p>
            <div className="dtp-hours">
              {HOURS.map((h) => (
                <button key={h} type="button" className={`chip${h === hour ? " is-selected" : ""}`} onClick={() => pickHour(h)}>
                  {pad(h)}
                </button>
              ))}
            </div>
            <p className="dtp-label">{t("Minutes", "Minutes")}</p>
            <div className="dtp-minutes">
              {MINUTES.map((m) => (
                <button key={m} type="button" className={`chip${m === minute ? " is-selected" : ""}`} onClick={() => pickMinute(m)}>
                  {pad(m)}
                </button>
              ))}
            </div>
          </div>

          {isPast && <p className="dtp-warn">{t("Cette date est déjà passée.", "This date has already passed.")}</p>}
          <button type="button" className="btn-ghost dtp-done" onClick={() => setOpen(false)}>
            {t("Valider", "Done")}
          </button>
        </div>
      )}
    </div>
  );
}
