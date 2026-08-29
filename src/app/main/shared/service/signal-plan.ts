import type { Anordnung, Bahn, Plan } from '../interfaces/signal.interface';

/**
 * Wie viele Linien nebeneinander laufen.
 *
 * Einzige Stelle, an der die Zahl steht. Alles andere rechnet sich
 * daraus, auch die Zentrierung des Buendels.
 */
const LINIEN = 7;

const IDS = Array.from({ length: LINIEN }, (_, i) => `l${i}`);

/**
 * Wo die Hero-Linie nach unten abknickt, als Bruchteil der Tafelbreite.
 *
 * Bewusst weit rechts: Der Text der Hero steht links, das Logo in der
 * Mitte der rechten Haelfte. Erst hinter beiden ist die Flaeche frei
 * genug, dass ein Knick nichts kreuzt.
 */
const KNICK_X = 0.86;

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
  /** Reserviertes Band am unteren Rand, in Pixeln. */
  band: number;
  /** Abstand der parallelen Linien, in Pixeln. */
  abstand: number;
}

/**
 * Die Linien der Hero.
 *
 * Sie treten an der linken Kante ein und laufen gerade nach rechts. Auf
 * der Buehne knicken sie hinter dem Logo nach unten ab und queren die
 * Naht bereits auf Bandhoehe, damit About darunter eine reine Gerade
 * bleibt und keinen Text kreuzt.
 */
export function heroPlan(anordnung: Anordnung, w: PlanWerte): Plan {
  const bahnen: Bahn[] = IDS.map((id, i) => {
    const versatz = mittig(i, w.abstand);

    if (anordnung === 'gestapelt') {
      // Ohne Buehne endet die Linie an der rechten Kante. About faengt
      // links in seinem Band wieder an, wie ein Zeilenumbruch. Eine
      // durchgehende Naht hiesse hier eine senkrechte Linie quer durch
      // den About-Inhalt.
      return {
        id,
        punkte: [
          { x: 0, y: 1, yVersatz: -w.einlauf + versatz },
          { x: 1, y: 1, yVersatz: -w.einlauf + versatz },
        ],
      };
    }

    return {
      id,
      punkte: [
        { x: 0, y: 1, yVersatz: -w.einlauf + versatz },
        {
          x: KNICK_X,
          y: 1,
          yVersatz: -w.einlauf + versatz,
          // Die tiefer laufende Linie knickt frueher ab. Nur so bleibt
          // der Abstand auch in der Schraege derselbe; ohne den Versatz
          // ruecken die Linien in der Kurve zusammen.
          xVersatz: -versatz,
          schraegeZuerst: true,
        },
        { x: 1, y: 1, yVersatz: -w.band / 2 + versatz },
      ],
    };
  });

  return { bahnen };
}

/**
 * Versatz der i-ten Linie, so dass das Buendel um die Bezugslinie herum
 * zentriert liegt statt von ihr aus nach unten zu wachsen.
 *
 * Ohne die Zentrierung haengt das Buendel bei vielen Linien unten aus dem
 * reservierten Band heraus: Sieben Linien à 9 Pixel sind 54 Pixel, ein
 * 88 Pixel hohes Band bietet ab seiner Mitte aber nur 44.
 */
function mittig(i: number, abstand: number): number {
  return (i - (LINIEN - 1) / 2) * abstand;
}

/**
 * Die Linien von About: eine reine Gerade im reservierten Band am
 * unteren Rand.
 *
 * Das Band wird in about.scss als Polster freigehalten. Dadurch ist
 * baulich sichergestellt, dass hier nie Text steht, statt sich darauf zu
 * verlassen, dass der Inhalt schon kurz genug bleibt.
 */
export function aboutPlan(_anordnung: Anordnung, w: PlanWerte): Plan {
  const bahnen: Bahn[] = IDS.map((id, i) => {
    const y = -w.band / 2 + mittig(i, w.abstand);
    return {
      id,
      punkte: [
        { x: 0, y: 1, yVersatz: y },
        { x: 1, y: 1, yVersatz: y },
      ],
    };
  });

  return { bahnen };
}
