import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Animations } from '../../shared/service/animations';

/** Ein Stueck Fliesstext, optional gefolgt von einer Belegziffer. */
interface Segment {
  text: string;
  note?: number;
}

interface Absatz {
  key: string;
  segmente: readonly Segment[];
}

/**
 * Ein Beleg: ein Themenfeld aus dem Text und die Projekte, die es
 * nachpruefbar machen.
 */
interface Beleg {
  n: number;
  titleKey: string;
  projekte: readonly { label: string; slug: string }[];
}

/**
 * Belegziffer im Uebersetzungstext, etwa "Backends[1]".
 *
 * Bewusst als Marke im Fliesstext und nicht als eigener Schluessel je
 * Satzteil: so bleibt der Absatz in der Sprachdatei ein zusammenhaengender
 * Satz, den man normal bearbeiten kann, und jede Sprache setzt ihre Ziffern
 * an die Stelle, an der ihr Satzbau sie braucht.
 */
const MARKE = /\[(\d+)\]/g;

/** Absaetze, die Marken enthalten koennen. */
const ABSAETZE = ['about.p1', 'about.p2', 'about.p3'] as const;

/**
 * Zerlegt einen Absatz in Text und Ziffern.
 *
 * Ohne Marke kommt genau ein Segment zurueck, der Absatz wird also nicht
 * anders behandelt als vorher.
 */
function zerlege(text: string): Segment[] {
  const segmente: Segment[] = [];
  let zuletzt = 0;

  for (const treffer of text.matchAll(MARKE)) {
    segmente.push({
      text: text.slice(zuletzt, treffer.index),
      note: Number(treffer[1]),
    });
    zuletzt = treffer.index + treffer[0].length;
  }

  if (zuletzt < text.length) segmente.push({ text: text.slice(zuletzt) });
  return segmente;
}

@Component({
  selector: 'app-about',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './about.html',
  styleUrls: ['./about.scss', './about-mediaQuerrys.scss'],
})
export class About implements AfterViewInit {
  private readonly anim = inject(Animations);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly translate = inject(TranslateService);

  protected readonly absaetze = signal<readonly Absatz[]>([]);

  /**
   * Projektnamen sind Eigennamen und stehen deshalb bewusst nicht in den
   * Uebersetzungsdateien. Die Slugs sind dieselben wie in ProjectsData;
   * der Link setzt sie als Parameter `p`, den die Projektsektion liest.
   */
  protected readonly belege: readonly Beleg[] = [
    {
      n: 1,
      titleKey: 'about.sources.backends',
      projekte: [
        { label: 'Coderr', slug: 'coderr' },
        { label: 'Videoflix', slug: 'videoflix' },
        { label: 'Kanmind', slug: 'kanmind' },
        { label: 'Quizly', slug: 'quizly' },
      ],
    },
    {
      n: 2,
      titleKey: 'about.sources.frontends',
      projekte: [
        { label: 'JOIN', slug: 'join' },
        { label: 'PokeDex', slug: 'pokedex' },
        { label: 'Alien Adventure', slug: 'alien-adventure' },
      ],
    },
    {
      n: 3,
      titleKey: 'about.sources.ai',
      projekte: [
        { label: 'FIN-Tool', slug: 'fin-vergleichstool' },
        { label: 'FAIME', slug: 'faime' },
        { label: 'Kioskbrowser', slug: 'kioskbrowser' },
      ],
    },
    {
      n: 4,
      titleKey: 'about.sources.homelab',
      projekte: [{ label: 'HomeLab', slug: 'homelab' }],
    },
  ];

  constructor() {
    // stream statt get: liefert bei jedem Sprachwechsel erneut, damit die
    // Ziffern auch nach dem Umschalten an der richtigen Stelle sitzen.
    this.translate
      .stream([...ABSAETZE])
      .pipe(takeUntilDestroyed())
      .subscribe((werte: Record<string, string>) => {
        this.absaetze.set(
          ABSAETZE.map((key) => ({ key, segmente: zerlege(werte[key] ?? '') })),
        );
      });
  }

  ngAfterViewInit(): void {
    const el = this.host.nativeElement;

    this.anim.staggerChildren(el, '[data-reveal]', {
      scroll: true,
      stagger: 0.08,
      y: 22,
    });
  }
}
