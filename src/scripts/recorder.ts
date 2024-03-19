import { StereoAnalyserObject } from 'src/components/models';

export class Recorder {
  audioContext: AudioContext;
  chunks: Blob[];

  recorder?: MediaRecorder;
  mediaStreamSource?: MediaStreamAudioSourceNode;
  stereoAnalyser?: StereoAnalyserObject;

  recording = false;
  startTime = 0;

  constructor() {
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

      navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
        this.recorder = new MediaRecorder(stream);

        this.mediaStreamSource =
          this.audioContext.createMediaStreamSource(stream);

        if (this.stereoAnalyser) {
          this.mediaStreamSource.connect(this.stereoAnalyser.splitter);
          this.stereoAnalyser.splitter.connect(
            this.stereoAnalyser.analysers[0],
            0
          );
          this.stereoAnalyser.splitter.connect(
            this.stereoAnalyser.analysers[1],
            1
          );

          this.stereoAnalyser.analysers[0].minDecibels = -100;
          this.stereoAnalyser.analysers[0].maxDecibels = 0;
        }

        this.recorder.ondataavailable = (e) => {
          this.chunks.push(e.data);
        };
      });
    } catch (error) {
      console.error('startRecording', error);
    }
  }

  public async startRecording() {
    this.recorder?.start();
    this.startTime = Date.now();
    this.recording = true;
  }

  public stopRecording() {
    if (this.recorder) {
      this.recorder.stop();
      this.recording = false;
    }
  }
}
