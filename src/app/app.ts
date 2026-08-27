import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './main/shared/header/header';
import { Footer } from './main/shared/footer/footer';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Footer],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
