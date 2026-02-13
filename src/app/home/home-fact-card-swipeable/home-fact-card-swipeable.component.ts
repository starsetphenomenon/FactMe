import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core';
import { Fact } from 'src/app/models/fact.models';

const SWIPE_THRESHOLD_PX = 80;
const ANIMATION_MS = 280;

@Component({
  selector: 'app-home-fact-card-swipeable',
  templateUrl: './home-fact-card-swipeable.component.html',
  styleUrls: ['./home-fact-card-swipeable.component.scss'],
  standalone: false,
})
export class HomeFactCardSwipeableComponent implements OnDestroy {
  @Input() fact!: Fact;
  @Input() index = 0;
  @Output() swipeLeft = new EventEmitter<number>();
  @Output() swipeRight = new EventEmitter<number>();

  @ViewChild('cardEl') cardEl!: ElementRef<HTMLElement>;

  private touchStartX = 0;
  private touchStartY = 0;
  private isSwiping = false;
  private animationDone = false;
  private useTouches = false;

  onTouchStart(e: TouchEvent): void {
    if (this.animationDone || e.touches.length !== 1) return;
    this.useTouches = true;
    this.touchStartX = e.touches[0].clientX;
    this.touchStartY = e.touches[0].clientY;
    this.isSwiping = true;
  }

  onTouchMove(e: TouchEvent): void {
    if (!this.isSwiping || this.animationDone || e.touches.length !== 1) return;
    this.updateDrag(e.touches[0].clientX, e.touches[0].clientY, e);
  }

  onTouchEnd(e: TouchEvent): void {
    if (!this.isSwiping || this.animationDone) return;
    this.isSwiping = false;
    const x = e.changedTouches?.[0]?.clientX ?? 0;
    this.finishDrag(x - this.touchStartX);
  }

  onMouseDown(e: MouseEvent): void {
    if (this.animationDone || e.button !== 0) return;
    this.useTouches = false;
    this.touchStartX = e.clientX;
    this.touchStartY = e.clientY;
    this.isSwiping = true;
    e.preventDefault();
  }

  onMouseMove(e: MouseEvent): void {
    if (!this.isSwiping || this.animationDone) return;
    this.updateDrag(e.clientX, e.clientY, e);
  }

  onMouseUp(e: MouseEvent): void {
    if (!this.isSwiping || this.animationDone) return;
    this.isSwiping = false;
    this.finishDrag(e.clientX - this.touchStartX);
  }

  @HostListener('document:mousemove', ['$event'])
  onDocumentMouseMove(e: MouseEvent): void {
    if (this.isSwiping && !this.useTouches) this.onMouseMove(e);
  }

  @HostListener('document:mouseup', ['$event'])
  onDocumentMouseUp(e: MouseEvent): void {
    if (this.isSwiping && !this.useTouches) {
      this.isSwiping = false;
      this.finishDrag(e.clientX - this.touchStartX);
    }
  }

  onMouseLeave(): void {
    if (this.isSwiping && !this.animationDone && !this.useTouches) {
      this.isSwiping = false;
      const card = this.cardEl?.nativeElement;
      if (card) {
        card.style.transition = `transform ${ANIMATION_MS}ms ease-out`;
        card.style.transform = 'translateX(0)';
      }
    }
  }

  private updateDrag(clientX: number, clientY: number, e: TouchEvent | MouseEvent): void {
    const dx = clientX - this.touchStartX;
    const dy = clientY - this.touchStartY;
    const card = this.cardEl?.nativeElement;
    if (!card) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (e.preventDefault) e.preventDefault();
      const damp = Math.min(Math.abs(dx) / 2, 120);
      card.style.transition = 'none';
      card.style.transform = `translateX(${dx > 0 ? Math.min(damp, dx) : Math.max(-damp, dx)}px)`;
    }
  }

  private finishDrag(dx: number): void {
    const card = this.cardEl?.nativeElement;
    if (!card) return;

    if (dx < -SWIPE_THRESHOLD_PX) {
      this.runExitAnimation('left', card);
    } else if (dx > SWIPE_THRESHOLD_PX) {
      this.runExitAnimation('right', card);
    } else {
      card.style.transition = `transform ${ANIMATION_MS}ms ease-out`;
      card.style.transform = 'translateX(0)';
    }
  }

  private runExitAnimation(direction: 'left' | 'right', card: HTMLElement): void {
    this.animationDone = true;
    const sign = direction === 'left' ? -1 : 1;
    card.style.transition = `transform ${ANIMATION_MS}ms ease-in, opacity ${ANIMATION_MS}ms ease-in`;
    card.style.transform = `translateX(${sign * 120}%)`;
    card.style.opacity = '0';

    const emit = () => {
      if (direction === 'left') this.swipeLeft.emit(this.index);
      else this.swipeRight.emit(this.index);
    };

    setTimeout(emit, ANIMATION_MS);
  }

  ngOnDestroy(): void {
    this.isSwiping = false;
  }
}
