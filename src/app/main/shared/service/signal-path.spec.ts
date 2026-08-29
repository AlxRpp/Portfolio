import { describe, expect, it } from 'vitest';
import type { Pixelpunkt, Stuetzpunkt } from '../interfaces/signal.interface';
import { baueBahn, baueEcken } from './signal-path';

/** Nur waagerecht, senkrecht oder exakt 45 Grad ist erlaubt. */
function erlaubterWinkel(a: Pixelpunkt, b: Pixelpunkt): boolean {
  const dx = Math.abs(b.x - a.x);
  const dy = Math.abs(b.y - a.y);
  if (dx < 0.01) return dy > 0.01;
  if (dy < 0.01) return true;
  return Math.abs(dx - dy) < 0.01;
}

describe('baueEcken', () => {
  it('erzeugt ausschliesslich waagerechte, senkrechte und 45-Grad-Segmente', () => {
    const punkte: Stuetzpunkt[] = [
      { x: 0.1, y: 0.7 },
      { x: 0.5, y: 0.3, schraegeZuerst: true },
      { x: 1, y: 0.42 },
    ];

    const ecken = baueEcken(punkte, 1600, 900, 0);

    for (let i = 1; i < ecken.length; i++) {
      expect(
        erlaubterWinkel(ecken[i - 1], ecken[i]),
        `Segment ${i} ist schraeg: ${JSON.stringify(ecken[i - 1])} nach ${JSON.stringify(ecken[i])}`,
      ).toBe(true);
    }
  });

  it('trifft ersten und letzten Punkt exakt', () => {
    const punkte: Stuetzpunkt[] = [
      { x: 0.25, y: 0.5 },
      { x: 0.6, y: 0.2 },
      { x: 1, y: 0.42 },
    ];

    const ecken = baueEcken(punkte, 1000, 800, 0);

    expect(ecken[0]).toEqual({ x: 250, y: 400 });
    expect(ecken.at(-1)).toEqual({ x: 1000, y: 336 });
  });

  it('rastet Zwischenpunkte, aber nie den ersten oder letzten', () => {
    const punkte: Stuetzpunkt[] = [
      { x: 0.11, y: 0.5, rasten: true },
      { x: 0.5, y: 0.25, rasten: true },
      { x: 0.91, y: 0.5, rasten: true },
    ];

    const ecken = baueEcken(punkte, 1000, 800, 100);

    // Randpunkte unveraendert, obwohl sie die Kennzeichnung tragen.
    expect(ecken[0]).toEqual({ x: 110, y: 400 });
    expect(ecken.at(-1)).toEqual({ x: 910, y: 400 });

    // Der Zwischenpunkt liegt auf einem Vielfachen von 100.
    const mitte = ecken.find((p) => p.x === 500 && p.y === 200);
    expect(mitte, 'Zwischenpunkt wurde nicht gerastet').toBeDefined();
  });
});

describe('baueBahn', () => {
  it('rundet Ecken und deckelt den Radius auf das halbe kuerzere Segment', () => {
    // Zwei Segmente von je 10 Pixeln, Regelradius ist 12. Gedeckelt auf 5.
    const punkte: Stuetzpunkt[] = [
      { x: 0, y: 0 },
      { x: 0.1, y: 0 },
      { x: 0.1, y: 0.1 },
    ];

    expect(baueBahn(punkte, 100, 100, 0)).toBe('M 0,0 L 5,0 Q 10,0 10,5 L 10,10');
  });

  it('liefert bei entarteten Eingaben den leeren String', () => {
    const zwei: Stuetzpunkt[] = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ];

    expect(baueBahn([], 100, 100, 0)).toBe('');
    expect(baueBahn([{ x: 0, y: 0 }], 100, 100, 0)).toBe('');
    expect(baueBahn(zwei, 0, 100, 0)).toBe('');
    expect(baueBahn(zwei, 100, 0, 0)).toBe('');
    expect(baueBahn(zwei, Number.NaN, 100, 0)).toBe('');
  });

  it('gibt niemals NaN aus', () => {
    const punkte: Stuetzpunkt[] = [
      { x: 0.2, y: 0.2 },
      { x: 0.2, y: 0.2 },
      { x: 0.8, y: 0.6 },
    ];

    expect(baueBahn(punkte, 1200, 700, 88)).not.toContain('NaN');
  });
});
