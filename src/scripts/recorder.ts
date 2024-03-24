import { watch } from 'vue';
import {
  MediaRecorder as EMediaRecorder,
  register,
} from 'extendable-media-recorder';
import { connect } from 'extendable-media-recorder-wav-encoder';

import {
  RecordedSound,
  RecorderState,
  StereoAnalyserObject,
} from 'src/components/models';
import { useSoundLibraryStore } from 'src/stores/sound-library-store';
import { useSettingsStore } from 'src/stores/settings-store';
import { dbToGain } from './math-helpers';
export class Recorder {
  state = RecorderState.NOT_INITIALIZED;
  audioContext?: AudioContext;
  chunks?: Blob[];

  mediaRecorder?: MediaRecorder | InstanceType<typeof EMediaRecorder>;
  mediaStreamSource?: MediaStreamAudioSourceNode;
  stereoAnalyser?: StereoAnalyserObject;
  gainNode?: GainNode;
  hpfNode?: BiquadFilterNode;
  limiterNode?: DynamicsCompressorNode;
  streamDestinationNode?: MediaStreamAudioDestinationNode;

  recording = false;
  startTime = 0;
  shouldSaveSound = true;

  recordedSound?: RecordedSound;

  analyserTimeWindowInMs = 0;

  settingsStore = useSettingsStore();

  public async init() {
    try {
      this.audioContext = new AudioContext();

      if (!this.audioContext) {
        throw new Error("Can't create AudioContext");
      }

      this.chunks = [];

      this.stereoAnalyser = {
        splitter: this.audioContext.createChannelSplitter(2),
        analysers: [
          this.audioContext.createAnalyser(),
          this.audioContext.createAnalyser(),
        ],
      };
      this.gainNode = this.audioContext.createGain();
      this.hpfNode = this.createFilterNode(this.audioContext);
      this.limiterNode = this.createLimiterNode(this.audioContext);
      this.streamDestinationNode =
        this.audioContext.createMediaStreamDestination();

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('MediaDevices or getUserMedia is not supported');
      }

      const inputDevices = await navigator.mediaDevices.enumerateDevices();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      this.mediaStreamSource =
        this.audioContext?.createMediaStreamSource(stream);
      this.gainNode.disconnect();
      this.mediaStreamSource?.connect(this.gainNode);
      this.gainNode.connect(this.hpfNode);
      this.hpfNode.connect(this.limiterNode);
      this.limiterNode.connect(this.streamDestinationNode);

      if (this.settingsStore.recorder.fileFormat === 'ogg') {
        const options = {
          mimeType: 'audio/webm; codecs=opus',
          audioBitsPerSecond: 256000,
        };
        this.mediaRecorder = new MediaRecorder(
          this.streamDestinationNode.stream,
          options
        );
      } else {
        await register(await connect());
        this.mediaRecorder = new EMediaRecorder(
          this.streamDestinationNode.stream,
          { mimeType: 'audio/wav' }
        );
      }

      if (this.stereoAnalyser) {
        this.limiterNode?.connect(this.stereoAnalyser.splitter);
        this.stereoAnalyser.splitter.connect(
          this.stereoAnalyser.analysers[0],
          0
        );
        this.stereoAnalyser.splitter.connect(
          this.stereoAnalyser.analysers[1],
          1
        );
      }

      this.analyserTimeWindowInMs = Math.floor(
        this.audioContext.sampleRate / this.stereoAnalyser.analysers[0].fftSize
      );

      this.mediaRecorder.ondataavailable = (e: any) => {
        this.chunks?.push(e.data);
        const soundLibraryStore = useSoundLibraryStore();
        if (this.shouldSaveSound)
          soundLibraryStore.saveRecording(this.recordedSound!, this.chunks!);
        else this.shouldSaveSound = true;
      };

      this.state = RecorderState.READY;
    } catch (error) {
      throw error;
    }
  }

  private createFilterNode(audioContext: AudioContext): BiquadFilterNode {
    const filter = audioContext.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 0;
    filter.Q.value = 0;
    return filter;
  }

  private createLimiterNode(
    audioContext: AudioContext
  ): DynamicsCompressorNode {
    const limiter = audioContext.createDynamicsCompressor();
    limiter.threshold.value = -3;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.1;
    limiter.release.value = 0.1;
    return limiter;
  }

  public setRecordedSound(sound: RecordedSound) {
    this.recordedSound = sound;
  }

  public async startRecording() {
    this.chunks = [];
    this.mediaRecorder?.start();
    this.shouldSaveSound = true;
  }

  public stopRecording(save = true) {
    if (this.mediaRecorder) {
      this.mediaRecorder.stop();

      if (!save) this.shouldSaveSound = false;
    }
  }

  public setTrimGain(gain: number) {
    if (this.audioContext && this.gainNode)
      this.gainNode.gain.setValueAtTime(
        dbToGain(gain),
        this.audioContext.currentTime
      );
  }

  public setHpfState(enabled: boolean, frequency: number) {
    if (this.hpfNode) this.hpfNode.frequency.value = enabled ? frequency : 0;
  }

  public setLimiterState(enabled: boolean, threshold: number) {
    if (this.limiterNode)
      this.limiterNode.threshold.value = enabled ? threshold : 0;
  }
}
