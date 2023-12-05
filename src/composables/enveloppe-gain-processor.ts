declare const AudioWorkletProcessor: any;
declare const registerProcessor: any;

import { EnveloppePoint } from '../components/models';

class EnveloppeGainProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.port.onmessage = (event: any) => {
      console.log(event);
    };
  }
  process(inputs: any, outputs: any, parameters: any) {
    const input = inputs[0];
    const output = outputs[0];

    for (let channel = 0; channel < input.length; ++channel) {
      const inputChannel = input[channel];
      const outputChannel = output[channel];

      for (let i = 0; i < inputChannel.length; ++i) {
        outputChannel[i] = inputChannel[i];
      }
    }

    // Keep the processor alive by returning true
    return true;
  }

  getEnveloppeValueAtTime(time: number, eP: EnveloppePoint[]) {
    const enveloppePoints = eP;

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
}

registerProcessor('enveloppe-gain-processor', EnveloppeGainProcessor);
