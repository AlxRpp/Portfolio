import { Injectable } from '@angular/core';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(ScrollTrigger, SplitText);

/** Gemeinsame Bewegungssprache: langsam, präzise, kein Bounce. */
const EASE = 'power2.out';
const DUR = { fast: 0.4, base: 0.6, slow: 0.8 } as const;

export interface RevealOptions {
  /** Verzögerung vor dem Start, in Sekunden. */
  delay?: number;
  /** Startversatz nach unten, in Pixeln. */
  y?: number;
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

  /** Zahl von 0 auf ihren Wert hochlaufen lassen. */
  counterUp(el: Element, to: number, o: RevealOptions = {}): gsap.core.Tween | undefined {
    if (this.reduced) {
      el.textContent = String(to);
      return undefined;
    }

    const state = { value: 0 };

    return gsap.to(state, {
      value: to,
      duration: o.duration ?? DUR.slow,
      delay: o.delay ?? 0,
      ease: EASE,
      onUpdate: () => {
        el.textContent = String(Math.round(state.value));
      },
      ...this.trigger(el, o),
    });
  }

  /** Alle ScrollTrigger neu vermessen, etwa nach einem Sprachwechsel. */
  refresh(): void {
    ScrollTrigger.refresh();
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

  /** Endzustand ohne Bewegung herstellen. */
  private settle(target: gsap.TweenTarget): void {
    gsap.set(target, { opacity: 1, y: 0, yPercent: 0, clearProps: 'transform' });
  }
}
