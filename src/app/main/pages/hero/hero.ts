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
import { Signals } from '../../shared/service/signals';
import { SignalLayer } from '../../shared/signal-layer/signal-layer';

@Component({
  selector: 'app-hero',
  imports: [RouterLink, TranslatePipe, SignalLayer],
  templateUrl: './hero.html',
  styleUrls: ['./hero.scss', './hero-mediaQuerrys.scss'],
})
export class Hero implements AfterViewInit, OnDestroy {
  private readonly anim = inject(Animations);
  protected readonly signale = inject(Signals);
  private readonly translate = inject(TranslateService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  private split?: SplitText;

  async ngAfterViewInit(): Promise<void> {
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

    const el = this.host.nativeElement;
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
  }

  private nextFrames(count: number): Promise<void> {
    return new Promise((resolve) => {
      const step = (left: number) =>
        left <= 0 ? resolve() : requestAnimationFrame(() => step(left - 1));
      step(count);
    });
  }
}
