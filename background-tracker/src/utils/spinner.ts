import chalk from 'chalk';

interface SpinnerOptions {
  text?: string;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'cyan' | 'magenta';
  frames?: string[];
  interval?: number;
}

interface CountdownSpinnerOptions extends SpinnerOptions {
  countdownSeconds?: number;
  template?: string; // Template like "Waiting for next check in {time}..."
}

export class Spinner {
  private frames: string[];
  private text: string;
  private color: string;
  private interval: number;
  private currentFrame: number;
  private timerId?: NodeJS.Timeout;
  private isSpinning: boolean;

  constructor(options: SpinnerOptions = {}) {
    this.frames = options.frames || ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    this.text = options.text || 'Loading...';
    this.color = options.color || 'cyan';
    this.interval = options.interval || 80;
    this.currentFrame = 0;
    this.isSpinning = false;
  }

  start(text?: string): void {
    if (this.isSpinning) {
      return;
    }

    if (text) {
      this.text = text;
    }

    this.isSpinning = true;
    this.currentFrame = 0;
    
    // Hide cursor
    process.stdout.write('\x1b[?25l');
    
    this.timerId = setInterval(() => {
      this.render();
    }, this.interval);
  }

  stop(finalText?: string): void {
    if (!this.isSpinning) {
      return;
    }

    this.isSpinning = false;
    
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = undefined;
    }

    // Clear the current line
    process.stdout.write('\r\x1b[K');
    
    // Show cursor
    process.stdout.write('\x1b[?25h');
    
    if (finalText) {
      console.log(finalText);
    }
  }

  updateText(text: string): void {
    this.text = text;
    if (this.isSpinning) {
      this.render();
    }
  }
  private render(): void {
    const frame = this.frames[this.currentFrame];
    let coloredFrame: string;
    
    switch (this.color) {
      case 'blue':
        coloredFrame = chalk.blue(frame);
        break;
      case 'green':
        coloredFrame = chalk.green(frame);
        break;
      case 'yellow':
        coloredFrame = chalk.yellow(frame);
        break;
      case 'red':
        coloredFrame = chalk.red(frame);
        break;
      case 'cyan':
        coloredFrame = chalk.cyan(frame);
        break;
      case 'magenta':
        coloredFrame = chalk.magenta(frame);
        break;
      default:
        coloredFrame = chalk.cyan(frame);
    }
    
    const line = `${coloredFrame} ${this.text}`;
    
    // Move to beginning of line and clear it, then write new content
    process.stdout.write(`\r\x1b[K${line}`);
    
    this.currentFrame = (this.currentFrame + 1) % this.frames.length;
  }
}

export class CountdownSpinner extends Spinner {
  private countdownSeconds: number;
  private remainingSeconds: number;
  private template: string;
  private countdownTimerId?: NodeJS.Timeout;

  constructor(options: CountdownSpinnerOptions = {}) {
    super(options);
    this.countdownSeconds = options.countdownSeconds || 60;
    this.remainingSeconds = this.countdownSeconds;
    this.template = options.template || 'Waiting... {time}';
  }

  startCountdown(countdownSeconds?: number): void {
    if (countdownSeconds) {
      this.countdownSeconds = countdownSeconds;
    }
    
    this.remainingSeconds = this.countdownSeconds;
    this.updateCountdownText();
    this.start();

    // Update countdown every second
    this.countdownTimerId = setInterval(() => {
      this.remainingSeconds--;
      this.updateCountdownText();
      
      if (this.remainingSeconds <= 0) {
        this.stopCountdown();
      }
    }, 1000);
  }

  stopCountdown(finalText?: string): void {
    if (this.countdownTimerId) {
      clearInterval(this.countdownTimerId);
      this.countdownTimerId = undefined;
    }
    this.stop(finalText);
  }

  private updateCountdownText(): void {
    const minutes = Math.floor(this.remainingSeconds / 60);
    const seconds = this.remainingSeconds % 60;
    const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    const text = this.template.replace('{time}', timeStr);
    this.updateText(text);
  }

  resetCountdown(): void {
    this.remainingSeconds = this.countdownSeconds;
    this.updateCountdownText();
  }
}

// Convenience functions
export function createSpinner(text: string, options?: Omit<SpinnerOptions, 'text'>): Spinner {
  return new Spinner({ ...options, text });
}

export function createCountdownSpinner(template: string, countdownSeconds: number, options?: Omit<CountdownSpinnerOptions, 'template' | 'countdownSeconds'>): CountdownSpinner {
  return new CountdownSpinner({ ...options, template, countdownSeconds });
}
