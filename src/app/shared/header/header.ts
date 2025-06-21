import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-header',
  imports: [],
  templateUrl: './header.html',
  styleUrl: './header.scss'
})
export class Header {
  name = signal('Alex :)');
  isHovered = signal(false);

  changeName(){
    this.name.set('Alex :D');
    this.isHovered.set(true);
  }

  resetName(){
    this.name.set('Alex :)');
    this.isHovered.set(false);

  }
}
