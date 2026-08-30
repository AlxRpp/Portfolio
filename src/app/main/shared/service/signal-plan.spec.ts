import { describe, expect, it } from 'vitest';
import type { Anordnung } from '../interfaces/signal.interface';
import {
  HAUPT,
  LINIEN,
  ZWEIG_LINIEN,
  aboutPlan,
  arbeitPlan,
  heroPlan,
  kontaktPlan,
  projektePlan,
  stackPlan,
  versatz,
  type PlanWerte,
} from './signal-plan';
import type { Anker, Plan } from '../interfaces/signal.interface';
import { KETTE } from './signals';

/** Der Strang des Durchgangs. Alles andere sind Zweige. */
function durchgang(plan: Plan) {
  const strang = plan.straenge.find((s) => s.id === HAUPT);
  expect(strang, 'Jeder Plan braucht einen Durchgang').toBeDefined();
  return strang!;
}

/** Seine Mittellinie. */
function haupt(plan: Plan) {
  return durchgang(plan).mitte;
}

const ANORDNUNGEN: Anordnung[] = ['buehne', 'gestapelt'];
const WERTE: PlanWerte = {
  einlauf: 130,
  band: 88,
  abstand: 9,
  rail: 44,
  taper: 428,
  bogen: 380,
  bogenKontakt: 96,
  anlauf: 160,
  zweig: 64,
};

/** Tafelbreite der Testrechnungen. Beide Sektionen sind gleich breit. */
const BREITE = 1600;

/** Absolute x eines Stuetzpunktes, in Pixeln. */
function absolutX(p: { x: number; xVersatz?: number }): number {
  return p.x * BREITE + (p.xVersatz ?? 0);
}

/**
 * Wo die Gerade des Seitenwechsels liegt, nachdem sie `gefallen` Pixel
 * gefallen ist. Sie fuehrt von der rechten Schiene zur linken.
 */
function querUeber(gefallen: number): number {
  const rechts = BREITE - WERTE.rail;
  const anteil = gefallen / (WERTE.anlauf + WERTE.bogenKontakt);
  return rechts + (WERTE.rail - rechts) * anteil;
}

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
    const alle = Array.from({ length: LINIEN }, (_, i) => versatz(i, WERTE.abstand, LINIEN));

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
    const halb = Math.abs(versatz(0, WERTE.abstand, LINIEN));
    expect(WERTE.rail + halb).toBeLessThan(88);
  });
});

describe('signal-plan', () => {
  it('startet die Hero an der linken Kante', () => {
    for (const a of ANORDNUNGEN) {
      expect(haupt(heroPlan(a, WERTE))[0].x).toBe(0);
    }
  });

  it('erreicht die Naht waagerecht, nicht in der Schraege', () => {
    // Sonst steht das Buendel der Hero schraeg, waehrend About es
    // waagerecht erwartet, und die Linien treffen sich an der Naht
    // nicht mehr. Genau so war die Naht einmal kaputt.
    const mitte = haupt(heroPlan('buehne', WERTE));
    const vorletzt = mitte.at(-2)!;
    const letzt = mitte.at(-1)!;

    expect(letzt.x).toBe(1);
    expect(vorletzt.y).toBe(letzt.y);
    expect(vorletzt.yVersatz ?? 0).toBe(letzt.yVersatz ?? 0);
  });

  it('laesst die Schraege der Hero unter 45 Grad laufen', () => {
    const mitte = haupt(heroPlan('buehne', WERTE));
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

    const mitte = haupt(heroPlan('buehne', WERTE));
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
      const [ein, knick, aus] = haupt(aboutPlan(a, WERTE));

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
      const aus = haupt(aboutPlan(a, WERTE)).at(-1)!;
      const [ein, knick] = haupt(arbeitPlan(a, WERTE));

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
    const [, knick, unten] = haupt(arbeitPlan('buehne', WERTE));
    expect(knick.xVersatz).toBe(unten.xVersatz);
    expect(knick.xVersatz).toBe(-WERTE.rail);
    expect(unten.y).toBe(1);
  });

  it('faengt die Schraege zwischen den Belegen an, nicht am Rand', () => {
    // Der Knick liegt um die volle Schraegenlaenge links von der
    // Schiene. Waere er kuerzer, saesse er am rechten Rand statt bei den
    // Belegen.
    const [, knick, aus] = haupt(aboutPlan('buehne', WERTE));

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

  it('uebergibt senkrecht an Projects, ohne Ueberstand', () => {
    // Senkrechte Naht: Die Parallelen stehen dort waagerecht, alle Linien
    // erreichen die Kante gleichzeitig. Der Ueberstand, den der schraege
    // Uebergang zwischen About und "Wie ich arbeite" braucht, waere hier
    // also falsch.
    for (const a of ANORDNUNGEN) {
      const aus = haupt(arbeitPlan(a, WERTE)).at(-1)!;
      const ein = haupt(projektePlan(a, WERTE, []))[0];

      expect(aus.y).toBe(1);
      expect(ein.y).toBe(0);
      expect(aus.xVersatz).toBe(ein.xVersatz);
      expect(aus.yVersatz ?? 0).toBe(0);
      expect(ein.yVersatz ?? 0).toBe(0);
    }
  });

  it('laeuft erst senkrecht und dann in einer geraden Strecke zur Mitte', () => {
    const mitte = haupt(projektePlan('buehne', WERTE, []));
    const [ein, knick, ankunft, runter] = mitte;

    // Das senkrechte Stueck am Anfang ist kein Schmuck: Die Parallelen
    // stehen senkrecht auf der Laufrichtung. Boege Projects sofort in die
    // flache Schraege ab, laegen seine Linien an der Naht fast
    // waagerecht, waehrend "Wie ich arbeite" senkrecht ankommt.
    expect(ein.x).toBe(1);
    expect(knick.x).toBe(1);
    expect(ein.xVersatz).toBe(knick.xVersatz);
    expect(knick.yVersatz!).toBeGreaterThan(0);

    // Danach EINE gerade Strecke zur Mitte, nicht zerlegt.
    expect(ankunft.direkt).toBe(true);
    expect(ankunft.x).toBe(0.5);
    expect(ankunft.yVersatz).toBe(WERTE.bogen);

    // Und von dort senkrecht nach unten.
    expect(runter.x).toBe(0.5);
    expect(runter.y).toBe(1);
  });

  it('setzt den Zweig an der aeussersten Bahn an, nicht in der Mitte', () => {
    // Aus der Mitte muesste er die halbe Buendelbreite queren und dabei
    // alle anderen Bahnen schneiden. Von aussen geht er frei ab.
    const aussen = Math.abs(versatz(0, WERTE.abstand, LINIEN));
    const anker: Anker[] = [
      { oben: 300, nah: -260 },
      { oben: 800, nah: 260 },
    ];
    const zweige = projektePlan('buehne', WERTE, anker).straenge.filter(
      (s) => s.id !== HAUPT,
    );

    expect(zweige).toHaveLength(anker.length);
    expect(aussen).toBeGreaterThan(0);

    zweige.forEach((z, i) => {
      const a = anker[i];
      const [ab, an] = z.mitte;
      const seite = Math.sign(a.nah);

      // Genau zwei Punkte: von der aeusseren Bahn an die Karte.
      expect(z.mitte).toHaveLength(2);
      expect(z.anzahl).toBe(1);

      // Ansatz auf der aeussersten Bahn, auf der Seite der Karte.
      expect(ab.xVersatz).toBeCloseTo(seite * aussen);

      // Ende genau auf der oberen Ecke, die zu den Bahnen zeigt.
      expect(an.xVersatz).toBe(a.nah);
      expect(an.yVersatz).toBe(a.oben);

      // Unter 45 Grad: gleicher Weg zur Seite wie nach unten.
      expect(an.yVersatz! - ab.yVersatz!).toBeCloseTo(
        Math.abs(a.nah - seite * aussen),
      );
    });
  });

  it('bringt das Buendel im Stack zurueck auf dieselbe Schiene', () => {
    for (const a of ANORDNUNGEN) {
      const aus = haupt(projektePlan(a, WERTE, [])).at(-1)!;
      const mitte = haupt(stackPlan(a, WERTE));
      const [ein, knick, ankunft, runter] = mitte;

      // Senkrechte Naht in der Mitte: Projects endet dort, Stack faengt
      // dort an. Beide senkrecht, also ohne Ueberstand.
      expect(aus.x).toBe(0.5);
      expect(ein.x).toBe(0.5);
      expect(ein.yVersatz ?? 0).toBe(0);

      // Erst ein Stueck senkrecht, sonst schliesst die Naht nicht.
      expect(knick.x).toBe(0.5);
      expect(knick.yVersatz!).toBeGreaterThan(0);

      // Dann in EINER geraden Strecke zurueck an den rechten Rand.
      expect(ankunft.direkt).toBe(true);
      expect(ankunft.x).toBe(1);
      expect(ankunft.xVersatz).toBe(-WERTE.rail);

      // Und dort senkrecht hinunter, auf genau der Schiene, auf der die
      // Linien schon durch "Wie ich arbeite" liefen.
      expect(runter.x).toBe(1);
      expect(runter.xVersatz).toBe(-WERTE.rail);
      expect(haupt(arbeitPlan(a, WERTE)).at(-1)!.xVersatz).toBe(runter.xVersatz);

      // Aber nicht mehr bis zur Unterkante: Der Wechsel auf die linke
      // Seite beginnt schon hier, --signal-anlauf darueber.
      expect(runter.y).toBe(1);
      expect(runter.yVersatz).toBe(-WERTE.anlauf);
    }
  });

  it('laesst den Seitenwechsel schon in Stack beginnen, nicht erst in Contact', () => {
    for (const a of ANORDNUNGEN) {
      const raus = haupt(stackPlan(a, WERTE)).at(-1)!;

      // Stack verlaesst seine Sektion bereits in der Schraegen und reicht
      // dabei ueber die Kante hinaus, sonst erreichen die aeusseren Bahnen
      // sie nicht.
      expect(raus.direkt).toBe(true);
      expect(raus.y).toBe(1);
      expect(raus.yVersatz!).toBeGreaterThan(0);

      // Und liegt dabei genau auf der Geraden zur linken Schiene.
      expect(absolutX(raus)).toBeCloseTo(querUeber(WERTE.anlauf + raus.yVersatz!));
    }
  });

  it('fuehrt die Linien in Contact bis in den Absendeknopf', () => {
    const knopf: Anker = { oben: 900, nah: 260 };

    for (const a of ANORDNUNGEN) {
      const aus = haupt(stackPlan(a, WERTE)).at(-1)!;
      const mitte = haupt(kontaktPlan(a, WERTE, [knopf]));
      const [ein, ankunft, runter, ziel] = mitte;

      // Schraege Naht: Stack quert die Kante bereits in der Schraegen,
      // Contact setzt dieselbe Gerade oberhalb der eigenen Oberkante fort.
      // Beide reichen um denselben Betrag ueber die Kante.
      expect(ein.y).toBe(0);
      expect(ein.yVersatz).toBe(-aus.yVersatz!);
      expect(absolutX(ein)).toBeCloseTo(querUeber(WERTE.anlauf + ein.yVersatz!));

      // Und zwar auf EINER Geraden mit dem Austritt aus Stack: gleiche
      // Steigung, sonst knickt die Linie an der Naht.
      const steigung =
        (WERTE.anlauf + WERTE.bogenKontakt) / (BREITE - 2 * WERTE.rail);
      expect(
        (aus.yVersatz! - ein.yVersatz!) / (absolutX(aus) - absolutX(ein)),
      ).toBeCloseTo(-steigung);

      // Der Bogen links bleibt unveraendert: Das Buendel muss angekommen
      // sein, BEVOR der Inhalt anfaengt. Faellt es tiefer, quert die
      // Schraege die Ueberschrift.
      expect(ankunft.direkt).toBe(true);
      expect(ankunft.x).toBe(0);
      expect(ankunft.xVersatz).toBe(WERTE.rail);
      expect(ankunft.yVersatz).toBe(WERTE.bogenKontakt);

      // Senkrecht hinunter auf Knopfhoehe.
      expect(runter.x).toBe(0);
      expect(runter.xVersatz).toBe(WERTE.rail);
      expect(runter.yVersatz).toBe(knopf.oben);

      // Und waagerecht hinein, auf derselben Hoehe. Die Spitze liegt
      // HINTER der Knopfkante: Dort laufen alle sieben Linien zusammen,
      // und sieben Striche uebereinander waeren ein heller Knoten. Der
      // Knopf deckt ihn ab.
      expect(ziel.yVersatz).toBe(knopf.oben);
      expect(ziel.xVersatz!).toBeGreaterThan(WERTE.rail + knopf.nah);
    }
  });

  it('laesst das Buendel erst kurz vor dem Knopf konisch zusammenlaufen', () => {
    const knopf: Anker = { oben: 900, nah: 260 };
    const halb = Math.abs(versatz(0, WERTE.abstand, LINIEN));

    for (const a of ANORDNUNGEN) {
      const strang = durchgang(kontaktPlan(a, WERTE, [knopf]));
      const ziel = strang.mitte.at(-1)!;

      // Der Trichter beginnt genau eine halbe Buendelbreite vor der
      // Knopfkante. Bis dorthin laufen die sieben parallel.
      expect(ziel.xVersatz! - strang.trichter!).toBe(
        WERTE.rail + knopf.nah - halb,
      );

      // Und er endet erst hinter der Kante, sonst laege der Knoten offen.
      expect(strang.trichter!).toBeGreaterThan(halb);
    }
  });

  it('laesst ohne gemessenen Knopf gar nichts zusammenlaufen', () => {
    // Ohne Knopf gibt es kein Ziel, in das etwas muenden koennte. Ein
    // Trichter mitten in der Flaeche saehe aus wie ein Fehler.
    expect(durchgang(kontaktPlan('buehne', WERTE, [])).trichter).toBeUndefined();
  });

  it('endet ohne gemessenen Knopf sauber an der Unterkante', () => {
    // Beim ersten Aufbau ist noch nichts gemessen. Dann soll die Linie
    // trotzdem richtig aussehen und nicht ins Nichts zeigen.
    const mitte = haupt(kontaktPlan('buehne', WERTE, []));
    const letzt = mitte.at(-1)!;

    expect(letzt.x).toBe(0);
    expect(letzt.y).toBe(1);
    expect(letzt.xVersatz).toBe(WERTE.rail);
  });

  it('laesst Contact als letztes Glied nichts weitergeben', () => {
    // Dort laufen die Linien in den Absendeknopf, und genau dort ist der
    // Punkt angekommen.
    expect(KETTE.at(-1)).toBe('kontakt');
  });
});
