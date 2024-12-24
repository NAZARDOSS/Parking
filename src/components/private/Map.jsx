import React, { useEffect, useState, useRef } from "react";
import { useSelector, shallowEqual } from "react-redux"; 
import mapboxgl from "mapbox-gl";
import { Toaster, toast } from "react-hot-toast";
import SearchInput from "./SearchInput.jsx";
import GeoButton from "./controls/GeoButton";
import BarButton from "./controls/BarButton";
import {
  initializeMap,
  updateUserLocation,
  drawRoute,
  drawParkingMarkers
} from "./lib/MapHelper.ts";
import { getRoute } from './lib/Requests.ts' 
import EvCircle from "./СircleArea/EvCircle.jsx";
import ParkingCircle from "./СircleArea/ParkingCirle.jsx";
import FilterBlock from "./bar/FilterBlock.jsx";

function Map() {
  const [map, setMap] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [isFollowing, setIsFollowing] = useState(true);
  const [isBarVisible, setIsBarVisible] = useState(false);
  const mapContainer = useRef(null);

  const parkingData = useSelector(
    (state) => state.parkings.parkingData,
    shallowEqual
  );

  const parkingFilters = useSelector((state) => state.filters.parkingFilters); 

  const isFiltersVisible = useSelector((state) => state.filters.isFiltersVisible);
  const isParkingData = useSelector((state) => state.parkings.isParkingData);
  const isChargerData = useSelector((state) => state.chargers.isChargerData);

  const mapboxAccessToken =
    "pk.eyJ1IjoibmF6YXJkb3MiLCJhIjoiY2x2eTZyejQ3MG1iNTJpcGRzdjJtenc0NSJ9.7FZe4OjfKqC8rYu4pMntdA";

  useEffect(() => {
    if (!map) return;

    const handleZoomEnd = () => {
      const zoomLevel = map.getZoom();
      drawParkingMarkers(map, parkingData, zoomLevel, parkingFilters);
    };

    map.on("zoomend", handleZoomEnd);

    return () => {
      map.off("zoomend", handleZoomEnd);
    };
  }, [map, parkingData, parkingFilters]);

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
      })
    
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
      </div>

      {isFiltersVisible && <FilterBlock map={map}/>}

      <GeoButton
        map={map}
        isFollowing={isFollowing}
        setIsFollowing={setIsFollowing}
      />
      <BarButton
        isBarVisible={isBarVisible}
        setIsBarVisible={setIsBarVisible}
      />
    
      {isParkingData && <ParkingCircle map={map} />}
      {isChargerData && <EvCircle map={map} />}
    </div>
  );
}

export default Map;
