/**
 * Ein Punkt einer Leiterbahn, angegeben als Bruchteil von Breite und
 * Hoehe der Sektion. Erst der Pfadbauer rechnet daraus Pixel.
 */
export interface Stuetzpunkt {
  /** 0 bis 1, Bruchteil der Breite. */
  x: number;
  /** 0 bis 1, Bruchteil der Hoehe. */
  y: number;
  /**
   * Auf die Rasterschrittweite runden, damit die Bahn im Raster der Hero
   * liegt. Der Bauer nimmt den ersten und letzten Punkt davon immer aus,
   * auch wenn die Kennzeichnung gesetzt ist: Das sind die Anschluesse an
   * der Naht, ein Versatz dort liesse die Linie zur Nachbarsektion
   * klaffen.
   */
  rasten?: boolean;
  /** Erst die 45-Grad-Schraege laufen, dann gerade. Ohne Angabe umgekehrt. */
  schraegeZuerst?: boolean;
  /**
   * Versatz in Pixeln, nach der Umrechnung aufgeschlagen.
   *
   * Fuer parallel laufende Linien: Ihr Abstand soll bei jeder Tafelhoehe
   * derselbe sein. Als Bruchteil gerechnet liefe das Buendel auf hohen
   * Schirmen auseinander und auf flachen zusammen.
   */
  xVersatz?: number;
  yVersatz?: number;
}

/** Ein Punkt in Pixeln, im Koordinatensystem der viewBox. */
export interface Pixelpunkt {
  x: number;
  y: number;
}

/**
 * Der Plan einer Sektion: EINE Mittellinie.
 *
 * Die sieben sichtbaren Linien entstehen daraus als echte Parallelen,
 * siehe versetze() in signal-path.ts. Sie hier einzeln zu fuehren waere
 * der Fehler gewesen: Von Hand versetzte Stuetzpunkte halten den Abstand
 * nur auf den Geraden, in jeder Schraege laeuft das Buendel auseinander.
 */

/**
 * `buehne`: Hero und About stehen nebeneinander, die Naht ist senkrecht.
 * `gestapelt`: sie stehen untereinander, die Naht ist waagerecht.
 */
export type Anordnung = 'buehne' | 'gestapelt';

export interface Plan {
  mitte: Stuetzpunkt[];
}
