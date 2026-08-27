import { Injectable, computed, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export type Lang = 'de' | 'en';

/**
 * Eigener Schlüssel, bewusst NICHT der alte `currentLanguage`.
 *
 * MyPortfolio schrieb unter diesem Namen die Werte 'ger' und 'en'. Da das
 * neue Portfolio auf denselben Ursprung deployt wird, bestimmte ein alter
 * Eintrag sonst die Sprache des neuen Portfolios mit. Eigener Schlüssel,
 * eigener Zustand.
 */
const STORAGE_KEY = 'portfolio.lang';

const DEFAULT_LANG: Lang = 'de';

/**
 * Hält die aktive Sprache als Signal und spiegelt sie in ngx-translate,
 * localStorage und das lang-Attribut des Dokuments.
 *
 * `switchable` steuert, ob Englisch überhaupt wählbar ist. Steht es auf
 * false, wird ein Wunsch nach 'en' still auf Deutsch zurückgesetzt, egal
 * ob er aus dem Header, aus localStorage oder aus der Konsole kommt.
 */
@Injectable({ providedIn: 'root' })
export class Language {
  private readonly translate = inject(TranslateService);

  private readonly _current = signal<Lang>(DEFAULT_LANG);

  readonly current = this._current.asReadonly();
  readonly isGerman = computed(() => this._current() === DEFAULT_LANG);

  /**
   * Steht auf true, sobald en.json jeden Key aus de.json trägt. Beim
   * Ergänzen einer Sektion müssen deshalb IMMER beide Dateien wachsen,
   * sonst zeigt Englisch dort deutsche Fallback-Texte.
   */
  readonly switchable = signal(true);

  /** Nur was hier drin steht, darf überhaupt gesetzt werden. */
  private readonly available = computed<readonly Lang[]>(() =>
    this.switchable() ? ['de', 'en'] : ['de'],
  );

  constructor() {
    this.use(this.read() ?? DEFAULT_LANG);
  }

  use(lang: Lang): void {
    // Ein nicht verfügbarer Wunsch fällt still auf Deutsch zurück, statt
    // eine leere Seite zu rendern.
    const next = this.available().includes(lang) ? lang : DEFAULT_LANG;

    this._current.set(next);
    this.translate.use(next);
    this.write(next);
    document.documentElement.lang = next;
  }

  toggle(): void {
    this.use(this.isGerman() ? 'en' : 'de');
  }

  /** localStorage kann im privaten Modus werfen, dann still auf Default. */
  private read(): Lang | null {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      return v === 'de' || v === 'en' ? v : null;
    } catch {
      return null;
    }
  }

  private write(lang: Lang): void {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* kein persistenter Speicher verfügbar, nicht kritisch */
    }
  }
}
