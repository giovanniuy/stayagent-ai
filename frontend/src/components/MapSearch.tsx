import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';
import { CLASS_LABELS, type Listing, type Rect } from '@/lib/data';
import { Bot, DollarSign } from 'lucide-react';

// Fix iconos de leaflet con bundlers
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
(L.Icon.Default as any).mergeOptions({ iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow });

interface Props {
  listings: Listing[];
  onAreasChange: (areas: Rect[]) => void;
  onSelect: (l: Listing) => void;
}

/** Control de dibujo: solo rectángulos, multi-rectángulo */
function DrawRectangles({ onAreasChange }: { onAreasChange: (a: Rect[]) => void }) {
  const map = useMap();
  const drawnRef = useRef<L.FeatureGroup | null>(null);
  const cbRef = useRef(onAreasChange);
  cbRef.current = onAreasChange;

  useEffect(() => {
    const drawn = new L.FeatureGroup();
    drawnRef.current = drawn;
    map.addLayer(drawn);

    const toRects = () => {
      const rects: Rect[] = [];
      drawn.eachLayer((layer: any) => {
        const b = layer.getBounds();
        rects.push({ minLng: b.getWest(), minLat: b.getSouth(), maxLng: b.getEast(), maxLat: b.getNorth() });
      });
      cbRef.current(rects);
    };

    const drawControl = new (L.Control as any).Draw({
      position: 'topright',
      draw: {
        rectangle: { shapeOptions: { color: '#e11d48', weight: 2, fillOpacity: 0.12 } },
        polygon: false, polyline: false, circle: false, circlemarker: false, marker: false,
      },
      edit: { featureGroup: drawn, remove: true },
    });
    map.addControl(drawControl);

    const onCreated = (e: any) => { drawn.addLayer(e.layer); toRects(); };
    const onEdited = () => toRects();
    const onDeleted = () => toRects();
    map.on((L as any).Draw.Event.CREATED, onCreated);
    map.on((L as any).Draw.Event.EDITED, onEdited);
    map.on((L as any).Draw.Event.DELETED, onDeleted);
    return () => {
      map.off((L as any).Draw.Event.CREATED, onCreated);
      map.off((L as any).Draw.Event.EDITED, onEdited);
      map.off((L as any).Draw.Event.DELETED, onDeleted);
      map.removeControl(drawControl);
      map.removeLayer(drawn);
    };
  }, [map]);
  return null;
}

export default function MapSearch({ listings, onAreasChange, onSelect }: Props) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready) return <div className="h-full w-full bg-slate-100 animate-pulse rounded-xl" />;

  return (
    <MapContainer center={[-34.905, -56.14]} zoom={12} className="h-full w-full rounded-xl z-0">
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <DrawRectangles onAreasChange={onAreasChange} />
      {listings.map((l) => (
        <Marker key={l.id} position={[l.lat, l.lng]}>
          <Popup>
            <div className="w-48">
              <img src={l.photos[0]} alt="" className="w-full h-24 object-cover rounded-md mb-2" />
              <p className="font-semibold text-sm leading-tight">{l.title}</p>
              <p className="text-xs text-slate-500">{CLASS_LABELS[l.class]} · {l.city}</p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-sm font-bold text-rose-600 flex items-center gap-0.5">
                  <DollarSign size={14} />{l.price}/noche
                </span>
                {l.autoHost && (
                  <span className="text-[10px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                    <Bot size={10} /> Auto
                  </span>
                )}
              </div>
              <button
                onClick={() => onSelect(l)}
                className="mt-2 w-full bg-rose-600 text-white text-xs font-medium py-1.5 rounded-md hover:bg-rose-700"
              >
                Ver y chatear
              </button>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
