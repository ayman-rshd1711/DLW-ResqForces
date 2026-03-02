"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { GrAed } from "react-icons/gr";
import Image from "next/image";
import { triggerLiveLocationAtom } from "@/jotai/EmergencyPageAtoms";
import { useAtom } from "jotai";

const REGIONS = {
  WEST: { center: [1.3404, 103.709], zoom: 14 },
  EAST: { center: [1.3573, 103.9452], zoom: 14 },
  NORTH: { center: [1.4467, 103.7855], zoom: 14 },
  SOUTH: { center: [1.2847, 103.8513], zoom: 14 },
  ALL: { center: [1.3521, 103.8198], zoom: 12 },
};

// 1. Blue Dot for individual markers
const blueAedIcon =
  typeof window !== "undefined"
    ? L.divIcon({
        html: `<div style="background-color: #3b82f6; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.3);"></div>`,
        className: "custom-blue-dot",
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      })
    : null;

const createCustomClusterIcon = (cluster) => {
  const count = cluster.getChildCount();
  let size = 40;
  if (count > 50) size = 50;
  if (count > 100) size = 60;

  return L.divIcon({
    html: `<span>${count}</span>`,
    className: "custom-marker-cluster",
    iconSize: L.point(size, size, true),
  });
};

export default function SingaporeMap() {
  //   const searchParams = useSearchParams();
  const [aedLocations, setAedLocations] = useState([]);
  const [map, setMap] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const center = [1.3521, 103.8198];
  const [triggerLiveLocation, setTriggerLiveLocation] = useAtom(
    triggerLiveLocationAtom
  );

  useEffect(() => {
    const loadLocalData = async () => {
      try {
        const res = await fetch("/aed.json");
        const json = await res.json();
        if (json.features) setAedLocations(json.features);
      } catch (err) {
        console.error("Error loading /public/aed.json", err);
      }
    };
    loadLocalData();
  }, []);

  useEffect(() => {
    if (triggerLiveLocation == true && map) {
      goToLiveLocation();
      const timer = setTimeout(() => {
        goToLiveLocation();
        setTriggerLiveLocation(false); // Reset the trigger
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [triggerLiveLocation, map]);
  const goToRegion = (regionKey) => {
    if (map) {
      const { center, zoom } = REGIONS[regionKey];
      map.flyTo(center, zoom, {
        animate: true,
        duration: 1.5, // Seconds for the transition
      });
    }
  };

  const goToLiveLocation = () => {
    if (!map) return;

    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newPos = [latitude, longitude];

        // Update state to show the marker
        setUserLocation(newPos);

        // Move the map to the location
        map.flyTo(newPos, 18, {
          animate: true,
          duration: 2,
          easeLinearity: 0.25,
        });
      },
      (error) => {
        console.error("Error detecting location:", error);
        alert("Unable to retrieve location.");
      },
      { enableHighAccuracy: true }
    );
  };

  return (
    <div className="flex flex-col items-center w-full">
      <style>{`
        .custom-marker-cluster {
          background: #2563eb;
          color: white;
          border-radius: 50%;
          border: 3px solid white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 14px;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
        }
        .custom-marker-cluster:hover {
          transform: scale(1.1);
          background: #1d4ed8;
        }
        /* Custom styling for the Google Maps button */
        .gmaps-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          background-color: #ffffff;
          color: #374151;
          border: 1px solid #d1d5db;
          padding: 6px 10px;
          border-radius: 6px;
          text-decoration: none !important;
          font-weight: 600;
          font-size: 11px;
          margin-top: 10px;
          transition: all 0.2s;
        }
        .gmaps-button:hover {
          background-color: #f3f4f6;
          border-color: #9ca3af;
        }
      `}</style>

      <div className="w-full max-w-[90%] mb-6 flex flex-col items-start">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          AED Distribution Zones
        </h1>
        <p className="text-slate-500">
          Click a station to get navigation instructions.
        </p>
      </div>

      <div className="h-[70vh] w-full max-w-[90%] rounded-xl overflow-hidden shadow-2xl border-4 border-white">
        <MapContainer
          center={center}
          zoom={12}
          className="h-full w-full"
          ref={setMap}
        >
          <TileLayer
            attribution="© OpenStreetMap"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* 1. YOUR LIVE LOCATION MARKER (Outside the cluster group) */}
          {userLocation && (
            <Marker
              position={userLocation}
              icon={L.divIcon({
                className: "user-location-marker",
                html: `
                <div class="relative flex items-center justify-center">

                  <div class="absolute w-10 h-10 bg-red-500 rounded-full animate-ping opacity-40"></div>
                  

                  <div class="relative w-5 h-5 bg-red-600 rounded-full border-2 border-white shadow-[0_0_10px_rgba(220,38,38,0.5)]"></div>
                  

                  <div class="absolute w-1.5 h-1.5 bg-white rounded-full"></div>
                </div>
              `,
                iconSize: [40, 40],
                iconAnchor: [20, 20],
              })}
            >
              <Popup>
                <div className="p-1 text-center">
                  <span className="text-xs font-black uppercase text-red-600 tracking-tighter">
                    You are here
                  </span>
                </div>
              </Popup>
            </Marker>
          )}

          <MarkerClusterGroup
            chunkedLoading
            iconCreateFunction={createCustomClusterIcon}
            maxClusterRadius={50}
            showCoverageOnHover={false}
          >
            {aedLocations.map((feature, idx) => {
              const info = feature.properties;
              const lat = parseFloat(info.LATITUDE);
              const lng = parseFloat(info.LONGITUDE);

              if (!lat || !lng) return null;

              const gMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

              return (
                <Marker
                  key={info.OBJECTID || idx}
                  position={[lat, lng]}
                  icon={blueAedIcon}
                >
                  <Popup>
                    <div className="p-2 min-w-[220px] font-sans">
                      <div className="flex items-center gap-2 mb-2 border-b pb-2 border-slate-100">
                        <GrAed className="text-red-600" size={20} />
                        <h3 className="font-bold text-slate-800 text-sm">
                          AED Station
                        </h3>
                      </div>

                      {/* Corrected Keys below: */}
                      <div className="space-y-2 mb-4">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400">
                            Building
                          </p>
                          <p className="text-xs font-semibold text-slate-800">
                            {info.BUILDING_NAME || "Unnamed Building"}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400">
                            Exact Location
                          </p>
                          <p className="text-xs text-slate-600 leading-tight">
                            {info.AED_LOCATION_DESCRIPTION ||
                              "Refer to map pin"}
                          </p>
                        </div>

                        <div className="flex gap-4">
                          <div>
                            <p className="text-[10px] uppercase font-bold text-slate-400">
                              Level
                            </p>
                            <p className="text-xs font-bold text-blue-600">
                              {info.AED_LOCATION_FLOOR_LEVEL || "N/A"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase font-bold text-slate-400">
                              Postal
                            </p>
                            <p className="text-xs text-slate-600">
                              {info.POSTAL_CODE}
                            </p>
                          </div>
                        </div>
                      </div>

                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 bg-red-600 !text-white text-xs font-bold py-2.5 rounded-lg hover:bg-red-700 transition-all shadow-md active:scale-95"
                      >
                        Navigate Now
                      </a>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MarkerClusterGroup>
        </MapContainer>
      </div>

      <div className="absolute top-80 right-[10%] -translate-x-1/2 z-[1000] flex flex-row gap-x-3 backdrop-blur-md p-2 rounded-xl shadow-2xl border-1 border-slate-300 bg-white fix">
        <GrAed size={50} />
      </div>
      <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-[1000] flex flex-row items-center gap-x-3 bg-white/80 backdrop-blur-md p-2 rounded-full shadow-2xl border border-white/20">
        <button
          onClick={() => goToRegion("WEST")}
          className="flex items-center gap-x-2 bg-slate-800 hover:bg-slate-700 text-white px-6 py-2.5 rounded-full text-sm font-bold transition-all active:scale-95 shadow-md"
        >
          <span>←</span> West
        </button>

        <button
          onClick={() => goToRegion("EAST")}
          className="hover:cursor-pointer flex items-center gap-x-2 bg-slate-800 hover:bg-slate-700 text-white px-6 py-2.5 rounded-full text-sm font-bold transition-all active:scale-95 shadow-md"
        >
          East <span>→</span>
        </button>

        <button
          onClick={() => goToRegion("NORTH")}
          className="hover:cursor-pointer flex items-center gap-x-2 bg-slate-800 hover:bg-slate-700 text-white px-6 py-2.5 rounded-full text-sm font-bold transition-all active:scale-95 shadow-md"
        >
          <span>↑</span> North
        </button>

        <button
          onClick={() => goToRegion("SOUTH")}
          className="hover:cursor-pointer flex items-center gap-x-2 bg-slate-800 hover:bg-slate-700 text-white px-6 py-2.5 rounded-full text-sm font-bold transition-all active:scale-95 shadow-md"
        >
          <span>↓</span> South
        </button>

        <button
          onClick={goToLiveLocation}
          className="hover:cursor-pointer flex items-center gap-x-2 btn btn-info hover:bg-blue-700 text-white px-6 py-2.5 rounded-full text-sm font-bold transition-all active:scale-95 shadow-md"
        >
          <span>📍</span> Live
        </button>

        {/* Reset Button (Ghost Style) */}
        <button
          onClick={() => goToRegion("ALL")}
          className="hover:cursor-pointer flex items-center gap-x-2 bg-white/50 border border-slate-200 hover:bg-slate-100 text-slate-600 px-6 py-2.5 rounded-full text-sm font-bold transition-all active:scale-95"
        >
          <span>↺</span> Reset
        </button>
      </div>
    </div>
  );
}
