export class NormalizableRange {
  constructor(
    public min: number,
    public max: number,
    public skew: number = 1
  ) {}

  public setRange(min: number, max: number, skew = 1) {
    this.min = min;
    this.max = max;

    if (skew !== 1) {
      this.skew = skew;
    }
  }

  public setSkew(skew: number) {
    this.skew = skew;
  }

  public scaleTo0to1(value: number) {
    const clippedValue = Math.min(Math.max(value, this.min), this.max);
    return (clippedValue - this.min) / (this.max - this.min);
  }

  public scaleFrom0to1(value: number) {
    const clippedValue = Math.min(Math.max(value, 0), 1);
    return clippedValue * (this.max - this.min) + this.min;
  }

  public logScaleTo0to1(value: number) {
    const clippedValue = Math.min(Math.max(value, this.min), this.max);
    const scaledValue = Math.pow(
      this.skew,
      (clippedValue - this.min) / (this.max - this.min)
    );
    return (scaledValue - 1) / (this.skew - 1);
  }

  public logScaleFrom0to1(value: number) {
    const clippedValue = Math.min(Math.max(value, 0), 1);
    const unscaledValue =
      Math.log(clippedValue * (this.skew - 1) + 1) / Math.log(this.skew);
    return unscaledValue * (this.max - this.min) + this.min;
  }

  public logScaleWithinSameRange(value: number) {
    const clippedValue = Math.min(Math.max(value, this.min), this.max);
    const scaledValue = Math.pow(
      this.skew,
      (clippedValue - this.min) / (this.max - this.min)
    );
    const newScaledValue = (scaledValue - 1) / (this.skew - 1);
    const range = this.max - this.min;
    return newScaledValue * range + this.min;
  }

  public scaleToAnotherRange(value: number, otherRange: NormalizableRange) {
    const scaledValue = this.scaleTo0to1(value);
    return otherRange.scaleFrom0to1(scaledValue);
  }
}
