import type {
  Anker,
  Anordnung,
  Plan,
  Strang,
} from '../interfaces/signal.interface';

/** Wie viele Linien das Rueckgrat fuehrt. */
export const LINIEN = 7;

/** Und wie viele ein Zweig. Genau eine, er traegt weniger. */
export const ZWEIG_LINIEN = 1;

/**
 * Kurzes senkrechtes Stueck, bevor das Rueckgrat zur Mitte abbiegt.
 *
 * Nicht Kosmetik: Die Parallelen stehen senkrecht auf der Laufrichtung.
 * Boege Projects sofort in die flache Schraege ab, laegen seine Linien
 * an der Naht fast waagerecht, waehrend "Wie ich arbeite" senkrecht
 * ankommt und seine waagerecht liegen. Die Linien traefen sich dann
 * nicht.
 */
const EINLAUF = 48;

/** Die Kennung des Stranges, der den Durchgangsverkehr traegt. */
export const HAUPT = 'haupt';

/**
 * Wo die Hero-Linie nach unten abknickt, als Bruchteil der Tafelbreite.
 *
 * Bewusst weit rechts: Der Text steht links, das Logo in der Mitte der
 * rechten Haelfte. Erst hinter beiden ist die Flaeche frei genug, dass
 * ein Knick nichts kreuzt.
 */
const KNICK_X = 0.86;

/**
 * Wie weit beide Sektionen ueber die gemeinsame Naht hinausreichen, in
 * Pixeln.
 *
 * Die Schraege quert die Sektionskante unter 45 Grad. Die Parallelen
 * stehen senkrecht auf ihr und damit SCHRAEG zur Kante: Die Linien
 * erreichen die Kante nicht gleichzeitig, sondern ueber rund 38 Pixel
 * verteilt. Ohne Ueberstand hoerten die oberen davor auf, und genau das
 * sieht man beim Scrollen als abgeschnitten.
 *
 * Deshalb reicht JEDE Sektion ein Stueck darueber hinaus, und beide
 * beschneiden an ihrer eigenen Kante. Jede zeichnet damit genau ihre
 * Haelfte: keine Luecke, und keine Ueberlagerung. Zeichneten beide
 * dasselbe Stueck, laegen zwei Linien uebereinander und die Naht
 * leuchtete heller.
 *
 * Bei senkrechten Uebergaengen entfaellt das: Dort stehen die Parallelen
 * waagerecht und alle erreichen die Kante gleichzeitig.
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
  /** Abstand der Buendelmitte vom rechten Rand, in Pixeln. */
  rail: number;
  /** Waagerechte Laenge der langen Schraegen von About nach unten. */
  taper: number;
  /**
   * Groesste Laenge der Schraegen, mit der das Buendel vom rechten Rand
   * zur Mitte von Projects wandert, in Pixeln.
   *
   * Nicht der Winkel, sondern die Fallhoehe: Wie weit die Linie auf dem
   * Weg vom rechten Rand zur Mitte nach unten kommt. Der Winkel ergibt
   * sich daraus und aus der Fensterbreite, ist also auf breiten Schirmen
   * flacher. Genau so soll es sein, sonst koestete der Weg zur Mitte auf
   * einem 2560er Schirm ueber 1200 Pixel leere Hoehe.
   */
  bogen: number;
  /**
   * Dasselbe fuer Contact, aber viel flacher.
   *
   * Dort wechselt das Buendel auf die linke Seite und muss damit fertig
   * sein, BEVOR der Inhalt anfaengt. Faellt es tiefer, quert die Schraege
   * die Ueberschrift, weil sie auf ihrem Weg nach links genau durch
   * deren Hoehe laeuft.
   */
  bogenKontakt: number;
  /** Abstand der Karten von der Mittellinie, in Pixeln. */
  zweig: number;
}

/**
 * Versatz der i-ten Linie gegenueber der Mittellinie ihres Stranges.
 *
 * Das Buendel liegt um die Mittellinie herum, statt von ihr aus nach
 * einer Seite zu wachsen. Sonst haengt es bei vielen Linien aus dem
 * reservierten Streifen heraus.
 */
export function versatz(i: number, abstand: number, anzahl: number): number {
  return (i - (anzahl - 1) / 2) * abstand;
}

function haupt(mitte: Strang['mitte']): Plan {
  return { straenge: [{ id: HAUPT, mitte, anzahl: LINIEN }] };
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
    return haupt([
      { x: 0, y: 1, yVersatz: -w.einlauf },
      { x: 1, y: 1, yVersatz: -w.einlauf },
    ]);
  }

  // Der Abstieg endet VOR der Naht, danach laeuft die Linie wieder
  // waagerecht bis zur Kante.
  //
  // Das ist keine Kosmetik: Die Parallelen stehen senkrecht auf der
  // Laufrichtung. Kaeme die Hero noch in der Schraege an, stuende ihr
  // Buendel schraeg, waehrend About es waagerecht erwartet. Die Linien
  // traefen sich an der Naht dann nicht mehr.
  const abstieg = w.einlauf - w.band / 2;

  return haupt([
    { x: 0, y: 1, yVersatz: -w.einlauf },
    { x: KNICK_X, y: 1, yVersatz: -w.einlauf },
    { x: KNICK_X, y: 1, xVersatz: abstieg, yVersatz: -w.band / 2 },
    { x: 1, y: 1, yVersatz: -w.band / 2 },
  ]);
}

/**
 * Die Mittellinie von About: waagerecht durch das reservierte Band am
 * unteren Rand, dann am rechten Bildschirmrand ueber eine lange
 * 45-Grad-Schraege nach unten in die naechste Sektion.
 */
export function aboutPlan(_anordnung: Anordnung, w: PlanWerte): Plan {
  return haupt([
    { x: 0, y: 1, yVersatz: -w.band / 2 },
    // Hier knickt sie ab, bei der zweiten Belegspalte.
    { x: 1, y: 1, xVersatz: austritt(w) - w.band / 2, yVersatz: -w.band / 2 },
    // Und verlaesst die Sektion nach unten, immer noch in der Schraegen.
    // Der Ueberstand sorgt dafuer, dass alle Linien die Kante erreichen.
    {
      x: 1,
      y: 1,
      xVersatz: austritt(w) + UEBERSTAND,
      yVersatz: UEBERSTAND,
    },
  ]);
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
 * Die Mittellinie in "Wie ich arbeite": schraeg herein, dann senkrecht am
 * rechten Rand hindurch.
 */
export function arbeitPlan(_anordnung: Anordnung, w: PlanWerte): Plan {
  return haupt([
    // Beginnt oberhalb der eigenen Oberkante, auf derselben Geraden wie
    // der Austritt aus About. Siehe UEBERSTAND.
    {
      x: 1,
      y: 0,
      xVersatz: austritt(w) - UEBERSTAND,
      yVersatz: -UEBERSTAND,
    },
    // Ende der Schraegen, ab hier senkrecht in der Schiene.
    { x: 1, y: 0, xVersatz: -w.rail, yVersatz: w.taper - w.band / 2 },
    { x: 1, y: 1, xVersatz: -w.rail },
  ]);
}

/**
 * Projects: das Rueckgrat wandert vom rechten Rand zur Mitte und laeuft
 * dort nach unten. An jeder Karte geht ein Zweig ab.
 *
 * Der Weg zur Mitte besteht aus einer gedeckelten Schraegen und einer
 * Waagerechten. Eine reine 45-Grad-Schraege ueber die halbe Breite
 * koestete dieselbe Hoehe, also bei 1920 Pixeln ueber 900 Pixel leere
 * Flaeche zwischen Ueberschrift und erster Karte. Die Waagerechte
 * kostet keine.
 */
export function projektePlan(
  _anordnung: Anordnung,
  w: PlanWerte,
  anker: readonly Anker[],
): Plan {
  const straenge: Strang[] = [
    {
      id: HAUPT,
      anzahl: LINIEN,
      mitte: [
        // Kommt senkrecht an der Schiene herein und laeuft erst ein
        // Stueck senkrecht weiter, damit die Naht sauber schliesst.
        { x: 1, y: 0, xVersatz: -w.rail },
        { x: 1, y: 0, xVersatz: -w.rail, yVersatz: EINLAUF },
        // In EINER geraden Strecke zur Mitte, unter dem Winkel, der sich
        // aus Breite und Fallhoehe ergibt.
        //
        // Zerlegt in 45 Grad plus Waagerechte waeren es zwei Ecken, und
        // bei sieben Linien spreizt jede Ecke das Buendel um seine ganze
        // Breite. Zwei kurz hintereinander sehen aus wie ein Treppenhaufen.
        { x: 0.5, y: 0, yVersatz: w.bogen, direkt: true },
        // Ab hier das Rueckgrat nach unten.
        { x: 0.5, y: 1 },
      ],
    },
  ];

  anker.forEach((a, i) => {
    straenge.push({
      id: `zweig-${i}`,
      anzahl: ZWEIG_LINIEN,
      mitte: zweigStummel(a, w),
    });
  });

  return { straenge };
}

/**
 * Der Zweig zu einer Karte: eine Linie von der AEUSSERSTEN Bahn des
 * Buendels unter 45 Grad an die zugewandte Kante der Karte.
 *
 * Von der aeussersten und nicht aus der Mitte: Ein Zweig, der aus der
 * Mitte kaeme, muesste die halbe Buendelbreite queren und alle anderen
 * Bahnen schneiden. Von aussen geht er frei ab.
 */
function zweigStummel(a: Anker, w: PlanWerte): Strang['mitte'] {
  const seite = Math.sign(a.nah) || 1;

  // Auf welcher Bahn des Buendels der Zweig ansetzt: der linken bei
  // einer Karte links, der rechten bei einer rechts.
  const aussen = seite * Math.abs(versatz(0, w.abstand, LINIEN));

  // Waagerechter Weg von dort bis an die Karte. Unter 45 Grad faellt die
  // Linie um denselben Betrag.
  const weg = Math.abs(a.nah - aussen);

  return [
    { x: 0.5, y: 0, xVersatz: aussen, yVersatz: a.oben - weg, direkt: true },
    // Endet auf der oberen Ecke, die zu den Bahnen zeigt.
    { x: 0.5, y: 0, xVersatz: a.nah, yVersatz: a.oben, direkt: true },
  ];
}

/**
 * Stack: das Gegenstueck zu Projects. Das Buendel kommt in der Mitte
 * herein und wandert wieder an den rechten Rand, auf dieselbe Schiene,
 * auf der es schon durch "Wie ich arbeite" lief.
 *
 * Erst ein kurzes senkrechtes Stueck, aus demselben Grund wie in
 * Projects: Die Naht schliesst nur sauber, wenn beide Seiten dort
 * dieselbe Richtung haben.
 */
export function stackPlan(_anordnung: Anordnung, w: PlanWerte): Plan {
  return haupt([
    { x: 0.5, y: 0 },
    { x: 0.5, y: 0, yVersatz: EINLAUF },
    // In EINER geraden Strecke zurueck zur Schiene. Der Winkel ergibt
    // sich aus Breite und Fallhoehe und ist auf breiten Schirmen
    // flacher, genau wie beim Weg zur Mitte.
    { x: 1, y: 0, xVersatz: -w.rail, yVersatz: w.bogen, direkt: true },
    { x: 1, y: 1, xVersatz: -w.rail },
  ]);
}

/**
 * Contact, das Ende der Kette: von der Schiene rechts hinueber zur
 * Schiene links, dort hinunter und zuletzt waagerecht in den
 * Absendeknopf.
 *
 * Die sieben Linien treffen die linke Kante des Knopfes ueber ihre
 * Buendelbreite verteilt, laufen also wirklich hinein statt daneben zu
 * enden. Dafuer braucht es seine gemessene Lage: Sie haengt an der
 * Formularhoehe und laesst sich nicht aus Bruchteilen ableiten.
 */
export function kontaktPlan(
  _anordnung: Anordnung,
  w: PlanWerte,
  anker: readonly Anker[],
): Plan {
  const mitte: Strang['mitte'] = [
    // Kommt senkrecht an der rechten Schiene herein und laeuft erst ein
    // Stueck weiter, damit die Naht sauber schliesst.
    { x: 1, y: 0, xVersatz: -w.rail },
    { x: 1, y: 0, xVersatz: -w.rail, yVersatz: EINLAUF },
    // In EINER geraden Strecke hinueber zur Schiene am linken Rand.
    { x: 0, y: 0, xVersatz: w.rail, yVersatz: w.bogenKontakt, direkt: true },
  ];

  const ziel = anker[0];
  if (!ziel) {
    // Ohne gemessenen Knopf schlicht bis zur Unterkante. So sieht es
    // beim ersten Aufbau richtig aus, bevor gemessen wurde.
    mitte.push({ x: 0, y: 1, xVersatz: w.rail });
    return haupt(mitte);
  }

  mitte.push(
    // Senkrecht hinunter bis auf die Hoehe des Knopfes.
    { x: 0, y: 0, xVersatz: w.rail, yVersatz: ziel.oben },
    // Und waagerecht hinein.
    { x: 0, y: 0, xVersatz: w.rail + ziel.nah, yVersatz: ziel.oben },
  );

  return haupt(mitte);
}

/** Alle Plaene, in der Reihenfolge der Kette. */
export const PLAENE: Record<
  string,
  (a: Anordnung, w: PlanWerte, anker: readonly Anker[]) => Plan
> = {
  hero: heroPlan,
  about: aboutPlan,
  arbeit: arbeitPlan,
  projekte: projektePlan,
  stack: stackPlan,
  kontakt: kontaktPlan,
};
