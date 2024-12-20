import React, { useEffect, useState, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { Toaster, toast } from "react-hot-toast";
import { Subject } from "rxjs";
import { debounceTime } from "rxjs/operators";
import SearchInput from "./SearchInput";
import GeoButton from "./controls/GeoButton";
import SpeedTracker from "./SpeedTracker";
import BarButton from "./controls/BarButton";
import {
  initializeMap,
  updateUserLocation,
  getRoute,
  drawRoute,
} from "../lib/MapHelper.ts";
import DrawCircle from "./HelpComponents/DrawCircle.jsx";
import EvCircle from "./СircleArea/EvCircle.jsx";
import ParkingCircle from "./СircleArea/ParkingCirle.jsx";

function Map() {
  const [map, setMap] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [isFollowing, setIsFollowing] = useState(true);
  const [isBarVisible, setIsBarVisible] = useState(false);
  const mapContainer = useRef(null);

  const mapboxAccessToken =
    "pk.eyJ1IjoibmF6YXJkb3MiLCJhIjoiY2x2eTZyejQ3MG1iNTJpcGRzdjJtenc0NSJ9.7FZe4OjfKqC8rYu4pMntdA";

  useEffect(() => {
    if (!mapContainer.current) return;

    const newMap = initializeMap(mapContainer.current, mapboxAccessToken);
    setMap(newMap);

    return () => newMap.remove();
  }, [mapboxAccessToken]);

  useEffect(() => {
    if (!map) return;

    const handleSuccess = (position) => {
      const { latitude, longitude } = position.coords;
      const newLocation = { lat: latitude, lng: longitude };

      if (
        !userLocation ||
        userLocation.lat !== newLocation.lat ||
        userLocation.lng !== newLocation.lng
      ) {
        setUserLocation(newLocation);
        updateUserLocation(map, newLocation, isFollowing);
      }
    };

    const handleError = () => {
      toast.error("Не удалось получить доступ к геолокации.");
    };

    const watchId = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      {
        enableHighAccuracy: true,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [map, userLocation, isFollowing]);

  const handleRouteRequest = async (start, end, travelMode) => {
    if (!map) return;

    try {
      const geometry = await getRoute(
        start,
        end,
        travelMode,
        mapboxAccessToken
      );
      drawRoute(map, geometry);
    } catch (error) {
      toast.error("Ошибка при запросе маршрута.");
      console.error("Ошибка при запросе маршрута:", error);
    }
  };

  const handleSearchResult = ({ startPoint, finishPoint }) => {
    if (!map || !finishPoint) return;

    handleRouteRequest(startPoint, finishPoint, "driving");
    map.flyTo({ center: finishPoint, zoom: 14, essential: true });
    new mapboxgl.Marker().setLngLat(finishPoint).addTo(map);
  };

  return (
    <div className="map_block relative w-full h-screen">
      <Toaster position="top-right" reverseOrder={false} />
      <div ref={mapContainer} className="w-full h-screen"></div>
      <div className="z-10 absolute top-5 right-5">
        <SearchInput
          map={map}
          placeholder="Search"
          apiKey={mapboxAccessToken}
          onResultSelect={handleSearchResult}
          userLocation={userLocation}
        />
        <SpeedTracker />
      </div>
      <GeoButton
        map={map}
        isFollowing={isFollowing}
        setIsFollowing={setIsFollowing}
      />
      <BarButton
        isBarVisible={isBarVisible}
        setIsBarVisible={setIsBarVisible}
      />
      <EvCircle map={map} />
      <ParkingCircle map={map} />
    </div>
  );
}

export default Map;
