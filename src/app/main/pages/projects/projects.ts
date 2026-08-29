import { Location } from '@angular/common';
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
import { TranslatePipe } from '@ngx-translate/core';
import {
  Project,
  ProjectCategory,
} from '../../shared/interfaces/project.interface';
import { ProjectsData } from '../../shared/service/projects-data';
import { Animations } from '../../shared/service/animations';
import type { Anker } from '../../shared/interfaces/signal.interface';
import { Signals } from '../../shared/service/signals';
import { SignalLayer } from '../../shared/signal-layer/signal-layer';

/** Suchparameter, in dem das gewaehlte Projekt in der Adresszeile steht. */
const URL_PARAM = 'p';

/**
 * Wie lange eine Karte nachleuchtet, wenn ein Punkt sie trifft.
 * Muss zur Animation karte-atmen in projects.scss passen.
 */
const PULS_MS = 1600;

/**
 * Reihenfolge der Zweige am Rueckgrat, von oben nach unten.
 *
 * Bewusst nicht die Reihenfolge aus dem Interface: Sie erzaehlt einen
 * Weg. Erst was im Job entstanden ist, dann was gerade laeuft, danach
 * die beiden Seiten der eigenen Arbeit.
 */
const ZWEIGE: readonly ProjectCategory[] = [
  'work',
  'current',
  'backend',
  'frontend',
];

@Component({
  selector: 'app-projects',
  imports: [TranslatePipe, SignalLayer],
  templateUrl: './projects.html',
  styleUrls: ['./projects.scss', './projects-mediaQuerrys.scss'],
})
export class Projects implements AfterViewInit {
  protected readonly data = inject(ProjectsData);
  protected readonly signale = inject(Signals);
  private readonly anim = inject(Animations);
  private readonly location = inject(Location);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  private readonly modal = viewChild<ElementRef<HTMLDialogElement>>('modal');
  private readonly strang = viewChild<ElementRef<HTMLElement>>('strang');

  /**
   * Wo die Zweige hin sollen: die Mitte jeder Karte und ihre Seite.
   *
   * Als einziges gemessen statt gerechnet. Die Karten sind je nach
   * Inhalt verschieden hoch, ihre Lage laesst sich also nicht aus
   * Bruchteilen ableiten, und ein Zweig, der seine Karte verfehlt, sieht
   * kaputt aus.
   */
  protected readonly anker = signal<readonly Anker[]>([]);

  /**
   * Welche Karte gerade aufleuchtet, waehrend der Punkt ihren Rand
   * abfaehrt. Nur eine zur Zeit: Kaeme wirklich einmal ein zweiter Punkt
   * dazu, gewinnt der neuere, und das faellt niemandem auf.
   */
  protected readonly leuchtet = signal<number | null>(null);

  private aus?: ReturnType<typeof setTimeout>;

  /**
   * Der Signal-Layer meldet, dass ein Punkt an einer Karte angekommen
   * ist. Er kennt nur Geometrie und weiss nichts von Karten, deshalb
   * kommt die Zuordnung hier.
   */
  protected beiAnkunft(zweig: number): void {
    clearTimeout(this.aus);
    this.leuchtet.set(zweig);
    // Etwas laenger als die Animation, damit die Klasse nicht mitten
    // darin abfaellt und der Schein hart abbricht.
    this.aus = setTimeout(() => this.leuchtet.set(null), PULS_MS + 100);
  }

  /** Welches Projekt im Modal steht. Leer heisst: Modal zu. */
  private readonly gewaehlt = signal('');

  protected readonly aktives = computed(() =>
    this.data.getBySlug(this.gewaehlt()),
  );

  protected readonly gruppen = computed(() =>
    ZWEIGE.map((kategorie) => ({
      kategorie,
      projekte: this.data.byCategory(kategorie),
    })),
  );

  constructor() {
    this.folgeAuswahlAusUrl();
  }

  // --- Modal ---------------------------------------------------------

  protected oeffne(p: Project): void {
    this.gewaehlt.set(p.slug);
    this.schreibeAuswahlInUrl(p.slug);

    // Erst im naechsten Frame: showModal auf einem Dialog, dessen Inhalt
    // Angular noch nicht gezeichnet hat, oeffnet ein leeres Fenster.
    requestAnimationFrame(() => {
      const d = this.modal()?.nativeElement;
      if (d && !d.open) d.showModal();
    });
  }

  protected schliesse(): void {
    this.modal()?.nativeElement.close();
  }

  /**
   * Laeuft auch, wenn der Dialog ueber Escape oder den Hintergrund
   * geschlossen wird. Deshalb wird hier aufgeraeumt und nicht in
   * schliesse(), sonst blieben Auswahl und Adresszeile stehen.
   */
  protected beimSchliessen(): void {
    this.gewaehlt.set('');
    this.schreibeAuswahlInUrl('');
  }

  // --- Zustand in der Adresszeile ------------------------------------

  /**
   * Das gewaehlte Projekt steht als Suchparameter in der Adresszeile,
   * nicht im Anker: Den Anker schreibt bereits die Sektionsverfolgung in
   * home.ts, beide wuerden sich sonst gegenseitig ueberschreiben.
   */
  private schreibeAuswahlInUrl(slug: string): void {
    const url = new URL(window.location.href);
    if (slug) url.searchParams.set(URL_PARAM, slug);
    else url.searchParams.delete(URL_PARAM);
    this.location.replaceState(url.pathname + url.search + url.hash);
  }

  /**
   * Uebernimmt eine Auswahl, die von aussen kommt, etwa aus den Belegen
   * der About-Sektion.
   *
   * Bewusst ueber NavigationEnd und nicht ueber queryParamMap: Die
   * Auswahl innerhalb der Sektion wird per Location.replaceState
   * geschrieben, davon erfaehrt der Router nichts. Sein Parameterstrom
   * liefe damit auseinander mit dem, was wirklich in der Adresszeile
   * steht. window.location ist hier die verlaessliche Quelle.
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
        if (projekt && projekt.slug !== this.gewaehlt()) this.oeffne(projekt);
      });
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
   * Pfad zum Bildschirmfoto, oder nichts.
   *
   * Die Sperre fuer Kundenprojekte sitzt hier und nicht im Template:
   * Traegt jemand spaeter ein Bild nach, ohne an die
   * Verschwiegenheitspflicht zu denken, wird es trotzdem nicht gezeigt.
   */
  protected bild(p: Project): string | null {
    if (p.confidential || !p.image) return null;
    return `/assets/images/projects/${p.image}`;
  }

  /**
   * Haelt die Ankerpunkte aktuell.
   *
   * Ein ResizeObserver auf der Sektion UND auf jeder Karte: Aendert eine
   * Karte ihre Hoehe, etwa weil die echte Schrift nachgeladen wurde,
   * verschiebt das alle darunter. Nur die Sektion zu beobachten reichte
   * nicht, wenn sich deren Gesamthoehe dabei zufaellig nicht aendert.
   */
  private beobachteKarten(): void {
    const sektion = this.host.nativeElement.querySelector<HTMLElement>('.projects');
    const wurzel = this.strang()?.nativeElement;
    if (!sektion || !wurzel) return;

    const messen = () => {
      const s = sektion.getBoundingClientRect();
      // Bezug ist die Mittellinie, dort laeuft das Rueckgrat.
      const mitte = s.left + s.width / 2;
      const karten = [...wurzel.querySelectorAll<HTMLElement>('[data-karte]')];

      // Der Zweig trifft die obere Ecke, die zu den Bahnen zeigt.
      //
      // Dort ist keine Korrektur fuer die Schraege noetig: Bei beiden
      // Neigungsrichtungen liegt genau diese Ecke auf der Ecke des
      // rechteckigen Kastens, die Schraege wirkt sich erst nach unten
      // hin aus.
      this.anker.set(
        karten.map((karte) => {
          const r = karte.getBoundingClientRect();
          const linksHerum = r.right <= mitte;
          return {
            oben: r.top - s.top,
            nah: (linksHerum ? r.right : r.left) - mitte,
          };
        }),
      );
    };

    const beobachter = new ResizeObserver(messen);
    beobachter.observe(sektion);
    for (const karte of wurzel.querySelectorAll('[data-karte]')) {
      beobachter.observe(karte);
    }
    this.destroyRef.onDestroy(() => beobachter.disconnect());
    this.destroyRef.onDestroy(() => clearTimeout(this.aus));

    messen();
  }

  ngAfterViewInit(): void {
    const el = this.host.nativeElement;

    this.beobachteKarten();

    this.anim.staggerChildren(el, '.projects__head [data-reveal]', {
      scroll: true,
      stagger: 0.08,
      y: 20,
    });

    // Die Karten schieben sich vom Bildschirmrand herein, jede von der
    // Seite, an der ihr Zweig sie haelt.
    //
    // Bewegt wird die innere Flaeche, NICHT das Element mit data-karte.
    // Dessen Kasten wird vermessen, damit der Zweig seine Ecke trifft,
    // und getBoundingClientRect rechnet Transformationen mit: Waehrend
    // des Hereinschiebens laege der Anker sonst weit daneben, und die
    // Linie zeigte ins Leere.
    //
    // Weil der Anker stillsteht, dockt die Flaeche am Ende von selbst
    // genau an der Verbindung an.
    this.anim.slideVomRand(
      el,
      '.projects__zweig.is-links .projects__flaeche',
      true,
    );
    this.anim.slideVomRand(
      el,
      '.projects__zweig:not(.is-links) .projects__flaeche',
      false,
    );
  }
}
