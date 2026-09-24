/**
 * HeatmapLayer.jsx — CrimeCast Spatial Density Heat Layer
 *
 * A React-Leaflet bridge for leaflet.heat.
 * Imperatively attaches a L.heatLayer to the parent MapContainer and
 * correctly destroys it on unmount or prop change to prevent memory leaks.
 *
 * Design: God's Eye View tactical color palette (yellow → orange → red → deep-red)
 * aligned to the CrimeCast fraud probability scale.
 */
import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';

/**
 * Default heat layer configuration.
 * Gradient keys are normalized 0..1 intensity values.
 * Colors pulled from God's Eye tactical palette + CrimeCast orange/red threat scale.
 */
const DEFAULT_CONFIG = {
  radius:  38,
  blur:    22,
  maxZoom: 14,
  gradient: {
    0.0:  '#0a0a0f',   // God's Eye dark bg — zero intensity vanishes into map
    0.2:  '#1a1a2e',   // Near-zero — deep navy
    0.35: '#eab308',   // Watch tier — yellow (p < 0.10)
    0.60: '#f97316',   // Elevated tier — orange (p 0.10–0.15)
    0.82: '#ef4444',   // High tier — red (p >= 0.15)
    1.0:  '#ff0044',   // Critical — deep red glow (top cluster centroid)
  },
};

/**
 * HeatmapLayer component.
 *
 * @param {{ points: Array<[number, number, number]>, config?: Object }} props
 *   points — array of [lat, lon, intensity] tuples (intensity 0..1)
 *   config — optional overrides for leaflet.heat options
 */
export default function HeatmapLayer({ points = [], config = {} }) {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    if (!map || !points.length) return;

    const mergedConfig = { ...DEFAULT_CONFIG, ...config };

    // Create and add the heat layer
    layerRef.current = L.heatLayer(points, mergedConfig).addTo(map);

    // Cleanup: remove layer from map on unmount or when points/config change
    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map, points, config]);

  // Pure imperative layer — renders nothing into the React tree
  return null;
}
