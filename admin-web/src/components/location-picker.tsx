import { EnvironmentOutlined } from '@ant-design/icons';
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import type { LatLngExpression, LeafletMouseEvent } from 'leaflet';

const HANOI: LatLngExpression = [21.0285, 105.8542];

function MapClickHandler({ onSelect }: { onSelect: (latitude: number, longitude: number) => void }) {
  useMapEvents({
    click(event: LeafletMouseEvent) {
      onSelect(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

export function LocationPicker({
  latitude,
  longitude,
  onSelect,
}: {
  latitude: number | null;
  longitude: number | null;
  onSelect: (latitude: number, longitude: number) => void;
}) {
  const position: LatLngExpression | null =
    latitude === null || longitude === null ? null : [latitude, longitude];

  return (
    <div className="location-picker">
      <div className="location-picker-hint">
        <EnvironmentOutlined /> Nhấn vào bản đồ để chọn tọa độ.
      </div>
      <MapContainer center={position ?? HANOI} zoom={12} scrollWheelZoom className="location-map">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onSelect={onSelect} />
        {position && <Marker position={position} />}
      </MapContainer>
      {position && (
        <div className="location-coordinates">
          {latitude?.toFixed(6)}, {longitude?.toFixed(6)}
        </div>
      )}
    </div>
  );
}
