import {
  RecordedSound,
  RecorderState,
  StereoAnalyserObject,
} from 'src/components/models';
import { useSoundLibraryStore } from 'src/stores/sound-library-store';
import { dbToGain } from './math-helpers';
export class Recorder {
  state = RecorderState.NOT_INITIALIZED;
  audioContext?: AudioContext;
  chunks?: Blob[];

  recorder?: MediaRecorder;
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
      console.log(inputDevices);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      this.mediaStreamSource =
        this.audioContext?.createMediaStreamSource(stream);

      this.mediaStreamSource?.connect(this.gainNode);
      this.gainNode.connect(this.hpfNode);
      this.hpfNode.connect(this.limiterNode);
      this.limiterNode.connect(this.streamDestinationNode);

      const options = {
        mimeType: 'audio/webm; codecs=opus',
        audioBitsPerSecond: 256000,
      };
      this.recorder = new MediaRecorder(
        this.streamDestinationNode.stream,
        options
      );

      if (this.stereoAnalyser) {
        this.gainNode?.connect(this.stereoAnalyser.splitter);
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

      this.recorder.ondataavailable = (e) => {
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
    this.recorder?.start();
    this.shouldSaveSound = true;
  }

  public stopRecording(save = true) {
    if (this.recorder) {
      this.recorder.stop();

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
}
