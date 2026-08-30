/**
 * Die harten Angaben fuer Impressum und Datenschutzerklaerung.
 *
 * Bewusst hier und nicht in den Sprachdateien: Eine Anschrift ist keine
 * Sprache. Sie steht in der deutschen und in der englischen Fassung
 * gleich, und beide Rechtstexte nennen sie. Das waeren vier Stellen, an
 * denen nach einem Umzug dieselbe Zeile geaendert werden muesste, und
 * eine davon wird vergessen. Deshalb genau eine Quelle.
 *
 * Die Datenschutzerklaerung holt sich diesen Block ueber die Marke
 * {{kontakt}} in ihren Textbausteinen, siehe privacy-policy.ts.
 */
export const ANBIETER = {
  name: 'Alexander Ruppel',
  strasse: 'Graf-Sporck-Str. 16A',
  ort: '33129 Delbrück',

  /** Wie die Nummer dasteht. */
  telefon: '+49 176 22393181',
  /** Und wie sie waehlbar ist: ohne Leerzeichen, sonst greift tel: nicht. */
  telefonRoh: '+4917622393181',

  mail: 'info@alexander-ruppel.de',
} as const;

/**
 * Stand der beiden Rechtstexte, als ISO-Datum.
 *
 * Als Datum und nicht als fertiger Text: "August 2026" heisst auf
 * Englisch anders, und zwei gepflegte Zeichenketten laufen irgendwann
 * auseinander. Die Seiten formatieren es je Sprache selbst.
 *
 * Beim naechsten Eingriff in einen der Texte mit aendern.
 */
export const STAND = '2026-08-30';

/**
 * Woher die Textbausteine stammen. Der Generator verlangt die Nennung.
 */
export const QUELLE = 'https://www.e-recht24.de';

/**
 * Der Stand, ausgeschrieben in der Sprache der Seite.
 *
 * Nicht als fertiger Text im Datenbestand: "August 2026" heisst auf
 * Englisch "August 2026", im Oktober aber "Oktober" gegen "October".
 * Zwei gepflegte Zeichenketten liefen genau dort auseinander.
 */
export function standInSprache(sprache: string): string {
  return new Intl.DateTimeFormat(sprache, {
    month: 'long',
    year: 'numeric',
  }).format(new Date(STAND));
}

/**
 * Was in den Textbausteinen der Datenschutzerklaerung fuer die Marken
 * eingesetzt wird.
 *
 * Nur die Angaben selbst, nicht ihre Beschriftungen: "Telefon" gegen
 * "Phone" ist Sprache und steht deshalb im jeweiligen Baustein.
 */
export const MARKEN: Readonly<Record<string, string>> = {
  anschrift: `${ANBIETER.name}<br>${ANBIETER.strasse}<br>${ANBIETER.ort}`,
  telefon: ANBIETER.telefon,
  mail: ANBIETER.mail,
};
