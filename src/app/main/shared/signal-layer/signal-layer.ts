import {
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { gsap } from 'gsap';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { aboutPlan, heroPlan } from '../service/signal-plan';
import type { PlanWerte } from '../service/signal-plan';
import { baueBahn } from '../service/signal-path';
import {
  PAUSE_MAX,
  PAUSE_MIN,
  Signals,
  TEMPO_MAX,
  TEMPO_MIN,
  VORLAUF,
  spanne,
} from '../service/signals';

gsap.registerPlugin(MotionPathPlugin);

interface GezeichneteBahn {
  id: string;
  d: string;
}

/**
 * Legt die Leiterbahnen hinter eine Sektion und schickt Punkte darueber.
 *
 * Die Geometrie haengt an einem ResizeObserver und NICHT am
 * Refresh-Zyklus von ScrollTrigger. Eine Bahn braucht nur die eigene
 * Kastengroesse, weder die Dokumenthoehe noch die Scrollstrecke. Dadurch
 * ist sie unempfindlich gegen die drei Stolperstellen, die im Projekt
 * schon Zeit gekostet haben: die Reihenfolge von ngAfterViewInit, das zu
 * fruehe Aufloesen von document.fonts.ready und das Nachvermessen nach
 * einem Medienwechsel der Buehne.
 */
@Component({
  selector: 'app-signal-layer',
  templateUrl: './signal-layer.html',
  styleUrl: './signal-layer.scss',
})
export class SignalLayer {
  private readonly signale = inject(Signals);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  readonly bereich = input.required<'hero' | 'about'>();

  private readonly breite = signal(0);
  private readonly hoehe = signal(0);
  /**
   * Masse aus CSS. Sie stehen in styles.scss unter :root, damit Hero und
   * About garantiert dieselben lesen: Die Naht zwischen den beiden haengt
   * daran.
   */
  private readonly werte = signal<PlanWerte>({
    einlauf: 130,
    band: 88,
    abstand: 9,
  });

  private readonly reduziert = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches;

  /** Der naechste geplante Punkt. Kein fester Takt, siehe planeNaechsten. */
  private naechster?: gsap.core.Tween;

  /** Der Vorlauf gilt nur beim ersten Mal, nicht nach jedem Blickwechsel. */
  private ersterLauf = true;

  /** Welche Bahnen gerade einen Punkt tragen. */
  private readonly belegt = new Set<string>();

  protected readonly viewBox = computed(
    () => `0 0 ${this.breite()} ${this.hoehe()}`,
  );

  protected readonly bahnen = computed<GezeichneteBahn[]>(() => {
    const b = this.breite();
    const h = this.hoehe();
    if (!(b > 0) || !(h > 0)) return [];

    const anordnung = this.signale.anordnung();
    const werte = this.werte();
    const plan =
      this.bereich() === 'hero'
        ? heroPlan(anordnung, werte)
        : aboutPlan(anordnung, werte);

    return plan.bahnen.map((bahn) => ({
      id: bahn.id,
      // Ohne Rasterung: Seit die Linien gerade laufen, setzt kein Plan
      // mehr rasten. Der Pfadbauer kann es weiterhin, es fordert nur
      // gerade niemand an.
      d: baueBahn(bahn.punkte, b, h, 0),
    }));
  });

  constructor() {
    const el = this.host.nativeElement;

    const beobachter = new ResizeObserver(() => this.vermesse());
    beobachter.observe(el);
    this.destroyRef.onDestroy(() => beobachter.disconnect());

    this.vermesse();

    // Haengt an beidem: an der Geometrie, weil sich nach einer
    // Groessenaenderung die Bahnlaengen aendern, und an der Sichtbarkeit,
    // damit im Hintergrund nichts weiterrechnet.
    effect(() => {
      const bahnen = this.bahnen();
      const laeuft = this.signale.laeuft();

      this.naechster?.kill();
      this.naechster = undefined;

      if (this.reduziert || !bahnen.length || !laeuft) return;
      if (untracked(() => this.bereich()) !== 'hero') return;

      // Beim allerersten Mal der feste Vorlauf, damit der Name vorher
      // durchlaeuft. Danach sofort in die unregelmaessige Folge.
      const start = this.ersterLauf ? VORLAUF : spanne(PAUSE_MIN, PAUSE_MAX, 2);
      this.ersterLauf = false;
      this.planeNaechsten(start);
    });

    // About taktet nicht selbst, es uebernimmt, was die Hero abgibt. So
    // sieht ein Punkt ueber die Naht hinweg wie derselbe Punkt aus.
    effect(() => {
      const staffel = this.signale.staffel();
      if (!staffel) return;
      if (untracked(() => this.bereich()) !== 'about') return;
      this.schicke(staffel.bahn, staffel.tempo);
    });

    this.destroyRef.onDestroy(() => {
      this.naechster?.kill();
      gsap.killTweensOf(el.querySelectorAll('.signal__punkt'));
    });
  }

  private vermesse(): void {
    const el = this.host.nativeElement;
    const r = el.getBoundingClientRect();
    this.breite.set(r.width);
    this.hoehe.set(r.height);

    // Beide Werte stehen in hero.scss und aendern sich je Breite. Sie
    // werden deshalb bei jeder Groessenaenderung neu gelesen, nicht
    // einmalig beim Aufbau.
    const stil = getComputedStyle(el);
    this.werte.set({
      einlauf: zahl(stil.getPropertyValue('--signal-einlauf'), 130),
      band: zahl(stil.getPropertyValue('--signal-band'), 88),
      abstand: zahl(stil.getPropertyValue('--signal-abstand'), 9),
    });
  }

  /**
   * Plant den naechsten Punkt und danach den uebernaechsten.
   *
   * Bewusst eine Kette einzelner Aufrufe und keine wiederholende
   * Zeitleiste: Eine Zeitleiste hat feste Positionen und wiederholt
   * damit immer dasselbe Muster. Hier wuerfelt jeder Schritt seine eigene
   * Pause, es gibt also gar keine Runde, die sich wiederholen koennte.
   */
  private planeNaechsten(verzoegerung: number): void {
    this.naechster?.kill();
    this.naechster = gsap.delayedCall(verzoegerung, () => {
      this.schickeFreie();
      this.planeNaechsten(spanne(PAUSE_MIN, PAUSE_MAX, 2));
    });
  }

  /**
   * Schickt einen Punkt auf eine gerade freie Linie.
   *
   * Zufaellig gewaehlt statt reihum: Reihum waere bei sieben Linien ein
   * sichtbar wanderndes Muster. Sind alle belegt, passiert nichts und der
   * naechste Versuch kommt ohnehin gleich.
   */
  private schickeFreie(): void {
    const frei = untracked(() =>
      this.bahnen().map((b) => b.id).filter((id) => !this.belegt.has(id)),
    );
    if (!frei.length) return;

    const id = frei[Math.floor(Math.random() * frei.length)];
    this.schicke(id, spanne(TEMPO_MIN, TEMPO_MAX));
  }

  /**
   * Schickt einen Punkt ueber eine Bahn.
   *
   * Die Dauer folgt aus der Bahnlaenge und einem festen Tempo, nicht aus
   * einer festen Zahl: Sonst kroeche der Punkt auf der langen Bahn und
   * schoesse ueber die kurze, und das liest man sofort als falsch.
   */
  private schicke(bahnId: string, tempo: number): void {
    if (this.reduziert || this.belegt.has(bahnId)) return;

    const wurzel = this.host.nativeElement;
    const pfad = wurzel.querySelector<SVGPathElement>(
      `path[data-bahn="${bahnId}"]`,
    );
    const punkt = wurzel.querySelector<SVGGElement>(`g[data-bahn="${bahnId}"]`);
    if (!pfad || !punkt) return;

    // Solange der Pfad nicht im DOM haengt oder leer ist, liefert
    // getTotalLength null. Dann faehrt kein Punkt, statt an Ort und
    // Stelle zu blinken.
    const laenge = pfad.getTotalLength();
    if (!(laenge > 0)) return;

    this.belegt.add(bahnId);

    // Zwei getrennte Tweens, bewusst nicht einer mit nachtraeglich
    // gesetzter Dauer: .duration() skaliert die GANZE Bewegung, das
    // Einblenden liefe dann ueber die volle Strecke statt nur ueber den
    // Anfang.
    gsap.fromTo(
      punkt,
      { opacity: 0 },
      { opacity: 1, duration: 0.25, ease: 'none' },
    );

    gsap.to(punkt, {
      duration: laenge / tempo,
      ease: 'none',
      motionPath: { path: pfad, align: pfad, alignOrigin: [0.5, 0.5] },
      onComplete: () => {
        gsap.set(punkt, { opacity: 0 });
        this.belegt.delete(bahnId);
        if (this.bereich() === 'hero') this.signale.uebergib(bahnId, tempo);
      },
    });
  }
}

function zahl(wert: string, ersatz: number): number {
  const n = parseFloat(wert);
  return Number.isFinite(n) ? n : ersatz;
}
