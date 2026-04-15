"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const partners = [
  {
    name: "South Vancouver Neighbourhood House",
    short: "SVNH",
    address: "6470 Victoria Dr, Vancouver, BC",
    lat: 49.2184,
    lng: -123.0707,
    totalWorkshops: 10,
    ages: "TBD",
    maxAttendees: "TBD",
    yearsTogether: "TBD",
    duration: "TBD",
  },
  {
    name: "Killarney Community Centre",
    short: "Killarney CC",
    address: "6260 Killarney St, Vancouver, BC",
    lat: 49.2258,
    lng: -123.0268,
    totalWorkshops: 10,
    ages: "TBD",
    maxAttendees: "TBD",
    yearsTogether: "TBD",
    duration: "TBD",
  },
  {
    name: "Strathcona Community Centre",
    short: "Strathcona CC",
    address: "601 Keefer St, Vancouver, BC",
    lat: 49.2770,
    lng: -123.0857,
    totalWorkshops: 10,
    ages: "TBD",
    maxAttendees: "TBD",
    yearsTogether: "TBD",
    duration: "TBD",
  },
  {
    name: "False Creek Community Centre",
    short: "False Creek CC",
    address: "1318 Cartwright St, Vancouver, BC",
    lat: 49.2714,
    lng: -123.1243,
    totalWorkshops: 10,
    ages: "TBD",
    maxAttendees: "TBD",
    yearsTogether: "TBD",
    duration: "TBD",
  },
  {
    name: "Collingwood Neighbourhood House",
    short: "Collingwood NH",
    address: "5288 Joyce St, Vancouver, BC",
    lat: 49.2431,
    lng: -123.0358,
    totalWorkshops: 10,
    ages: "TBD",
    maxAttendees: "TBD",
    yearsTogether: "TBD",
    duration: "TBD",
  },
  {
    name: "Champlain Heights Community Centre",
    short: "Champlain Heights",
    address: "3350 Maquinna Dr, Vancouver, BC",
    lat: 49.2124,
    lng: -123.0388,
    totalWorkshops: 10,
    ages: "TBD",
    maxAttendees: "TBD",
    yearsTogether: "TBD",
    duration: "TBD",
  },
];

const redPin = L.divIcon({
  className: "",
  html: `<svg width="28" height="40" viewBox="0 0 28 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 0C6.268 0 0 6.268 0 14C0 24.5 14 40 14 40C14 40 28 24.5 28 14C28 6.268 21.732 0 14 0Z" fill="#E63946"/>
    <circle cx="14" cy="14" r="6" fill="white"/>
  </svg>`,
  iconSize: [28, 40],
  iconAnchor: [14, 40],
  popupAnchor: [0, -42],
});

export default function WorkshopsMap() {
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    return () => {
      // Properly destroy the map on unmount so React StrictMode's
      // double-mount doesn't throw "Map container is already initialized"
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <MapContainer
      ref={mapRef}
      center={[49.2488, -123.0600]}
      zoom={12}
      scrollWheelZoom={false}
      className="w-full h-full rounded-3xl"
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      {partners.map((p) => (
        <Marker key={p.name} position={[p.lat, p.lng]} icon={redPin}>
          <Popup closeButton={false}>
            {/* Header */}
            <div style={{ background: "#2d2d2d", padding: "14px 16px" }}>
              <p style={{ color: "white", fontWeight: 700, fontSize: 14, lineHeight: 1.3, margin: 0 }}>
                {p.name}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
                <p style={{ color: "#aaa", fontSize: 12, margin: 0 }}>{p.address}</p>
              </div>
            </div>

            {/* Total workshops */}
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #eee", textAlign: "center" }}>
              <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", color: "#888", textTransform: "uppercase", margin: 0 }}>
                Total Workshops
              </p>
              <p style={{ fontSize: 28, fontWeight: 800, margin: "2px 0 0" }}>{p.totalWorkshops}</p>
            </div>

            {/* Stats grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
              {[
                { label: "Ages", value: p.ages },
                { label: "Max Attendees", value: p.maxAttendees },
                { label: "Partnership", value: p.yearsTogether },
                { label: "Duration", value: p.duration },
              ].map(({ label, value }, i) => (
                <div
                  key={label}
                  style={{
                    padding: "10px 16px",
                    borderRight: i % 2 === 0 ? "1px solid #eee" : "none",
                    borderTop: "1px solid #eee",
                    textAlign: "center",
                  }}
                >
                  <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", color: "#aaa", textTransform: "uppercase", margin: 0 }}>
                    {label}
                  </p>
                  <p style={{ fontSize: 18, fontWeight: 800, margin: "2px 0 0" }}>{value}</p>
                </div>
              ))}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
