import { Location } from '@angular/common';
import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  inject,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { Hero } from '../hero/hero';
import { About } from '../about/about';
import { HowIWork } from '../how-i-work/how-i-work';
import { Projects } from '../projects/projects';
import { Stack } from '../stack/stack';
import { Animations, StageControls } from '../../shared/service/animations';

/** Reihenfolge der Tafeln in der Buehne. */
const PANEL = { hero: 0, about: 1 } as const;

/** Anker der About-Tafel, die als einzige Tafel einen Hash traegt. */
const ABOUT_HASH = 'about';

/**
 * Setzt die Startseite aus den Sektionen zusammen.
 *
 * Hero und About liegen zusaetzlich in einer Buehne: Auf grossen Bildschirmen
 * laufen sie als zwei Tafeln nebeneinander, darunter stehen sie normal
 * untereinander. Alle weiteren Sektionen folgen unterhalb der Buehne und
 * werden von der Adresszeile automatisch mit erfasst.
 */
@Component({
  selector: 'app-home',
  imports: [Hero, About, HowIWork, Projects, Stack],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements AfterViewInit, OnDestroy {
  private readonly anim = inject(Animations);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  private readonly stage = viewChild.required<ElementRef<HTMLElement>>('stage');
  private readonly track = viewChild.required<ElementRef<HTMLElement>>('track');

  private controls?: StageControls;
  private aktiveTafel: number = PANEL.hero;
  private zuletztGeschriebenerHash: string | null = null;

  ngAfterViewInit(): void {
    // Die Schwelle steht in _tokens.scss und wird in styles.scss als
    // CSS-Variable ausgegeben. So nutzen Media Query und ScrollTrigger
    // garantiert dieselben Werte.
    const wurzel = getComputedStyle(document.documentElement);
    const minWidth = parseFloat(wurzel.getPropertyValue('--stage-min-width'));
    const minHeight = parseFloat(wurzel.getPropertyValue('--stage-min-height'));

    this.controls = this.anim.horizontalStage(
      this.stage().nativeElement,
      this.track().nativeElement,
      {
        minWidth,
        minHeight,
        onPanelChange: (index) => {
          this.aktiveTafel = index;
          this.aktualisiereHash();
        },
      },
    );

    // Solange die Buehne laeuft, liegt About seitlich versetzt in einem
    // gehefteten Container. Das normale Ankerscrollen wuerde dort die
    // falsche Position berechnen, deshalb springen wir selbst.
    //
    // Bewusst ueber die Router-Ereignisse und nicht ueber
    // ActivatedRoute.fragment: Das Fragment entprellt identische Werte.
    // Steht die URL bereits auf #about, weil jemand dorthin navigiert und
    // danach von Hand zurueckgescrollt ist, feuert es beim erneuten Klick
    // auf denselben Navigationspunkt kein zweites Mal. Die Navigation
    // waere dann tot, bis man eine andere Sektion anspringt. NavigationEnd
    // feuert dagegen bei jeder Navigation, auch bei gleicher URL, weil
    // onSameUrlNavigation in app.config.ts auf 'reload' steht.
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.springeZuTafel(this.aktuellesFragment()));

    // Die erste Navigation ist zu diesem Zeitpunkt bereits gelaufen, ein
    // direkt aufgerufenes /#about wuerde das Abo oben also verpassen.
    this.springeZuTafel(this.aktuellesFragment());

    this.beobachteScrollposition();
    this.vermesseAusloeserNeu();
  }

  /**
   * Vermisst alle ScrollTrigger neu, nachdem die Buehne steht.
   *
   * Die Sektionen unterhalb erzeugen ihre Ausloeser in ihrem eigenen
   * ngAfterViewInit, und das laeuft in Angular beim Kind VOR dem
   * Elternteil. Sie vermessen das Dokument also, bevor die Buehne gepinnt
   * ist, und rechnen mit einer um eine Bildschirmhoehe zu kurzen Seite.
   * Ohne diese Neuvermessung blenden sie sich deutlich zu frueh ein.
   *
   * Der zweite Durchgang nach dem Laden der Schriften faengt zusaetzlich
   * die Verschiebung ab, die entsteht, wenn die Ersatzschrift gegen die
   * echte getauscht wird.
   */
  private vermesseAusloeserNeu(): void {
    this.anim.refresh();

    // Zwei Frames nach dem Laden der Schriften, nicht sofort: fonts.ready
    // loest auf, BEVOR der Browser mit der echten Schrift neu umbrochen
    // hat. Vermisst man in dem Moment, sind alle Zeilen noch so hoch wie
    // in der Ersatzschrift und saemtliche Positionen darunter zu niedrig.
    void document.fonts.ready.then(() => this.nachZweiFrames());

    // Und ein letztes Mal, wenn wirklich alles geladen ist.
    if (document.readyState !== 'complete') {
      window.addEventListener('load', () => this.nachZweiFrames(), {
        once: true,
      });
    }
  }

  private nachZweiFrames(): void {
    requestAnimationFrame(() =>
      requestAnimationFrame(() => this.anim.refresh()),
    );
  }

  ngOnDestroy(): void {
    this.controls?.destroy();
  }

  private aktuellesFragment(): string | null {
    return this.router.parseUrl(this.router.url).fragment;
  }

  private springeZuTafel(fragment: string | null): void {
    if (!this.controls?.isActive()) return;

    // Belege liegen innerhalb der About-Tafel und sind dort bereits
    // sichtbar. Sie sollen die Buehne deshalb nur halten, nicht bewegen.
    const ziel =
      fragment === ABOUT_HASH || fragment?.startsWith('beleg-')
        ? PANEL.about
        : null;

    if (ziel === null) return;

    this.controls.goTo(ziel);
  }

  // --- Adresszeile ---------------------------------------------------

  /**
   * Haelt die Adresszeile an der Sektion, die gerade im Blick ist.
   *
   * Bewusst aus der Scrollposition berechnet und nicht nur aus dem
   * Tafelwechsel der Buehne: Sonst bliebe nach dem Verlassen der Buehne
   * dauerhaft #about stehen, obwohl laengst eine andere Sektion zu sehen
   * ist. So werden auch alle spaeter ergaenzten Sektionen ohne weiteres
   * Zutun mit erfasst.
   */
  private beobachteScrollposition(): void {
    let angefordert = false;

    const beiScroll = () => {
      if (angefordert) return;
      angefordert = true;
      requestAnimationFrame(() => {
        angefordert = false;
        this.aktualisiereHash();
      });
    };

    window.addEventListener('scroll', beiScroll, { passive: true });
    this.destroyRef.onDestroy(() =>
      window.removeEventListener('scroll', beiScroll),
    );

    this.aktualisiereHash();
  }

  private aktualisiereHash(): void {
    const mitte = window.innerHeight / 2;
    const buehne = this.stage().nativeElement;

    // Solange die Buehne den Bildschirm ausfuellt, entscheidet die Tafel,
    // denn beide Tafeln teilen sich dieselbe Scrollstrecke.
    if (this.controls?.isActive() && this.schneidetMitte(buehne, mitte)) {
      this.schreibeHash(
        this.aktiveTafel === PANEL.about ? ABOUT_HASH : null,
      );
      return;
    }

    const treffer = this.abschnitte().find((el) =>
      this.schneidetMitte(el, mitte),
    );
    this.schreibeHash(treffer?.id ?? null);
  }

  private schneidetMitte(el: Element, mitte: number): boolean {
    const r = el.getBoundingClientRect();
    return r.top <= mitte && r.bottom > mitte;
  }

  /**
   * Alle Sektionen mit Anker. Laeuft die Buehne horizontal, sind Hero und
   * About darin gebunden und werden oben gesondert behandelt; steht die
   * Seite vertikal, zaehlen sie als ganz normale Sektionen mit.
   */
  private abschnitte(): HTMLElement[] {
    const alle = [
      ...this.host.nativeElement.querySelectorAll<HTMLElement>('section[id]'),
    ];

    if (!this.controls?.isActive()) return alle;

    const buehne = this.stage().nativeElement;
    return alle.filter((el) => !buehne.contains(el));
  }

  /**
   * Schreibt den Hash ueber Location.replaceState und nicht ueber den
   * Router: Eine Navigation wuerde NavigationEnd ausloesen, das Abo oben
   * wuerde die Buehne erneut anfahren und gegen die laufende
   * Scrollbewegung arbeiten. replaceState taucht ausserdem nicht im
   * Verlauf auf, der Zurueck-Knopf fuehrt also weiterhin dorthin, wo man
   * vorher wirklich war.
   */
  private schreibeHash(id: string | null): void {
    if (id === this.zuletztGeschriebenerHash) return;
    this.zuletztGeschriebenerHash = id;

    const pfad = this.location.path(false);
    this.location.replaceState(id ? `${pfad}#${id}` : pfad);
  }
}
