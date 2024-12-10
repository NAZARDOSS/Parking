import React, { useEffect, useState, useRef } from "react";
import mapboxgl from "mapbox-gl";
import SearchInput from "./SearchInput";
import GeoButton from "./controls/GeoButton";
import SpeedTracker from "./SpeedTracker";
import BarButton from "./controls/BarButton";
import {
  initializeMap,
  updateUserLocation,
  getRoute,
  drawRoute,
  fetchParkingData,
  drawParkingMarkers,
  addParkingClusters,
  fetchEVChargers,
  drawEVMarkers
} from "../lib/MapHelper.ts";

function Map() {
  const [map, setMap] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [isFollowing, setIsFollowing] = useState(true);
  const [isBarVisible, setIsBarVisible] = useState(false);
  const [parkingData, setParkingData] = useState([]);
  const [EVdata, setEVdata] = useState([]);
  const mapContainer = useRef(null);

  const parkApiToken = "b8568cb9afc64fad861a69edbddb2658";
  const hereToken = `eyJhbGciOiJSUzUxMiIsImN0eSI6IkpXVCIsImlzcyI6IkhFUkUiLCJhaWQiOiJGZE5kOXpEN1ZBck52anhGOUNnUiIsImlhdCI6MTczMzgyNzUwMSwiZXhwIjoxNzMzOTEzOTAxLCJraWQiOiJqMSJ9.ZXlKaGJHY2lPaUprYVhJaUxDSmxibU1pT2lKQk1qVTJRMEpETFVoVE5URXlJbjAuLk9VcTNVd3Z5QVN1bkNWYkNubWJ3RncudEd1ZTg3cXBDTlIwNWVJS2lNZHJ3ajE5Ny1rT09IZ3BsQWFoZEtiZThSdm9BbG1IR3hsckJhUEh6RXM0MzVQM2QteXg5WGZhZkxjM1RNSGMxdVYxUFp2UloxWVEyXzdYODExdC0zaUtnXzVDZzNVekZYSWZ5ZGdkVjRscnFpSXFnVkJaa3RIai1Tc3dDNzZDbUhQSWZpNDNkX0VNa2JZSUlFYi1xcFJBeGdrLmZxRUJPUlNBTWthVl9yb0cyLXJnTnBLT3lpemVZUk1Zd2pNSTVvSEZNdGs.bhKvakV8SgBjwJcrUNMuPBLlYZ37OcyNpObEK_InrQILxNdVPuzqOCZfFv2vM6zvVo595SkMoYRRfJ-ldj4W6_Xk6IATro-ch7AwfkV2ac7Qknuu9E_dnU4ImuOs-brzcoQAMYKmP-vJTXN34-TjEaFMM5ZJYjtnGRaivd76UlMNtPFd_A0wQJR-9egpvhtJHlu-hGqCXR6iy6HavFmEAEV7nHlUYExb2yzAzXoZYn8Z6jAGJ_ihT-U8sh_aB82ObQ15dVfN538WMKDw4gBdFydHUDMBEDqGno1LEB9-6GynHA53pR8ntAAdK7RLzz1ywEqINQDkVcpQ7s87qeh43g`;
  const mapboxAccessToken =
    "pk.eyJ1IjoibmF6YXJkb3MiLCJhIjoiY2x2eTZyejQ3MG1iNTJpcGRzdjJtenc0NSJ9.7FZe4OjfKqC8rYu4pMntdA";

  const loadParkingData = async (mapInstance) => {
    try {
      const bounds = mapInstance.getBounds();
      const northEast = bounds.getNorthEast();
      const southWest = bounds.getSouthWest();
  
      const centerLat = (northEast.lat + southWest.lat) / 2;
      const centerLng = (northEast.lng + southWest.lng) / 2;
      const radius = Math.sqrt(
        Math.pow(northEast.lat - southWest.lat, 2) +
        Math.pow(northEast.lng - southWest.lng, 2)
      ) * 111000;  // Convert to meters
  
      const parkingData_ = await fetchParkingData(parkApiToken, northEast, southWest, radius);
      console.log('parkingData_', parkingData_);
  
      // Correcting the URL and passing centerLat, centerLng, and radius properly
      const EVdata_ = await fetchEVChargers(hereToken, `${centerLat},${centerLng}`, radius);
      console.log('EVdata_', EVdata_);
  
      setEVdata(EVdata_);
      setParkingData(parkingData_);
    } catch (error) {
      console.error("Ошибка загрузки данных о парковках:", error);
    }
  }
  ;

  useEffect(() => {
    if (!mapContainer.current) return;

    const newMap = initializeMap(mapContainer.current, mapboxAccessToken);
    setMap(newMap);

    newMap.on("moveend", () => {
      loadParkingData(newMap);
    });

    return () => {
      newMap.remove();
    };
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
      alert("Не удалось получить доступ к геолокации.");
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

  useEffect(() => {
    
    if (map && parkingData && parkingData.length) {
      let zoomValue = map.getZoom()
      drawParkingMarkers(map, parkingData, zoomValue)
    }
  }, [map, parkingData]);
  
  
  useEffect(() => {
    if (map && EVdata && EVdata.length) {
      let zoomValue = map.getZoom()
      drawEVMarkers(map, EVdata, zoomValue);
    }
  }, [map, EVdata]);

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
    </div>
  );
}

export default Map;
