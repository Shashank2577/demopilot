#!/usr/bin/env ts-node
import * as path from 'path';
import { recordScene } from '../record/screen-recorder';

const args = process.argv.slice(2);
const phase = args[args.indexOf('--phase') + 1] as 'record' | 'process' | 'all';
const scene = args[args.indexOf('--scene') + 1];
const product = args[args.indexOf('--product') + 1];

if (!phase || !product) {
  console.error('Usage: pipeline.ts --phase record|process|all --product ProductName [--scene scene-id]');
  process.exit(1);
}

const productDir = `projects/${product.toLowerCase()}`;

async function main() {
  const configPath = path.resolve(productDir, 'config.ts');
  const { PROJECT_CONFIG } = await import(configPath);

  const scenesToRun = scene
    ? PROJECT_CONFIG.scenes.filter((s: any) => s.id === scene)
    : PROJECT_CONFIG.scenes;

  if (scenesToRun.length === 0) {
    console.error(`No scenes found${scene ? ` matching id: ${scene}` : ''}`);
    process.exit(1);
  }

  for (const script of scenesToRun) {
    console.log(`\n▶ Recording: ${script.id} (${product})`);
    const { outputPath, timeline } = await recordScene(script);
    console.log(`✓ Saved: ${outputPath}`);
    console.log('Timeline marks:', timeline);
  }
}

main().catch(console.error);
