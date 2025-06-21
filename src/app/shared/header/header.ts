import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';

@Component({
  selector: 'app-header',
  imports: [CommonModule],
  templateUrl: './header.html',
  styleUrl: './header.scss'
})
export class Header implements OnInit {
  name = signal<string>('Alex :)');
  topName = signal<string>('Hello world');
  isHovered = signal<boolean>(false);
  StartAnimation = signal<boolean>(false);


  ngOnInit(): void {
    this.mobileStartAnimation();
  }

  mouseEnter(): void {
    this.name.set('Alex :D');
    this.isHovered.set(true);
  }

  mouseLeave(): void {
    this.name.set('Alex :)');
    this.isHovered.set(false);
  }

  mobileStartAnimation(): void {
    if (window.innerWidth < 500) {
      setTimeout(() => {
        this.StartAnimation.set(true);
        this.topName = signal<string>('I´M ALEXANDER RUPPEL');
        this.isHovered.set(true);
      }, 2000)
    }
  }
}
