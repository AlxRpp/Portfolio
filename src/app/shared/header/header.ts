import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-header',
  imports: [CommonModule],
  templateUrl: './header.html',
  styleUrl: './header.scss'
})
export class Header {
  name = signal('Alex :)');
  isHovered = signal(false);

  mouseEnter(){
    this.name.set('Alex :D');
    this.isHovered.set(true);
  }

  mouseLeave(){
    this.name.set('Alex :)');
    this.isHovered.set(false);

  }
}
