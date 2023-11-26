import Konva from 'konva';
import { SoundModel, WaveformParams } from 'src/components/models';
import { dbToGain } from './math-helpers';

const SAMPLES_PER_CHUNK = 200;

export async function calculateWaveformChunks(
  waveform: Float32Array
): Promise<Float32Array> {
  const startTime = Date.now();
  const chunks: number[] = [];
  const numberOfChunks = Math.ceil(waveform.length / SAMPLES_PER_CHUNK);
  console.log(`Calculating waveform with ${numberOfChunks} chunks.`);
  for (let i = 0; i < numberOfChunks; i++) {
    const start = i * SAMPLES_PER_CHUNK;
    let max = Number.NEGATIVE_INFINITY;
    for (let j = 0; j < SAMPLES_PER_CHUNK; j++) {
      if (start + j >= waveform.length) break;
      const sampleValue = Math.abs(waveform[start + j]);
      if (sampleValue > max) max = sampleValue;
    }
    chunks.push(max);
  }
  const endTime = Date.now();
  console.log(
    `Waveform calculated in ${endTime - startTime}ms. ${numberOfChunks} chunks.`
  );
  return new Float32Array(chunks);
}

export async function calculateYValueArrayFromChunks(
  waveformChunks: Float32Array,
  numberOfValues: number,
  startTime: number,
  endTime: number,
  sound: SoundModel
): Promise<Float32Array> {
  const dataArray: number[] = [];

  const clippedWaveformChunks = waveformChunks.slice(
    waveformChunks.length * (startTime / sound.duration),
    waveformChunks.length * (endTime / sound.duration)
  );

  const chunkSize = clippedWaveformChunks.length / numberOfValues;

  let lastMax = 0;
  for (let i = 0; i < numberOfValues; i++) {
    const start = i * chunkSize;
    const end = start + chunkSize;
    const currentChunk = clippedWaveformChunks.slice(start, end);
    let max = Math.max(...currentChunk);
    if (max === Number.NEGATIVE_INFINITY) max = lastMax;
    dataArray.push(max);
    lastMax = max;
  }
  return new Float32Array(dataArray);
}

export function drawWaveform(params: WaveformParams) {
  if (!params.sound.waveformCalculated || params.sound.waveform === null)
    return;
  if (params.stage.height() < 11) return;
  if (!params.sound.waveformShouldBeRedrawn) return;

  const width = params.stage.width();
  const height = params.stage.height();
  const ratio = dbToGain(params.sound.trimGain) * params.verticalZoomFactor;
  const middleY = height / 2;

  params.layer.removeChildren();

  const startTime = params.startTime;
  const endTime = params.endTime;

  const soundProgress =
    (params.sound.audioElement.currentTime - startTime) / (endTime - startTime);
  const progressX = soundProgress * width;

  if (params.waveformChunks !== null) {
    const playedPoints = [];
    const remainingPoints = [];

    for (let i = 0; i < width; i++) {
      const yValue = middleY + params.waveformChunks[i] * middleY * ratio;

      if (i < progressX) {
        playedPoints.push(i, Number.isNaN(yValue) ? middleY : yValue);
      } else {
        remainingPoints.push(i, Number.isNaN(yValue) ? middleY : yValue);
      }
    }

    for (let i = width - 1; i > 0; i--) {
      const yValue = middleY - params.waveformChunks[i] * middleY * ratio;
      if (i < progressX) {
        playedPoints.push(i, Number.isNaN(yValue) ? middleY : yValue);
      } else {
        remainingPoints.push(i, Number.isNaN(yValue) ? middleY : yValue);
      }
    }

    const playedWaveformColor =
      params.sound.remainingTime < 5 ? 'red' : 'green';
    const playedLine = new Konva.Line({
      points: playedPoints,
      fill: playedWaveformColor,
      closed: true,
    });

    const remainingWaveformColor = params.sound.isSelected
      ? 'orange'
      : 'rgb(40, 134, 189)';
    const remainingLine = new Konva.Line({
      points: remainingPoints,
      fill: remainingWaveformColor,
      closed: true,
    });

    params.layer.add(playedLine);
    params.layer.add(remainingLine);
    params.layer.draw();

    if (!params.sound.isPlaying) {
      params.sound.waveformShouldBeRedrawn = false;
    }
  }
}
