import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Animations } from '../../shared/service/animations';

/** Ein Absatz des Fliesstexts, optional mit Verweis auf einen Beleg. */
interface Paragraph {
  key: string;
  note?: number;
}

/** Ein Beleg: die Quellen, die eine Aussage im Text nachpruefbar machen. */
interface Source {
  n: number;
  links: { label: string; url: string }[];
}

const GITHUB = 'https://github.com/AlxRpp';

/** Dauer des Aufleuchtens, muss zur Animation in about.scss passen. */
const HIGHLIGHT_MS = 1600;

@Component({
  selector: 'app-about',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './about.html',
  styleUrls: ['./about.scss', './about-mediaQuerrys.scss'],
})
export class About implements AfterViewInit, OnDestroy {
  private readonly anim = inject(Animations);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * Die Fussnote sitzt am Ende des Absatzes, der die Aussage traegt.
   * Absatz 1 handelt vollstaendig von den Repo-Beschreibungen, Absatz 3
   * von der HomeLab-Dokumentation.
   */
  protected readonly paragraphs: readonly Paragraph[] = [
    { key: 'about.p1', note: 1 },
    { key: 'about.p2' },
    { key: 'about.p3', note: 2 },
    { key: 'about.p4' },
  ];

  /**
   * Repo-Namen sind Eigennamen und stehen deshalb bewusst nicht in den
   * Uebersetzungsdateien.
   */
  protected readonly sources: readonly Source[] = [
    {
      n: 1,
      links: [
        { label: 'Coderr_Backend', url: `${GITHUB}/Coderr_Backend` },
        { label: 'Videoflix_Backend', url: `${GITHUB}/Videoflix_Backend` },
        { label: 'Quizly_Backend', url: `${GITHUB}/Quizly_Backend` },
        { label: 'Kanmind_Backend', url: `${GITHUB}/Kanmind_Backend` },
      ],
    },
    {
      n: 2,
      links: [{ label: 'HomeLAB', url: `${GITHUB}/HomeLAB` }],
    },
  ];

  private readonly route = inject(ActivatedRoute);

  /**
   * Welcher Beleg gerade aufleuchtet.
   *
   * Das laesst sich nicht ueber die CSS-Pseudoklasse `:target` loesen:
   * Angulars Router wechselt das Fragment per `history.pushState`, und
   * pushState aktualisiert `:target` nicht. Ohne diesen Zustand springt
   * die Seite zwar zum Beleg, aber nichts zeigt an, welcher gemeint ist.
   */
  protected readonly highlighted = signal<number | null>(null);

  private timer?: ReturnType<typeof setTimeout>;

  constructor() {
    // Faengt den Direktaufruf einer Beleg-URL ab, etwa wenn jemand
    // /#beleg-2 teilt oder als Lesezeichen oeffnet.
    this.route.fragment.pipe(takeUntilDestroyed()).subscribe((fragment) => {
      const match = fragment?.match(/^beleg-(\d+)$/);
      if (match) this.highlight(Number(match[1]));
    });
  }

  /**
   * Laesst einen Beleg kurz aufleuchten.
   *
   * Wird zusaetzlich zum Fragment-Abo direkt am Klick aufgerufen, weil
   * `ActivatedRoute.fragment` bei unveraendertem Wert nicht erneut
   * feuert. Ohne diesen Aufruf bliebe der zweite Klick auf dieselbe
   * Fussnote wirkungslos, selbst mit onSameUrlNavigation 'reload'.
   */
  protected highlight(n: number): void {
    clearTimeout(this.timer);
    this.highlighted.set(n);
    this.timer = setTimeout(() => this.highlighted.set(null), HIGHLIGHT_MS);
  }

  ngAfterViewInit(): void {
    const el = this.host.nativeElement;

    this.anim.staggerChildren(el, '[data-reveal]', {
      scroll: true,
      stagger: 0.08,
      y: 22,
    });
  }

  ngOnDestroy(): void {
    clearTimeout(this.timer);
  }
}
