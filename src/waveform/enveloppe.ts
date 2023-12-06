import Konva from 'konva';
import { NormalizableRange } from './normalizable-range';
import { Waveform } from './waveform';

export interface EnveloppePoint {
  time: number;
  gainDb: number;
}

export class Enveloppe {
  waveform: Waveform;

  showEnvelope: boolean;
  private enveloppeLayer: Konva.Layer;
  enveloppePoints: EnveloppePoint[];
  private enveloppePointsDisplayCircles: Konva.Circle[];
  private enveloppePointsDragCircles: Konva.Circle[];
  private enveloppePointsLine: Konva.Line[];
  private enveloppePointsValueLayer: Konva.Layer;
  private enveloppePointsValueText: Konva.Text;
  private enveloppePointsValueTextBackground: Konva.Rect;
  private enveloppeDragTimeoutID: ReturnType<typeof setTimeout> | null;
  enveloppePointsDisplayCircleSize: number;
  enveloppePointsDisplayCircleFillColor: string;
  enveloppePointsDisplayCircleStrokeColor: string;
  enveloppePointsDragCircleSize: number;
  private enveloppePointsNormRange: NormalizableRange;
  enveloppeLineColor: string;
  enveloppeLineSize: number;
  enveloppeMaxGainDb: number;
  enveloppeMinGainDb: number;

  constructor(waveform: Waveform) {
    this.waveform = waveform;

    this.enveloppeLayer = new Konva.Layer();
    this.enveloppePoints = [] as EnveloppePoint[];
    this.enveloppePointsDisplayCircles = [] as Konva.Circle[];
    this.enveloppePointsDragCircles = [] as Konva.Circle[];
    this.enveloppePointsLine = [] as Konva.Line[];
    this.enveloppePointsDisplayCircleSize = 7;
    this.enveloppePointsDisplayCircleFillColor = 'red';
    this.enveloppePointsDisplayCircleStrokeColor = 'black';
    this.enveloppePointsDragCircleSize = 15;
    this.enveloppeLineColor = 'red';
    this.enveloppeLineSize = 2;
    this.showEnvelope = false;
    this.enveloppeMaxGainDb = 24;
    this.enveloppeMinGainDb = -100;
    this.enveloppePointsValueLayer = new Konva.Layer();
    this.enveloppePointsValueText = new Konva.Text();
    this.enveloppePointsValueTextBackground = new Konva.Rect();
    this.enveloppeDragTimeoutID = null;
    this.enveloppePointsNormRange = new NormalizableRange(-60, 0, 15);
    this.enveloppePointsValueLayer.add(this.enveloppePointsValueTextBackground);
    this.enveloppePointsValueLayer.add(this.enveloppePointsValueText);

    this.waveform.stage.add(this.enveloppePointsValueLayer);
    this.waveform.stage.add(this.enveloppeLayer);
  }

  setShowEnveloppe(showEnvelope: boolean) {
    this.showEnvelope = showEnvelope;
    this.waveform.updateWaveform();
  }

  setEnveloppePoints(enveloppePoints: EnveloppePoint[]) {
    this.enveloppeLayer.removeChildren();
    this.enveloppePoints = enveloppePoints;

    this.createEnveloppePointsCircles();
    this.createEnveloppesPointsLines();

    this.updateEnveloppePoints();
  }

  private createEnveloppePointsCircles() {
    this.enveloppePointsDisplayCircles = [];
    this.enveloppePointsDragCircles = [];
    for (let i = 0; i < this.enveloppePoints.length; i++) {
      const point = this.enveloppePoints[i];
      const x = this.waveform.timeToX(point.time);
      const y = this.envGainDbToY(point.gainDb);
      const circle = new Konva.Circle({
        radius: this.enveloppePointsDisplayCircleSize,
        fill: this.enveloppePointsDisplayCircleFillColor,
        stroke: this.enveloppePointsDisplayCircleStrokeColor,
        strokeWidth: 1,
      });
      this.enveloppePointsDisplayCircles.push(circle);
      this.enveloppeLayer.add(circle);

      const dragCircle = new Konva.Circle({
        radius: this.enveloppePointsDragCircleSize,
        fill: 'transparent',
      });
      this.enveloppePointsDragCircles.push(dragCircle);
      this.enveloppeLayer.add(dragCircle);

      dragCircle.draggable(true);
      dragCircle.dragBoundFunc((pos) => {
        return this.getEnveloppeCircleDragBoundFunc(pos, i);
      });

      dragCircle.on('dragmove', () => {
        this.handleEnveloppeCircleDragMove(dragCircle);
      });

      dragCircle.on('dbltap dblclick', () => {
        this.handleEnveloppeCircleDoubleCkick(dragCircle);
      });
    }
  }

  private createEnveloppesPointsLines() {
    this.enveloppePointsLine = [];
    for (let i = 0; i < this.enveloppePointsDisplayCircles.length - 1; i++) {
      const line = new Konva.Line({
        stroke: this.enveloppeLineColor,
        strokeWidth: this.enveloppeLineSize,
      });
      this.enveloppePointsLine.push(line);
      this.enveloppeLayer.add(line);
    }
  }

  private getEnveloppeCircleDragBoundFunc(
    pos: { x: number; y: number },
    i: number
  ) {
    const newY = Math.max(0, Math.min(pos.y, this.waveform.stage.height()));
    let newX = pos.x;

    if (i === 0) newX = this.waveform.timeToX(0);
    else if (i === this.enveloppePoints.length - 1)
      newX = this.waveform.timeToX(this.waveform.soundDuration);

    const previousPoint = this.enveloppePoints[i - 1] ?? null;
    if (previousPoint && newX <= this.waveform.timeToX(previousPoint.time)) {
      newX = this.waveform.timeToX(previousPoint.time) + 1;
    }

    const nextPoint = this.enveloppePoints[i + 1] ?? null;
    if (nextPoint && newX >= this.waveform.timeToX(nextPoint.time)) {
      newX = this.waveform.timeToX(nextPoint.time) - 1;
    }
    return {
      x: newX,
      y: newY,
    };
  }

  private handleEnveloppeCircleDoubleCkick(dragCircle: Konva.Circle) {
    const index = this.enveloppePointsDragCircles.indexOf(dragCircle);

    if (index === 0 || index === this.enveloppePoints.length - 1) return;

    this.enveloppePoints.splice(index, 1);
    this.setEnveloppePoints(this.enveloppePoints);

    const event = new CustomEvent('enveloppePointsChanged');
    this.waveform.eventTarget.dispatchEvent(event);
  }

  private handleEnveloppeCircleDragMove(dragCircle: Konva.Circle) {
    let newGainDb = this.envYToGainDb(dragCircle.y());
    const newTime = this.waveform.xToTime(dragCircle.x());

    if (newGainDb === Number.NEGATIVE_INFINITY) newGainDb = -100;

    const index = this.enveloppePointsDragCircles.indexOf(dragCircle);
    this.enveloppePoints[index] = {
      time: newTime,
      gainDb: newGainDb,
    };

    this.enveloppePoints.sort((a, b) => a.time - b.time);
    this.updateEnveloppePoints();

    const event = new CustomEvent('enveloppePointsChanged');
    this.waveform.eventTarget.dispatchEvent(event);

    this.drawDraggedEnveloppePointValue(dragCircle, newGainDb);
  }

  private drawDraggedEnveloppePointValue(
    dragCircle: Konva.Circle,
    newGainDb: number
  ) {
    const text = this.enveloppePointsValueText;
    this.enveloppePointsValueLayer.visible(true);
    text.text(`${newGainDb.toFixed(1)}dB`);
    text.fill('white');

    const textX = dragCircle.x() - text.width() / 2;
    const textY = dragCircle.y() - 25;
    text.x(textX);
    text.y(textY);

    const background = this.enveloppePointsValueTextBackground;
    background.x(textX - 2);
    background.y(textY - 2);
    background.width(text.width() + 4);
    background.height(text.height() + 4);
    background.fill('red');
    background.opacity(0.5);
    background.stroke('black');
    background.strokeWidth(1);
    background.cornerRadius(5);

    if (this.enveloppeDragTimeoutID !== null) {
      clearTimeout(this.enveloppeDragTimeoutID);
    }
    this.enveloppeDragTimeoutID = setTimeout(() => {
      this.enveloppePointsValueLayer.visible(false);
      this.enveloppeDragTimeoutID = null;
    }, 500);
  }

  updateEnveloppePoints() {
    for (let i = 0; i < this.enveloppePoints.length; i++) {
      const point = this.enveloppePoints[i];
      const x = this.waveform.timeToX(point.time);
      const y = this.envGainDbToY(point.gainDb);

      const circle = this.enveloppePointsDisplayCircles[i];
      circle.x(x);
      circle.y(y);
      const dragCircle = this.enveloppePointsDragCircles[i];
      dragCircle.x(x);
      dragCircle.y(y);
    }

    for (let i = 0; i < this.enveloppePointsDisplayCircles.length - 1; i++) {
      this.enveloppePointsLine[i].points([
        this.enveloppePointsDisplayCircles[i].x(),
        this.enveloppePointsDisplayCircles[i].y(),
        this.enveloppePointsDisplayCircles[i + 1].x(),
        this.enveloppePointsDisplayCircles[i + 1].y(),
      ]);
    }

    this.waveform.updateWaveform();
  }

  public getEnveloppeValueAtTime(time: number) {
    const enveloppePoints = this.enveloppePoints;

    if (enveloppePoints.length === 0) return 0;
    if (time <= enveloppePoints[0].time) return enveloppePoints[0].gainDb;
    if (time >= enveloppePoints[enveloppePoints.length - 1].time)
      return enveloppePoints[enveloppePoints.length - 1].gainDb;

    for (let i = 0; i < enveloppePoints.length - 1; i++) {
      const point1 = enveloppePoints[i];
      const point2 = enveloppePoints[i + 1];
      if (time >= point1.time && time <= point2.time) {
        const timeDelta = point2.time - point1.time;
        const gainDbDelta = point2.gainDb - point1.gainDb;
        const timeRatio = (time - point1.time) / timeDelta;
        const gainDb = point1.gainDb + timeRatio * gainDbDelta;
        return gainDb;
      }
    }
    return 0;
  }

  private envGainDbToY(gainDb: number) {
    const height = this.waveform.stage.height();
    const middleY = height / 2;

    if (gainDb === 0) return middleY;
    else if (gainDb > 0) {
      return middleY - (gainDb / this.enveloppeMaxGainDb) * middleY;
    } else if (gainDb < 0) {
      const valueFromScale =
        this.enveloppePointsNormRange.logScaleTo0to1(gainDb);
      const y = middleY * (1 + (1 - valueFromScale));
      return y;
    }
    return middleY;
  }

  private envYToGainDb(y: number) {
    const height = this.waveform.stage.height();
    const middleY = height / 2;

    if (y === middleY) return 0;
    else if (y < middleY) {
      return ((middleY - y) / middleY) * this.enveloppeMaxGainDb;
    } else if (y > middleY) {
      const valueToScale = 1 - (y - middleY) / middleY;
      return this.enveloppePointsNormRange.logScaleFrom0to1(valueToScale);
    }
    return 0;
  }

  public getEnveloppePoints(): EnveloppePoint[] {
    return this.enveloppePoints;
  }
}
