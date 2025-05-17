import { spawn } from 'child_process';
import { tmpdir } from 'os';
import path from 'path';
import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import { logger } from './logging.js';

let wasmFFmpeg: any;

async function convertWithSystemFfmpeg(wavBuffer: Buffer): Promise<Buffer> {
  const inputPath = path.join(tmpdir(), `${randomUUID()}.wav`);
  const outputPath = path.join(tmpdir(), `${randomUUID()}.ogg`);

  await fs.writeFile(inputPath, wavBuffer);

  await new Promise<void>((resolve, reject) => {
    const ff = spawn('ffmpeg', ['-y', '-i', inputPath, '-c:a', 'libvorbis', outputPath]);
    ff.on('error', reject);
    ff.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`ffmpeg exited with code ${code}`));
      }
    });
  });

  const oggBuffer = await fs.readFile(outputPath);
  await fs.unlink(inputPath).catch(() => {});
  await fs.unlink(outputPath).catch(() => {});

  return oggBuffer;
}

async function convertWithWasm(wavBuffer: Buffer): Promise<Buffer> {
  if (!wasmFFmpeg) {
    try {
      // For @ffmpeg/ffmpeg v0.11.0, createFFmpeg is typically a direct named export.
      const { createFFmpeg } = await import('@ffmpeg/ffmpeg');

      if (!createFFmpeg) {
        logger.error('createFFmpeg function not found in @ffmpeg/ffmpeg module');
        throw new Error('createFFmpeg function not found in @ffmpeg/ffmpeg module assets');
      }

      wasmFFmpeg = createFFmpeg({ log: false });
    } catch (err) {
      logger.error(`Failed to initialize ffmpeg.wasm: ${err}`);
      throw new Error(`ffmpeg.wasm module not available: ${(err as Error).message}`);
    }
  }

  if (!wasmFFmpeg.isLoaded()) {
    await wasmFFmpeg.load();
  }

  const inputName = 'input.wav';
  const outputName = 'output.ogg';
  wasmFFmpeg.FS('writeFile', inputName, new Uint8Array(wavBuffer));
  await wasmFFmpeg.run('-i', inputName, '-c:a', 'libvorbis', outputName);
  const data = wasmFFmpeg.FS('readFile', outputName);
  wasmFFmpeg.FS('unlink', inputName);
  wasmFFmpeg.FS('unlink', outputName);

  return Buffer.from(data);
}

/**
 * Convert WAV audio buffer to OGG. Uses the system ffmpeg binary when
 * available and falls back to a wasm implementation when necessary.
 * @param wavBuffer Buffer containing WAV audio data
 * @returns Buffer with OGG encoded audio
 */
export async function convertWavToOgg(wavBuffer: Buffer): Promise<Buffer> {
  try {
    return await convertWithSystemFfmpeg(wavBuffer);
  } catch (error) {
    logger.warn(`System ffmpeg failed: ${error}. Falling back to ffmpeg.wasm`);
    return await convertWithWasm(wavBuffer);
  }
}
