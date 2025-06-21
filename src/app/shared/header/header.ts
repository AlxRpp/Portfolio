import { CommonModule } from '@angular/common';
import { Component, AfterViewInit, ElementRef, ViewChild, OnInit, signal } from '@angular/core';
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

  @ViewChild('splitRef', { static: true }) splitRef!: ElementRef<HTMLDivElement>;

  name = signal<string>('Alex :)');
  topName = signal<string>('Hello world');
  isHovered = signal<boolean>(false);
  StartAnimation = signal<boolean>(false);


  ngAfterViewInit(): void {
    const split = SplitText.create(".split", { type: "chars, lines, words" });
    const secondSplit = SplitText.create(".secondSplit", { type: "chars, lines, words" });

    gsap.from(split.chars, {
      duration: 2,
      yPercent: "random(-100, 500)",
      rotation: "random(-45, 45)",     // animate from 100px below
      autoAlpha: 0, // fade in from opacity: 0 and visibility: hidden
      stagger: {
        amount: .3,
        from: "random",
        repeat: 0
      } // 0.05 seconds between each
    });

    gsap.from(secondSplit.chars, {
      duration: 2,
      yPercent: "random(-100, 500)",
      rotation: "random(-45, 45)",     // animate from 100px below
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
        this.topName = signal<string>('I´M ALEXANDER RUPPEL');
        this.isHovered.set(true);
      }, 2000)
    }
  }



}
