import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import type { NavItem } from '../header';

/**
 * Vollflächige Navigation unter 800px Breite.
 *
 * Die Komponente hält keinen eigenen Zustand. Öffnen und Schließen
 * steuert der Header. Sie meldet nur, dass geschlossen werden soll.
 */
@Component({
  selector: 'app-mobile-navbar',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './mobile-navbar.html',
  styleUrl: './mobile-navbar.scss',
})
export class MobileNavbar {
  readonly open = input.required<boolean>();
  readonly items = input.required<readonly NavItem[]>();

  readonly dismissed = output<void>();
}
