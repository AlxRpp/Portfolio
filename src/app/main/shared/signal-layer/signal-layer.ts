import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { gsap } from 'gsap';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { LINIEN, PLAENE, versatz } from '../service/signal-plan';
import { baueEcken, versetze, zeichne } from '../service/signal-path';
import {
  KETTE,
  PAUSE_MAX,
  PAUSE_MIN,
  Signals,
  TEMPO_MAX,
  TEMPO_MIN,
  VORLAUF,
  spanne,
  type Bereich,
} from '../service/signals';

gsap.registerPlugin(MotionPathPlugin);

interface GezeichneteBahn {
  nr: number;
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

  readonly bereich = input.required<Bereich>();

  private readonly breite = signal(0);
  private readonly hoehe = signal(0);

  private readonly reduziert = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches;

  /** Der naechste geplante Punkt. Kein fester Takt, siehe planeNaechsten. */
  private naechster?: gsap.core.Tween;

  /** Der Vorlauf gilt nur beim ersten Mal, nicht nach jeder Aenderung. */
  private ersterLauf = true;

  /** Welche Bahnen gerade einen Punkt tragen. */
  private readonly belegt = new Set<number>();

  protected readonly viewBox = computed(
    () => `0 0 ${this.breite()} ${this.hoehe()}`,
  );

  /**
   * Die sichtbaren Linien.
   *
   * Der Plan liefert nur die Mittellinie. Die sieben Linien entstehen
   * daraus als echte Parallelen: Segmente senkrecht verschieben, Ecken
   * als deren Schnittpunkte neu bestimmen. Von Hand versetzte
   * Stuetzpunkte haetten den Abstand nur auf den Geraden gehalten.
   */
  protected readonly bahnen = computed<GezeichneteBahn[]>(() => {
    const b = this.breite();
    const h = this.hoehe();
    if (!(b > 0) || !(h > 0)) return [];

    // Die Masse kommen aus dem Service, nicht aus dem eigenen Host: So
    // rechnen alle Sektionen garantiert mit denselben Zahlen, und die
    // Nahtstellen zwischen ihnen koennen nicht auseinanderlaufen.
    const w = this.signale.werte();
    const plan = PLAENE[this.bereich()](this.signale.anordnung(), w);
    const mitte = baueEcken(plan.mitte, b, h, 0);
    if (mitte.length < 2) return [];

    return Array.from({ length: LINIEN }, (_, i) => ({
      nr: i,
      d: zeichne(versetze(mitte, versatz(i, w.abstand))),
    }));
  });

  constructor() {
    const el = this.host.nativeElement;

    const beobachter = new ResizeObserver(() => this.vermesse());
    beobachter.observe(el);
    this.destroyRef.onDestroy(() => beobachter.disconnect());

    this.vermesse();

    // Haengt an beidem: an der Geometrie, weil sich nach einer
    // Groessenaenderung die Bahnlaengen aendern, und daran, ob das Netz
    // ueberhaupt laufen darf.
    effect(() => {
      const bahnen = this.bahnen();
      const laeuft = this.signale.laeuft();

      this.naechster?.kill();
      this.naechster = undefined;

      if (this.reduziert || !bahnen.length || !laeuft) return;
      // Nur der Kopf der Kette erzeugt Punkte. Alle weiteren Sektionen
      // bekommen sie von ihrem Vorgaenger uebergeben, damit ein Punkt
      // ueber die Naht hinweg wie derselbe Punkt aussieht.
      if (untracked(() => this.bereich()) !== KETTE[0]) return;

      const start = this.ersterLauf ? VORLAUF : spanne(PAUSE_MIN, PAUSE_MAX, 2);
      this.ersterLauf = false;
      this.planeNaechsten(start);
    });

    // Uebernimmt Punkte vom Vorgaenger. Direkt und nicht ueber ein
    // Signal, damit die Uebergabe im selben Bild passiert.
    //
    // Erst nach dem ersten Rendern, NICHT hier im Konstruktor: bereich
    // ist ein input.required, und ein solcher Zugriff wirft, solange der
    // Wert noch nicht gesetzt ist. Die Komponente stuerbe beim Erzeugen
    // und es waere gar nichts zu sehen.
    afterNextRender(() => {
      this.destroyRef.onDestroy(
        this.signale.melde(this.bereich(), (bahn, tempo) =>
          this.schicke(bahn, tempo, false),
        ),
      );
    });

    this.destroyRef.onDestroy(() => {
      this.naechster?.kill();
      gsap.killTweensOf(el.querySelectorAll('.signal__punkt'));
    });
  }

  private vermesse(): void {
    const r = this.host.nativeElement.getBoundingClientRect();
    this.breite.set(r.width);
    this.hoehe.set(r.height);
  }

  /**
   * Plant den naechsten Punkt und danach den uebernaechsten.
   *
   * Bewusst eine Kette einzelner Aufrufe und keine wiederholende
   * Zeitleiste: Eine Zeitleiste hat feste Positionen und wiederholt damit
   * immer dasselbe Muster. Hier wuerfelt jeder Schritt seine eigene
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
      this.bahnen().map((b) => b.nr).filter((nr) => !this.belegt.has(nr)),
    );
    if (!frei.length) return;

    const nr = frei[Math.floor(Math.random() * frei.length)];
    this.schicke(nr, spanne(TEMPO_MIN, TEMPO_MAX), true);
  }

  /**
   * Schickt einen Punkt ueber eine Bahn.
   *
   * Die Dauer folgt aus der Bahnlaenge und dem Tempo, nicht aus einer
   * festen Zahl: Sonst kroeche der Punkt auf der langen Bahn und schoesse
   * ueber die kurze, und das liest man sofort als falsch.
   */
  /**
   * Der Abschnitt des Pfades, der zwischen Ober- und Unterkante liegt.
   *
   * Die Pfade reichen an der Naht absichtlich ueber die Sektionskante
   * hinaus, damit wirklich alle sieben Linien den Rand erreichen.
   * Beschnitten wird per overflow: hidden, die LINIE sieht dadurch
   * richtig aus. Der Punkt aber fuehre diesen Ueberstand unsichtbar ab,
   * und weil die naechste Sektion ihren Ueberstand ebenfalls unsichtbar
   * durchlaeuft, verschwaende er an jeder Naht kurz.
   *
   * Gesucht wird per Intervallhalbierung. Das geht, weil y auf diesen
   * Pfaden monoton laeuft: Sie steigen nie wieder an.
   *
   * Bewusst am Pfad gemessen und nicht aus dem Plan gerechnet: So gilt es
   * fuer jede Bahn einzeln. Die sieben queren die Kante naemlich an
   * sieben verschiedenen Stellen, weil sie schraeg darauf treffen.
   */
  private sichtbar(
    pfad: SVGPathElement,
    laenge: number,
  ): { von: number; bis: number } {
    const h = this.hoehe();
    const y = (l: number) => pfad.getPointAtLength(l).y;

    /** Kleinste Laenge, ab der die Bedingung gilt. */
    const grenze = (gilt: (l: number) => boolean, a: number, b: number): number => {
      for (let i = 0; i < 16; i++) {
        const m = (a + b) / 2;
        if (gilt(m)) b = m;
        else a = m;
      }
      return b;
    };

    const von = y(0) < 0 ? grenze((l) => y(l) >= 0, 0, laenge) : 0;
    const bis = y(laenge) > h ? grenze((l) => y(l) > h, von, laenge) : laenge;
    return { von, bis };
  }

  private schicke(nr: number, tempo: number, geboren: boolean): void {
    if (this.reduziert || this.belegt.has(nr)) return;

    const wurzel = this.host.nativeElement;
    const pfad = wurzel.querySelector<SVGPathElement>(`path[data-bahn="${nr}"]`);
    const punkt = wurzel.querySelector<SVGGElement>(`g[data-bahn="${nr}"]`);
    if (!pfad || !punkt) return;

    // Solange der Pfad nicht im DOM haengt oder leer ist, liefert
    // getTotalLength null. Dann faehrt kein Punkt, statt an Ort und
    // Stelle zu blinken.
    const laenge = pfad.getTotalLength();
    if (!(laenge > 0)) return;

    // Nur den Teil fahren, der wirklich in der Sektion liegt.
    const { von, bis } = this.sichtbar(pfad, laenge);
    const strecke = bis - von;
    if (!(strecke > 0)) return;

    this.belegt.add(nr);

    // Einblenden NUR bei der Geburt am Anfang der Kette.
    //
    // Bei einer Uebergabe waere es falsch: Der Punkt ist dort schon
    // unterwegs, er faengt nicht an. Ihn dort erneut einblenden zu
    // lassen sah aus, als verschwaende er an der Naht kurz.
    //
    // Zwei getrennte Tweens, bewusst nicht einer mit nachtraeglich
    // gesetzter Dauer: .duration() skaliert die GANZE Bewegung, das
    // Einblenden liefe dann ueber die volle Strecke statt nur ueber den
    // Anfang.
    if (geboren) {
      gsap.fromTo(punkt, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'none' });
    } else {
      gsap.set(punkt, { opacity: 1 });
    }

    gsap.to(punkt, {
      duration: strecke / tempo,
      ease: 'none',
      motionPath: {
        path: pfad,
        align: pfad,
        alignOrigin: [0.5, 0.5],
        start: von / laenge,
        end: bis / laenge,
      },
      onComplete: () => {
        gsap.set(punkt, { opacity: 0 });
        this.belegt.delete(nr);
        this.signale.weiter(this.bereich(), nr, tempo);
      },
    });
  }
}
