import Konva from 'konva';

export interface SoundModel {
  id: string;
  name: string;

  color: string;

  isPlaying: boolean;
  isSelected: boolean;
  isPlaylistActiveSound: boolean;
  isCuePlayed: boolean;
  hasBeenCuePlayed: boolean;

  audioElement: HTMLAudioElement;
  source: MediaElementAudioSourceNode | null;

  duration: number;
  remainingTime: number;
  inTime: number | null;
  outTime: number | null;
  timeOutId?: ReturnType<typeof setTimeout>;

  isLooping: boolean;

  launchTime: number;

  integratedLoudness: number | null;

  volumeDb: number;
  trimDb: number;
  trimGainNode: GainNode | null;
  volumeGainNode: GainNode | null;
  enveloppeGainNode: GainNode | null;
  // enveloppeGainWorkletNode: AudioWorkletNode;

  hpfEnabled: boolean;
  hpfFrequency: number;
  //hpfNode: BiquadFilterNode;

  waveformChunks: Float32Array | null;
  displayWaveform: boolean;
  enveloppePoints: EnveloppePoint[];
  enveloppeIsEnabled: boolean;
}

export const dummySound: SoundModel = {
  id: '',
  name: '',
  color: '',
  isPlaying: false,
  isSelected: false,
  isPlaylistActiveSound: false,
  isCuePlayed: false,
  hasBeenCuePlayed: false,
  audioElement: new Audio(),
  source: null,
  duration: 0,
  remainingTime: 0,
  inTime: null,
  outTime: null,
  isLooping: false,
  launchTime: 0,
  integratedLoudness: null,
  volumeDb: 0,
  trimDb: 0,
  trimGainNode: null,
  volumeGainNode: null,
  enveloppeGainNode: null,
  hpfEnabled: false,
  hpfFrequency: 0,
  waveformChunks: null,
  displayWaveform: false,
  enveloppePoints: [],
  enveloppeIsEnabled: false,
};

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

export interface MeterBar {
  green: Konva.Rect;
  orange: Konva.Rect;
  red: Konva.Rect;
}
