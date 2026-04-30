export type PrinterMode = 'physical' | 'system' | 'virtual' | 'disabled';
export type LabelFormat = '62x29' | '50x30' | 'a4-sheet';
export type Orientation = 'portrait' | 'landscape';

export interface PrintSettings {
  mode: PrinterMode;
  format: LabelFormat;
  orientation: Orientation;
  restaurantName: string;
}

export type PrintCapability = 'supported' | 'unsupported' | 'unknown';
