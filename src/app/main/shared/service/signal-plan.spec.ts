import { describe, expect, it } from 'vitest';
import type { Anordnung } from '../interfaces/signal.interface';
import {
  LINIEN,
  aboutPlan,
  arbeitPlan,
  heroPlan,
  versatz,
  type PlanWerte,
} from './signal-plan';

const ANORDNUNGEN: Anordnung[] = ['buehne', 'gestapelt'];
const WERTE: PlanWerte = {
  einlauf: 130,
  band: 88,
  abstand: 9,
  rail: 44,
  taper: 428,
};

/** Steigung eines Abschnitts zwischen zwei Stuetzpunkten, in Pixeln. */
function weg(a: { xVersatz?: number; yVersatz?: number },
             b: { xVersatz?: number; yVersatz?: number }) {
  return {
    x: (b.xVersatz ?? 0) - (a.xVersatz ?? 0),
    y: (b.yVersatz ?? 0) - (a.yVersatz ?? 0),
  };
}

describe('versatz', () => {
  it('legt das Buendel um die Mittellinie herum', () => {
    const alle = Array.from({ length: LINIEN }, (_, i) => versatz(i, WERTE.abstand));

    // Symmetrisch: sonst haengt das Buendel bei vielen Linien aus dem
    // reservierten Streifen heraus.
    expect(alle[0]).toBeCloseTo(-alle[alle.length - 1]);

    for (let i = 1; i < alle.length; i++) {
      expect(alle[i] - alle[i - 1]).toBeCloseTo(WERTE.abstand);
    }
  });

  it('haelt das Buendel im reservierten Streifen am rechten Rand', () => {
    // --signal-rail-frei ist 88. Die aeusserste Linie liegt bei
    // rail plus halber Buendelbreite und muss darunter bleiben.
    const halb = Math.abs(versatz(0, WERTE.abstand));
    expect(WERTE.rail + halb).toBeLessThan(88);
  });
});

describe('signal-plan', () => {
  it('startet die Hero an der linken Kante', () => {
    for (const a of ANORDNUNGEN) {
      expect(heroPlan(a, WERTE).mitte[0].x).toBe(0);
    }
  });

  it('erreicht die Naht waagerecht, nicht in der Schraege', () => {
    // Sonst steht das Buendel der Hero schraeg, waehrend About es
    // waagerecht erwartet, und die Linien treffen sich an der Naht
    // nicht mehr. Genau so war die Naht einmal kaputt.
    const mitte = heroPlan('buehne', WERTE).mitte;
    const vorletzt = mitte.at(-2)!;
    const letzt = mitte.at(-1)!;

    expect(letzt.x).toBe(1);
    expect(vorletzt.y).toBe(letzt.y);
    expect(vorletzt.yVersatz ?? 0).toBe(letzt.yVersatz ?? 0);
  });

  it('laesst die Schraege der Hero unter 45 Grad laufen', () => {
    const mitte = heroPlan('buehne', WERTE).mitte;
    const oben = mitte[1];
    const unten = mitte[2];

    const weitX = (unten.xVersatz ?? 0) - (oben.xVersatz ?? 0);
    const weitY = (unten.yVersatz ?? 0) - (oben.yVersatz ?? 0);
    expect(oben.x).toBe(unten.x);
    expect(weitX).toBeCloseTo(weitY);
  });

  it('laesst die Hero-Linie oberhalb des Bandes einlaufen', () => {
    // Der Einlauf liegt hoeher als das Band, die Linie faellt also nach
    // rechts ab statt anzusteigen. Faellt die Reihenfolge um, laeuft der
    // Knick in die falsche Richtung.
    expect(WERTE.einlauf).toBeGreaterThan(WERTE.band / 2);

    const mitte = heroPlan('buehne', WERTE).mitte;
    const anfang = mitte[0];
    const ende = mitte[mitte.length - 1];

    expect(anfang.y).toBe(1);
    expect(ende.y).toBe(1);
    // Beide zaehlen von der Unterkante nach oben, also negativ. Der
    // Anfang liegt weiter oben als das Ende.
    expect(anfang.yVersatz!).toBeLessThan(ende.yVersatz!);
  });

  it('knickt About im Band ab und verlaesst es in der Schraegen', () => {
    for (const a of ANORDNUNGEN) {
      const [ein, knick, aus] = aboutPlan(a, WERTE).mitte;

      // Waagerecht im Band, ueber der Unterkante und nicht darauf.
      expect(ein.y).toBe(1);
      expect(ein.yVersatz).toBe(knick.yVersatz);
      expect(ein.yVersatz!).toBeLessThan(0);

      // Die Schraege laeuft unter genau 45 Grad und endet auf der
      // Unterkante, nicht davor: Sie laeuft in der naechsten Sektion
      // weiter, statt hier senkrecht zu werden.
      const w = weg(knick, aus);
      expect(w.x).toBeCloseTo(w.y);
      expect(aus.y).toBe(1);

      // Der Austritt liegt UNTER der Unterkante, nicht darauf.
      //
      // Die Parallelen stehen senkrecht auf der Schraegen und damit
      // schraeg zur Kante: Ohne Ueberstand erreichten nur die unteren
      // Linien den Rand, die oberen hoerten davor auf. Genau das sah man
      // beim Scrollen als abgeschnitten.
      expect(aus.yVersatz!).toBeGreaterThan(0);
    }
  });

  it('setzt die Schraege in "Wie ich arbeite" auf derselben Geraden fort', () => {
    for (const a of ANORDNUNGEN) {
      const aus = aboutPlan(a, WERTE).mitte.at(-1)!;
      const [ein, knick] = arbeitPlan(a, WERTE).mitte;

      expect(aus.y).toBe(1);
      expect(ein.y).toBe(0);
      expect(aus.x).toBe(ein.x);

      // Der Eintritt liegt oberhalb der eigenen Oberkante, und zwar um
      // genau so viel nach links wie nach oben. Nur dann liegt er auf
      // derselben 45-Grad-Geraden wie der Austritt aus About, und die
      // Ueberlappung deckt die Naht luecklos ab.
      const versatz = weg(ein, aus);
      expect(versatz.x).toBeCloseTo(versatz.y);

      // Beide reichen ueber die Naht hinaus, und zwar um denselben
      // Betrag in die jeweils eigene Richtung. Beschnitten wird an der
      // Sektionskante, jede zeichnet also genau ihre Haelfte. Waeren die
      // Ueberstaende ungleich, entstuende eine Luecke oder eine doppelt
      // gezeichnete und damit hellere Naht.
      expect(ein.yVersatz!).toBeLessThan(0);
      expect(aus.yVersatz!).toBeCloseTo(-ein.yVersatz!);

      // Und die Fortsetzung laeuft ebenfalls unter 45 Grad.
      const w = weg(ein, knick);
      expect(w.x).toBeCloseTo(w.y);
    }
  });

  it('endet in "Wie ich arbeite" senkrecht in der Schiene', () => {
    const [, knick, unten] = arbeitPlan('buehne', WERTE).mitte;
    expect(knick.xVersatz).toBe(unten.xVersatz);
    expect(knick.xVersatz).toBe(-WERTE.rail);
    expect(unten.y).toBe(1);
  });

  it('faengt die Schraege zwischen den Belegen an, nicht am Rand', () => {
    // Der Knick liegt um die volle Schraegenlaenge links von der
    // Schiene. Waere er kuerzer, saesse er am rechten Rand statt bei den
    // Belegen.
    const [, knick, aus] = aboutPlan('buehne', WERTE).mitte;

    // Der Knick liegt um die volle Schraegenlaenge plus die Schiene
    // links vom rechten Rand.
    expect(knick.xVersatz!).toBeCloseTo(-(WERTE.rail + WERTE.taper));

    // Und der Austritt liegt um die halbe Bandhoehe weiter rechts, denn
    // so weit ist die Schraege bis zur Unterkante gelaufen. Dazu kommt
    // der Ueberstand, um den sie noch darueber hinausreicht.
    expect(aus.xVersatz! - knick.xVersatz!).toBeCloseTo(
      WERTE.band / 2 + aus.yVersatz!,
    );

    // Sie ist deutlich laenger als der Streifen am Rand, sonst saesse
    // der Knick dort statt bei den Belegen.
    expect(WERTE.taper).toBeGreaterThan(WERTE.rail * 2);
  });
});
