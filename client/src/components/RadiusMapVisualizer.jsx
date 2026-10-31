import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { AlertCircle, CheckCircle2, Compass, MapPinned } from 'lucide-react';

const OPENFREEMAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

function markerElement(className, label) {
  const element = document.createElement('div');
  element.className = className;
  element.setAttribute('aria-label', label);
  return element;
}

export default function RadiusMapVisualizer({ vendors = [], buyerLocation }) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return undefined;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: OPENFREEMAP_STYLE,
      center: [buyerLocation.longitude, buyerLocation.latitude],
      zoom: 11,
      attributionControl: true,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');
    mapRef.current = map;

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.flyTo({
      center: [buyerLocation.longitude, buyerLocation.latitude],
      zoom: 11,
      speed: 1.2,
      essential: true,
    });

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    const buyerMarker = new maplibregl.Marker({
      element: markerElement('map-marker map-marker-buyer', 'Buyer location'),
    })
      .setLngLat([buyerLocation.longitude, buyerLocation.latitude])
      .setPopup(new maplibregl.Popup({ offset: 18 }).setText(buyerLocation.name))
      .addTo(map);
    markersRef.current.push(buyerMarker);

    vendors.forEach((vendor, index) => {
      const coordinates = vendor.location?.coordinates;
      if (!Array.isArray(coordinates) || coordinates.length < 2) return;

      const eligible = (vendor.distanceKm ?? 0) <= 20;
      const marker = new maplibregl.Marker({
        element: markerElement(
          `map-marker ${eligible ? 'map-marker-vendor' : 'map-marker-excluded'}`,
          `${vendor.businessName}, ${vendor.distanceKm ?? 'unknown'} km away`
        ),
      })
        .setLngLat(coordinates)
        .setPopup(
          new maplibregl.Popup({ offset: 18 }).setHTML(
            `<strong>${vendor.businessName}</strong><br />${vendor.distanceKm ?? '—'} km away`
          )
        )
        .addTo(map);
      markersRef.current.push(marker);
    });
  }, [buyerLocation, vendors]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <MapPinned className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-bold text-slate-900">Coimbatore Serviceability Map</h3>
            <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
              OpenFreeMap
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            OpenStreetMap-based map centered on {buyerLocation.name}: [
            {buyerLocation.latitude.toFixed(4)}, {buyerLocation.longitude.toFixed(4)}]
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-semibold">
          <span className="flex items-center gap-1.5 text-emerald-700">
            <CheckCircle2 className="w-3.5 h-3.5" /> Eligible
          </span>
          <span className="flex items-center gap-1.5 text-rose-700">
            <AlertCircle className="w-3.5 h-3.5" /> Excluded
          </span>
        </div>
      </div>

      <div ref={mapContainer} className="w-full h-72 rounded-xl overflow-hidden border border-slate-200" />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <Compass className="w-3.5 h-3.5 text-blue-600" />
          Blue marker: buyer location
        </span>
        <span className="font-semibold text-slate-700">Strict 20 km server rule enforced</span>
      </div>
    </div>
  );
}
