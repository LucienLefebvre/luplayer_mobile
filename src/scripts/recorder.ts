import {
  RecordedSound,
  RecorderState,
  StereoAnalyserObject,
} from 'src/components/models';
import { useSoundLibraryStore } from 'src/stores/sound-library-store';
export class Recorder {
  state = RecorderState.NOT_INITIALIZED;
  audioContext?: AudioContext;
  chunks?: Blob[];

  recorder?: MediaRecorder;
  mediaStreamSource?: MediaStreamAudioSourceNode;
  stereoAnalyser?: StereoAnalyserObject;

  recording = false;
  startTime = 0;
  shouldSaveSound = true;

  recordedSound?: RecordedSound;

  analyserTimeWindowInMs = 0;

  public async init() {
    this.audioContext = new AudioContext();
    this.chunks = [];

    this.stereoAnalyser = {
      splitter: this.audioContext.createChannelSplitter(2),
      analysers: [
        this.audioContext.createAnalyser(),
        this.audioContext.createAnalyser(),
      ],
    };

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('MediaDevices or getUserMedia is not supported');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const options = {
        mimeType: 'audio/webm; codecs=opus',
        audioBitsPerSecond: 256000,
      };
      this.recorder = new MediaRecorder(stream, options);

      this.mediaStreamSource =
        this.audioContext?.createMediaStreamSource(stream);

      if (this.stereoAnalyser) {
        this.mediaStreamSource?.connect(this.stereoAnalyser.splitter);
        this.stereoAnalyser.splitter.connect(
          this.stereoAnalyser.analysers[0],
          0
        );
        this.stereoAnalyser.splitter.connect(
          this.stereoAnalyser.analysers[1],
          1
        );

        /* this.stereoAnalyser.analysers[0].minDecibels = -100;
        this.stereoAnalyser.analysers[0].maxDecibels = 0; */
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
      console.error('initialize ', error);
    }
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
}
