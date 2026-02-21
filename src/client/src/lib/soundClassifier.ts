import { FilesetResolver } from '@mediapipe/tasks-vision';
import {
  AudioClassifier,
  type AudioClassifierResult,
} from '@mediapipe/tasks-audio';
import { logger } from '@shared/logger';
import { YAMNET_MODEL, WASM_PATH } from '@shared/constants';

let classifierPromise: Promise<AudioClassifier> | null = null;

export async function getClassifier(options?: {
  scoreThreshold?: number;
  maxResults?: number;
}): Promise<AudioClassifier> {
  if (!classifierPromise) {
    logger('[DecibelReader] Loading YAMNet classifier...');
    classifierPromise = (async () => {
      const wasm = await FilesetResolver.forAudioTasks(WASM_PATH);
      const classifier = await AudioClassifier.createFromModelPath(
        wasm,
        YAMNET_MODEL
      );
      classifier.setDefaultSampleRate(16000);
      logger('[DecibelReader] Classifier loaded');
      return classifier;
    })();
  }
  const classifier = await classifierPromise;
  if (
    options?.scoreThreshold !== undefined ||
    options?.maxResults !== undefined
  ) {
    await classifier.setOptions({
      scoreThreshold: options.scoreThreshold ?? 0.3,
      maxResults: options.maxResults ?? 5,
    });
  }
  return classifier;
}

export function classifyAudio(
  classifier: AudioClassifier,
  audioData: Float32Array,
  sampleRate = 16000
): AudioClassifierResult[] {
  return classifier.classify(audioData, sampleRate);
}
