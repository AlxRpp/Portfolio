import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { StackData } from '../../shared/service/stack-data';
import { Animations } from '../../shared/service/animations';

@Component({
  selector: 'app-stack',
  imports: [TranslatePipe],
  templateUrl: './stack.html',
  styleUrls: ['./stack.scss', './stack-mediaQuerrys.scss'],
})
export class Stack implements AfterViewInit {
  private readonly data = inject(StackData);
  private readonly anim = inject(Animations);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly alle = this.data.alle;

  /**
   * Die drei Baender. Richtung und Tempo stehen hier und nicht im CSS,
   * damit sich eine Reihe hinzufuegen laesst, ohne eine weitere
   * Stilregel dafuer anzulegen.
   *
   * Die dritte laeuft langsamer: Sie traegt weniger Zeichen, und bei
   * gleichem Tempo waere ihre Schleife merklich schneller durch.
   */
  protected readonly reihen = [
    { id: 'daily', items: this.data.rowTop, richtung: 'left', dauer: '46s' },
    { id: 'built', items: this.data.rowBottom, richtung: 'right', dauer: '52s' },
    { id: 'next', items: this.data.rowNext, richtung: 'left', dauer: '64s' },
  ] as const;

  /**
   * Zwei Durchgaenge derselben Reihe. Die Schleife verschiebt die Spur um
   * genau die Haelfte ihrer Breite, deshalb muss der Inhalt exakt doppelt
   * vorliegen, damit der Uebergang nicht springt.
   */
  protected readonly durchgaenge = [0, 1];

  ngAfterViewInit(): void {
    this.anim.staggerChildren(
      this.host.nativeElement,
      '.stack__head [data-reveal]',
      { scroll: true, stagger: 0.08, y: 20 },
    );

    this.anim.revealEach(this.host.nativeElement, '.stack__row', {
      y: 20,
      duration: 0.55,
    });
  }
}
