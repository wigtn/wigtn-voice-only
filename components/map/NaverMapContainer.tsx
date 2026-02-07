'use client';

import Script from 'next/script';
import { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import type { NaverPlaceResult } from '@/lib/naver-maps';

// 네이버 지도 타입 선언
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

// 기본 중심점 (서울 시청)
const DEFAULT_CENTER = { lat: 37.5665, lng: 126.9780 };

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

  // 마커 초기화
  const clearMarkers = useCallback(() => {
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];
  }, []);

  // 지도 초기화
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

  // 마커 추가
  const addMarkers = useCallback(() => {
    if (!mapInstanceRef.current || !window.naver?.maps) return;

    clearMarkers();

    markers.forEach((place, index) => {
      // KATEC 좌표를 WGS84로 변환 (네이버 API는 KATEC 좌표 반환)
      // mapx, mapy가 이미 위경도인 경우도 있으므로 값 범위 확인
      let lat = place.mapy;
      let lng = place.mapx;

      // KATEC 좌표인 경우 (값이 큰 경우) 대략적인 변환
      // 실제로는 네이버 좌표 변환 API를 사용해야 정확함
      if (lat > 1000000) {
        // 간단한 KATEC → WGS84 근사 변환
        lat = lat / 10000000;
        lng = lng / 10000000;
      }

      const marker = new window.naver.maps.Marker({
        position: new window.naver.maps.LatLng(lat, lng),
        map: mapInstanceRef.current!,
        title: place.name,
        icon: {
          content: `
            <div class="flex items-center justify-center w-8 h-8 bg-blue-500 text-white rounded-full shadow-lg border-2 border-white font-bold text-sm">
              ${index + 1}
            </div>
          `,
          anchor: new window.naver.maps.Point(16, 16),
        },
      });

      window.naver.maps.Event.addListener(marker, 'click', () => {
        onMarkerClick?.(place);
      });

      markersRef.current.push(marker);
    });

    // 마커가 있으면 첫 번째 마커로 중심 이동
    if (markers.length > 0 && markersRef.current.length > 0) {
      const firstMarker = markersRef.current[0];
      mapInstanceRef.current?.setCenter(firstMarker.getPosition());
    }
  }, [markers, onMarkerClick, clearMarkers]);

  // SDK 로드 완료 시 지도 초기화
  const handleScriptLoad = useCallback(() => {
    setIsLoaded(true);
    initMap();
  }, [initMap]);

  // 지도 로드 후 마커 추가
  useEffect(() => {
    if (isLoaded && mapInstanceRef.current) {
      addMarkers();
    }
  }, [isLoaded, addMarkers]);

  // 중심점 변경 시 지도 이동
  useEffect(() => {
    if (mapInstanceRef.current && center) {
      mapInstanceRef.current.setCenter(
        new window.naver.maps.LatLng(center.lat, center.lng)
      );
    }
  }, [center]);

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

  // API 키가 없는 경우
  if (!clientId) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg border border-gray-200">
        <div className="text-center text-gray-400 p-4">
          <MapPin className="mx-auto size-8 mb-2" />
          <p className="text-sm">지도 API 키가 설정되지 않았습니다</p>
          <p className="text-xs mt-1">NEXT_PUBLIC_NAVER_MAP_CLIENT_ID 환경변수를 확인해주세요</p>
        </div>
      </div>
    );
  }

  // 에러 발생 시
  if (hasError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg border border-gray-200">
        <div className="text-center text-gray-400 p-4">
          <MapPin className="mx-auto size-8 mb-2" />
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
      <div className="relative w-full h-full rounded-lg border border-gray-200 overflow-hidden">
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <Loader2 className="mx-auto size-6 text-blue-500 animate-spin mb-2" />
              <p className="text-sm text-gray-400">지도 로딩 중...</p>
            </div>
          </div>
        )}
        <div ref={mapRef} className="w-full h-full" />
      </div>
    </>
  );
}
