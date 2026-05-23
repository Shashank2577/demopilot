export class TimelineRecorder {
  private start = Date.now();
  private marks: { label: string; elapsed: number }[] = [];

  mark(label: string) {
    this.marks.push({ label, elapsed: (Date.now() - this.start) / 1000 });
  }

  report() {
    this.marks.forEach(m => console.log(`[${m.elapsed.toFixed(2)}s] ${m.label}`));
    return this.marks;
  }

  startFromFrames(label: string, fps = 30): number {
    const mark = this.marks.find(m => m.label === label);
    return mark ? Math.ceil(mark.elapsed * fps) : 0;
  }

  toJSON(): Record<string, number> {
    return Object.fromEntries(this.marks.map(m => [m.label, m.elapsed]));
  }
}
