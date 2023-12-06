import { PeaksInstance } from 'peaks.js';
import Konva from 'konva';

export interface SoundModel {
  id: string;
  url: string;
  file: File;
  name: string;

  isPlaying: boolean;
  isSelected: boolean;
  isCuePlayed: boolean;

  audioElement: HTMLAudioElement;
  peak?: PeaksInstance;
  source: MediaElementAudioSourceNode;

  duration: number;
  remainingTime: number;
  progressIn0to1: number;
  inTime: number | null;
  outTime: number | null;
  timeOutId?: ReturnType<typeof setTimeout>;

  launchTime: number;

  integratedLoudness: number | null;

  trimGain: number;
  trimGainNode: GainNode | null;
  volumeGainNode: GainNode | null;
  enveloppeGainNode: GainNode | null;
  // enveloppeGainWorkletNode: AudioWorkletNode;

  hpfEnabled: boolean;
  hpfFrequency: number;
  //hpfNode: BiquadFilterNode;

  waveformChunks: Float32Array | null;

  enveloppePoints: EnveloppePoint[];
}

export interface EnveloppePoint {
  time: number;
  gainDb: number;
}

export interface StereoAnalyserObject {
  splitter: ChannelSplitterNode;
  analysers: AnalyserNode[];
}

export interface WaveformParams {
  waveformChunks: Float32Array;
  sound: SoundModel;
  stage: Konva.Stage;
  layer: Konva.Layer;
  verticalZoomFactor: number;
  startTime: number;
  endTime: number;
  isMinimap: boolean;
  isZoomable: boolean;
}

export enum playerMode {
  PLAYLIST = 'playlist',
  CART = 'cart',
}
