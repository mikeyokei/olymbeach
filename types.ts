export interface FaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
  id?: number; // For tracking consistency if we implemented robust tracking
}

export interface Theme {
  id: string;
  name: string;
  backgroundImageUrl: string;
  overlayColor: string; // Color for the pipe/border
}

export enum AppStatus {
  LOADING_MODEL = 'LOADING_MODEL',
  WAITING_FOR_CAMERA = 'WAITING_FOR_CAMERA',
  READY = 'READY',
  ERROR = 'ERROR'
}
