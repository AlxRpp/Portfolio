/**
 * Was an einem Projekt gerade zutrifft. Steuert Punktfarbe und Beschriftung.
 */
export type ProjectStatus = 'live' | 'ongoing' | 'archived';

/**
 * Reiter, unter dem ein Projekt einsortiert ist. Jedes Projekt gehoert in
 * genau eine Kategorie, damit die Auswahl eindeutig bleibt und aus einem
 * Projekt immer auf seinen Reiter geschlossen werden kann.
 */
export type ProjectCategory = 'current' | 'work' | 'backend' | 'frontend';

export interface Project {
  slug: string;

  category: ProjectCategory;

  /** Eigenname, wird nicht uebersetzt. */
  title: string;

  status: ProjectStatus;
  year: number;


  /**
   * Kundenprojekt unter Verschwiegenheitspflicht. Ist das gesetzt, werden
   * weder Links noch Bilder gerendert, sondern der Hinweis darauf. Die
   * Regel steht an genau dieser Stelle, damit sie nicht in jedem Template
   * einzeln beachtet werden muss.
   */
  confidential: boolean;

  /** Eigennamen, werden nicht uebersetzt. */
  tech: readonly string[];

  liveUrl?: string;
  repoUrl?: string;

  /**
   * Kurzschluessel fuer beide Texte: die Beschreibung steht unter
   * projects.items.<key>, die technische Umsetzung unter
   * projects.impl.<key>. Ein Schluessel statt zwei, damit sie nicht
   * auseinanderlaufen koennen.
   */
  descriptionKey: string;

  /**
   * Dateiname eines Screenshots unter assets/images/projects.
   *
   * Optional: Wo keiner vorliegt, zeigt die Karte eine Flaeche in
   * Markenfarbe statt eines Platzhalterbildes.
   *
   * Bei `confidential` wird das Feld NICHT ausgewertet. Die Sperre sitzt
   * im Template, damit ein spaeter nachgetragenes Bild ein Kundenprojekt
   * nicht versehentlich zeigt.
   */
  image?: string;

  /**
   * i18n-Key eines Hinweises zum Umfang, etwa dass das Frontend vorgegeben
   * war. Steht bewusst als eigenes Feld und nicht im Fliesstext, damit es
   * sichtbar bleibt und nicht beim Kuerzen verlorengeht.
   */
  scopeKey?: string;
}
