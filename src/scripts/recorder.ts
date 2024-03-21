import {
  RecordedSound,
  RecorderState,
  StereoAnalyserObject,
} from 'src/components/models';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { useSoundLibraryStore } from 'src/stores/sound-library-store';
import write_blob from 'capacitor-blob-writer';
export class Recorder {
  state = RecorderState.INITIALIZING;
  audioContext?: AudioContext;
  chunks?: Blob[];

  recorder?: MediaRecorder;
  mediaStreamSource?: MediaStreamAudioSourceNode;
  stereoAnalyser?: StereoAnalyserObject;

  recording = false;
  startTime = 0;

  recordedSound?: RecordedSound;

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

        this.stereoAnalyser.analysers[0].minDecibels = -100;
        this.stereoAnalyser.analysers[0].maxDecibels = 0;
      }

      this.recorder.ondataavailable = (e) => {
        this.chunks?.push(e.data);
        this.saveRecording();
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
    this.startTime = Date.now();
    this.state = RecorderState.RECORDING;
    console.log('Recording started');
  }

  public stopRecording() {
    if (this.recorder) {
      this.recorder.stop();
      this.state = RecorderState.STOPPED;
    }
  }

  public async saveRecording() {
    if (this.chunks) {
      try {
        const fileName = this.recordedSound?.name + '.ogg';
        const newFileName = await this.getUniqueFileName(fileName);
        if (newFileName && fileName !== newFileName) {
          this.recordedSound!.name = newFileName;
        }
        if (!newFileName) {
          console.error('Failed to get unique filename.');
          return;
        }
        write_blob({
          directory: Directory.External,
          path: newFileName,
          blob: this.chunks[0],
        });

        const soundLibraryStore = useSoundLibraryStore();
        soundLibraryStore.addRecordedSoundToLibrary(this.recordedSound!);
      } catch (error) {
        console.error('saveRecording', error);
      }
    }
  }

  private async getUniqueFileName(
    fileName: string,
    attempt = 0
  ): Promise<string | null> {
    try {
      const files = await Filesystem.readdir({
        path: '',
        directory: Directory.External,
      });
      const existingFileNames = files.files.map((file) => file.name);
      let newFileName = fileName;
      while (existingFileNames.includes(newFileName)) {
        const [name, extension] = fileName.split('.');
        newFileName = `${name}_${attempt}.${extension}`;
        attempt++;
      }
      return newFileName;
    } catch (error) {
      console.error('getUniqueFileName', error);
      return null;
    }
  }
}
