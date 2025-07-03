// Layout constants for consistent spacing and sizing across the application
export const LAYOUT_CONSTANTS = {
  container: {
    padding: 16, // Tailwind p-4
  },
  header: {
    height: 140, // Total height of page header including title, controls, and stats
    marginBottom: 8, // Tailwind mb-2
  },
  chart: {
    titleHeight: 30, // Height reserved for chart title
    border: 2,       // 1px × 2 sides
    padding: 8,      // 4px × 2 sides (Tailwind p-1)
    gap: 8,          // Tailwind gap-2 between charts in grid
  },
  maxDimensions: {
    width: 1200,
    height: 650,
  },
  progressBar: {
    height: 40, // Including mb-2 margin
  },
} as const;

// Calculated values for convenience
export const CHART_SPACING = {
  // Total padding and border for a single chart
  paddingAndBorder: LAYOUT_CONSTANTS.chart.border + LAYOUT_CONSTANTS.chart.padding,
  // Container padding for both sides
  containerPadding: LAYOUT_CONSTANTS.container.padding * 2,
};