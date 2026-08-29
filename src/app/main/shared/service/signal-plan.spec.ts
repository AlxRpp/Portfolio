import { describe, expect, it } from 'vitest';
import type { Anordnung } from '../interfaces/signal.interface';
import { aboutPlan, heroPlan, type PlanWerte } from './signal-plan';

const ANORDNUNGEN: Anordnung[] = ['buehne', 'gestapelt'];
const WERTE: PlanWerte = { einlauf: 130, band: 88, abstand: 9 };

describe('signal-plan', () => {
  it('fuehrt in beiden Anordnungen gleich viele Linien', () => {
    const anzahl = heroPlan('buehne', WERTE).bahnen.length;
    expect(anzahl).toBeGreaterThan(1);

    for (const a of ANORDNUNGEN) {
      expect(heroPlan(a, WERTE).bahnen).toHaveLength(anzahl);
      expect(aboutPlan(a, WERTE).bahnen).toHaveLength(anzahl);
    }
  });

  it('startet in der Hero an der linken Kante', () => {
    for (const a of ANORDNUNGEN) {
      for (const bahn of heroPlan(a, WERTE).bahnen) {
        expect(bahn.punkte[0].x).toBe(0);
      }
    }
  });

  it('quert die Naht der Buehne bereits auf Bandhoehe', () => {
    // In About soll nur noch eine Gerade im Band laufen. Der Knick nach
    // unten gehoert deshalb in die Hero, wo die Flaeche rechts frei ist.
    const hero = heroPlan('buehne', WERTE).bahnen;
    const about = aboutPlan('buehne', WERTE).bahnen;

    hero.forEach((bahn, i) => {
      const ende = bahn.punkte.at(-1)!;
      const anfang = about[i].punkte[0];

      expect(bahn.id).toBe(about[i].id);
      expect(ende.x).toBe(1);
      expect(anfang.x).toBe(0);
      expect(ende.y).toBe(anfang.y);
      expect(ende.yVersatz).toBe(anfang.yVersatz);
    });
  });

  it('laesst About ausschliesslich waagerecht im Band laufen', () => {
    for (const a of ANORDNUNGEN) {
      for (const bahn of aboutPlan(a, WERTE).bahnen) {
        expect(bahn.punkte).toHaveLength(2);
        const [von, bis] = bahn.punkte;
        // Gleiche Hoehe an beiden Enden heisst: eine reine Gerade.
        expect(von.y).toBe(bis.y);
        expect(von.yVersatz).toBe(bis.yVersatz);
        // Und sie liegt im Band ueber der Unterkante, nicht darauf.
        expect(von.y).toBe(1);
        expect(von.yVersatz!).toBeLessThan(0);
      }
    }
  });

  it('laesst die Hero-Linie oberhalb des Bandes einlaufen', () => {
    // Der Einlauf liegt hoeher als das Band, die Linien fallen also nach
    // rechts ab statt anzusteigen. Faellt die Reihenfolge um, laeuft der
    // Knick in die falsche Richtung.
    expect(WERTE.einlauf).toBeGreaterThan(WERTE.band / 2);

    for (const bahn of heroPlan('buehne', WERTE).bahnen) {
      const anfang = bahn.punkte[0];
      const ende = bahn.punkte.at(-1)!;
      expect(anfang.y).toBe(1);
      expect(ende.y).toBe(1);
      // Beide zaehlen von der Unterkante nach oben, also negativ. Der
      // Anfang liegt weiter oben als das Ende.
      expect(anfang.yVersatz!).toBeLessThan(ende.yVersatz!);
    }
  });

  it('haelt die parallelen Linien auf gleichem Abstand', () => {
    const hoehen = heroPlan('buehne', WERTE).bahnen.map(
      (b) => b.punkte[0].yVersatz ?? 0,
    );

    for (let i = 1; i < hoehen.length; i++) {
      expect(hoehen[i] - hoehen[i - 1]).toBeCloseTo(WERTE.abstand);
    }
  });

  it('zentriert das Buendel um seine Bezugslinie', () => {
    // Sonst haengt es bei vielen Linien unten aus dem Band heraus.
    //
    // yVersatz zaehlt von der Unterkante nach oben und traegt den Einlauf
    // bereits mit. Geprueft wird deshalb, dass die MITTE des Buendels auf
    // dem Einlauf liegt, nicht dass die Randwerte entgegengesetzt sind.
    const hoehen = heroPlan('buehne', WERTE).bahnen.map(
      (b) => b.punkte[0].yVersatz ?? 0,
    );
    const mitte = (hoehen[0] + hoehen[hoehen.length - 1]) / 2;

    expect(mitte).toBeCloseTo(-WERTE.einlauf);

    // Und dasselbe fuer About, dort ist die Bezugslinie die Bandmitte.
    const imBand = aboutPlan('buehne', WERTE).bahnen.map(
      (b) => b.punkte[0].yVersatz ?? 0,
    );
    expect((imBand[0] + imBand[imBand.length - 1]) / 2).toBeCloseTo(
      -WERTE.band / 2,
    );
  });

  it('haelt das Buendel innerhalb des reservierten Bandes', () => {
    for (const bahn of aboutPlan('buehne', WERTE).bahnen) {
      // yVersatz zaehlt von der Unterkante nach oben, ist also negativ.
      // Betragsmaessig darf es die Bandhoehe nicht ueberschreiten.
      const versatz = bahn.punkte[0].yVersatz!;
      expect(versatz).toBeLessThan(0);
      expect(Math.abs(versatz)).toBeLessThan(WERTE.band);
    }
  });
});
