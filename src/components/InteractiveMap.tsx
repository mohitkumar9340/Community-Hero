import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Navigation, Compass, Globe, Info, Check, Eye } from 'lucide-react';
import { CommunityIssue, IssueCategory } from '../types';

interface InteractiveMapProps {
  issues: CommunityIssue[];
  selectedIssue: CommunityIssue | null;
  onSelectIssue: (issue: CommunityIssue) => void;
  onSelectCoords: (lat: number, lng: number, address: string) => void;
  userCoords: { lat: number; lng: number; address: string } | null;
  isAdmin?: boolean;
  focusLocation?: { lat: number; lng: number } | null;
}

const CATEGORY_COLORS: Record<IssueCategory, string> = {
  'Roads & Traffic': '#ef4444', // Red
  'Water & Sanitation': '#0ea5e9', // Blue
  'Waste Management': '#10b981', // Green
  'Electricity & Lighting': '#eab308', // Yellow
  'Public Parks & Safety': '#a855f7', // Purple
  'Other': '#64748b' // Slate
};

const CATEGORY_EMOJIS: Record<IssueCategory, string> = {
  'Roads & Traffic': '🚧',
  'Water & Sanitation': '💧',
  'Waste Management': '♻️',
  'Electricity & Lighting': '💡',
  'Public Parks & Safety': '🌳',
  'Other': '📍'
};

const STATUS_LABELS: Record<string, string> = {
  'Reported': '🔴 Reported',
  'Under Review': '🟠 Under Review',
  'Scheduled': '🔵 Scheduled',
  'In Progress': '🟡 In Progress',
  'Resolved': '🟢 Resolved'
};

export default function InteractiveMap({
  issues,
  selectedIssue,
  onSelectIssue,
  onSelectCoords,
  userCoords,
  isAdmin = false,
  focusLocation = null
}: InteractiveMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.FeatureGroup | null>(null);
  const activeReportMarkerRef = useRef<L.Marker | null>(null);

  // New Delhi default coordinates
  const defaultCenter: [number, number] = [28.6000, 77.2000];
  const defaultZoom = 12;

  // Generate authentic addresses from coordinates
  const getAddressFromCoords = (lat: number, lng: number) => {
    // Relative position inside the grid
    const xPercent = (lng - 77.1900) / (77.2300 - 77.1900) * 100;
    const yPercent = (1 - (lat - 28.5900) / (28.6400 - 28.5900)) * 100;
    
    let street = 'Janpath Road';
    let section = 'Connaught Place';

    if (xPercent < 35) {
      street = yPercent < 50 ? 'Ashoka Road' : 'Parliament Street';
      section = yPercent < 50 ? 'Gole Market' : 'Raisina Hill';
    } else if (xPercent > 70) {
      street = yPercent < 50 ? 'Barakhamba Road' : 'Kasturba Gandhi Marg';
      section = yPercent < 50 ? 'Commercial Hub' : 'India Gate Circle';
    } else {
      street = yPercent < 40 ? 'Tolstoy Marg' : 'Janpath Road';
      section = yPercent < 40 ? 'Embassy Area' : 'Central Plaza';
    }

    const houseNum = Math.floor(10 + Math.abs(yPercent) * 2);
    return `Block ${houseNum}, ${street}, ${section}, New Delhi`;
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Create Map
    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: defaultZoom,
      zoomControl: true,
      maxZoom: 20,
      minZoom: 10
    });

    // Add Tile Layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

    // Add Layer Group for Issue Markers
    const markersGroup = L.featureGroup().addTo(map);
    markersGroupRef.current = markersGroup;
    mapInstanceRef.current = map;

    // Listen to Map Clicks to set Report Coordinates
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      const address = getAddressFromCoords(lat, lng);
      onSelectCoords(lat, lng, address);
    });

    // Cleanup on unmount
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Markers when issues or selectedIssue changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersGroupRef.current;
    if (!map || !markersGroup) return;

    // Clear existing markers
    markersGroup.clearLayers();

    // Re-draw issue markers
    issues.forEach((issue) => {
      const color = CATEGORY_COLORS[issue.category] || '#64748b';
      const isSelected = selectedIssue?.id === issue.id;

      // Custom div icon with CSS animations and exact color representation
      const customIcon = L.divIcon({
        html: `
          <div class="relative flex items-center justify-center">
            ${issue.priority === 'Critical' ? `
              <span class="absolute inline-flex h-12 w-12 rounded-full border-2 border-red-500 animate-ping opacity-75"></span>
              <span class="absolute inline-flex h-10 w-10 rounded-full bg-red-500 opacity-20"></span>
            ` : ''}
            <span class="absolute inline-flex h-8 w-8 rounded-full opacity-40 animate-ping-slow" style="background-color: ${color}"></span>
            <div class="relative flex items-center justify-center rounded-full border-2 border-white shadow-md transition-all ${
              isSelected ? 'scale-125 ring-4 ring-offset-2 ring-blue-500' : 'hover:scale-110'
            }" style="width: 30px; height: 30px; background-color: ${color}; font-size: 15px; line-height: 1;">
              ${CATEGORY_EMOJIS[issue.category] || '📍'}
            </div>
          </div>
        `,
        className: 'custom-leaflet-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker([issue.latitude, issue.longitude], { icon: customIcon });
      (marker as any).issueId = issue.id;

      // Bind a nice popup content
      const popupContent = `
        <div class="p-2 font-sans space-y-1.5 text-slate-800">
          <div class="flex items-center justify-between gap-2 border-b border-slate-100 pb-1">
            <span class="text-[9px] font-black uppercase tracking-wider text-slate-400">${issue.category}</span>
            <span class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">${STATUS_LABELS[issue.status]}</span>
          </div>
          <h4 class="font-extrabold text-xs text-slate-900 leading-snug">${issue.title}</h4>
          <p class="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">${issue.description}</p>
          <div class="text-[9px] font-bold text-blue-600 pt-1 flex items-center gap-1">
            <span>👍 ${issue.votes} upvotes</span>
            <span>•</span>
            <span>✓ ${issue.verifiedBy?.length || 0} verifications</span>
          </div>
          <button id="inspect-btn-${issue.id}" class="mt-2 w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[9px] uppercase tracking-wider py-1.5 px-2.5 rounded-lg border-0 cursor-pointer shadow-sm transition-all">
            Inspect Issue Timeline
          </button>
        </div>
      `;

      marker.bindPopup(popupContent, {
        closeButton: false,
        maxWidth: 240,
        className: 'custom-leaflet-popup'
      });

      // Handle inspect button click in Leaflet popup
      marker.on('popupopen', () => {
        const btn = document.getElementById(`inspect-btn-${issue.id}`);
        if (btn) {
          btn.addEventListener('click', () => {
            onSelectIssue(issue);
            map.closePopup();
          });
        }
      });

      // Bind simple click directly to open popup & select in app list
      marker.on('click', () => {
        onSelectIssue(issue);
      });

      marker.addTo(markersGroup);
    });

  }, [issues, selectedIssue]);

  // Handle selected issue panning/centering
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedIssue) return;

    // Pan to selected issue coordinate with high quality transition
    map.setView([selectedIssue.latitude, selectedIssue.longitude], 16, {
      animate: true,
      duration: 1.2
    });

    // Find marker associated with selected issue to open popup
    const markersGroup = markersGroupRef.current;
    if (markersGroup) {
      markersGroup.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
          if ((layer as any).issueId === selectedIssue.id) {
            layer.openPopup();
          }
        }
      });
    }
  }, [selectedIssue]);

  // Handle active temporary user selection marker (for reporting)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear previous temp marker
    if (activeReportMarkerRef.current) {
      activeReportMarkerRef.current.remove();
      activeReportMarkerRef.current = null;
    }

    if (userCoords) {
      // Create crosshair pointer
      const tempIcon = L.divIcon({
        html: `
          <div class="relative flex items-center justify-center">
            <span class="absolute h-10 w-10 border-2 border-dashed border-rose-500 rounded-full animate-spin" style="animation-duration: 6s"></span>
            <div class="text-rose-600 bg-white p-1 rounded-full border border-rose-300 shadow-md">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="22" y1="12" x2="18" y2="12"></line>
                <line x1="6" y1="12" x2="2" y2="12"></line>
                <line x1="12" y1="6" x2="12" y2="2"></line>
                <line x1="12" y1="22" x2="12" y2="18"></line>
              </svg>
            </div>
            <div class="absolute top-8 bg-rose-600 text-white font-black text-[8px] uppercase tracking-wider px-2 py-0.5 rounded-md shadow-md whitespace-nowrap border border-rose-400">
              New Report Target
            </div>
          </div>
        `,
        className: 'temp-report-marker',
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      });

      const tempMarker = L.marker([userCoords.lat, userCoords.lng], { icon: tempIcon }).addTo(map);
      activeReportMarkerRef.current = tempMarker;

      // Pan slightly to center on selection
      map.setView([userCoords.lat, userCoords.lng], 16, {
        animate: true,
        duration: 0.8
      });
    }
  }, [userCoords]);

  // Handle focus location panning
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !focusLocation) return;

    map.setView([focusLocation.lat, focusLocation.lng], 16, {
      animate: true,
      duration: 1.0
    });
  }, [focusLocation]);

  return (
    <div className="bg-white rounded-3xl border-2 border-slate-100 shadow-sm overflow-hidden flex flex-col h-full animate-fade-in" id="interactive-map-card">
      {/* Map Header */}
      <div className="px-6 py-4.5 border-b-2 border-slate-100 flex flex-wrap justify-between items-center gap-3 bg-slate-50/50">
        <div>
          <h2 className="font-sans font-black text-slate-800 text-lg uppercase tracking-tight flex items-center gap-2">
            <Navigation className="h-5 w-5 text-blue-600 rotate-45 animate-pulse" />
            Live Incident Map
          </h2>
          <p className="text-xs text-slate-500 font-bold mt-0.5">
            Click anywhere on the satellite-mapped terrain to pinpoint custom community hazards
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Map Online</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full">
            <Globe className="h-3.5 w-3.5" />
            <span>Voyager Tile Layer</span>
          </div>
        </div>
      </div>

      {/* Map Stage */}
      <div className="relative flex-1 min-h-[380px] z-10 overflow-hidden">
        <div ref={mapContainerRef} className="w-full h-full" style={{ minHeight: '380px' }} />
        
        {/* Help prompt on bottom corner */}
        {!isAdmin && (
          <div className="absolute bottom-4 left-4 bg-slate-950/80 backdrop-blur-md text-white text-[10px] py-1.5 px-3 rounded-full flex items-center gap-1.5 shadow-md pointer-events-none font-bold z-[1000]">
            <Compass className="h-3.5 w-3.5 text-blue-400 animate-spin-slow" />
            <span>Click any point to file a new report</span>
          </div>
        )}
        
        {/* Locate Me button */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            if ('geolocation' in navigator) {
              navigator.geolocation.getCurrentPosition(
                (position) => {
                  const { latitude, longitude } = position.coords;
                  if (mapInstanceRef.current) {
                    mapInstanceRef.current.setView([latitude, longitude], 15, { animate: true });
                  }
                },
                (err) => {
                  console.warn('Geolocation error:', err);
                }
              );
            }
          }}
          className="absolute bottom-4 right-4 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 p-2.5 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer z-[1000]"
          title="Locate Me"
        >
          <Navigation className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
        </button>
      </div>

      {/* Map Legend */}
      <div className="px-5 py-3.5 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 bg-slate-50/50 text-[11px] font-sans text-slate-600">
        {Object.entries(CATEGORY_COLORS).map(([category, color]) => (
          <div key={category} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full shadow-xs" style={{ backgroundColor: color }} />
            <span className="truncate font-bold text-[10px] text-slate-500 uppercase tracking-wider">{category}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
