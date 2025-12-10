export type DrawMode = 'single' | 'paired' | 'groups' | 'interactive';
export type InteractiveMode = 'wheel' | 'race' | 'marble' | 'card';

export interface HistoryEntry {
  id: number;
  result: string;
  mode: DrawMode;
  timestamp: string;
  groups?: string[][];
}

export interface AppState {
  names: string[];
  tasks: string[];
  history: HistoryEntry[];
  isNameNoRepeat: boolean;
  availableNamesIndices: number[];
  isTaskNoRepeat: boolean;
  availableTasksIndices: number[];
  mode: DrawMode;
  interactiveMode: InteractiveMode;
  numGroups: number;
}

export const WHEEL_COLORS = [
  '#fb923c', // Orange
  '#a78bfa', // Purple
  '#34d399', // Emerald/Green
  '#f87171', // Red
  '#60a5fa', // Blue
  '#fde047', // Yellow
  '#e879f9', // Fuchsia
  '#4ade80'  // Green
];
