import Konva from 'konva';

export interface SoundModel {
  soundAudioHasBeenInitialized: boolean;

  id: string;

  fileContent: ArrayBuffer;
  base64FileContent?: string;

  name: string;
  path: string;

  color: string;

  isPlaying: boolean;
  isSelected: boolean;
  isPlaylistActiveSound: boolean;
  isCuePlayed: boolean;
  hasBeenCuePlayed: boolean;

  isFadingIn: boolean;
  isFadingOut: boolean;
  fadeInStartTime: number;
  fadeOutStartTime: number;
  fadeInTimeoutId?: ReturnType<typeof setTimeout>;
  fadeOutTimeoutId?: ReturnType<typeof setTimeout>;

  audioElement: HTMLAudioElement;
  source: MediaElementAudioSourceNode | null;

  duration: number;
  remainingTime: number;
  inTime: number | null;
  outTime: number | null;
  timeOutId?: ReturnType<typeof setTimeout>;

  isLooping: boolean;
  retrigger: boolean;

  launchTime: number;

  integratedLoudness: number | null;

  shouldShowVolume: boolean;

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
  waveformChunksHasBeenCalculated: boolean;
  enveloppePoints: EnveloppePoint[];
  enveloppeIsEnabled: boolean;
}

export const dummySound: SoundModel = {
  soundAudioHasBeenInitialized: false,
  id: '',
  name: '',
  color: '',
  path: '',
  fileContent: new ArrayBuffer(0),
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
  retrigger: false,
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
  waveformChunksHasBeenCalculated: false,
  enveloppePoints: [],
  enveloppeIsEnabled: false,
  isFadingIn: false,
  isFadingOut: false,
  fadeInStartTime: 0,
  fadeOutStartTime: 0,
  shouldShowVolume: false,
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

export enum RecorderState {
  INITIALIZING = 'initializing',
  READY = 'ready',
  RECORDING = 'recording',
  STOPPED = 'stopped',
}
export interface RecordedSound {
  id: string;
  name: string;
  path?: string;
  markers: SoundMarker[];
  totalLengthInMs?: number;
}

export interface SoundMarker {
  id: number;
  name: string;
  positionInMs: number;
  color?: string;
  nameHasBeenEdited: boolean;
  showDialog: boolean;
}
