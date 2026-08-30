import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Language } from '../../shared/service/language';
import {
  ANBIETER,
  QUELLE,
  standInSprache,
} from '../../shared/service/legal-data';

@Component({
  selector: 'app-legal-notice',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './legal-notice.html',
})
export class LegalNotice {
  private readonly sprache = inject(Language);

  protected readonly anbieter = ANBIETER;
  protected readonly quelle = QUELLE;

  /** Der Stand in der Sprache der Seite, siehe legal-data.ts. */
  protected readonly stand = computed(() => standInSprache(this.sprache.current()));
}
