import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Animations } from '../../shared/service/animations';

/** Ein Schritt der Arbeitsweise. Die Reihenfolge traegt die Bedeutung. */
interface Step {
  /** Teil des i18n-Keys unter howIWork.steps. */
  id: string;
}

@Component({
  selector: 'app-how-i-work',
  imports: [TranslatePipe],
  templateUrl: './how-i-work.html',
  styleUrls: ['./how-i-work.scss', './how-i-work-mediaQuerrys.scss'],
})
export class HowIWork implements AfterViewInit {
  private readonly anim = inject(Animations);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * Nummeriert wird hier bewusst, weil es wirklich eine Abfolge ist und
   * keine blosse Aufzaehlung: Verstehen kommt vor Bauen, Absichern danach.
   */
  protected readonly steps: readonly Step[] = [
    { id: 'understand' },
    { id: 'build' },
    { id: 'verify' },
  ];

  /** Zweistellig, damit die Ziffern in der Monospace-Spalte fluchten. */
  protected nummer(index: number): string {
    return String(index + 1).padStart(2, '0');
  }

  ngAfterViewInit(): void {
    const el = this.host.nativeElement;

    // Kopf: die drei Zeilen gehoeren zusammen und laufen deshalb versetzt
    // aus einem gemeinsamen Ausloeser los.
    this.anim.staggerChildren(el, '.work__head [data-reveal]', {
      scroll: true,
      stagger: 0.08,
      y: 20,
    });

    // Schritte: jeder bekommt seinen eigenen Ausloeser und schiebt sich
    // leicht von links herein, sobald er selbst in den Blick kommt.
    this.anim.revealEach(el, '.work__step', { x: -24, duration: 0.55 });
  }
}
