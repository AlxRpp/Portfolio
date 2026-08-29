import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { StackData } from '../../shared/service/stack-data';
import { Animations } from '../../shared/service/animations';
import { Signals } from '../../shared/service/signals';
import { SignalLayer } from '../../shared/signal-layer/signal-layer';

@Component({
  selector: 'app-stack',
  imports: [TranslatePipe, SignalLayer],
  templateUrl: './stack.html',
  styleUrls: ['./stack.scss', './stack-mediaQuerrys.scss'],
})
export class Stack implements AfterViewInit {
  private readonly data = inject(StackData);
  protected readonly signale = inject(Signals);
  private readonly anim = inject(Animations);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly gruppen = this.data.gruppen;

  ngAfterViewInit(): void {
    const el = this.host.nativeElement;

    this.anim.staggerChildren(el, '.stack__head [data-reveal]', {
      scroll: true,
      stagger: 0.08,
      y: 20,
    });

    // Jede Spalte mit eigenem Ausloeser, damit sie nacheinander kommen,
    // sobald die Sektion in den Blick faehrt.
    this.anim.revealEach(el, '.stack__group', { y: 24, duration: 0.55 });
  }
}
