import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  inject,
  viewChild,
} from '@angular/core';
import { Location } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { Hero } from '../hero/hero';
import { About } from '../about/about';
import { Animations, StageControls } from '../../shared/service/animations';

/** Reihenfolge der Tafeln in der Buehne, fuer scrollFor(). */
const PANEL = { hero: 0, about: 1 } as const;

/**
 * Setzt die Startseite aus den Sektionen zusammen.
 *
 * Hero und About liegen zusaetzlich in einer Buehne: Auf grossen Bildschirmen
 * laufen sie als zwei Tafeln nebeneinander, darunter stehen sie normal
 * untereinander. Jede weitere Sektion wird unterhalb der Buehne ergaenzt und
 * traegt ihren Anker, damit die Navigation im Header sie erreicht.
 */
@Component({
  selector: 'app-home',
  imports: [Hero, About],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements AfterViewInit, OnDestroy {
  private readonly anim = inject(Animations);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly destroyRef = inject(DestroyRef);

  private readonly stage = viewChild.required<ElementRef<HTMLElement>>('stage');
  private readonly track = viewChild.required<ElementRef<HTMLElement>>('track');

  private controls?: StageControls;

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
        onPanelChange: (index) => this.spiegleTafelInUrl(index),
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
  }

  private aktuellesFragment(): string | null {
    return this.router.parseUrl(this.router.url).fragment;
  }

  /**
   * Haelt die Adresszeile am aktiven Rastpunkt.
   *
   * Bewusst ueber Location.replaceState und nicht ueber den Router: Eine
   * Navigation wuerde NavigationEnd ausloesen, das Abo oben wuerde die
   * Buehne erneut anfahren und gegen die laufende Scrollbewegung arbeiten.
   * replaceState taucht ausserdem nicht im Verlauf auf, der Zurueck-Knopf
   * fuehrt also weiterhin dorthin, wo man vorher wirklich war.
   */
  private spiegleTafelInUrl(index: number): void {
    const pfad = this.location.path(false);
    this.location.replaceState(index === PANEL.about ? `${pfad}#about` : pfad);
  }

  ngOnDestroy(): void {
    this.controls?.destroy();
  }

  private springeZuTafel(fragment: string | null): void {
    if (!this.controls?.isActive()) return;

    // Belege liegen innerhalb der About-Tafel und sind dort bereits
    // sichtbar. Sie sollen die Buehne deshalb nur halten, nicht bewegen.
    const ziel =
      fragment === 'about' || fragment?.startsWith('beleg-')
        ? PANEL.about
        : null;

    if (ziel === null) return;

    this.controls.goTo(ziel);
  }
}
