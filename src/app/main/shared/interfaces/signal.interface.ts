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
   * Direkt verbinden, in einer geraden Strecke unter beliebigem Winkel.
   *
   * Sonst zerlegt der Pfadbauer jede Strecke in Segmente von 0, 45 oder
   * 90 Grad. Das ist die Regel und soll es bleiben. Der lange Weg vom
   * rechten Rand zur Mitte von Projects ist die Ausnahme: Zerlegt braucht
   * er zwei Ecken, und bei sieben Linien spreizt jede das Buendel um
   * seine ganze Breite. Zwei davon kurz hintereinander sehen aus wie ein
   * Treppenhaufen. Eine gerade Strecke hat nur eine Ecke.
   */
  direkt?: boolean;
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

/**
 * Ein Buendel: EINE Mittellinie und die Zahl ihrer Parallelen.
 *
 * Die sichtbaren Linien entstehen daraus per versetze() in
 * signal-path.ts. Sie einzeln zu fuehren waere der Fehler: Von Hand
 * versetzte Stuetzpunkte halten den Abstand nur auf den Geraden, in
 * jeder Schraege laeuft das Buendel auseinander.
 */
export interface Strang {
  /**
   * Kennung. `haupt` traegt den Durchgangsverkehr der Kette, alles
   * andere sind Zweige, die irgendwo abgehen und dort enden.
   */
  id: string;
  mitte: Stuetzpunkt[];
  /** Wie viele Parallelen. Rueckgrat sieben, ein Zweig genau eine. */
  anzahl: number;
  /**
   * Eckenradius in Pixeln. Ohne Angabe scharfe Gehrungen.
   *
   * Nur fuer einlinige Straenge sinnvoll: Ein Buendel braeuchte je Linie
   * einen eigenen Radius, damit die Boegen konzentrisch bleiben. Ein
   * Zweig hat nur eine Linie, dort geht es.
   */
  radius?: number;
  /**
   * Laenge des Trichters am Ende, in Pixeln. Ohne Angabe laeuft das
   * Buendel bis zuletzt parallel.
   *
   * Auf dieser letzten Strecke geben die Parallelen ihren Abstand auf
   * und laufen konisch auf den Endpunkt der Mittellinie zu. Das ist die
   * einzige Stelle im Netz, an der das Buendel NICHT parallel laeuft,
   * und sie ist als Ausnahme gemeint: Sie muendet in ein Ziel, das
   * schmaler ist als das Buendel breit.
   *
   * Zwei Bedingungen gehoeren dazu. Der Trichter braucht ein letztes
   * Segment, das laenger ist als er selbst, sonst wird er gekappt. Und
   * er darf nicht an einer Naht liegen: Die Parallelen stehen dort nicht
   * mehr senkrecht auf der Laufrichtung, die Nachbarsektion traefe sie
   * nicht. Er gehoert ans ENDE der Kette, nicht an ihre Fugen.
   */
  trichter?: number;
}

/**
 * Der Plan einer Sektion. Mehrere Straenge, weil Zweige ein Baum sind
 * und keine Linie.
 */
export interface Plan {
  straenge: Strang[];
}

/**
 * Wo ein Zweig hin soll: die Hoehe in Pixeln ab Sektionsoberkante und
 * die Seite.
 *
 * Diese Werte werden als einzige gemessen statt gerechnet. Die Karten
 * sind je nach Inhalt verschieden hoch, ihre Lage laesst sich also nicht
 * aus Bruchteilen ableiten, und ein Zweig, der seine Karte verfehlt,
 * sieht kaputt aus. Gemessen wird per ResizeObserver, nicht ueber
 * ScrollTrigger.
 */
export interface Anker {
  /** Oberkante der Karte, in Pixeln ab Sektionsoberkante. */
  oben: number;
  /**
   * Waagerechter Abstand des Ziels von der Linie, an der das Buendel in
   * dieser Sektion gerade laeuft, mit Vorzeichen.
   *
   * In Projects ist das die Mittellinie, in Contact die Schiene am
   * linken Rand. Bewusst relativ und nicht absolut: Der Plan rechnet in
   * Versaetzen zu einem Bezugspunkt, eine absolute Koordinate waere dort
   * um dessen Lage daneben. Nebenbei steckt damit auch die Seite schon
   * im Vorzeichen.
   */
  nah: number;
}
