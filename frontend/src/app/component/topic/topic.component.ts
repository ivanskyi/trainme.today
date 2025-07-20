import { Component, AfterViewInit, HostListener } from '@angular/core';
import { Hands } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';

@Component({
  selector: 'app-topic',
  templateUrl: './topic.component.html',
  styleUrls: ['./topic.component.scss']
})
export class TopicComponent implements AfterViewInit {
  private video!: HTMLVideoElement;
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private questionEl!: HTMLElement;

  data = [
    { word: 'Achievement', correct: 'Досягнення', options: ['Провал', 'Досягнення', 'Спроба'] },
    { word: 'Approach', correct: 'Підхід', options: ['Підхід', 'Відстань', 'Результат'] },
    { word: 'Benefit', correct: 'Перевага', options: ['Проблема', 'Перевага', 'Втрати'] },
    { word: 'Challenge', correct: 'Виклик', options: ['Відповідь', 'Виклик', 'Скарга'] },
    { word: 'Concern', correct: 'Занепокоєння', options: ['Радість', 'Занепокоєння', 'Довіра'] },
    { word: 'Decline', correct: 'Зниження', options: ['Підйом', 'Зниження', 'Виправлення'] },
    { word: 'Evidence', correct: 'Доказ', options: ['Доказ', 'Уява', 'Думка'] },
    { word: 'Growth', correct: 'Зростання', options: ['Падіння', 'Зростання', 'Втеча'] },
    { word: 'Impact', correct: 'Вплив', options: ['Відповідальність', 'Зіткнення', 'Вплив'] },
    { word: 'Issue', correct: 'Проблема', options: ['Успіх', 'Проблема', 'Випадок'] },
    { word: 'Resource', correct: 'Ресурс', options: ['Ресурс', 'Втрата', 'Витрати'] },
    { word: 'Solution', correct: 'Рішення', options: ['Завдання', 'Проблема', 'Рішення'] },
    { word: 'Strategy', correct: 'Стратегія', options: ['Інтуїція', 'Стратегія', 'Помилка'] },
    { word: 'Trend', correct: 'Тенденція', options: ['Тенденція', 'Суміш', 'Зміна'] },
    { word: 'Value', correct: 'Цінність', options: ['Цінність', 'Ціна', 'Ризик'] }
  ];

  private boxes: Array<{x:number,y:number,w:number,h:number,text:string,correct:boolean,highlighted:boolean}> = [];
  private current = 0;
  private latestHands: any = null;
  private speaking = false;
  private repeatTimeout: any = null;
  private repeatDelay = 1000;
  private repeatCount = 0;
  private nextIsFemale = true;
  private voiceMale: SpeechSynthesisVoice | null = null;
  private voiceFemale: SpeechSynthesisVoice | null = null;

  ngAfterViewInit(): void {
    this.video = document.getElementById('video') as HTMLVideoElement;
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
    this.questionEl = document.getElementById('question') as HTMLElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.resizeCanvas();
    this.initVoices();
    this.initHandTracking();
    this.render();
    this.nextQuestion();
  }

  @HostListener('window:resize')
  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight - this.getNavbarHeight();
  }

  private getNavbarHeight(): number {
    const rootStyles = getComputedStyle(document.documentElement);
    const navbarHeight = rootStyles.getPropertyValue('--navbar-height');
    const val = parseInt(navbarHeight);
    return isNaN(val) ? 60 : val;
  }

  private initVoices() {
    const synth = window.speechSynthesis;
    const setVoices = () => {
      const voices = synth.getVoices();
      this.voiceMale = voices.find(v => v.lang.startsWith('en') && /male/i.test(v.name)) || voices[0];
      this.voiceFemale = voices.find(v => v.lang.startsWith('en') && /female/i.test(v.name)) || voices[0];
    };
    setVoices();
    speechSynthesis.onvoiceschanged = setVoices;
  }

  private speakWord(word: string, done?: () => void) {
    speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(word);
    utter.voice = this.nextIsFemale ? this.voiceFemale : this.voiceMale;
    this.nextIsFemale = !this.nextIsFemale;
    utter.rate = 1;
    utter.onend = () => done?.();
    speechSynthesis.speak(utter);
  }

  private startRepeating(word: string) {
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
        this.repeatDelay *= 2;
        this.repeatTimeout = setTimeout(repeat, this.repeatDelay);
      });
    };
    repeat();
  }

  private stopRepeating() {
    if (this.repeatTimeout) clearTimeout(this.repeatTimeout);
    speechSynthesis.cancel();
  }

  private nextQuestion() {
    if (this.current >= this.data.length) this.current = 0;
    const q = this.data[this.current];
    this.questionEl.textContent = q.word;
    this.speaking = false;
    const shuffled = [...q.options].sort(() => Math.random() - 0.5);
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
    this.startRepeating(q.word);
  }

  private mirrorX(x: number) {
    return this.canvas.width - x;
  }

  private checkPointing(hand: any) {
    const tip = hand[8];
    const base = hand[5];
    const tx = this.mirrorX(tip.x * this.canvas.width);
    const ty = tip.y * this.canvas.height;
    const bx = this.mirrorX(base.x * this.canvas.width);
    const by = base.y * this.canvas.height;
    for (const box of this.boxes) {
      const cx = box.x + box.w / 2;
      const cy = box.y + box.h / 2;
      const dx = tx - bx;
      const dy = ty - by;
      const bxRel = cx - bx;
      const byRel = cy - by;
      const dot = dx * bxRel + dy * byRel;
      const len1 = Math.hypot(dx, dy);
      const len2 = Math.hypot(bxRel, byRel);
      const angle = Math.acos(dot / (len1 * len2));
      const dist = Math.hypot(tx - cx, ty - cy);
      box.highlighted = angle < 0.4 && dist < 180;
    }
    const hit = this.boxes.find(b => b.highlighted);
    if (hit && !this.speaking) {
      this.speaking = true;
      this.stopRepeating();
      const correct = hit.text === this.data[this.current].correct;
      const msg = new SpeechSynthesisUtterance(correct ? 'Correct!' : 'Wrong, try again.');
      msg.voice = this.nextIsFemale ? this.voiceFemale : this.voiceMale;
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
  }

  private drawBoxes() {
    for (const b of this.boxes) {
      this.ctx.fillStyle = b.correct && b.highlighted ? '#28a745' : (b.highlighted ? '#dc3545' : '#222');
      this.ctx.fillRect(b.x, b.y, b.w, b.h);
      this.ctx.fillStyle = '#fff';
      this.ctx.font = 'clamp(16px, 4vw, 22px) sans-serif';
      this.ctx.textBaseline = 'middle';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(b.text, b.x + b.w / 2, b.y + b.h / 2);
    }
  }

  private drawHand(hand: any) {
    this.ctx.strokeStyle = '#00ff88';
    this.ctx.lineWidth = 2;
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4],
      [0, 5], [5, 6], [6, 7], [7, 8],
      [0, 9], [9, 10], [10, 11], [11, 12],
      [0, 13], [13, 14], [14, 15], [15, 16],
      [0, 17], [17, 18], [18, 19], [19, 20]
    ];
    for (const [s, e] of connections) {
      const p1 = hand[s], p2 = hand[e];
      this.ctx.beginPath();
      this.ctx.moveTo(this.mirrorX(p1.x * this.canvas.width), p1.y * this.canvas.height);
      this.ctx.lineTo(this.mirrorX(p2.x * this.canvas.width), p2.y * this.canvas.height);
      this.ctx.stroke();
    }
  }

  private render = () => {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawBoxes();
    if (this.latestHands?.multiHandLandmarks) {
      for (const hand of this.latestHands.multiHandLandmarks) {
        this.drawHand(hand);
        this.checkPointing(hand);
      }
    }
    requestAnimationFrame(this.render);
  };

  private initHandTracking() {
    const hands = new Hands({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });
    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7
    });
    hands.onResults((results: any) => this.latestHands = results);
    const camera = new Camera(this.video, {
      onFrame: async () => await hands.send({ image: this.video }),
      width: 640,
      height: 480
    });
    camera.start();
  }
}
