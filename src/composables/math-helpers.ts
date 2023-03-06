export function dbToGain(db: number) {
  return Math.exp(db * (Math.log(10.0) / 20.0));
}

export function gainToDb(gain: number) {
  return 20.0 * Math.log10(gain);
}
