export type RecordingStep =
  | { action: 'navigate'; url: string }
  | { action: 'wait'; ms: number }
  | { action: 'click'; selector: string }
  | { action: 'hover'; selector: string }
  | { action: 'scroll'; x: number; y: number }
  | { action: 'type'; selector: string; text: string; delay?: number }
  | { action: 'click-nth'; selector: string; index: number }
  | { action: 'hover-nth'; selector: string; index: number }
  | { action: 'hover-xy'; x: number; y: number }  // preferred for charts/SVG/virtual scroll

export interface RecordingScript {
  id: string;
  productName: string;
  url: string;
  viewport: { width: number; height: number };
  steps: RecordingStep[];
}

export interface ProcessingConfig {
  inputPath: string;
  outputPath: string;
  trim?: { start: number; end: number };
}

export interface ProjectConfig {
  productName: string;
  projectRoot: string;
  scenes: RecordingScript[];
}
