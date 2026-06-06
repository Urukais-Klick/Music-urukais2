import { useEffect, useRef } from 'react';

class ScrambleText {
  el: HTMLElement;
  chars: string;
  frameRequest: number | null;
  frame: number;
  queue: Array<{ from: string; to: string; start: number; end: number; char?: string }>;
  resolve: (() => void) | null;

  constructor(el: HTMLElement) {
    this.el = el;
    this.chars = '!<>-_\\/[]{}--=+*^?#________';
    this.frameRequest = null;
    this.frame = 0;
    this.queue = [];
    this.resolve = null;
    this.update = this.update.bind(this);
  }

  setText(newText: string): Promise<void> {
    const oldText = this.el.innerText;
    const length = Math.max(oldText.length, newText.length);
    const promise = new Promise<void>((resolve) => (this.resolve = resolve));
    this.queue = [];
    for (let i = 0; i < length; i++) {
      const from = oldText[i] || '';
      const to = newText[i] || '';
      const start = Math.floor(Math.random() * 40);
      const end = start + Math.floor(Math.random() * 40);
      this.queue.push({ from, to, start, end });
    }
    if (this.frameRequest) {
      cancelAnimationFrame(this.frameRequest);
    }
    this.frame = 0;
    this.frameRequest = requestAnimationFrame(this.update);
    return promise;
  }

  update() {
    let output = '';
    let complete = 0;
    this.queue.forEach((q, i) => {
      const { from, to, start, end } = q;
      let { char } = q;
      if (this.frame >= end) {
        complete++;
        output += to;
        return;
      }
      if (this.frame >= start) {
        if (!char || Math.random() < 0.28) {
          char = this.randomChar();
          this.queue[i].char = char;
        }
        output += `<span class="scramble-dud">${char}</span>`;
      } else {
        output += from;
      }
    });
    this.el.innerHTML = output;
    if (complete === this.queue.length) {
      if (this.resolve) this.resolve();
    } else {
      this.frame++;
      this.frameRequest = requestAnimationFrame(this.update);
    }
  }

  randomChar() {
    return this.chars[Math.floor(Math.random() * this.chars.length)];
  }

  destroy() {
    if (this.frameRequest) {
      cancelAnimationFrame(this.frameRequest);
    }
  }
}

export function useScrambleText(text: string, trigger: boolean = true) {
  const ref = useRef<HTMLSpanElement>(null);
  const scramblerRef = useRef<ScrambleText | null>(null);

  useEffect(() => {
    if (!ref.current || !trigger) return;
    
    const scrambler = new ScrambleText(ref.current);
    scramblerRef.current = scrambler;
    scrambler.setText(text);

    return () => {
      scrambler.destroy();
    };
  }, [text, trigger]);

  return ref;
}

export function useContinuousScramble(texts: string[], interval: number = 4000) {
  const ref = useRef<HTMLSpanElement>(null);
  const scramblerRef = useRef<ScrambleText | null>(null);
  const indexRef = useRef(0);

  useEffect(() => {
    if (!ref.current) return;

    const scrambler = new ScrambleText(ref.current);
    scramblerRef.current = scrambler;

    const cycle = async () => {
      await scrambler.setText(texts[indexRef.current]);
      indexRef.current = (indexRef.current + 1) % texts.length;
      setTimeout(cycle, interval);
    };

    cycle();

    return () => {
      scrambler.destroy();
    };
  }, [texts, interval]);

  return ref;
}
