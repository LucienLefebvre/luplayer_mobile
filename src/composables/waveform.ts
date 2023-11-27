import { SoundModel } from 'src/components/models';
import { Ref } from 'vue';
import Konva from 'konva';
import { KonvaEventObject } from 'konva/lib/Node';
import { dbToGain } from './math-helpers';
import { debounce } from 'quasar';

const SAMPLES_PER_CHUNK = 1000;
const NUMBER_OF_PIXELS_PER_LINE = 1;
const TOUCH_MOUSE_CLICK_TIME = 200;
const TOUCH_HOLD_TIME = 500;
const FRAME_RATE = 25;

export class Waveform {
  private waveformView: Ref<HTMLDivElement>;

  public eventTarget = new EventTarget();

  private sound: SoundModel;
  private stage: Konva.Stage;
  private layer: Konva.Layer;

  private globalWaveformChunks: Float32Array;
  private waveformCalculated: boolean;
  private diplayWaveformChunks: Float32Array;
  private displayChunkSize: number;

  private verticalZoomFactor: number;
  private horizontalZoomFactor: number;

  private audioGain: number;

  private startTime: number;
  private endTime: number;
  private waveformShouldBeRedrawn: boolean;

  public isPlayPositionAlwaysOnCenter: boolean;
  public isDraggable: boolean;
  public isZoomable: boolean;

  public touchMouseDownTime: number;
  private touchHoldTimeout: ReturnType<typeof setTimeout> | null;

  private isDragging: boolean;
  private dragStartX: number;
  private dragStartY: number;
  private waveformDragStartTime: number;
  private waveformDragEndTime: number;
  private initialTouchDistance: number;
  private oldTimeDeltaX: number;

  constructor(waveformView: Ref<HTMLDivElement>, sound: SoundModel) {
    this.eventTarget = new EventTarget();

    this.waveformView = waveformView;
    this.sound = sound;

    this.verticalZoomFactor = 1;

    this.stage = new Konva.Stage({
      container: this.waveformView.value,
      width: this.waveformView.value.clientWidth,
      height: this.waveformView.value.clientHeight,
    });

    this.globalWaveformChunks = new Float32Array(0);
    this.diplayWaveformChunks = new Float32Array(0);
    this.displayChunkSize = 0;
    this.waveformCalculated = false;
    this.waveformShouldBeRedrawn = false;

    this.audioGain = dbToGain(sound.trimGain);

    this.layer = new Konva.Layer();
    this.stage.add(this.layer);

    this.startTime = 0;
    this.endTime = sound.duration;
    this.horizontalZoomFactor = 1;

    this.isPlayPositionAlwaysOnCenter = false;
    this.isZoomable = true;
    this.isDraggable = true;
    this.isDragging = false;

    this.audioGain = dbToGain(sound.trimGain);

    this.touchMouseDownTime = 0;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.waveformDragStartTime = 0;
    this.waveformDragEndTime = sound.duration;
    this.initialTouchDistance = 0;
    this.oldTimeDeltaX = 0;
    this.touchHoldTimeout = null;

    this.registerEventsListeners();
    this.registerMouseEvents();
    this.initializeResizeObserver();

    const anim = new Konva.Animation((frame) => {
      this.drawWaveform();
    }, this.layer);

    anim.start();
  }

  public addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ) {
    this.eventTarget.addEventListener(type, listener, options);
  }

  public removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions
  ) {
    this.eventTarget.removeEventListener(type, listener, options);
  }

  private registerEventsListeners() {
    if (!this.sound.audioElement) {
      return;
    }
    this.sound.audioElement.addEventListener('play', () => {
      this.waveformShouldBeRedrawn = true;
    });
  }

  private registerMouseEvents() {
    this.stage?.on('mousedown touchstart', (e) => {
      const debounceClick = debounce(
        () => {
          console.log('click');
          this.handleMouseTouchStart(e);
        },
        10,
        true
      );

      debounceClick();
    });

    this.stage?.on('mouseup touchend', (e) => {
      clearTimeout(this.touchHoldTimeout!);
      if (Date.now() - this.touchMouseDownTime < TOUCH_MOUSE_CLICK_TIME) {
        const event = new CustomEvent('click');
        this.eventTarget.dispatchEvent(event);
      }
      this.isDragging = false;
    });

    this.stage?.on('mousemove touchmove', (e) => {
      if (e.evt.touches && e.evt.touches.length > 1) {
        this.handleTouchPan(e);
      } else if (this.isDragging) {
        this.handleDrag();
      }
    });

    this.stage?.on('wheel', (e) => {
      this.handleMouseWheel(e.evt);
    });
  }

  public async calculateWaveformChunks() {
    const chunks: number[] = [];
    try {
      const buffer = await fetch(this.sound.url).then((response) =>
        response.arrayBuffer()
      );
      const audioBuffer = await new AudioContext().decodeAudioData(buffer);

      const channelData = audioBuffer.getChannelData(0);

      const numberOfChunks = Math.ceil(channelData.length / SAMPLES_PER_CHUNK);
      for (let i = 0; i < numberOfChunks; i++) {
        const start = i * SAMPLES_PER_CHUNK;
        let max = Number.NEGATIVE_INFINITY;
        for (let j = 0; j < SAMPLES_PER_CHUNK; j++) {
          if (start + j >= channelData.length) break;
          const sampleValue = Math.abs(channelData[start + j]);
          if (sampleValue > max) max = sampleValue;
        }
        chunks.push(max);
      }
    } catch (error) {
      console.error('Error:', error);
    }

    this.globalWaveformChunks = new Float32Array(chunks);
    this.waveformCalculated = true;

    this.waveformShouldBeRedrawn = true;
    this.calculateYValueArrayFromChunks();
  }

  private async calculateYValueArrayFromChunks() {
    const dataArray: number[] = [];

    const clippedWaveformChunks = this.globalWaveformChunks.slice(
      this.globalWaveformChunks.length * (this.startTime / this.sound.duration),
      this.globalWaveformChunks.length * (this.endTime / this.sound.duration)
    );

    this.displayChunkSize = clippedWaveformChunks.length / this.stage.width();

    let lastMax = 0;
    for (let i = 0; i < this.stage.width(); i++) {
      const start = i * this.displayChunkSize;
      const end = start + this.displayChunkSize;
      const currentChunk = clippedWaveformChunks.slice(start, end);
      let max = Math.max(...currentChunk);
      if (max === Number.NEGATIVE_INFINITY) max = lastMax;
      dataArray.push(max);
      lastMax = max;
    }

    this.diplayWaveformChunks = new Float32Array(dataArray);
  }

  private drawWaveform() {
    if (
      !this.waveformCalculated ||
      this.sound.waveform === null ||
      this.stage.height() < 11 ||
      !this.waveformShouldBeRedrawn ||
      this.diplayWaveformChunks === null
    ) {
      return;
    }

    const width = this.stage.width();
    const height = this.stage.height();
    const ratio =
      dbToGain(this.sound.trimGain) * this.verticalZoomFactor * this.audioGain;
    const middleY = height / 2;

    this.layer.removeChildren();

    const soundProgress =
      (this.sound.audioElement.currentTime - this.startTime) /
      (this.endTime - this.startTime);
    const progressX = soundProgress * width;

    const playedPoints = [];
    const remainingPoints = [];

    for (let i = 0; i < width; i += NUMBER_OF_PIXELS_PER_LINE) {
      const yValue = middleY + this.diplayWaveformChunks[i] * middleY * ratio;

      if (i < progressX) {
        playedPoints.push(i, Number.isNaN(yValue) ? middleY : yValue);
      } else {
        remainingPoints.push(i, Number.isNaN(yValue) ? middleY : yValue);
      }
    }

    for (let i = width - 1; i > 0; i -= NUMBER_OF_PIXELS_PER_LINE) {
      const yValue = middleY - this.diplayWaveformChunks[i] * middleY * ratio;
      if (i < progressX) {
        playedPoints.push(i, Number.isNaN(yValue) ? middleY : yValue);
      } else {
        remainingPoints.push(i, Number.isNaN(yValue) ? middleY : yValue);
      }
    }

    const playedWaveformColor = this.sound.remainingTime < 5 ? 'red' : 'green';
    const playedLine = new Konva.Line({
      points: playedPoints,
      fill: playedWaveformColor,
      closed: true,
    });

    const remainingWaveformColor = this.sound.isSelected
      ? 'orange'
      : 'rgb(40, 134, 189)';
    const remainingLine = new Konva.Line({
      points: remainingPoints,
      fill: remainingWaveformColor,
      closed: true,
    });

    this.layer.add(playedLine);
    this.layer.add(remainingLine);
    this.layer.draw();

    if (!this.sound.isPlaying) {
      this.waveformShouldBeRedrawn = false;
    }
  }

  public updateWaveform() {
    this.calculateYValueArrayFromChunks().then(() => {
      this.waveformShouldBeRedrawn = true;
    });
  }

  private initializeResizeObserver() {
    const handleResized = debounce(() => {
      this.stage.width(this.waveformView.value.clientWidth);
      this.updateWaveform();
    }, 100);

    const resizeObserver = new ResizeObserver(handleResized);
    resizeObserver.observe(this.waveformView.value);
  }

  private handleMouseTouchStart(e: KonvaEventObject<any>) {
    if (e.evt.touches && e.evt.touches.length > 1) {
      const touch1 = e.evt.touches[0];
      const touch2 = e.evt.touches[1];

      const touch1X = touch1.clientX;
      const touch2X = touch2.clientX;

      this.initialTouchDistance = Math.abs(touch1X - touch2X);
    } else {
      this.touchHoldTimeout = setTimeout(() => {
        const event = new CustomEvent('touchHold');
        this.eventTarget.dispatchEvent(event);
      }, TOUCH_HOLD_TIME);

      this.touchMouseDownTime = Date.now();
      this.isDragging = true;
      this.dragStartX = this.stage!.getPointerPosition()?.x ?? 0;
      this.dragStartY = this.stage!.getPointerPosition()?.y ?? 0;

      this.waveformDragStartTime = this.startTime;
      this.waveformDragEndTime = this.endTime;
    }
  }

  private handleDrag() {
    const pointerPosX = this.stage!.getPointerPosition()?.x ?? 0;
    const pointerPosY = this.stage!.getPointerPosition()?.y ?? 0;
    const deltaX = pointerPosX - this.dragStartX;
    const deltaY = pointerPosY - this.dragStartY;

    if (this.isDraggable) {
      const timeDeltaX = -(
        (deltaX! / this.stage!.width()) *
        this.sound.duration
      );
      const newStartTime =
        timeDeltaX / this.horizontalZoomFactor + this.waveformDragStartTime;
      const newEndTime =
        timeDeltaX / this.horizontalZoomFactor + this.waveformDragEndTime;

      if (newStartTime >= 0 && newEndTime <= this.sound.duration) {
        this.startTime = newStartTime;
        this.endTime = newEndTime;
        this.updateWaveform();
      }
    }
    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
      clearTimeout(this.touchHoldTimeout!);
    }
  }

  private handleMouseWheel(event: WheelEvent) {
    if (this.isZoomable) {
      if (event.deltaY < 0) {
        this.waveformZoom('in');
      } else {
        this.waveformZoom('out');
      }
    }
  }

  private handleTouchPan(e: KonvaEventObject<any>) {
    const touch1 = e.evt.touches[0];
    const touch2 = e.evt.touches[1];

    const touch1X = touch1.clientX;
    const touch2X = touch2.clientX;

    const deltaX = Math.abs(touch1X - touch2X) - this.initialTouchDistance;

    const timeDeltaX = -((deltaX! / this.stage!.width()) * this.sound.duration);

    const zoomDirection = this.oldTimeDeltaX - timeDeltaX > 0 ? 'in' : 'out';
    if (zoomDirection === 'in' && this.displayChunkSize < 0.1) return;

    const newStartTime = this.waveformDragStartTime - timeDeltaX / 2;
    const newEndTime = this.waveformDragEndTime + timeDeltaX / 2;

    this.startTime = Math.max(0, newStartTime);
    this.endTime = Math.min(this.sound.duration, newEndTime);

    this.updateWaveform();
    this.updateZoomFactor();
    this.oldTimeDeltaX = timeDeltaX;
    console.log(deltaX);
    if (Math.abs(deltaX) > 5) {
      clearTimeout(this.touchHoldTimeout!);
    }
  }

  private xToTime(xPos: number) {
    return (xPos / this.stage.width()) * this.sound.duration;
  }

  private waveformZoom(direction: 'in' | 'out', coef = 1.2) {
    if (direction === 'out' && this.horizontalZoomFactor < 1.2) {
      this.setZoomFactor(1);
      return;
    }

    const centerTime = (this.startTime + this.endTime) / 2;
    const timeDelta = (this.endTime - this.startTime) / 2;

    coef = direction === 'in' ? 1 / coef : coef;
    const newStartTime = centerTime - timeDelta * coef;
    const newEndTime = centerTime + timeDelta * coef;

    this.startTime = Math.max(0, newStartTime);
    this.endTime = Math.min(this.sound.duration, newEndTime);

    this.updateZoomFactor();
    this.updateWaveform();
  }

  private setZoomFactor(newZoomFactor: number) {
    if (newZoomFactor === this.horizontalZoomFactor) return;
    const oldZoomFactor = this.horizontalZoomFactor;
    this.horizontalZoomFactor = newZoomFactor;
    if (this.horizontalZoomFactor === 1) {
      this.startTime = 0;
      this.endTime = this.sound.duration;
    } else {
      const centerTime = (this.startTime + this.endTime) / 2;
      const timeDelta = (this.endTime - this.startTime) / 2;
      this.startTime =
        centerTime - timeDelta * (oldZoomFactor / this.horizontalZoomFactor);
      this.endTime =
        centerTime + timeDelta * (oldZoomFactor / this.horizontalZoomFactor);
    }
    this.updateWaveform();
  }

  private updateZoomFactor() {
    this.horizontalZoomFactor =
      1 / ((this.endTime - this.startTime) / this.sound.duration);
  }

  public setVerticalZoomFactor(newVerticalZoomFactor: number) {
    this.verticalZoomFactor = newVerticalZoomFactor;
    this.updateWaveform();
  }

  public setAudioGain(newAudioGain: number) {
    this.audioGain = newAudioGain;
    this.updateWaveform();
  }

  public setHeight(newHeight: number) {
    this.stage.height(newHeight);
    this.updateWaveform();
  }
}
