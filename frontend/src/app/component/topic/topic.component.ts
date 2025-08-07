import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';

interface WordQuestion {
  word: string;
  correct: string;
  options: string[];
}

@Component({
  selector: 'app-topic',
  template: `<canvas #canvas></canvas>`,
  styles: [`
    canvas {
      display: block;
      width: 100vw;
      height: 100vh;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
      background: #fff;
    }
  `]
})
export class TopicComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  ctx!: CanvasRenderingContext2D;
  data: WordQuestion[] = [];
  current = 0;
  question: WordQuestion | null = null;
  shuffledOptions: string[] = [];
  selectedOption: string | null = null;
  speaking = false;
  repeatTimeout: any = null;
  repeatDelay = 1000;
  nextIsFemale = true;
  optionBoxes: { text: string; x: number; y: number; w: number; h: number }[] = [];

  constructor(private http: HttpClient, private route: ActivatedRoute) {}

  ngAfterViewInit(): void {
    const topicId = this.route.snapshot.queryParamMap.get('id') || 'b2-words';
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    this.loadTopicData(topicId).then(() => this.nextQuestion());
    canvas.addEventListener('click', this.handleCanvasClick.bind(this));
    canvas.addEventListener('touchstart', this.handleCanvasClick.bind(this));
  }

  ngOnDestroy(): void {
    this.stopRepeating();
    window.removeEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    const canvas = this.canvasRef.nativeElement;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);
    this.render();
  }

  async loadTopicData(topicId: string): Promise<void> {
    const path = `assets/topics/${topicId}.json`;
    try {
      this.data = await firstValueFrom(this.http.get<WordQuestion[]>(path));
    } catch {
      this.data = [];
    }
  }

  nextQuestion(): void {
    if (this.current >= this.data.length) this.current = 0;
    this.question = this.data[this.current];
    this.shuffledOptions = this.shuffleArray([...this.question.options]);
    this.selectedOption = null;
    this.speaking = false;
    this.optionBoxes = [];
    this.startRepeating(this.question.word);
    this.render();
  }

  shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  speakWord(word: string, done?: () => void): void {
    speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(word);
    utter.rate = 1;
    utter.pitch = this.nextIsFemale ? 1.2 : 0.8;
    utter.volume = 1;
    utter.lang = 'en-GB';
    this.nextIsFemale = !this.nextIsFemale;
    utter.onend = () => done?.();
    speechSynthesis.speak(utter);
  }

  startRepeating(word: string): void {
    this.stopRepeating();
    this.repeatDelay = 1000;

    const repeat = () => {
      if (this.speaking || speechSynthesis.speaking) {
        this.repeatTimeout = setTimeout(repeat, this.repeatDelay);
        return;
      }
      this.speakWord(word, () => {
        this.repeatDelay = Math.min(this.repeatDelay * 1.5, 8000);
        this.repeatTimeout = setTimeout(repeat, this.repeatDelay);
      });
    };

    repeat();
  }

  stopRepeating(): void {
    if (this.repeatTimeout) {
      clearTimeout(this.repeatTimeout);
      this.repeatTimeout = null;
    }
    speechSynthesis.cancel();
  }

  handleCanvasClick(event: MouseEvent | TouchEvent) {
    if (this.speaking || !this.question || this.selectedOption) return;
    event.preventDefault();

    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    let x = 0;
    let y = 0;

    if ('touches' in event) {
      x = event.touches[0].clientX - rect.left;
      y = event.touches[0].clientY - rect.top;
    } else {
      x = (event as MouseEvent).clientX - rect.left;
      y = (event as MouseEvent).clientY - rect.top;
    }

    for (const box of this.optionBoxes) {
      if (
        x >= box.x &&
        x <= box.x + box.w &&
        y >= box.y &&
        y <= box.y + box.h
      ) {
        this.selectOption(box.text);
        break;
      }
    }
  }

  selectOption(option: string): void {
    this.selectedOption = option;
    this.speaking = true;
    this.stopRepeating();

    const correct = option === this.question!.correct;
    const msg = new SpeechSynthesisUtterance(correct ? 'Correct!' : 'Wrong, try again.');
    msg.rate = 1;
    msg.pitch = this.nextIsFemale ? 1.2 : 0.8;
    msg.volume = 1;
    msg.lang = 'en-GB';
    this.nextIsFemale = !this.nextIsFemale;

    speechSynthesis.speak(msg);

    msg.onend = () => {
      if (correct) {
        setTimeout(() => {
          this.current++;
          this.speaking = false;
          this.nextQuestion();
        }, 1000);
      } else {
        this.speaking = false;
        this.startRepeating(this.question!.word);
        this.selectedOption = null;
        this.render();
      }
    };

    this.render();
  }

  render() {
    const ctx = this.ctx;
    const canvas = this.canvasRef.nativeElement;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!this.question) {
      ctx.fillStyle = '#222';
      ctx.font = '600 28px "Inter", "Segoe UI", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Loading...', 20, 40);
      return;
    }

    ctx.fillStyle = '#111';
    ctx.font = '600 40px "Inter", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(this.question.word, canvas.width / 2, 60);

    const boxWidth = Math.min(canvas.width * 0.8, 500);
    const boxHeight = 60;
    const gap = 24;
    const startY = 160;
    const centerX = canvas.width / 2;

    this.optionBoxes = [];

    for (let i = 0; i < this.shuffledOptions.length; i++) {
      const opt = this.shuffledOptions[i];
      const x = centerX - boxWidth / 2;
      const y = startY + i * (boxHeight + gap);

      ctx.shadowColor = 'rgba(0,0,0,0.04)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 4;

      let bg = '#fdfdfd';
      let border = '#e0e0e0';
      let textColor = '#222';

      if (this.selectedOption) {
        if (opt === this.question.correct) {
          bg = '#e3fbe3';
          border = '#a5d6a7';
          textColor = '#1b5e20';
        } else if (opt === this.selectedOption && opt !== this.question.correct) {
          bg = '#fdecec';
          border = '#ef9a9a';
          textColor = '#b71c1c';
        }
      }

      ctx.fillStyle = bg;
      this.roundRect(ctx, x, y, boxWidth, boxHeight, 12, true, false);

      ctx.shadowBlur = 0;
      ctx.lineWidth = 1;
      ctx.strokeStyle = border;
      this.roundRect(ctx, x, y, boxWidth, boxHeight, 12, false, true);

      ctx.fillStyle = textColor;
      ctx.font = '500 22px "Inter", "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(opt, centerX, y + boxHeight / 2);

      this.optionBoxes.push({ text: opt, x, y, w: boxWidth, h: boxHeight });
    }
  }

  roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: boolean, stroke: boolean) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }
}
