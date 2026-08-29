import type { Anordnung, Plan, Stuetzpunkt } from '../interfaces/signal.interface';

/** Wie viele Linien nebeneinander laufen. */
export const LINIEN = 7;

/**
 * Wo die Hero-Linie nach unten abknickt, als Bruchteil der Tafelbreite.
 *
 * Bewusst weit rechts: Der Text steht links, das Logo in der Mitte der
 * rechten Haelfte. Erst hinter beiden ist die Flaeche frei genug, dass
 * ein Knick nichts kreuzt.
 */
const KNICK_X = 0.86;

/**
 * Laenge der 45-Grad-Fase, mit der About von waagerecht auf senkrecht
 * dreht. Kleiner als die halbe Bandhoehe, damit danach noch ein Stueck
 * senkrecht bleibt: Sonst traefe die Linie die Naht schraeg und knickte
 * am Sektionsuebergang sichtbar.
 */
const FASE = 24;

/**
 * Wie weit beide Sektionen ueber die gemeinsame Naht hinausreichen, in
 * Pixeln.
 *
 * Die Schraege quert die Sektionskante unter 45 Grad. Die Parallelen
 * stehen senkrecht auf ihr und damit SCHRAEG zur Kante: Die sieben
 * Linien erreichen die Kante nicht gleichzeitig, sondern ueber rund 38
 * Pixel verteilt. Ohne Ueberstand hoerten die oberen 19 Pixel vor dem
 * Rand auf, und genau das sieht man beim Scrollen als abgeschnitten.
 *
 * Deshalb reicht JEDE Sektion ein Stueck ueber die Naht hinaus, und
 * beide Sektionen beschneiden an ihrer eigenen Kante (overflow: hidden
 * in about.scss und how-i-work.scss). Jede zeichnet damit genau ihre
 * Haelfte: keine Luecke, und vor allem keine Ueberlagerung. Zeichneten
 * beide dasselbe Stueck, laegen zwei Linien à 45 Prozent Deckkraft
 * uebereinander und die Naht leuchtete heller als der Rest.
 */
const UEBERSTAND = 20;

/** Masse, die aus CSS kommen. Siehe styles.scss. */
export interface PlanWerte {
  /**
   * Hoehe der waagerechten Hero-Linie ueber der Unterkante, in Pixeln.
   *
   * In Pixeln und nicht als Bruchteil, damit hero.scss genau diesen Wert
   * als Polster reservieren kann. Bei einem Bruchteil waere der Abstand
   * zu den Knoepfen von der Fensterhoehe abhaengig.
   */
  einlauf: number;
  /** Reserviertes Band am unteren Rand von About, in Pixeln. */
  band: number;
  /** Abstand der parallelen Linien, in Pixeln. */
  abstand: number;
  /**
   * Abstand der Buendelmitte vom rechten Rand, in Pixeln. Dort laufen die
   * Linien senkrecht durch "Wie ich arbeite" nach unten.
   */
  rail: number;
  /**
   * Waagerechte Laenge der langen Schraegen, in Pixeln.
   *
   * Sie beginnt in About zwischen dem zweiten und dritten Beleg und
   * endet an der Schiene. Weil sie unter 45 Grad laeuft, ist ihr
   * senkrechter Fall genauso gross. Der passt nicht in About, deshalb
   * quert sie die Naht und laeuft in "Wie ich arbeite" zu Ende.
   */
  taper: number;
}

/**
 * Versatz der i-ten Linie gegenueber der Mittellinie.
 *
 * Das Buendel liegt um die Mittellinie herum, statt von ihr aus nach
 * einer Seite zu wachsen. Sonst haengt es bei vielen Linien aus dem
 * reservierten Streifen heraus.
 */
export function versatz(i: number, abstand: number): number {
  return (i - (LINIEN - 1) / 2) * abstand;
}

/**
 * Die Mittellinie der Hero.
 *
 * Sie tritt an der linken Kante ein und laeuft gerade nach rechts. Auf
 * der Buehne knickt sie hinter dem Logo nach unten ab und quert die Naht
 * bereits auf Bandhoehe, damit About darunter eine reine Waagerechte
 * bleibt und keinen Text kreuzt.
 */
export function heroPlan(anordnung: Anordnung, w: PlanWerte): Plan {
  if (anordnung === 'gestapelt') {
    // Ohne Buehne endet die Linie an der rechten Kante. About faengt
    // links in seinem Band wieder an, wie ein Zeilenumbruch. Eine
    // durchgehende Naht hiesse hier eine senkrechte Linie quer durch den
    // About-Inhalt.
    return {
      mitte: [
        { x: 0, y: 1, yVersatz: -w.einlauf },
        { x: 1, y: 1, yVersatz: -w.einlauf },
      ],
    };
  }

  // Der Abstieg endet VOR der Naht, danach laeuft die Linie wieder
  // waagerecht bis zur Kante.
  //
  // Das ist keine Kosmetik: Die sieben Linien entstehen als Parallelen
  // zur Mittellinie, und eine Parallele steht senkrecht auf der
  // Laufrichtung. Kaeme die Hero noch in der Schraege an, stuende ihr
  // Buendel schraeg, waehrend About es waagerecht erwartet. Die Linien
  // traefen sich an der Naht dann nicht mehr.
  //
  // Die Schraege laeuft unter 45 Grad, ihr waagerechter Weg ist also
  // genauso lang wie der senkrechte Abstieg.
  const abstieg = w.einlauf - w.band / 2;

  return {
    mitte: [
      { x: 0, y: 1, yVersatz: -w.einlauf },
      { x: KNICK_X, y: 1, yVersatz: -w.einlauf },
      { x: KNICK_X, y: 1, xVersatz: abstieg, yVersatz: -w.band / 2 },
      { x: 1, y: 1, yVersatz: -w.band / 2 },
    ],
  };
}

/**
 * Die Mittellinie von About: waagerecht durch das reservierte Band am
 * unteren Rand, dann am rechten Bildschirmrand ueber eine 45-Grad-Fase
 * nach unten in die naechste Sektion.
 *
 * Das Band wird in about.scss als Polster freigehalten. Dadurch ist
 * baulich sichergestellt, dass hier nie Text steht, statt sich darauf zu
 * verlassen, dass der Inhalt schon kurz genug bleibt.
 */
export function aboutPlan(_anordnung: Anordnung, w: PlanWerte): Plan {
  return {
    mitte: [
      { x: 0, y: 1, yVersatz: -w.band / 2 },
      // Hier knickt sie ab, zwischen dem zweiten und dritten Beleg.
      { x: 1, y: 1, xVersatz: austritt(w) - w.band / 2, yVersatz: -w.band / 2 },
      // Und verlaesst die Sektion nach unten, immer noch in der
      // Schraegen. Der Ueberstand sorgt dafuer, dass wirklich alle
      // sieben Linien die Kante erreichen und nicht nur die unteren.
      {
        x: 1,
        y: 1,
        xVersatz: austritt(w) + UEBERSTAND,
        yVersatz: UEBERSTAND,
      },
    ],
  };
}

/**
 * Wo die Schraege About nach unten verlaesst, gemessen vom rechten Rand.
 *
 * Bis dorthin ist sie um die halbe Bandhoehe gefallen, unter 45 Grad
 * also auch um dieselbe Strecke nach rechts gelaufen.
 */
function austritt(w: PlanWerte): number {
  return -(w.rail + w.taper) + w.band / 2;
}

/**
 * Die Mittellinie in "Wie ich arbeite": senkrecht am rechten Rand
 * hindurch.
 *
 * Sie tritt oben dort ein, wo About unten austritt, und verlaesst die
 * Sektion unten wieder an derselben Stelle. Der Streifen wird in
 * how-i-work-mediaQuerrys.scss als Polster freigehalten, damit dort kein
 * Text steht.
 */
export function arbeitPlan(_anordnung: Anordnung, w: PlanWerte): Plan {
  return {
    mitte: [
      // Beginnt oberhalb der eigenen Oberkante, auf derselben Geraden wie
      // der Austritt aus About. Siehe NAHT_UEBERLAPP.
      {
        x: 1,
        y: 0,
        xVersatz: austritt(w) - UEBERSTAND,
        yVersatz: -UEBERSTAND,
      },
      // Ende der Schraegen, ab hier senkrecht in der Schiene.
      { x: 1, y: 0, xVersatz: -w.rail, yVersatz: w.taper - w.band / 2 },
      { x: 1, y: 1, xVersatz: -w.rail },
    ],
  };
}

/** Alle Plaene, in der Reihenfolge der Kette. */
export const PLAENE: Record<string, (a: Anordnung, w: PlanWerte) => Plan> = {
  hero: heroPlan,
  about: aboutPlan,
  arbeit: arbeitPlan,
};

export type { Stuetzpunkt };
