export interface StackIcon {
  /** Eigenname, wird nicht uebersetzt. */
  name: string;
  /**
   * Dateiname ohne Endung unter public/assets/icons/tech/.
   *
   * Optional, weil nicht zu jedem Eintrag ein Zeichen existiert. Bleibt es
   * leer, steht die Zelle trotzdem, damit die Namen weiter auf einer Linie
   * fluchten.
   */
  icon?: string;
}

export interface StackGroup {
  /** Teil des i18n-Keys unter stack.groups. */
  id: string;
  items: readonly StackIcon[];
}
