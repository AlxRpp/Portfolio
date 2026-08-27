import { Component } from '@angular/core';
import { Hero } from '../hero/hero';

/**
 * Setzt die Startseite aus den Sektionen zusammen.
 * Jede weitere Sektion wird hier ergänzt und traegt ihren Anker,
 * damit die Navigation im Header sie erreicht.
 */
@Component({
  selector: 'app-home',
  imports: [Hero],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {}
