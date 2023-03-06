import { PeaksInstance } from 'peaks.js';

export interface SoundModel {
  id: string;
  name: string;
  isPlaying: boolean;
  isSelected: boolean;
  url: string;
  audioElement: HTMLAudioElement;
  peak?: PeaksInstance;
  duration: number;
  currentTime: number;
  remainingTime: number;
  progressIn0to1: number;
  trimGain: number;
  trimGainNode: GainNode;
  volumeGainNode: GainNode;
  source: MediaElementAudioSourceNode;
}
