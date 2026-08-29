import { describe, expect, it } from 'vitest';
import type { Pixelpunkt, Stuetzpunkt } from '../interfaces/signal.interface';
import { baueBahn, baueEcken, versetze, zeichne } from './signal-path';

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

describe('versetze', () => {
  /** Einheitsrichtung eines Segments. */
  function richtung(a: Pixelpunkt, b: Pixelpunkt): Pixelpunkt {
    const l = Math.hypot(b.x - a.x, b.y - a.y);
    return { x: (b.x - a.x) / l, y: (b.y - a.y) / l };
  }

  /** Abstand von `p` zur Geraden durch `a` mit Richtung `u`. */
  function abstand(p: Pixelpunkt, a: Pixelpunkt, u: Pixelpunkt): number {
    return Math.abs((p.x - a.x) * u.y - (p.y - a.y) * u.x);
  }

  // Waagerecht, dann 45 Grad abwaerts, dann senkrecht. Genau die
  // Kombination, an der von Hand versetzte Stuetzpunkte scheitern: Auf
  // den Geraden stimmt der Abstand, in der Schraege spreizt das Buendel
  // um 41 Prozent auf.
  const zug: Pixelpunkt[] = [
    { x: 0, y: 100 },
    { x: 200, y: 100 },
    { x: 260, y: 160 },
    { x: 260, y: 400 },
  ];

  it('haelt den Abstand in jedem Segment, auch in der Schraege', () => {
    for (const d of [-27, -9, 9, 27]) {
      const versetzt = versetze(zug, d);
      expect(versetzt).toHaveLength(zug.length);

      for (let i = 0; i < zug.length - 1; i++) {
        const u = richtung(zug[i], zug[i + 1]);
        const v = richtung(versetzt[i], versetzt[i + 1]);

        // Gleiche Richtung: die Parallele darf nicht kippen.
        expect(v.x).toBeCloseTo(u.x);
        expect(v.y).toBeCloseTo(u.y);

        // Und beide Endpunkte liegen genau |d| von der Ursprungsgeraden
        // entfernt, unabhaengig vom Winkel des Segments.
        expect(abstand(versetzt[i], zug[i], u)).toBeCloseTo(Math.abs(d));
        expect(abstand(versetzt[i + 1], zug[i], u)).toBeCloseTo(Math.abs(d));
      }
    }
  });

  it('versetzt nach rechts bezogen auf die Laufrichtung', () => {
    // Nach rechts heisst bei einem nach rechts laufenden Segment nach
    // unten, denn y zeigt in Bildschirmkoordinaten nach unten.
    const waagerecht: Pixelpunkt[] = [
      { x: 0, y: 50 },
      { x: 100, y: 50 },
    ];
    expect(versetze(waagerecht, 10)[0].y).toBeCloseTo(60);
    expect(versetze(waagerecht, -10)[0].y).toBeCloseTo(40);
  });

  it('laesst den Zug bei Versatz null unveraendert', () => {
    expect(versetze(zug, 0)).toEqual(zug);
  });

  it('liefert bei entarteten Eingaben eine leere Liste', () => {
    expect(versetze([], 5)).toEqual([]);
    expect(versetze([{ x: 1, y: 1 }], 5)).toEqual([]);
    // Zwei gleiche Punkte ergeben ein Segment der Laenge null.
    expect(versetze([{ x: 1, y: 1 }, { x: 1, y: 1 }], 5)).toEqual([]);
  });
});

describe('zeichne', () => {
  it('setzt ohne Radius scharfe Gehrungen', () => {
    const ecken: Pixelpunkt[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ];
    expect(zeichne(ecken)).toBe('M 0,0 L 10,0 L 10,10');
  });
});

describe('baueEcken mit direkt', () => {
  it('verbindet ohne Zerlegung, unter beliebigem Winkel', () => {
    const punkte: Stuetzpunkt[] = [
      { x: 1, y: 0 },
      { x: 0, y: 0.2, direkt: true },
    ];

    // Ohne direkt zerlegt der Bauer die Strecke in ein waagerechtes und
    // ein 45-Grad-Segment, also drei Punkte. Mit direkt bleiben es zwei.
    expect(baueEcken(punkte, 1000, 1000, 0)).toEqual([
      { x: 1000, y: 0 },
      { x: 0, y: 200 },
    ]);
  });

  it('zerlegt ohne direkt weiterhin in erlaubte Winkel', () => {
    const punkte: Stuetzpunkt[] = [
      { x: 1, y: 0 },
      { x: 0, y: 0.2 },
    ];
    expect(baueEcken(punkte, 1000, 1000, 0).length).toBeGreaterThan(2);
  });
});
