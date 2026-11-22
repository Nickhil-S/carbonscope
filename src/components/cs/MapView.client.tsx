import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw";
import "leaflet-draw/dist/leaflet.draw.css";

// Fix default marker icon paths under bundlers.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export default function MapView({
  boundary,
  onDraw,
  editable = true,
  height = 520,
}: {
  boundary: GeoJSON.Feature | null;
  onDraw?: (f: GeoJSON.Feature) => void;
  editable?: boolean;
  height?: number;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.FeatureGroup | null>(null);
  const cb = useRef(onDraw);
  cb.current = onDraw;

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { center: [20.6, 78.9], zoom: 4 });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(m);
    const fg = new L.FeatureGroup().addTo(m);
    layer.current = fg;
    if (editable) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const D = (L as any).Control.Draw;
      // The plugin's live area formatter references an undefined variable in 1.0.4.
      // Area remains available in the selection panel through the central Turf calculation.
      m.addControl(new D({ draw: { polygon: { allowIntersection: false, showArea: false }, rectangle: { showArea: false }, circle: false, circlemarker: false, marker: false, polyline: false }, edit: { featureGroup: fg, remove: false } }));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      m.on((L as any).Draw.Event.CREATED, (e: any) => {
        fg.clearLayers();
        fg.addLayer(e.layer);
        cb.current?.(e.layer.toGeoJSON());
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      m.on((L as any).Draw.Event.EDITED, () => {
        const first = fg.getLayers()[0] as L.Polygon | undefined;
        if (first) cb.current?.(first.toGeoJSON() as GeoJSON.Feature);
      });
    }
    map.current = m;
    return () => { m.remove(); map.current = null; };
  }, [editable]);

  useEffect(() => {
    const fg = layer.current, m = map.current;
    if (!fg || !m) return;
    fg.clearLayers();
    if (boundary) {
      const color = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim();
      const g = L.geoJSON(boundary, { style: { color, weight: 2, fillOpacity: 0.15 } });
      g.eachLayer((l: L.Layer) => fg.addLayer(l));
      const b = fg.getBounds();
      if (b.isValid()) m.fitBounds(b, { padding: [24, 24] });
    }
  }, [boundary]);

  return <div ref={el} style={{ height }} className="z-0 w-full overflow-hidden rounded-lg border" />;
}
