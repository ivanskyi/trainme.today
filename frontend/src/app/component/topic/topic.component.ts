import { Component, AfterViewInit, HostListener, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { Hands } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import { firstValueFrom } from "rxjs";

interface WordQuestion {
  word: string;
  correct: string;
  options: string[];
}

@Component({
  selector: 'app-topic',
  templateUrl: './topic.component.html',
  styleUrls: ['./topic.component.scss']
})
export class TopicComponent implements AfterViewInit, OnDestroy {
  private video!: HTMLVideoElement;
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private questionEl!: HTMLElement;
  private camera?: Camera;
  private hands?: Hands;
  private animationFrameId?: number;

  data: WordQuestion[] = [];
  private boxes: Array<{ x: number; y: number; w: number; h: number; text: string; correct: boolean; highlighted: boolean }> = [];
  private current = 0;
  private latestHands: any = null;
  private speaking = false;
  private repeatTimeout: any = null;
  private repeatDelay = 1000;
  private repeatCount = 0;
  private nextIsFemale = true;
  private lastProcessTime = 0;
  private readonly PROCESSING_INTERVAL = 100;
  private readonly MAX_FPS = 30;
  private lastRenderTime = 0;
  private renderInterval = 1000 / this.MAX_FPS;
  private cachedCanvasData = { width: 0, height: 0, navbarHeight: 0 };
  private touchStartTime = 0;
  private touchedBox: any = null;
  private readonly TOUCH_DURATION = 500;

  constructor(private http: HttpClient, private route: ActivatedRoute) {}

  ngAfterViewInit(): void {
    this.video = document.getElementById('video') as HTMLVideoElement;
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
    this.questionEl = document.getElementById('question') as HTMLElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;

    this.resizeCanvas();

    const topicId = this.route.snapshot.queryParamMap.get('id') || 'b2-words';
    this.loadTopicData(topicId).then(() => {
      this.initHandTracking();
      this.startRenderLoop();
      this.nextQuestion();
    });
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  private cleanup(): void {
    this.stopRepeating();
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.camera) {
      this.camera.stop();
    }
    if (this.hands) {
      this.hands.close();
    }
    speechSynthesis.cancel();
  }

  @HostListener('window:resize')
  resizeCanvas(): void {
    const newWidth = window.innerWidth;
    const newHeight = window.innerHeight - this.getNavbarHeight();

    if (this.cachedCanvasData.width !== newWidth || this.cachedCanvasData.height !== newHeight) {
      this.canvas.width = newWidth;
      this.canvas.height = newHeight;
      this.cachedCanvasData.width = newWidth;
      this.cachedCanvasData.height = newHeight;

      if (this.data.length > 0 && this.current < this.data.length) {
        this.calculateBoxPositions();
      }
    }
  }

  private getNavbarHeight(): number {
    if (this.cachedCanvasData.navbarHeight === 0) {
      const rootStyles = getComputedStyle(document.documentElement);
      const navbarHeight = rootStyles.getPropertyValue('--navbar-height');
      const val = parseInt(navbarHeight);
      this.cachedCanvasData.navbarHeight = isNaN(val) ? 60 : val;
    }
    return this.cachedCanvasData.navbarHeight;
  }

  private async loadTopicData(topicId: string): Promise<void> {
    const path = `assets/topics/${topicId}.json`;
    try {
      this.data = await firstValueFrom(this.http.get<WordQuestion[]>(path));
    } catch (error) {
      console.error('Failed to load topic data:', error);
      this.data = [];
    }
  }

  private speakWord(word: string, done?: () => void): void {
    speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(word);
    utter.rate = 1;
    utter.pitch = this.nextIsFemale ? 1.2 : 0.8;
    utter.volume = 1;
    utter.lang = 'en-US';
    this.nextIsFemale = !this.nextIsFemale;
    utter.onend = () => done?.();
    speechSynthesis.speak(utter);
  }

  private startRepeating(word: string): void {
    this.stopRepeating();
    this.repeatDelay = 1000;
    this.repeatCount = 0;

    const repeat = () => {
      if (this.speaking || speechSynthesis.speaking) {
        this.repeatTimeout = setTimeout(repeat, this.repeatDelay);
        return;
      }

      this.repeatCount++;
      this.speakWord(word, () => {
        this.repeatDelay = Math.min(this.repeatDelay * 1.5, 8000);
        this.repeatTimeout = setTimeout(repeat, this.repeatDelay);
      });
    };

    repeat();
  }

  private stopRepeating(): void {
    if (this.repeatTimeout) {
      clearTimeout(this.repeatTimeout);
      this.repeatTimeout = null;
    }
    speechSynthesis.cancel();
  }

  private nextQuestion(): void {
    if (this.current >= this.data.length) this.current = 0;

    const q = this.data[this.current];
    this.questionEl.textContent = q.word;
    this.speaking = false;
    this.touchStartTime = 0;
    this.touchedBox = null;

    this.calculateBoxPositions();
    this.startRepeating(q.word);
  }

  private calculateBoxPositions(): void {
    const q = this.data[this.current];
    const shuffled = this.shuffleArray([...q.options]);

    const h = 80;
    const gap = 8;
    const count = shuffled.length;
    const totalGapWidth = gap * (count - 1);
    const availableWidth = this.canvas.width - 20;
    const w = (availableWidth - totalGapWidth) / count;
    const startX = 10;
    const y = (this.canvas.height - h) / 2;

    this.boxes = shuffled.map((opt, i) => ({
      x: startX + i * (w + gap),
      y,
      w,
      h,
      text: opt,
      correct: opt === q.correct,
      highlighted: false
    }));
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private mirrorX(x: number): number {
    return this.canvas.width - x;
  }

  private checkPointing(hand: any): void {
    const now = Date.now();
    if (now - this.lastProcessTime < this.PROCESSING_INTERVAL) return;
    this.lastProcessTime = now;

    const tip = hand[8];
    const tx = this.mirrorX(tip.x * this.canvas.width);
    const ty = tip.y * this.canvas.height;

    this.boxes.forEach(box => box.highlighted = false);

    let touchingBox = null;

    for (const box of this.boxes) {
      const isTouching = tx >= box.x && tx <= box.x + box.w && ty >= box.y && ty <= box.y + box.h;

      if (isTouching) {
        touchingBox = box;
        box.highlighted = true;
        break;
      }
    }

    if (touchingBox && !this.speaking) {
      if (this.touchedBox === touchingBox) {
        if (this.touchStartTime === 0) {
          this.touchStartTime = now;
        } else if (now - this.touchStartTime >= this.TOUCH_DURATION) {
          this.handleSelection(touchingBox);
        }
      } else {
        this.touchedBox = touchingBox;
        this.touchStartTime = now;
      }
    } else {
      this.touchStartTime = 0;
      this.touchedBox = null;
    }
  }

  private handleSelection(hit: any): void {
    this.speaking = true;
    this.stopRepeating();
    this.touchStartTime = 0;
    this.touchedBox = null;

    const correct = hit.text === this.data[this.current].correct;
    const msg = new SpeechSynthesisUtterance(correct ? 'Correct!' : 'Wrong, try again.');
    msg.rate = 1;
    msg.pitch = this.nextIsFemale ? 1.2 : 0.8;
    msg.volume = 1;
    msg.lang = 'en-US';
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
        this.startRepeating(this.data[this.current].word);
      }
    };
  }

  private drawBoxes(): void {
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.font = 'clamp(16px, 4vw, 22px) sans-serif';

    for (const b of this.boxes) {
      let fillColor = '#222';

      if (b.highlighted) {
        if (this.touchedBox === b && this.touchStartTime > 0) {
          const elapsed = Date.now() - this.touchStartTime;
          const progress = Math.min(elapsed / this.TOUCH_DURATION, 1);
          const intensity = Math.floor(255 * progress);
          fillColor = b.correct ? `rgb(${40 + intensity * 0.7}, ${167 + intensity * 0.3}, ${69 + intensity * 0.7})` : `rgb(${220 + intensity * 0.15}, ${53 + intensity * 0.8}, ${69 + intensity * 0.7})`;
        } else {
          fillColor = b.correct ? '#28a745' : '#dc3545';
        }
      }

      this.ctx.fillStyle = fillColor;
      this.ctx.fillRect(b.x, b.y, b.w, b.h);
      this.ctx.fillStyle = '#fff';
      this.ctx.fillText(b.text, b.x + b.w / 2, b.y + b.h / 2);
    }
  }

  private drawHand(hand: any): void {
    this.ctx.strokeStyle = '#00ff88';
    this.ctx.lineWidth = 2;

    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4],
      [0, 5], [5, 6], [6, 7], [7, 8],
      [5, 9], [9, 10], [10, 11], [11, 12],
      [9, 13], [13, 14], [14, 15], [15, 16],
      [13, 17], [17, 18], [18, 19], [19, 20]
    ];

    this.ctx.beginPath();
    for (const [s, e] of connections) {
      const p1 = hand[s], p2 = hand[e];
      this.ctx.moveTo(this.mirrorX(p1.x * this.canvas.width), p1.y * this.canvas.height);
      this.ctx.lineTo(this.mirrorX(p2.x * this.canvas.width), p2.y * this.canvas.height);
    }
    this.ctx.stroke();
  }

  private startRenderLoop(): void {
    const render = (currentTime: number) => {
      if (currentTime - this.lastRenderTime >= this.renderInterval) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawBoxes();

        if (this.latestHands?.multiHandLandmarks) {
          for (const hand of this.latestHands.multiHandLandmarks) {
            this.drawHand(hand);
            this.checkPointing(hand);
          }
        }

        this.lastRenderTime = currentTime;
      }
      this.animationFrameId = requestAnimationFrame(render);
    };

    this.animationFrameId = requestAnimationFrame(render);
  }

  private initHandTracking(): void {
    this.hands = new Hands({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    this.hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 0,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.5,
    });

    this.hands.onResults((results: any) => {
      this.latestHands = results;
    });

    this.camera = new Camera(this.video, {
      onFrame: async () => {
        if (this.hands && this.video.readyState === 4) {
          await this.hands.send({ image: this.video });
        }
      },
      width: 320,
      height: 240,
      facingMode: 'user'
    });

    this.camera.start().catch(err => {
      console.error('Camera failed to start:', err);
    });
  }
}
