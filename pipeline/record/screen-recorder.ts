import { chromium } from 'playwright';
import * as path from 'path';
import { RecordingScript, RecordingStep } from '../types';
import { TimelineRecorder } from './timeline-recorder';

export async function recordScene(script: RecordingScript): Promise<{ outputPath: string; timeline: Record<string, number> }> {
  const productDir = `projects/${script.productName.toLowerCase()}`;
  const outputPath = path.join(productDir, 'public/recordings', `${script.id}.mp4`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: script.viewport,
    recordVideo: { dir: path.join(productDir, 'public/recordings'), size: script.viewport },
  });

  const page = await context.newPage();
  const tl = new TimelineRecorder();

  for (const step of script.steps) {
    await executeStep(page, step, tl);
  }

  await context.close();
  await browser.close();

  console.log('\nTimeline:');
  tl.report();

  return { outputPath, timeline: tl.toJSON() };
}

async function executeStep(page: any, step: RecordingStep, tl: TimelineRecorder) {
  switch (step.action) {
    case 'navigate':
      await page.goto(step.url, { waitUntil: 'networkidle' });
      tl.mark(`navigate:${step.url}`);
      break;
    case 'wait':
      await page.waitForTimeout(step.ms);
      break;
    case 'click':
      await page.click(step.selector);
      tl.mark(`click:${step.selector}`);
      break;
    case 'hover':
      await page.hover(step.selector);
      tl.mark(`hover:${step.selector}`);
      break;
    case 'scroll':
      await page.mouse.move(step.x, step.y);
      await page.mouse.wheel(0, 300);
      break;
    case 'type':
      await page.type(step.selector, step.text, { delay: step.delay ?? 80 });
      break;
    case 'click-nth':
      await page.locator(step.selector).nth(step.index).click();
      tl.mark(`click-nth:${step.selector}[${step.index}]`);
      break;
    case 'hover-nth':
      await page.locator(step.selector).nth(step.index).hover();
      tl.mark(`hover-nth:${step.selector}[${step.index}]`);
      break;
    case 'hover-xy':
      await page.mouse.move(step.x, step.y);
      tl.mark(`hover-xy:${step.x},${step.y}`);
      break;
  }
}
