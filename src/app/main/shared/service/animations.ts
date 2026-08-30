import { Injectable } from '@angular/core';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { Flip } from 'gsap/Flip';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';

gsap.registerPlugin(ScrollTrigger, SplitText, ScrollToPlugin, Flip, DrawSVGPlugin);

/** Gemeinsame Bewegungssprache: langsam, präzise, kein Bounce. */
const EASE = 'power2.out';
const DUR = { fast: 0.4, base: 0.6, slow: 0.8 } as const;

/** Steuerung der horizontalen Buehne, siehe horizontalStage(). */
export interface StageControls {
  /**
   * Faehrt die angegebene Tafel an. Gibt false zurueck, wenn die Buehne
   * gerade nicht aktiv ist; der Aufrufer kann dann das normale
   * Ankerscrollen greifen lassen.
   */
  goTo(panelIndex: number): boolean;
  /** true, solange die Buehne horizontal laeuft. */
  isActive(): boolean;
  destroy(): void;
}

export interface StageOptions {
  minWidth: number;
  minHeight: number;
  /**
   * Wird gerufen, sobald eine andere Tafel die aktive wird, also beim
   * Ueberschreiten der Haelfte zwischen zwei Rastpunkten. Feuert nur bei
   * echtem Wechsel, nicht bei jedem Scrollschritt.
   */
  onPanelChange?: (panelIndex: number) => void;
  /**
   * Meldet, dass die Buehne gerade an- oder ausgeschaltet wurde, weil die
   * Schwelle beim Groessenaendern ueberschritten wurde.
   *
   * Der Aufrufer braucht das, um die sichtbare Stelle zu halten: mit dem
   * Pin waechst das Dokument um eine Bildschirmhoehe, alles darunter
   * rutscht mit, und dieselbe Scrollposition zeigt danach etwas anderes.
   */
  onToggle?: (aktiv: boolean) => void;
}

export interface TiltOptions {
  /** Groesster Ausschlag in Grad. */
  max?: number;
  /** Tiefe der Perspektive in Pixeln. Kleiner heisst staerker raeumlich. */
  perspective?: number;
  /** Seitlicher Versatz am Rand des Bezugs, in Pixeln. */
  shift?: number;
  /**
   * Nur oberhalb dieser Fensterbreite aktiv. Ohne Angabe immer aktiv.
   * Verhindert, dass die Neigung an einem Element haengt, das gar nicht
   * sichtbar ist.
   */
  minWidth?: number;
}

export interface RevealOptions {
  /** Verzögerung vor dem Start, in Sekunden. */
  delay?: number;
  /** Startversatz nach unten, in Pixeln. */
  y?: number;
  /** Startversatz zur Seite, in Pixeln. Negativ heisst von links. */
  x?: number;
  duration?: number;
  /** Wenn gesetzt, startet die Animation erst beim Hereinscrollen. */
  scroll?: boolean;
  /** ScrollTrigger-Startpunkt, Standard: Element zu 80 % im Viewport. */
  start?: string;
}

/**
 * Einziger Ort im Projekt, an dem GSAP aufgerufen wird.
 *
 * Komponenten benutzen ausschließlich die benannten Presets hier. Das
 * hält die Bewegungssprache einheitlich und macht `prefers-reduced-motion`
 * an einer Stelle prüfbar statt in jeder Komponente.
 */
@Injectable({ providedIn: 'root' })
export class Animations {
  /**
   * Wer weniger Bewegung möchte, bekommt den Endzustand sofort: nicht
   * eine schnellere Animation, sondern gar keine.
   */
  private get reduced(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /** Element steigt aus dem Nichts nach oben ins Bild. */
  revealUp(target: gsap.TweenTarget, o: RevealOptions = {}): gsap.core.Tween | undefined {
    if (this.reduced) {
      this.settle(target);
      return undefined;
    }

    return gsap.from(target, {
      opacity: 0,
      y: o.y ?? 24,
      duration: o.duration ?? DUR.base,
      delay: o.delay ?? 0,
      ease: EASE,
      ...this.trigger(target, o),
    });
  }

  /** Kinder eines Containers nacheinander einblenden. */
  staggerChildren(
    container: Element,
    selector: string,
    o: RevealOptions & { stagger?: number } = {},
  ): gsap.core.Tween | undefined {
    const items = container.querySelectorAll(selector);
    if (!items.length) return undefined;
    if (this.reduced) {
      this.settle(items);
      return undefined;
    }

    return gsap.from(items, {
      opacity: 0,
      y: o.y ?? 20,
      duration: o.duration ?? DUR.fast,
      delay: o.delay ?? 0,
      stagger: o.stagger ?? 0.06,
      ease: EASE,
      ...this.trigger(container, o),
    });
  }

  /**
   * Blendet jedes Element einzeln ein, sobald es selbst in den Blick kommt.
   *
   * Unterschied zu staggerChildren: Dort haengen alle Elemente an einem
   * gemeinsamen Ausloeser und laufen versetzt los, sobald der Container
   * sichtbar wird. Bei einer hohen Sektion sind die letzten Elemente dann
   * laengst fertig animiert, bevor man sie ueberhaupt gesehen hat. Hier
   * traegt jedes Element seinen eigenen Ausloeser.
   */
  revealEach(container: Element, selector: string, o: RevealOptions = {}): void {
    const items = container.querySelectorAll(selector);
    if (!items.length) return;

    if (this.reduced) {
      this.settle(items);
      return;
    }

    items.forEach((el) => {
      gsap.from(el, {
        opacity: 0,
        y: o.y ?? 0,
        x: o.x ?? 0,
        duration: o.duration ?? DUR.base,
        ease: EASE,
        scrollTrigger: {
          trigger: el,
          start: o.start ?? 'top 88%',
          once: true,
        },
      });
    });
  }

  /**
   * Überschrift zeichenweise aufbauen.
   * Gibt die SplitText-Instanz zurück, damit die Komponente sie beim
   * Zerstören wieder zusammenführen kann.
   */
  splitHeadline(el: Element, o: RevealOptions = {}): SplitText | undefined {
    if (this.reduced) {
      this.settle(el);
      return undefined;
    }

    const split = new SplitText(el, { type: 'chars,words', charsClass: 'char' });

    gsap.from(split.chars, {
      opacity: 0,
      yPercent: 60,
      duration: o.duration ?? DUR.base,
      delay: o.delay ?? 0,
      stagger: 0.018,
      ease: EASE,
      ...this.trigger(el, o),
    });

    return split;
  }

  /**
   * Zahl von 0 auf ihren Wert hochlaufen lassen.
   *
   * `onValue` meldet jeden Zwischenstand. Damit kann der Aufrufer
   * mitlaufende Beschriftungen anpassen, etwa Einzahl und Mehrzahl einer
   * Einheit. Ohne das stuende waehrend des Hochzaehlens kurz "1 Wochen"
   * auf der Seite, weil die Einheit aus dem Zielwert kaeme.
   */
  counterUp(
    el: Element,
    to: number,
    o: RevealOptions & { onValue?: (value: number) => void } = {},
  ): gsap.core.Tween | undefined {
    if (this.reduced) {
      el.textContent = String(to);
      o.onValue?.(to);
      return undefined;
    }

    const state = { value: 0 };
    let zuletzt = -1;

    return gsap.to(state, {
      value: to,
      duration: o.duration ?? DUR.slow,
      delay: o.delay ?? 0,
      ease: EASE,
      onUpdate: () => {
        const gerundet = Math.round(state.value);
        if (gerundet === zuletzt) return;
        zuletzt = gerundet;
        el.textContent = String(gerundet);
        o.onValue?.(gerundet);
      },
      ...this.trigger(el, o),
    });
  }

  /**
   * Legt zwei oder mehr Tafeln nebeneinander und verwandelt vertikales
   * Scrollen in eine horizontale Bewegung, die auf ganze Tafeln einrastet.
   *
   * Aktiv nur oberhalb der uebergebenen Schwelle. Die Hoehe ist dabei die
   * eigentliche Bedingung: In einer gehefteten Tafel laesst sich nicht
   * nachscrollen, zu hoher Inhalt waere also unerreichbar. Bei
   * `prefers-reduced-motion` bleibt die Buehne ebenfalls aus und die
   * Sektionen stehen normal untereinander.
   *
   * gsap.matchMedia raeumt beim Unterschreiten der Schwelle selbst auf und
   * loest den Pin wieder, auch beim Groessenaendern des Fensters.
   */
  horizontalStage(
    stage: HTMLElement,
    track: HTMLElement,
    { minWidth, minHeight, onPanelChange, onToggle }: StageOptions,
  ): StageControls {
    const panels = track.children.length;
    if (panels < 2) {
      return { goTo: () => false, isActive: () => false, destroy: () => {} };
    }

    const mm = gsap.matchMedia();
    let trigger: ScrollTrigger | undefined;
    let anfahrt: gsap.core.Tween | undefined;

    const query =
      `(min-width: ${minWidth}px) and (min-height: ${minHeight}px) ` +
      `and (prefers-reduced-motion: no-preference)`;

    mm.add(query, () => {
      let aktiveTafel = 0;

      const tween = gsap.to(track, {
        // Die Spur ist so breit wie alle Tafeln zusammen. Eine Tafel
        // weiterzuschieben sind daher 100/panels Prozent der Spur, nicht
        // volle 100 Prozent.
        xPercent: (-100 * (panels - 1)) / panels,
        ease: 'none',
        scrollTrigger: {
          trigger: stage,
          pin: true,
          scrub: 0.6,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          // Die Buehne steht ganz oben auf der Seite, ihre Ausloeser
          // werden aber zuletzt erzeugt: Angular ruft ngAfterViewInit
          // beim Kind vor dem Elternteil. Ohne feste Reihenfolge
          // vermessen die Sektionen darunter das Dokument ohne die
          // Strecke, die dieser Pin hinzufuegt, und feuern genau eine
          // Bildschirmhoehe zu frueh.
          refreshPriority: 1,
          end: () => '+=' + stage.offsetHeight * (panels - 1),
          onUpdate: (self) => {
            const index = Math.round(self.progress * (panels - 1));
            if (index === aktiveTafel) return;
            aktiveTafel = index;
            onPanelChange?.(index);
          },
          snap: {
            snapTo: 1 / (panels - 1),
            duration: { min: 0.2, max: 0.5 },
            ease: 'power2.inOut',
          },
        },
      });

      trigger = tween.scrollTrigger;
      onToggle?.(true);

      return () => {
        trigger = undefined;
        onToggle?.(false);
      };
    });

    return {
      goTo: (index) => {
        if (!trigger) return false;

        const spanne = trigger.end - trigger.start;
        const ziel = trigger.start + (spanne * index) / (panels - 1);

        // Bewusst ueber GSAP und nicht ueber window.scrollTo: Der Snap des
        // ScrollTriggers erkennt eine fremde Scrollbewegung nicht als
        // gewollt und zieht sofort auf den naechsten Rastpunkt zurueck.
        // Damit bliebe der Sprung wirkungslos.
        anfahrt?.kill();
        anfahrt = gsap.to(window, {
          scrollTo: { y: ziel, autoKill: false },
          duration: 0.8,
          ease: 'power2.inOut',
          overwrite: true,
        });

        return true;
      },
      isActive: () => Boolean(trigger),
      destroy: () => {
        anfahrt?.kill();
        mm.revert();
      },
    };
  }

  /**
   * Schiebt Elemente beim Hereinscrollen vom Bildschirmrand an ihren
   * Platz.
   *
   * Der Weg wird je Element aus seiner tatsaechlichen Lage gerechnet und
   * nicht fest vorgegeben: Eine feste Zahl waere auf einem schmalen
   * Bildschirm zu viel und auf einem breiten zu wenig, das Element
   * begaenne dann sichtbar mitten im Bild.
   *
   * Als Funktion uebergeben, damit GSAP sie bei jedem `refresh` neu
   * auswertet. Nach einer Groessenaenderung stimmte der Weg sonst nicht
   * mehr.
   *
   * WICHTIG: Bewegt wird das Element selbst. Wird seine Lage anderswo
   * vermessen, etwa um eine Linie daran anzudocken, darf dort NICHT
   * dasselbe Element gemessen werden: getBoundingClientRect rechnet die
   * Verschiebung mit.
   */
  slideVomRand(
    container: Element,
    selector: string,
    vonLinks: boolean,
    o: RevealOptions = {},
  ): void {
    const items = container.querySelectorAll<HTMLElement>(selector);
    if (!items.length) return;

    if (this.reduced) {
      this.settle(items);
      return;
    }

    items.forEach((el) => {
      gsap.from(el, {
        opacity: 0,
        x: () => {
          const r = el.getBoundingClientRect();
          // Vollstaendig aus dem Bild heraus, plus etwas Luft, damit auch
          // der Schein des drop-shadow draussen bleibt.
          return vonLinks ? -(r.right + 48) : window.innerWidth - r.left + 48;
        },
        duration: o.duration ?? DUR.slow,
        ease: EASE,
        scrollTrigger: {
          trigger: el,
          start: o.start ?? 'top 85%',
          once: true,
          invalidateOnRefresh: true,
        },
      });
    });
  }

  /**
   * Merkt sich die Lage einer Gruppe von Elementen, BEVOR sich das
   * Layout aendert.
   *
   * Getrennt von `ordneNeu`, weil die Aenderung dazwischen liegt und
   * Angular sie erst im naechsten Zeichnen umsetzt. Ein einziger Aufruf
   * mit Rueckruf ginge deshalb nicht.
   */
  merkeLage(elemente: ArrayLike<Element>): ReturnType<typeof Flip.getState> {
    return Flip.getState(elemente as Element[]);
  }

  /**
   * Bewegt die Elemente von der gemerkten Lage an ihre neue.
   *
   * Genau dafuer ist Flip gebaut: Es vergleicht vorher und nachher und
   * legt die Bewegung selbst. Von Hand muesste man fuer jede Karte
   * Versatz und Groesse ausrechnen und bei jeder Rasteraenderung
   * nachziehen.
   *
   * `absolute` nimmt die bewegten Elemente waehrend der Bewegung aus dem
   * Fluss. Ohne das schieben sich die uebrigen Karten waehrend der
   * Animation noch einmal, und es ruckelt.
   */
  ordneNeu(lage: ReturnType<typeof Flip.getState>): void {
    if (this.reduced) return;

    Flip.from(lage, {
      duration: 0.5,
      ease: EASE,
      absolute: true,
      nested: true,
      onEnter: (els) =>
        gsap.fromTo(
          els,
          { opacity: 0, scale: 0.94 },
          { opacity: 1, scale: 1, duration: 0.4, ease: EASE },
        ),
      onLeave: (els) =>
        gsap.to(els, { opacity: 0, scale: 0.94, duration: 0.25, ease: EASE }),
    });
  }

  /**
   * Schiebt eine Markierung auf ein anderes Element, in Position UND
   * Groesse.
   *
   * Genau dafuer ist Flip.fit gebaut: Es misst Ziel und Markierung und
   * ueberfuehrt die eine in die andere. Von Hand muesste man Versatz,
   * Breite und Hoehe einzeln berechnen und bei jeder Layoutaenderung
   * nachziehen.
   *
   * `animiert: false` setzt ohne Bewegung, fuer den ersten Aufbau und
   * fuer Groessenaenderungen des Fensters.
   */
  moveHighlight(
    highlight: HTMLElement,
    target: HTMLElement,
    animiert = true,
  ): void {
    if (!animiert || this.reduced) {
      Flip.fit(highlight, target, { absolute: true });
      return;
    }

    Flip.fit(highlight, target, {
      absolute: true,
      duration: 0.4,
      ease: EASE,
    });
  }

  /**
   * Schiebt eine Unterstreichung unter ein anderes Element.
   *
   * Bewusst NICHT ueber Flip.fit: Das uebertraegt auch die Hoehe, aus der
   * 2px-Linie wuerde dann ein Block in Reiterhoehe. Hier wandern nur
   * Position und Breite, die Hoehe kommt aus dem CSS.
   */
  moveUnderline(
    bar: HTMLElement,
    target: HTMLElement,
    animiert = true,
  ): void {
    const eltern = bar.offsetParent as HTMLElement | null;
    if (!eltern) return;

    const bezug = eltern.getBoundingClientRect();
    const ziel = target.getBoundingClientRect();

    const werte = {
      x: ziel.left - bezug.left + eltern.scrollLeft,
      width: ziel.width,
    };

    if (!animiert || this.reduced) {
      gsap.set(bar, werte);
      return;
    }

    gsap.to(bar, { ...werte, duration: 0.4, ease: EASE, overwrite: true });
  }

  /**
   * Laesst die Bloecke einer Flaeche nacheinander einlaufen.
   *
   * Anders als revealEach ohne ScrollTrigger: Das hier laeuft auf einen
   * Klick hin, nicht auf eine Scrollposition. `overwrite` sorgt dafuer,
   * dass schnelles Weiterklicken die vorige Bewegung abbricht statt sie
   * zu ueberlagern.
   */
  revealBlocks(container: Element, selector: string): void {
    const blocks = container.querySelectorAll(selector);
    if (!blocks.length) return;

    if (this.reduced) {
      this.settle(blocks);
      return;
    }

    gsap.from(blocks, {
      opacity: 0,
      y: 14,
      duration: 0.42,
      stagger: 0.055,
      ease: EASE,
      overwrite: true,
    });
  }

  /** Alle ScrollTrigger neu vermessen, etwa nach einem Sprachwechsel. */
  refresh(): void {
    ScrollTrigger.refresh();
  }

  /**
   * Ruft die Rueckmeldung genau einmal, sobald der naechste Refresh
   * vollstaendig durch ist.
   *
   * Gedacht fuer alles, was erst gemacht werden darf, wenn die Seite ihre
   * endgueltige Hoehe hat. Ein paar Frames zu warten reicht dafuer nicht:
   * ScrollTrigger vermisst nach einer Groessenaenderung selbst noch
   * einmal nach, und wer vorher scrollt, wird von dieser Nachmessung
   * wieder verschoben.
   */
  nachRefresh(fertig: () => void): void {
    const einmal = () => {
      ScrollTrigger.removeEventListener('refresh', einmal);
      fertig();
    };
    ScrollTrigger.addEventListener('refresh', einmal);
  }

  private trigger(target: gsap.TweenTarget, o: RevealOptions) {
    if (!o.scroll) return {};

    return {
      scrollTrigger: {
        trigger: target as Element,
        start: o.start ?? 'top 80%',
        once: true,
      },
    };
  }

  /**
   * Zeichnet ein Logo einmal beim Laden: erst laeuft eine Kontur um die
   * Formen, dann fuellt sich die Flaeche und die Kontur nimmt sich
   * wieder zurueck.
   *
   * DrawSVG animiert ausschliesslich Konturen, nie Flaechen. Die Pfade
   * des Logos sind aber reine Flaechen ohne stroke. Die Kontur wird
   * deshalb hier gesetzt und am Ende wieder auf null gefahren, damit der
   * Endzustand exakt das unveraenderte Logo ist und nicht eine Fassung
   * mit Rand.
   *
   * Die Rueckgabe ist die Timeline, damit die Komponente sie beim
   * Zerstoeren beenden kann.
   */
  drawLogo(svg: Element, o: RevealOptions = {}): gsap.core.Timeline | undefined {
    const paths = svg.querySelectorAll('path');
    if (!paths.length) return undefined;

    if (this.reduced) {
      gsap.set(paths, { fillOpacity: 1, strokeWidth: 0 });
      return undefined;
    }

    // Ausgangszustand sofort setzen, nicht erst als ersten Schritt der
    // Timeline. Die traegt eine Verzoegerung, das fertige Logo stuende
    // sonst erst sichtbar da und verschwaende beim Start wieder.
    gsap.set(paths, {
      fillOpacity: 0,
      stroke: 'currentColor',
      strokeWidth: 1.5,
      drawSVG: '0%',
    });

    const tl = gsap.timeline({ delay: o.delay ?? 0 });

    tl.to(paths, {
        drawSVG: '100%',
        duration: o.duration ?? 1.2,
        stagger: 0.12,
        ease: 'power1.inOut',
      })
      // Fuellung setzt kurz vor dem Ende der Kontur ein, damit die Form
      // nicht erst leer stehenbleibt und dann springt.
      .to(paths, { fillOpacity: 1, duration: 0.5, ease: EASE }, '-=0.35')
      .to(paths, { strokeWidth: 0, duration: 0.4, ease: EASE }, '<');

    return tl;
  }

  /**
   * Laesst ein Element der Maus nachkippen, damit es sich wie ein Koerper
   * im Raum anfuehlt und nicht wie ein aufgeklebtes Bild.
   *
   * `bezug` ist die Flaeche, ueber der die Maus gemessen wird, also
   * ueblicherweise die ganze Sektion und nicht das Element selbst. Sonst
   * spraenge die Neigung erst an, wenn der Zeiger die Marke trifft, und
   * beim Verlassen wieder zurueck.
   *
   * Zwei Voraussetzungen, sonst passiert nichts: ein echter Zeiger, denn
   * auf einem Touchgeraet gibt es kein Schweben, und keine reduzierte
   * Bewegung.
   *
   * Die Rueckgabe raeumt die Ereignisse wieder ab. Ohne das haengen sie
   * am Dokument weiter, wenn die Komponente laengst zerstoert ist.
   */
  tiltOnPointer(
    el: HTMLElement,
    bezug: HTMLElement,
    o: TiltOptions = {},
  ): () => void {
    const feinerZeiger = window.matchMedia('(hover: hover) and (pointer: fine)');
    if (this.reduced || !feinerZeiger.matches) return () => {};

    const max = o.max ?? 12;
    const shift = o.shift ?? 10;
    const minWidth = o.minWidth ?? 0;

    gsap.set(el, {
      transformPerspective: o.perspective ?? 900,
      transformOrigin: 'center center',
    });

    // quickTo statt gsap.to je Bewegung: das erzeugt einen einzigen
    // wiederverwendeten Tween statt bei jedem Mausereignis einen neuen.
    const zuRotX = gsap.quickTo(el, 'rotationX', { duration: 0.7, ease: 'power3.out' });
    const zuRotY = gsap.quickTo(el, 'rotationY', { duration: 0.7, ease: 'power3.out' });
    const zuX = gsap.quickTo(el, 'x', { duration: 0.7, ease: 'power3.out' });
    const zuY = gsap.quickTo(el, 'y', { duration: 0.7, ease: 'power3.out' });

    const ruhe = () => {
      zuRotX(0);
      zuRotY(0);
      zuX(0);
      zuY(0);
    };

    const bewege = (e: PointerEvent) => {
      if (window.innerWidth < minWidth) return;

      const r = bezug.getBoundingClientRect();
      if (!r.width || !r.height) return;

      // -1 am linken und oberen Rand, +1 am rechten und unteren.
      const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
      const ny = ((e.clientY - r.top) / r.height) * 2 - 1;

      // Waagerechte Mausbewegung dreht um die senkrechte Achse, deshalb
      // nx auf rotationY. Das Vorzeichen bei rotationX ist umgekehrt,
      // damit die Marke sich zum Zeiger neigt statt von ihm weg.
      zuRotY(nx * max);
      zuRotX(-ny * max);
      zuX(nx * shift);
      zuY(ny * shift);
    };

    bezug.addEventListener('pointermove', bewege);
    bezug.addEventListener('pointerleave', ruhe);

    return () => {
      bezug.removeEventListener('pointermove', bewege);
      bezug.removeEventListener('pointerleave', ruhe);
      gsap.killTweensOf(el);
    };
  }

  /** Endzustand ohne Bewegung herstellen. */
  private settle(target: gsap.TweenTarget): void {
    gsap.set(target, { opacity: 1, y: 0, yPercent: 0, clearProps: 'transform' });
  }
}
