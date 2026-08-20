export type LengthUnit = 'mm' | 'cm' | 'in';

const MM_PER_INCH = 25.4;
const MM_PER_CM = 10;
const PT_PER_INCH = 72;

export function toMm(value: number, unit: LengthUnit): number {
  switch (unit) {
    case 'mm':
      return value;
    case 'cm':
      return value * MM_PER_CM;
    case 'in':
      return value * MM_PER_INCH;
  }
}

export function fromMm(mm: number, unit: LengthUnit): number {
  switch (unit) {
    case 'mm':
      return mm;
    case 'cm':
      return mm / MM_PER_CM;
    case 'in':
      return mm / MM_PER_INCH;
  }
}

export function mmToPt(mm: number): number {
  return (mm / MM_PER_INCH) * PT_PER_INCH;
}

export function ptToMm(pt: number): number {
  return (pt / PT_PER_INCH) * MM_PER_INCH;
}

export function mmToPx(mm: number, dpi = 96): number {
  return (mm / MM_PER_INCH) * dpi;
}

export function pxToMm(px: number, dpi = 96): number {
  return (px / dpi) * MM_PER_INCH;
}
