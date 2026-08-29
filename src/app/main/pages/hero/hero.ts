import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  inject,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import type { SplitText } from 'gsap/SplitText';
import { Animations } from '../../shared/service/animations';

@Component({
  selector: 'app-hero',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './hero.html',
  styleUrls: ['./hero.scss', './hero-mediaQuerrys.scss'],
})
export class Hero implements AfterViewInit, OnDestroy {
  private readonly anim = inject(Animations);
  private readonly translate = inject(TranslateService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  private split?: SplitText;
  private logo?: gsap.core.Timeline;
  private tiltAus?: () => void;

  async ngAfterViewInit(): Promise<void> {
    // Das Monogramm haengt weder an der Uebersetzung noch an der Schrift.
    // Es startet deshalb sofort und wartet nicht auf beides mit, sonst
    // begaenne es erst, wenn die Schrift geladen ist.
    const el = this.host.nativeElement;
    const mark = el.querySelector('.hero__mark-svg');
    if (mark) {
      this.logo = this.anim.drawLogo(mark, { delay: 0.3 });
    }

    // Die Neigung haengt am Wrapper, nicht am SVG: so stoeren sich
    // Zeichnen und Kippen nicht, das eine laeuft auf den Pfaden, das
    // andere auf dem Kasten darueber.
    //
    // Bezug ist die ganze Sektion, damit die Marke schon auf Bewegung
    // reagiert, bevor der Zeiger sie erreicht.
    const kasten = el.querySelector<HTMLElement>('.hero__mark');
    if (kasten) {
      const schwelle = parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--bp-laptop'),
      );
      this.tiltAus = this.anim.tiltOnPointer(kasten, el, { minWidth: schwelle });
    }

    // SplitText zerlegt den Text, der in diesem Moment im DOM steht, und
    // friert ihn als einzelne Zeichen ein. Beides muss deshalb vorher
    // fertig sein:
    //   - die Übersetzung, sonst zerlegt es den rohen Key "hero.name"
    //   - die Schrift, sonst vermisst es die Ersatzschrift und die
    //     Buchstaben springen beim Nachladen
    await Promise.all([
      firstValueFrom(this.translate.get('hero.name')),
      document.fonts.ready,
    ]);

    // Zwei Frames warten, damit Angular den übersetzten Text tatsächlich
    // gerendert hat, bevor gemessen wird.
    await this.nextFrames(2);

    const name = el.querySelector('.hero__name');

    if (name) {
      this.split = this.anim.splitHeadline(name, { delay: 0.15 });
    }

    this.anim.staggerChildren(el, '[data-reveal]', {
      delay: 0.45,
      stagger: 0.09,
      y: 18,
    });
  }

  ngOnDestroy(): void {
    // Zeichen wieder zu normalem Text zusammenführen.
    this.split?.revert();
    this.logo?.kill();
    this.tiltAus?.();
  }

  private nextFrames(count: number): Promise<void> {
    return new Promise((resolve) => {
      const step = (left: number) =>
        left <= 0 ? resolve() : requestAnimationFrame(() => step(left - 1));
      step(count);
    });
  }
}
