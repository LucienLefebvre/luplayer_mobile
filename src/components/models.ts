import { PeaksInstance } from 'peaks.js';

export interface SoundModel {
  id: string;
  url: string;
  file: File;
  name: string;

  isPlaying: boolean;
  isSelected: boolean;

  audioElement: HTMLAudioElement;
  peak?: PeaksInstance;
  source: MediaElementAudioSourceNode;

  duration: number;
  currentTime: number;
  remainingTime: number;
  progressIn0to1: number;
  inTime: number | null;
  outTime: number | null;
  timeOutId?: ReturnType<typeof setTimeout>;

  integratedLoudness: number | null;

  trimGain: number;
  trimGainNode: GainNode;
  volumeGainNode: GainNode;

  hpfEnabled: boolean;
  hpfFrequency: number;
  hpfNode: BiquadFilterNode;
}

export interface StereoAnalyserObject {
  splitter: ChannelSplitterNode;
  stereoAnalyser: AnalyserNode;
  analysers: AnalyserNode[];
}

export enum playerMode {
  PLAYLIST = 'playlist',
  CART = 'cart',
}
