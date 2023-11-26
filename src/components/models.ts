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
  trimGainNode: GainNode;
  volumeGainNode: GainNode;

  hpfEnabled: boolean;
  hpfFrequency: number;
  hpfNode: BiquadFilterNode;

  waveform: Float32Array | null;
  waveformCalculated: boolean;
  waveformShouldBeRedrawn: boolean;
}

export interface StereoAnalyserObject {
  splitter: ChannelSplitterNode;
  stereoAnalyser: AnalyserNode;
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
}

export enum playerMode {
  PLAYLIST = 'playlist',
  CART = 'cart',
}
