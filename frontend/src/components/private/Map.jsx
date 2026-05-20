import { useCallback, useEffect, useState, useRef } from "react";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import mapboxgl from "mapbox-gl";
import { Toaster, toast } from "react-hot-toast";
import SearchInput from "./SearchInput.jsx";
import GeoButton from "./controls/GeoButton.jsx";
import BarButton from "./controls/BarButton.jsx";
import {
  initializeMap,
  updateUserLocation,
  drawRoute,
  drawParkingMarkers,
} from "./lib/MapHelper.ts";
import { getParkingRecommendations, getRoute } from "./lib/Requests.ts";
import EvCircle from "./СircleArea/EvCircle.jsx";
import ParkingCircle from "./СircleArea/ParkingCirle.jsx";
import FilterBlock from "./bar/FilterBlock.jsx";
import ProfileBlock from "./bar/ProfileBlock.jsx";
import RoutesData from "./bar/RoutesData.jsx";
import PlaceDetailsPanel from "./bar/PlaceDetailsPanel.jsx";
import { setIsParkingData } from "./Store/store.js";
import { MAPBOX_ACCESS_TOKEN } from "../../config/env.js";

const createRouteMarker = (label, className) => {
  const element = document.createElement("div");
  element.className = `flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white shadow-lg ${className}`;
  element.textContent = label;
  return element;
};

const createRecommendationMarker = (rank, recommendation) => {
  const element = document.createElement("button");
  element.type = "button";
  const colorClass = {
    green: "bg-emerald-400 text-emerald-950",
    yellow: "bg-amber-400 text-blue-950",
    red: "bg-red-400 text-red-950",
  }[recommendation.occupancyPrediction?.color] || "bg-amber-400 text-blue-950";
  element.className = `flex h-9 w-9 items-center justify-center rounded-full border-2 border-white ${colorClass} text-sm font-black shadow-xl`;
  element.textContent = String(rank);
  element.setAttribute("aria-label", `Parking recommendation ${rank}`);
  element.setAttribute(
    "title",
    `${recommendation.parking.name || "Parking"} · ${Math.round(recommendation.score * 100)}% score · ${recommendation.occupancyPrediction?.label || "Availability unknown"}`
  );
  return element;
};

const removeLayerAndSource = (map, layerId, sourceId = layerId) => {
  if (map?.getLayer(layerId)) {
    map.removeLayer(layerId);
  }

  if (map?.getSource(sourceId)) {
    map.removeSource(sourceId);
  }
};

const drawRouteSegment = (map, sourceId, layerId, geometry, paint) => {
  if (!map || !geometry) return;

  const data = {
    type: "Feature",
    properties: {},
    geometry,
  };

  if (map.getSource(sourceId)) {
    map.getSource(sourceId).setData(data);
    return;
  }

  map.addSource(sourceId, {
    type: "geojson",
    data,
  });

  map.addLayer({
    id: layerId,
    type: "line",
    source: sourceId,
    layout: {
      "line-join": "round",
      "line-cap": "round",
    },
    paint,
  });
};

const fitRouteToMap = (map, route, hasDetailsPanel) => {
  const coordinates = route?.geometry?.coordinates || [];
  if (!map || coordinates.length === 0) return;

  const bounds = coordinates.reduce(
    (routeBounds, coordinate) => routeBounds.extend(coordinate),
    new mapboxgl.LngLatBounds(coordinates[0], coordinates[0])
  );

  map.fitBounds(bounds, {
    padding: {
      top: 120,
      bottom: 120,
      left: hasDetailsPanel ? 470 : 90,
      right: 440,
    },
    duration: 700,
  });
};

function Map({ setIsLoggedIn }) {
  const dispatch = useDispatch();
  const [map, setMap] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [isFollowing, setIsFollowing] = useState(true);
  const [isBarVisible, setIsBarVisible] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const mapContainer = useRef(null);
  const recommendationMarkersRef = useRef([]);

  const [startPointMarker, setStartPointMarker] = useState(null);
  const [finishPointMarker, setFinishPointMarker] = useState(null);

  const parkingData = useSelector(
    (state) => state.parkings.parkingData,
    shallowEqual
  );
  
  const parkingFilters = useSelector((state) => state.filters.parkingFilters);
  const isFiltersVisible = useSelector((state) => state.filters.isFiltersVisible);
  const isProfileVisible = useSelector((state) => state.profile.isProfileVisible);
  const isRoutesVisible = useSelector((state) => state.routes.isRoutesVisible);
  
  const isParkingData = useSelector((state) => state.parkings.isParkingData);
  const isChargerData = useSelector((state) => state.chargers.isChargerData);

  const mapboxAccessToken = MAPBOX_ACCESS_TOKEN;

  const clearRecommendationMarkers = useCallback(() => {
    recommendationMarkersRef.current.forEach((marker) => marker.remove());
    recommendationMarkersRef.current = [];
  }, []);

  const handleParkingSelect = useCallback((parking) => {
    dispatch(setIsParkingData(true));
    setSelectedPlace({ type: "parking", place: parking });
  }, [dispatch]);

  const handleEvSelect = useCallback((station) => {
    setSelectedPlace({ type: "ev", place: station });
  }, []);

  const clearActiveRoute = useCallback(() => {
    removeLayerAndSource(map, "route");
    removeLayerAndSource(map, "recommended-drive-route");
    removeLayerAndSource(map, "recommended-walk-route");
    clearRecommendationMarkers();

    if (startPointMarker) {
      startPointMarker.remove();
      setStartPointMarker(null);
    }

    if (finishPointMarker) {
      finishPointMarker.remove();
      setFinishPointMarker(null);
    }
  }, [map, startPointMarker, finishPointMarker, clearRecommendationMarkers]);

  const drawRecommendationMarkers = useCallback(
    (recommendations) => {
      if (!map) return;

      clearRecommendationMarkers();

      recommendationMarkersRef.current = recommendations.map((recommendation, index) => {
        const element = createRecommendationMarker(index + 1, recommendation);
        element.addEventListener("click", (event) => {
          event.stopPropagation();
          handleParkingSelect(recommendation.parking);
        });

        return new mapboxgl.Marker({
          element,
          anchor: "bottom",
        })
          .setLngLat([recommendation.parking.lon, recommendation.parking.lat])
          .addTo(map);
      });
    },
    [map, clearRecommendationMarkers, handleParkingSelect]
  );

  const buildParkingRecommendations = useCallback(
    async ({ startPoint, finishPoint, travelMode, parkingFiltersOverride }) => {
      if (!startPoint || !finishPoint) return [];

      try {
        const result = await getParkingRecommendations({
          startPoint,
          finishPoint,
          parkingFilters: parkingFiltersOverride || parkingFilters,
          radiusMeters: 1000,
          maxCandidates: 20,
          limit: 3,
          includeCycling: travelMode === "cycling",
          enableOccupancyPrediction: true,
          occupancyPredictionLimit: 8,
        });

        const recommendations = result.candidates || [];
        drawRecommendationMarkers(recommendations);
        return recommendations;
      } catch (error) {
        toast.error(error.message || "Не вдалося порахувати рекомендації парковок.");
        return [];
      }
    },
    [drawRecommendationMarkers, parkingFilters]
  );

  const handleParkingRecommendationSelect = useCallback(
    async (recommendation, routeContext = {}) => {
      if (!map || !recommendation) return;

      const parkingPoint = [recommendation.parking.lon, recommendation.parking.lat];
      const { startPoint, finishPoint } = routeContext;

      handleParkingSelect(recommendation.parking);
      removeLayerAndSource(map, "route");

      if (!startPoint || !finishPoint) return;

      try {
        const [driveRoute, walkRoute] = await Promise.all([
          getRoute(startPoint, parkingPoint, "driving", mapboxAccessToken),
          getRoute(parkingPoint, finishPoint, "walking", mapboxAccessToken),
        ]);

        drawRouteSegment(
          map,
          "recommended-drive-route",
          "recommended-drive-route",
          driveRoute.geometry,
          {
            "line-color": "#2563eb",
            "line-width": ["interpolate", ["linear"], ["zoom"], 12, 4, 22, 12],
            "line-opacity": 0.9,
          }
        );
        drawRouteSegment(
          map,
          "recommended-walk-route",
          "recommended-walk-route",
          walkRoute.geometry,
          {
            "line-color": "#f59e0b",
            "line-width": ["interpolate", ["linear"], ["zoom"], 12, 3, 22, 8],
            "line-dasharray": [1.5, 1],
            "line-opacity": 0.9,
          }
        );
      } catch (error) {
        toast.error("Не вдалося побудувати маршрут через рекомендовану парковку.");
      }
    },
    [map, mapboxAccessToken, handleParkingSelect]
  );

  useEffect(() => {
    if (!map) return;

    const handleZoomEnd = () => {
      const zoomLevel = map.getZoom();
      drawParkingMarkers(map, parkingData, zoomLevel, parkingFilters, handleParkingSelect);
    };

    map.on("zoomend", handleZoomEnd);

    return () => {
      map.off("zoomend", handleZoomEnd);
    };
  }, [map, parkingData, parkingFilters, handleParkingSelect]);

  useEffect(() => {
    if (selectedPlace?.type === "parking" && !isParkingData) {
      setSelectedPlace(null);
    }

    if (selectedPlace?.type === "ev" && !isChargerData) {
      setSelectedPlace(null);
    }
  }, [isParkingData, isChargerData, selectedPlace]);

  useEffect(() => {
    if (!mapContainer.current || !mapboxAccessToken) return;

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
      toast.error("Геолокація недоступна");
    };

    const watchId = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      {
        enableHighAccuracy: true,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [map, isFollowing]);

  const handleRouteRequest = async (start, end, travelMode) => {
    if (!map) return;

    try {
      const route = await getRoute(
        start,
        end,
        travelMode,
        mapboxAccessToken
      );
      drawRoute(map, route.geometry);
      return route;
    } catch (error) {
      toast.error("Ошибка при запросе маршрута.");
      throw error;
    }
  };

  const handleSearchResult = async ({
    startPoint,
    finishPoint,
    travelMode = "driving",
    parkingFilters: routeParkingFilters,
  }) => {
    if (!map || !finishPoint) return;

    clearActiveRoute();

    if (startPoint) {
      const newStartMarker = new mapboxgl.Marker({
        element: createRouteMarker("A", "bg-emerald-500"),
      }).setLngLat(startPoint).addTo(map);
      setStartPointMarker(newStartMarker);
    }

    if (finishPoint) {
      const newFinishMarker = new mapboxgl.Marker({
        element: createRouteMarker("B", "bg-blue-600"),
      }).setLngLat(finishPoint).addTo(map);
      setFinishPointMarker(newFinishMarker);
    }

    const route = await handleRouteRequest(startPoint, finishPoint, travelMode);
    const parkingRecommendations = await buildParkingRecommendations({
      startPoint,
      finishPoint,
      travelMode,
      parkingFiltersOverride: routeParkingFilters,
    });

    fitRouteToMap(map, route, Boolean(selectedPlace));
    return {
      ...route,
      parkingRecommendations,
    };
  };

  if (!mapboxAccessToken) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950 px-6 text-center text-white">
        Mapbox token is not configured. Set VITE_MAPBOX_ACCESS_TOKEN in frontend/.env.
      </div>
    );
  }

  return (
    <div className="map_block relative h-screen w-full overflow-hidden">
      <Toaster position="top-right" reverseOrder={false} />
      <div ref={mapContainer} className="w-full h-screen"></div>
      <div className="z-10 absolute top-5 right-5">
        <SearchInput
          map={map}
          placeholder="Search"
          apiKey={mapboxAccessToken}
          onResultSelect={handleSearchResult}
          onParkingRecommendationSelect={handleParkingRecommendationSelect}
          onClearRoute={clearActiveRoute}
          userLocation={userLocation}
        />
      </div>

      {selectedPlace && (
        <PlaceDetailsPanel
          selection={selectedPlace}
          onClose={() => setSelectedPlace(null)}
        />
      )}
      {isFiltersVisible && <FilterBlock map={map} onParkingSelect={handleParkingSelect}/>}
      {isProfileVisible && <ProfileBlock setIsLoggedIn = {setIsLoggedIn}/>}
      {isRoutesVisible && <RoutesData onResultSelect={handleSearchResult} />}
      <GeoButton
        map={map}
        isFollowing={isFollowing}
        setIsFollowing={setIsFollowing}
      />
      <BarButton
        isBarVisible={isBarVisible}
        setIsBarVisible={setIsBarVisible}
      />
    
      {isParkingData && <ParkingCircle map={map} onPlaceSelect={handleParkingSelect} />}
      {isChargerData && <EvCircle map={map} onPlaceSelect={handleEvSelect} />}
    </div>
  );
}

export default Map;
