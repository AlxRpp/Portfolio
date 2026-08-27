import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import {
  provideRouter,
  withInMemoryScrolling,
  withRouterConfig,
} from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withFetch()),

    // Deutsch ist Ausgangssprache und zugleich Fallback: fehlt ein Key
    // in en.json, erscheint der deutsche Text statt einer Lücke. Leere
    // Strings gelten dagegen als gültiger Wert und greifen den Fallback
    // NICHT ab, deshalb gehört in en.json entweder Übersetzung oder nichts.
    provideTranslateService({
      loader: provideTranslateHttpLoader({
        prefix: './assets/i18n/',
        suffix: '.json',
      }),
      lang: 'de',
      fallbackLang: 'de',
    }),

    provideRouter(
      routes,
      withInMemoryScrolling({
        anchorScrolling: 'enabled',
        scrollPositionRestoration: 'enabled',
      }),
      // Ohne 'reload' verwirft der Router eine Navigation auf exakt
      // dieselbe URL. Ein zweiter Klick auf denselben Ankerlink bliebe
      // dann wirkungslos: kein erneutes Scrollen und kein erneutes
      // Aufleuchten des Belegs in der About-Sektion.
      withRouterConfig({ onSameUrlNavigation: 'reload' }),
    ),
  ],
};
