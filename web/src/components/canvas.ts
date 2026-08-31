export class SignaturePad {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private isDrawing = false;
  private hasDrawn = false;

  constructor(canvasElement: HTMLCanvasElement) {
    this.canvas = canvasElement;
    const context = canvasElement.getContext('2d');
    if (!context) throw new Error('Cannot get 2D context from canvas');
    this.ctx = context;

    this.initCanvas();
    this.attachEvents();
  }

  private initCanvas(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width || 300;
    this.canvas.height = rect.height || 120;

    this.ctx.strokeStyle = '#1e293b';
    this.ctx.lineWidth = 2.5;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
  }

  private attachEvents(): void {
    // Mouse events
    this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
    this.canvas.addEventListener('mousemove', (e) => this.draw(e));
    window.addEventListener('mouseup', () => this.stopDrawing());

    // Touch events for mobile
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.startDrawing(touch as any);
    });
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.draw(touch as any);
    });
    window.addEventListener('touchend', () => this.stopDrawing());
  }

  private getCoordinates(e: MouseEvent | Touch): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  private startDrawing(e: MouseEvent | Touch): void {
    this.isDrawing = true;
    this.hasDrawn = true;
    const { x, y } = this.getCoordinates(e);
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
  }

  private draw(e: MouseEvent | Touch): void {
    if (!this.isDrawing) return;
    const { x, y } = this.getCoordinates(e);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
  }

  private stopDrawing(): void {
    this.isDrawing = false;
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.hasDrawn = false;
  }

  toDataURL(): string | null {
    if (!this.hasDrawn) return null;
    return this.canvas.toDataURL('image/png');
  }

  loadDataURL(dataUrl: string): void {
    if (!dataUrl) return;
    const img = new Image();
    img.onload = () => {
      this.clear();
      this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
      this.hasDrawn = true;
    };
    img.src = dataUrl;
  }

  isEmpty(): boolean {
    return !this.hasDrawn;
  }
}
