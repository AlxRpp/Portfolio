import { CommonModule } from '@angular/common';
import { Component, AfterViewInit, ElementRef, OnInit, signal, viewChild } from '@angular/core';
import { gsap, random } from "gsap";
import { TextPlugin } from "gsap/TextPlugin";
import { SplitText } from "gsap/SplitText";
gsap.registerPlugin(TextPlugin, SplitText);

@Component({
  selector: 'app-header',
  imports: [CommonModule,],
  templateUrl: './header.html',
  styleUrl: './header.scss'
})
export class Header implements OnInit, AfterViewInit {


  name = signal<string>('Alex :)');
  greeting = signal<string>('Hello world');
  isHovered = signal<boolean>(false);
  hand = signal<boolean>(false)
  StartAnimation = signal<boolean>(false);
  splitRef = viewChild.required<ElementRef>('splitRef');
  test = viewChild.required<ElementRef>('animateTest')



  ngAfterViewInit(): void {
    const split = SplitText.create(".split", { type: "chars, lines, words" });
    const secondSplit = SplitText.create(".secondSplit", { type: "chars, lines, words" });

    // this.splitRef().nativeElement.style.color = 'red'


    gsap.from(split.chars, {
      duration: 2,
      y: -100,
      rotation: "random(-720, 900)",
      autoAlpha: 0,
      stagger: {
        each: .25,
        from: "random",
        repeat: 0
      }
    });

    gsap.from(secondSplit.chars, {
      duration: 2,
      y: 1000,
      rotation: "random(-270, 180)",     // animate from 100px below
      autoAlpha: 0, // fade in from opacity: 0 and visibility: hidden
      stagger: {
        amount: .3,
        from: "random",
        repeat: 0
      } // 0.05 seconds between each
    });
  }

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
        this.greeting = signal<string>('I´M ALEXANDER RUPPEL');
        this.isHovered.set(true);
      }, 2000)
    }
  }

  startgreeting() {
    this.StartAnimation.set(true);
    this.greeting = signal<string>('I´M ALEXANDER RUPPEL');
    this.hand.set(true)
    setTimeout(() => {
      this.test().nativeElement.classList.add('test')
    }, 50);


  }


  stopgreeting() {
    this.test().nativeElement.classList.add('stop')
    setTimeout(() => {
      this.StartAnimation.set(false);
      this.greeting = signal<string>('Hello world');
      this.hand.set(false)
      this.test().nativeElement.classList.add('stop')
    }, 250);


  }
}
