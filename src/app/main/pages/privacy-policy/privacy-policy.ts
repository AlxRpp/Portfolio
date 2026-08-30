import { HttpClient } from '@angular/common/http';
import { Component, computed, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { catchError, of, switchMap } from 'rxjs';
import { Language } from '../../shared/service/language';
import { MARKEN, standInSprache } from '../../shared/service/legal-data';

/**
 * Marken in den Textbausteinen, etwa {{anschrift}}.
 *
 * Was hier nicht getroffen wird, bleibt sichtbar im Text stehen. Genau
 * so soll es sein: Eine verschriebene Marke faellt dann beim ersten
 * Blick auf die Seite auf, statt eine Pflichtangabe still zu schlucken.
 */
const MARKE = /\{\{(\w+)\}\}/g;

@Component({
  selector: 'app-privacy-policy',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './privacy-policy.html',
})
export class PrivacyPolicy {
  private readonly http = inject(HttpClient);
  private readonly sprache = inject(Language);

  /** Der Stand in der Sprache der Seite, siehe legal-data.ts. */
  protected readonly stand = computed(() => standInSprache(this.sprache.current()));

  /**
   * Der Text, nachgeladen in der Sprache der Seite.
   *
   * Bewusst eine eigene Datei und nicht die Sprachdatei der Seite: Der
   * Text ist mit rund 18 KB je Sprache groesser als alle anderen Texte
   * des Portfolios zusammen. In de.json laege er im Startpaket jedes
   * Besuchers, obwohl ihn kaum jemand oeffnet. So kommt er nur, wenn
   * diese Seite aufgerufen wird, und nur in der gelesenen Sprache.
   */
  private readonly roh = toSignal(
    toObservable(this.sprache.current).pipe(
      switchMap((sprache) =>
        this.http
          .get(`./assets/legal/privacy.${sprache}.html`, { responseType: 'text' })
          // Faellt der Abruf aus, zeigt die Seite den Hinweis unten
          // statt einer leeren Flaeche. Ein Rechtstext, der wortlos
          // fehlt, faellt sonst erst auf, wenn jemand danach fragt.
          .pipe(catchError(() => of(''))),
      ),
    ),
    { initialValue: '' },
  );

  protected readonly geladen = computed(() => this.roh().length > 0);

  protected readonly inhalt = computed(() =>
    this.roh().replace(MARKE, (ganz, name: string) => MARKEN[name] ?? ganz),
  );
}
