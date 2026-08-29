import { Injectable, computed, signal } from '@angular/core';
import type { Anordnung } from '../interfaces/signal.interface';
import type { PlanWerte } from './signal-plan';

/** Ab dieser Breite gibt es ueberhaupt ein Netz. */
const MIN_BREITE = 900;

/** Die Sektionen in der Reihenfolge, in der die Punkte sie durchlaufen. */
export type Bereich = 'hero' | 'about' | 'arbeit';
export const KETTE: readonly Bereich[] = ['hero', 'about', 'arbeit'];

/**
 * Kuerzeste und laengste Pause zwischen zwei Punkten, in Sekunden.
 *
 * Bewusst eine Spanne und kein fester Takt: Ein gleichmaessiger Takt
 * wirkt wie eine Maschine, die Muster wiederholt. Mit einer Spanne
 * draengeln sich die Punkte mal und lassen dann wieder Ruhe.
 */
export const PAUSE_MIN = 0.25;
export const PAUSE_MAX = 2.4;

/** Langsamster und schnellster Punkt, in Pixeln je Sekunde. */
export const TEMPO_MIN = 150;
export const TEMPO_MAX = 430;

/** Verzoegerung des ersten Punktes, damit der Name vorher durchlaeuft. */
export const VORLAUF = 1.2;

/**
 * Zufallswert zwischen zwei Grenzen.
 *
 * `neigung` groesser als 1 zieht das Ergebnis zur unteren Grenze. Bei den
 * Pausen ist das gewollt: kurze Abstaende sind der Normalfall, lange die
 * Ausnahme. Genau das ergibt die Buendel, statt gleichmaessig verteilter
 * Zufallswerte.
 */
export function spanne(min: number, max: number, neigung = 1): number {
  return min + (max - min) * Math.random() ** neigung;
}

/**
 * Haelt den Zustand des Signalnetzes.
 *
 * Bewusst ein eigener Service und nicht Teil von `animations.ts`: Die
 * Datei traegt bereits Buehne, SplitText, Flip und die Reveal-Familie.
 * Der Takt hat mit keinem dieser Belange etwas zu tun.
 */
@Injectable({ providedIn: 'root' })
export class Signals {
  /**
   * Die Masse des Netzes, EINMAL zentral aus CSS gelesen.
   *
   * Bewusst hier und nicht in jedem Layer einzeln. Zwei Stellen, die
   * dieselbe Zahl unabhaengig ermitteln, koennen auseinanderlaufen, und
   * genau das ist passiert: Der Layer las im Konstruktor, also bevor
   * sein Element im Dokument hing. getComputedStyle liefert dann nichts
   * und die Ersatzwerte im Code griffen. Wenn das nur einer der beiden
   * Layer tut, treffen sich die Linien an der Naht nicht mehr.
   *
   * document.documentElement haengt immer im Dokument, hier kann das
   * nicht passieren.
   */
  readonly werte = signal<PlanWerte>({
    einlauf: 130,
    band: 88,
    abstand: 9,
    rail: 44,
    taper: 400,
  });

  private readonly buehne = signal(false);
  private readonly breitGenug = signal(false);
  private readonly sichtbar = signal(true);

  /**
   * Welche Anordnung gilt. Wird NICHT selbst aus einer Media Query
   * abgeleitet, sondern von `home.ts` aus dem `onToggle` der Buehne
   * gesetzt. Nur so koennen Buehne und Netz nicht verschiedener Meinung
   * darueber sein, ob die Tafeln nebeneinander stehen.
   */
  readonly anordnung = computed<Anordnung>(() =>
    this.buehne() ? 'buehne' : 'gestapelt',
  );

  /** Ob der Layer ueberhaupt erzeugt wird. */
  readonly netzAn = computed(() => this.breitGenug());

  /**
   * Ob der Takt laufen darf.
   *
   * Haengt bewusst NICHT daran, welche Sektion gerade im Blick ist. Ein
   * Punkt soll die ganze Kette durchlaufen, und dafuer muessen auch die
   * Sektionen weiterlaufen, die man gerade nicht sieht. Sonst risse der
   * Strom ab, sobald man scrollt. Gespart wird stattdessen dort, wo es
   * wirklich zaehlt: im Hintergrundtab.
   */
  readonly laeuft = computed(() => this.breitGenug() && this.sichtbar());

  /**
   * Wer einen uebergebenen Punkt entgegennimmt, je Sektion.
   *
   * Bewusst eine direkte Rueckmeldung und kein Signal mit Effekt: Ein
   * Signal wird erst im naechsten Aenderungslauf ausgewertet, die
   * Uebernahme kaeme also ein Bild zu spaet. Genau das sah man als
   * kurzes Blinken an der Naht. So laeuft sie im selben Zug wie das Ende
   * des vorigen Punktes.
   *
   * Das Tempo reist mit, damit die naechste Sektion genauso schnell
   * weiterfaehrt: Sonst wechselte der Punkt an der Naht die
   * Geschwindigkeit, und aus einem durchlaufenden wuerden sichtbar zwei.
   */
  private readonly empfaenger = new Map<
    Bereich,
    (bahn: number, tempo: number) => void
  >();

  /** Meldet eine Sektion an. Die Rueckgabe meldet sie wieder ab. */
  melde(
    bereich: Bereich,
    nimm: (bahn: number, tempo: number) => void,
  ): () => void {
    this.empfaenger.set(bereich, nimm);
    return () => {
      if (this.empfaenger.get(bereich) === nimm) {
        this.empfaenger.delete(bereich);
      }
    };
  }

  constructor() {
    const mq = window.matchMedia(`(min-width: ${MIN_BREITE}px)`);
    this.breitGenug.set(mq.matches);
    mq.addEventListener('change', (e) => this.breitGenug.set(e.matches));

    const pruefeSicht = () =>
      this.sichtbar.set(document.visibilityState === 'visible');
    pruefeSicht();
    document.addEventListener('visibilitychange', pruefeSicht);

    // Neu lesen, wenn sich das Fenster aendert: --signal-taper rechnet
    // mit 50vw und ist damit von der Fensterbreite abhaengig.
    this.liesWerte();
    window.addEventListener('resize', () => this.liesWerte(), { passive: true });
  }

  /**
   * Liest die Masse aus CSS.
   *
   * Alle fuenf sind in styles.scss per @property als <length>
   * registriert. Ohne diese Registrierung gaebe getPropertyValue den
   * TEXT der Eigenschaft zurueck statt ihres Wertes, aus
   * clamp(...) wuerde also kein Pixelwert und parseFloat scheiterte.
   */
  private liesWerte(): void {
    const stil = getComputedStyle(document.documentElement);
    const zahl = (name: string, ersatz: number): number => {
      const n = parseFloat(stil.getPropertyValue(name));
      return Number.isFinite(n) ? n : ersatz;
    };

    this.werte.set({
      einlauf: zahl('--signal-einlauf', 130),
      band: zahl('--signal-band', 88),
      abstand: zahl('--signal-abstand', 9),
      rail: zahl('--signal-rail', 44),
      taper: zahl('--signal-taper', 400),
    });
  }

  setzeBuehne(aktiv: boolean): void {
    this.buehne.set(aktiv);
  }

  /**
   * Gibt einen Punkt an die naechste Sektion der Kette weiter. Am Ende
   * der Kette passiert nichts, der Punkt ist dann angekommen.
   */
  weiter(von: Bereich, bahn: number, tempo: number): void {
    const ziel = KETTE[KETTE.indexOf(von) + 1];
    if (!ziel) return;
    this.empfaenger.get(ziel)?.(bahn, tempo);
  }
}
