"use client";

import { useState } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  MapMouseEvent,
} from "@vis.gl/react-google-maps";

interface MapPickerProps {
  onLocationSelect: (lat: number, lng: number) => void;
  defaultCenter?: { lat: number; lng: number };
}

export default function MapPicker({
  onLocationSelect,
  defaultCenter = { lat: 29.3759, lng: 47.9774 },
}: MapPickerProps) {
  const [markerPosition, setMarkerPosition] = useState<google.maps.LatLngLiteral | null>(null);

  const handleMapClick = (e: MapMouseEvent) => {
    if (e.detail.latLng) {
      const pos = e.detail.latLng;
      setMarkerPosition(pos);
      onLocationSelect(pos.lat, pos.lng);
    }
  };

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

  return (
    <div className="h-full w-full relative z-0">
      <APIProvider apiKey={apiKey}>
        <Map
          style={{ width: "100%", height: "100%", borderRadius: "0.5rem" }}
          defaultCenter={defaultCenter}
          defaultZoom={13}
          gestureHandling={"greedy"}
          disableDefaultUI={false}
          onClick={handleMapClick}
          mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "bf190a908a7051a"}
        >
          {markerPosition && (
            <AdvancedMarker position={markerPosition}>
              <Pin
                background={"#000"}
                glyphColor={"#fff"}
                borderColor={"#000"}
              />
            </AdvancedMarker>
          )}
        </Map>
      </APIProvider>
    </div>
  );
}
