"use client";

import Script from "next/script";
import { useEffect, useRef, useState, useCallback } from "react";
import { MapPin, Loader2 } from "lucide-react";
import type { NaverPlaceResult } from "@/lib/naver-maps";

declare global {
  interface Window {
    naver: typeof naver;
  }
}

interface NaverMapContainerProps {
  center: { lat: number; lng: number } | null;
  zoom?: number;
  markers: NaverPlaceResult[];
  selectedPlace: NaverPlaceResult | null;
  onMarkerClick?: (place: NaverPlaceResult) => void;
}

const DEFAULT_CENTER = { lat: 37.5665, lng: 126.978 };

export default function NaverMapContainer({
  center,
  zoom = 15,
  markers,
  selectedPlace,
  onMarkerClick,
}: NaverMapContainerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<naver.maps.Map | null>(null);
  const markersRef = useRef<naver.maps.Marker[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;

  const clearMarkers = useCallback(() => {
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];
  }, []);

  const initMap = useCallback(() => {
    if (!mapRef.current || !window.naver?.maps) return;

    const activeCenter = center || DEFAULT_CENTER;

    const map = new window.naver.maps.Map(mapRef.current, {
      center: new window.naver.maps.LatLng(activeCenter.lat, activeCenter.lng),
      zoom,
      zoomControl: true,
      zoomControlOptions: {
        position: window.naver.maps.Position.TOP_RIGHT,
      },
    });

    mapInstanceRef.current = map;
  }, [center, zoom]);

  const addMarkers = useCallback(() => {
    if (!mapInstanceRef.current || !window.naver?.maps) return;

    clearMarkers();

    markers.forEach((place, index) => {
      let lat = place.mapy;
      let lng = place.mapx;

      if (lat > 1000000) {
        lat = lat / 10000000;
        lng = lng / 10000000;
      }

      const marker = new window.naver.maps.Marker({
        position: new window.naver.maps.LatLng(lat, lng),
        map: mapInstanceRef.current!,
        title: place.name,
        icon: {
          content: `
            <div style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;background:#0F172A;color:white;border-radius:50%;box-shadow:0 2px 8px rgba(15,23,42,0.25);border:2px solid white;font-weight:700;font-size:13px;">
              ${index + 1}
            </div>
          `,
          anchor: new window.naver.maps.Point(16, 16),
        },
      });

      window.naver.maps.Event.addListener(marker, "click", () => {
        onMarkerClick?.(place);
      });

      markersRef.current.push(marker);
    });

    if (markers.length > 0 && markersRef.current.length > 0) {
      const firstMarker = markersRef.current[0];
      mapInstanceRef.current?.setCenter(firstMarker.getPosition());
    }
  }, [markers, onMarkerClick, clearMarkers]);

  const handleScriptLoad = useCallback(() => {
    setIsLoaded(true);
    initMap();
  }, [initMap]);

  useEffect(() => {
    if (isLoaded && mapInstanceRef.current) {
      addMarkers();
    }
  }, [isLoaded, addMarkers]);

  // 중심점 변경 시 지도 부드럽게 이동 (panTo 사용)
  useEffect(() => {
    if (mapInstanceRef.current && center) {
      const newCenter = new window.naver.maps.LatLng(center.lat, center.lng);
      // panTo로 부드러운 이동 애니메이션
      mapInstanceRef.current.panTo(newCenter, {
        duration: 500,
        easing: "easeOutCubic",
      });
    }
  }, [center]);

  // 줌 레벨 변경 시 부드럽게 적용
  useEffect(() => {
    if (mapInstanceRef.current && zoom) {
      const currentZoom = mapInstanceRef.current.getZoom();
      if (currentZoom !== zoom) {
        // 줌 변경도 애니메이션으로
        mapInstanceRef.current.setZoom(zoom, true);
      }
    }
  }, [zoom]);

  // 선택된 장소 변경 시 해당 마커 강조
  useEffect(() => {
    if (!selectedPlace || !mapInstanceRef.current) return;

    const index = markers.findIndex((m) => m.name === selectedPlace.name);
    if (index >= 0 && markersRef.current[index]) {
      const marker = markersRef.current[index];
      mapInstanceRef.current.setCenter(marker.getPosition());
      mapInstanceRef.current.setZoom(17);
    }
  }, [selectedPlace, markers]);

  if (!clientId) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0]">
        <div className="text-center text-[#94A3B8] p-4">
          <MapPin className="mx-auto size-8 mb-2 text-[#CBD5E1]" />
          <p className="text-sm">지도 API 키가 설정되지 않았습니다</p>
          <p className="text-xs mt-1 text-[#CBD5E1]">
            NEXT_PUBLIC_NAVER_MAP_CLIENT_ID 환경변수를 확인해주세요
          </p>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0]">
        <div className="text-center text-[#94A3B8] p-4">
          <MapPin className="mx-auto size-8 mb-2 text-[#CBD5E1]" />
          <p className="text-sm">지도를 불러오지 못했습니다</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Script
        src={`https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${clientId}`}
        onLoad={handleScriptLoad}
        onError={() => setHasError(true)}
        strategy="lazyOnload"
      />
      <div className="relative w-full h-full rounded-2xl border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#F8FAFC]">
            <div className="text-center">
              <Loader2 className="mx-auto size-6 text-[#0F172A] animate-spin mb-2" />
              <p className="text-sm text-[#94A3B8]">지도 로딩 중...</p>
            </div>
          </div>
        )}
        <div ref={mapRef} className="w-full h-full" />
      </div>
    </>
  );
}
