import { Injectable, computed, signal } from '@angular/core';
import type { Anordnung } from '../interfaces/signal.interface';

/** Ab dieser Breite gibt es ueberhaupt ein Netz. */
const MIN_BREITE = 900;

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

/** Verzoegerung des ersten Punktes, damit der Name vorher durchlaeuft. */
export const VORLAUF = 1.2;

/**
 * Haelt den Zustand des Signalnetzes.
 *
 * Bewusst ein eigener Service und nicht Teil von `animations.ts`: Die
 * Datei traegt bereits Buehne, SplitText, Flip und die Reveal-Familie.
 * Der Takt hat mit keinem dieser Belange etwas zu tun.
 */
@Injectable({ providedIn: 'root' })
export class Signals {
  private readonly buehne = signal(false);
  private readonly imBlick = signal(true);
  private readonly breitGenug = signal(false);

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

  /** Ob der Takt laufen darf. */
  readonly laeuft = computed(() => this.breitGenug() && this.imBlick());

  /**
   * Meldet, dass ein Punkt die Hero verlassen hat und About ihn
   * uebernehmen soll.
   *
   * Bewusst ein Ereignis und keine geteilte Zeitrechnung: About muesste
   * sonst wissen, wie lange die Hero-Bahn dauert. So kennt jede Tafel nur
   * ihre eigene Geometrie.
   *
   * Der Zaehler steigt bei jeder Uebergabe, damit zwei Uebergaben auf
   * derselben Bahn zwei verschiedene Werte sind und der Effekt in About
   * beide Male anspringt.
   */
  readonly staffel = signal<{
    bahn: string;
    /**
     * Das Tempo des uebergebenen Punktes. Reist mit, damit About genauso
     * schnell weiterfaehrt: Sonst wechselte der Punkt genau an der Naht
     * die Geschwindigkeit, und aus einem durchlaufenden Punkt wuerden
     * sichtbar zwei.
     */
    tempo: number;
    nr: number;
  } | null>(null);

  private nr = 0;

  constructor() {
    const mq = window.matchMedia(`(min-width: ${MIN_BREITE}px)`);
    this.breitGenug.set(mq.matches);
    mq.addEventListener('change', (e) => this.breitGenug.set(e.matches));
  }

  setzeBuehne(aktiv: boolean): void {
    this.buehne.set(aktiv);
  }

  /**
   * Ob die Buehne im Blick ist. Gilt fuer Hero UND About zusammen: Waere
   * nur die eigene Sektion massgeblich, verstummte About in dem Moment,
   * in dem die Hero aus dem Bild faehrt, und bekaeme nie wieder einen
   * Punkt.
   */
  setzeImBlick(sichtbar: boolean): void {
    this.imBlick.set(sichtbar);
  }

  uebergib(bahn: string, tempo: number): void {
    this.staffel.set({ bahn, tempo, nr: ++this.nr });
  }
}
