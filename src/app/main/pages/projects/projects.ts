import { Location, NgTemplateOutlet } from '@angular/common';
import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  Project,
  ProjectCategory,
  ProjectDuration,
} from '../../shared/interfaces/project.interface';
import { ProjectsData } from '../../shared/service/projects-data';
import { Animations } from '../../shared/service/animations';

/** Suchparameter, in dem das gewaehlte Projekt in der Adresszeile steht. */
const URL_PARAM = 'p';

@Component({
  selector: 'app-projects',
  imports: [TranslatePipe, NgTemplateOutlet],
  templateUrl: './projects.html',
  styleUrls: ['./projects.scss', './projects-mediaQuerrys.scss'],
})
export class Projects implements AfterViewInit {
  protected readonly data = inject(ProjectsData);
  private readonly anim = inject(Animations);
  private readonly translate = inject(TranslateService);
  private readonly location = inject(Location);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly categories: readonly ProjectCategory[] = [
    'current',
    'work',
    'backend',
    'frontend',
  ];

  protected readonly activeCategory = signal<ProjectCategory>('current');
  protected readonly activeSlug = signal('');

  /**
   * true, sobald Liste und Detail nebeneinander passen. Darunter erscheint
   * das Detail als Aufklapper direkt unter dem angetippten Eintrag, weil
   * drei Bereiche nebeneinander auf einem Handy nicht funktionieren.
   */
  protected readonly breit = signal(false);

  protected readonly liste = computed(() =>
    this.data.byCategory(this.activeCategory()),
  );

  protected readonly aktives = computed(() =>
    this.data.getBySlug(this.activeSlug()),
  );

  private readonly listenBalken =
    viewChild<ElementRef<HTMLElement>>('listenBalken');
  private readonly reiterBalken =
    viewChild<ElementRef<HTMLElement>>('reiterBalken');

  constructor() {
    this.beobachteBreite();
    this.stelleAuswahlHer();
    this.folgeAuswahlAusUrl();
  }

  // --- Auswahl -------------------------------------------------------

  protected waehleKategorie(category: ProjectCategory): void {
    if (category === this.activeCategory()) return;
    this.activeCategory.set(category);

    // Beim Reiterwechsel das erste Projekt der Kategorie zeigen, damit die
    // Detailflaeche nie leer steht.
    const erstes = this.data.byCategory(category)[0];
    if (erstes) this.waehleProjekt(erstes.slug);
    else this.nachDemZeichnen(() => this.setzeBalken(true));
  }

  protected waehleProjekt(slug: string): void {
    const gewechselt = slug !== this.activeSlug();
    this.activeSlug.set(slug);
    this.schreibeAuswahlInUrl(slug);

    this.nachDemZeichnen(() => {
      this.setzeBalken(true);
      if (gewechselt) this.baueDetailAuf();
    });
  }

  /**
   * Fuehrt etwas aus, nachdem Angular die Aenderung gezeichnet hat. Ohne
   * das misst Flip noch die alten Positionen.
   */
  private nachDemZeichnen(fn: () => void): void {
    requestAnimationFrame(() => requestAnimationFrame(fn));
  }

  /**
   * Pfeiltasten im Reiterband, wie es die WAI-ARIA-Praxis fuer Tabs
   * vorsieht. Ohne das waeren die Reiter nur mit der Maus bedienbar.
   */
  protected onTabKey(event: KeyboardEvent): void {
    const schritt =
      event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;

    if (schritt === 0) {
      if (event.key === 'Home') this.springeZuReiter(0);
      else if (event.key === 'End') this.springeZuReiter(this.categories.length - 1);
      else return;
    } else {
      const i = this.categories.indexOf(this.activeCategory());
      const ziel = (i + schritt + this.categories.length) % this.categories.length;
      this.springeZuReiter(ziel);
    }

    event.preventDefault();
  }

  private springeZuReiter(index: number): void {
    const category = this.categories[index];
    this.waehleKategorie(category);
    this.host.nativeElement
      .querySelector<HTMLButtonElement>(`#tab-${category}`)
      ?.focus();
  }

  // --- Zustand in der Adresszeile ------------------------------------

  /**
   * Das gewaehlte Projekt steht als Suchparameter in der Adresszeile,
   * nicht im Anker: Den Anker schreibt bereits die Sektionsverfolgung in
   * home.ts, beide wuerden sich sonst gegenseitig ueberschreiben.
   */
  private schreibeAuswahlInUrl(slug: string): void {
    const url = new URL(window.location.href);
    url.searchParams.set(URL_PARAM, slug);
    this.location.replaceState(url.pathname + url.search + url.hash);
  }

  /**
   * Uebernimmt eine Auswahl, die von aussen kommt, etwa aus den Belegen
   * der About-Sektion.
   *
   * Bewusst ueber NavigationEnd und nicht ueber queryParamMap: die Auswahl
   * innerhalb der Sektion wird per Location.replaceState geschrieben,
   * davon erfaehrt der Router nichts. Sein Parameterstrom liefe damit
   * auseinander mit dem, was wirklich in der Adresszeile steht.
   * window.location ist hier die verlaessliche Quelle.
   *
   * Ohne Projekt in der Adresszeile passiert nichts: ein Sprung auf
   * #projects aus der Navigation darf die getroffene Auswahl nicht
   * zuruecksetzen.
   */
  private folgeAuswahlAusUrl(): void {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        const ausUrl = new URLSearchParams(window.location.search).get(URL_PARAM);
        const projekt = ausUrl ? this.data.getBySlug(ausUrl) : undefined;
        if (!projekt || projekt.slug === this.activeSlug()) return;

        // Ueber waehleProjekt statt ueber die Signale direkt, damit
        // Reiterbalken und Detailflaeche mitgezogen werden.
        this.activeCategory.set(projekt.category);
        this.waehleProjekt(projekt.slug);
      });
  }

  private stelleAuswahlHer(): void {
    const ausUrl = new URLSearchParams(window.location.search).get(URL_PARAM);
    const projekt = ausUrl ? this.data.getBySlug(ausUrl) : undefined;

    if (projekt) {
      this.activeCategory.set(projekt.category);
      this.activeSlug.set(projekt.slug);
      return;
    }

    const erstes = this.data.byCategory(this.activeCategory())[0];
    if (erstes) this.activeSlug.set(erstes.slug);
  }

  // --- Breite --------------------------------------------------------

  private beobachteBreite(): void {
    const wurzel = getComputedStyle(document.documentElement);
    const schwelle = parseFloat(wurzel.getPropertyValue('--bp-tablet-lg'));
    const mq = window.matchMedia(`(min-width: ${schwelle}px)`);

    this.breit.set(mq.matches);

    const beiWechsel = (e: MediaQueryListEvent) => this.breit.set(e.matches);
    mq.addEventListener('change', beiWechsel);
    this.destroyRef.onDestroy(() => mq.removeEventListener('change', beiWechsel));
  }

  // --- i18n-Keys -----------------------------------------------------

  protected beschreibung(p: Project): string {
    return `projects.items.${p.descriptionKey}`;
  }

  protected umsetzung(p: Project): string {
    return `projects.impl.${p.descriptionKey}`;
  }

  protected umfang(p: Project): string {
    return `projects.scope.${p.scopeKey}`;
  }

  protected statusLabel(p: Project): string {
    return `projects.status.${p.status}`;
  }

  /**
   * Einheit der Dauer in Einzahl oder Mehrzahl. Ohne das steht bei einer
   * Woche "1 Wochen" auf der Seite.
   */
  protected dauerEinheit(d: ProjectDuration): string {
    const einzahl = d.value === 1;
    const key =
      d.unit === 'days'
        ? einzahl
          ? 'day'
          : 'days'
        : einzahl
          ? 'week'
          : 'weeks';
    return `projects.durationUnit.${key}`;
  }

  // --- Bewegung ------------------------------------------------------

  /** Schiebt Auswahlbalken und Reiter-Unterstreichung an ihren Platz. */
  private setzeBalken(animiert: boolean): void {
    const el = this.host.nativeElement;

    const eintrag = el.querySelector<HTMLElement>('.projects__item.is-active');
    const listenBalken = this.listenBalken()?.nativeElement;
    if (eintrag && listenBalken) {
      this.anim.moveHighlight(listenBalken, eintrag, animiert);
    }

    const reiter = el.querySelector<HTMLElement>('.projects__tab.is-active');
    const reiterBalken = this.reiterBalken()?.nativeElement;
    if (reiter && reiterBalken) {
      this.anim.moveUnderline(reiterBalken, reiter, animiert);
    }
  }

  /** Laesst die Bloecke der Detailflaeche nacheinander einlaufen. */
  private baueDetailAuf(): void {
    const panel = this.host.nativeElement.querySelector('.projects__panel');
    if (!panel) return;

    this.anim.revealBlocks(panel, '[data-block]');

    const dauer = this.aktives()?.duration;
    const zahl = panel.querySelector<HTMLElement>('[data-duration]');
    const einheit = panel.querySelector<HTMLElement>('.projects__duration-unit');
    if (!zahl || !dauer) return;

    this.anim.counterUp(zahl, dauer.value, {
      duration: 0.7,
      delay: 0.25,
      // Einheit laeuft mit, sonst steht beim Zaehlen kurz "1 Wochen".
      onValue: (wert) => {
        if (!einheit) return;
        einheit.textContent = this.translate.instant(
          this.dauerEinheit({ value: wert, unit: dauer.unit }),
        );
      },
    });
  }

  ngAfterViewInit(): void {
    const el = this.host.nativeElement;

    this.anim.staggerChildren(el, '.projects__head [data-reveal]', {
      scroll: true,
      stagger: 0.08,
      y: 20,
    });

    this.anim.revealEach(el, '.projects__browser', { y: 28, duration: 0.6 });

    // Erster Aufbau ohne Bewegung, danach folgt der Balken jedem Klick.
    this.nachDemZeichnen(() => this.setzeBalken(false));

    // Und noch einmal, sobald die echte Schrift steht. Bis dahin sind die
    // Reiter in der Ersatzschrift breiter, der Balken saesse sonst
    // dauerhaft auf den Maszen von vorher.
    void document.fonts.ready.then(() =>
      this.nachDemZeichnen(() => this.setzeBalken(false)),
    );

    // Bei Groessenaenderung sitzt der Balken sonst auf der alten Stelle.
    const beiResize = () => this.nachDemZeichnen(() => this.setzeBalken(false));
    window.addEventListener('resize', beiResize, { passive: true });
    this.destroyRef.onDestroy(() =>
      window.removeEventListener('resize', beiResize),
    );
  }
}
