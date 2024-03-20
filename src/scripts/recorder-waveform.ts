import { StereoAnalyserObject } from 'src/components/models';
import Konva from 'konva';

export interface Marker {
  xPos: number;
  color: string;
  line: Konva.Line;
}
export class RecorderWaveform {
  private waveformView: HTMLDivElement;
  private stereoAnalyser: StereoAnalyserObject;

  private stage: Konva.Stage;
  private layer: Konva.Layer;
  private waveform: Konva.Line;
  private anim: Konva.Animation;

  private peakValuesL: number[];
  private peakValuesR: number[];

  private color = 'orange';

  private markers: Marker[] = [];

  constructor(
    waveformView: HTMLDivElement,
    stereoAnalyser: StereoAnalyserObject
  ) {
    this.waveformView = waveformView;
    this.stereoAnalyser = stereoAnalyser;

    this.stage = new Konva.Stage({
      container: this.waveformView,
      width: this.waveformView.clientWidth,
      height: this.waveformView.clientHeight,
    });
    this.layer = new Konva.Layer();
    this.stage.add(this.layer);
    this.waveform = new Konva.Line();
    this.layer.add(this.waveform);

    this.anim = new Konva.Animation(() => {
      this.drawWaveform();
    }, this.layer);

    this.peakValuesL = new Array(this.waveformView.clientWidth).fill(0);
    this.peakValuesR = new Array(this.waveformView.clientWidth).fill(0);

    this.start();
  }

  public start() {
    this.anim.start();
  }

  public stop() {
    this.anim.stop();
  }

  private drawWaveform() {
    const bufferLength = this.stereoAnalyser.analysers[0].frequencyBinCount;
    const dataArrayL = new Float32Array(bufferLength);
    const dataArrayR = new Float32Array(bufferLength);
    this.stereoAnalyser.analysers[0].getFloatTimeDomainData(dataArrayL);
    this.stereoAnalyser.analysers[1].getFloatTimeDomainData(dataArrayR);

    const maxValueL = Math.max(...dataArrayL);
    const maxValueR = Math.max(...dataArrayR);

    this.peakValuesL.push(maxValueL);
    this.peakValuesR.push(maxValueR);

    if (this.peakValuesL.length > this.waveformView.clientWidth) {
      this.peakValuesL.shift();
      this.peakValuesR.shift();
    }

    const points = [] as number[];
    points.push(0, this.waveformView.clientHeight / 2);
    for (let i = 0; i < this.peakValuesL.length; i++) {
      points.push(
        i,
        (this.peakValuesR[i] / 2) * this.waveformView.clientHeight +
          this.waveformView.clientHeight / 2
      );
    }
    for (let i = this.peakValuesL.length - 1; i >= 0; i--) {
      points.push(
        i,
        (-this.peakValuesL[i] / 2) * this.waveformView.clientHeight +
          this.waveformView.clientHeight / 2
      );
    }
    points.push(0, this.waveformView.clientHeight / 2);

    this.waveform.points(points);
    this.waveform.stroke(this.color);
    this.waveform.fill(this.color);
    this.waveform.strokeWidth(1);
    this.waveform.closed(true);

    this.markers.forEach((marker) => {
      marker.xPos--;
      marker.line.points([
        marker.xPos,
        0,
        marker.xPos,
        this.waveformView.clientHeight,
      ]);
      if (marker.xPos < 0) {
        this.deleteMarker(marker);
      }
    });
  }

  public addMarker(color: string) {
    this.markers.push({
      xPos: this.waveformView.clientWidth - 1,
      color: color,
      line: new Konva.Line({
        points: [
          this.waveformView.clientWidth - 1,
          0,
          this.waveformView.clientWidth - 1,
          this.waveformView.clientHeight,
        ],
        stroke: color,
        strokeWidth: 2,
      }),
    });

    this.layer.add(this.markers[this.markers.length - 1].line);
  }

  private deleteMarker(marker: Marker) {
    marker.line.destroy();
    this.markers = this.markers.filter((m) => m !== marker);
  }

  public setWaveformColor(color: string) {
    this.color = color;
  }
}
