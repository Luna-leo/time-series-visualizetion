// Chart color palette
export const CHART_COLORS = [
  { fill: 'rgba(59, 130, 246, 0.6)', stroke: 'rgba(59, 130, 246, 1)' },    // Blue
  { fill: 'rgba(239, 68, 68, 0.6)', stroke: 'rgba(239, 68, 68, 1)' },      // Red
  { fill: 'rgba(34, 197, 94, 0.6)', stroke: 'rgba(34, 197, 94, 1)' },      // Green
  { fill: 'rgba(251, 146, 60, 0.6)', stroke: 'rgba(251, 146, 60, 1)' },    // Orange
  { fill: 'rgba(168, 85, 247, 0.6)', stroke: 'rgba(168, 85, 247, 1)' },    // Purple
  { fill: 'rgba(236, 72, 153, 0.6)', stroke: 'rgba(236, 72, 153, 1)' },    // Pink
];

// Chart styling defaults
export const CHART_STYLES = {
  axes: {
    stroke: '#ccc',
    grid: {
      stroke: '#eee',
      width: 1,
    },
  },
  points: {
    defaultSize: 6,
    smallSize: 4,
    largeSize: 8,
    strokeWidth: 1,
  },
  line: {
    defaultWidth: 2,
    thinWidth: 1,
    thickWidth: 3,
  },
};

// Chart dimension defaults
export const CHART_DIMENSIONS = {
  default: {
    width: 800,
    height: 600,
  },
  small: {
    width: 400,
    height: 300,
  },
  large: {
    width: 1200,
    height: 800,
  },
  // Minimum sizes to prevent charts from becoming too small
  minimum: {
    width: 200,
    height: 150,
  },
};

// Grid layout configurations
export const GRID_CONFIGURATIONS = {
  '1x1': { rows: 1, cols: 1 },
  '2x2': { rows: 2, cols: 2 },
  '3x3': { rows: 3, cols: 3 },
  '4x4': { rows: 4, cols: 4 },
} as const;

// Data density multipliers
export const DENSITY_MULTIPLIERS = {
  'full': 1,      // 1 second intervals
  'medium': 2,    // 2 second intervals  
  'low': 5,       // 5 second intervals
} as const;

// Animation and transition durations
export const TRANSITIONS = {
  chartLoad: 300,
  seriesToggle: 150,
  layoutChange: 200,
} as const;