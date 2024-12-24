import React, { useEffect } from "react";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import * as turf from "@turf/turf";
import { drawParkingMarkers } from "../lib/MapHelper.ts";
import { fetchParkingData } from "../lib/Requests.ts";
import { toast } from "react-hot-toast";
import { setParkingData } from "../Store/store.js";

const ParkingCircle = ({ map }) => {
  const parkingData = useSelector(
    (state) => state.parkings.parkingData,
    shallowEqual
  );

  const parkingFilters = useSelector((state) => state.filters.parkingFilters);

  const dispatch = useDispatch();
  let radius;

  useEffect(() => {
    console.log("parkingFilters changed:", parkingFilters);
  }, [parkingFilters]);

  useEffect(() => {
    console.log('parkingData parkingFilters map');
    
    if (map && parkingFilters && parkingData) {
      drawParkingMarkers(map, parkingData, map.getZoom(), parkingFilters);
    }
  }, [map, parkingFilters, parkingData]);

  useEffect(() => {
    if (!map) return;

    const MAX_RADIUS = 1500;

    const calculateRadius = (center, cursor) => {
      const from = turf.point([center.lng, center.lat]);
      const to = turf.point([cursor.lng, cursor.lat]);
      const distance = turf.distance(from, to, { units: "meters" });
      return Math.min(distance, MAX_RADIUS);
    };

    const loadParkingData = async (circleCenter, radius) => {
      try {
        const bounds = turf.bbox(
          turf.circle([circleCenter.lng, circleCenter.lat], radius, {
            units: "meters",
          })
        );

        const fetchedParkingData = await fetchParkingData(
          "b8568cb9afc64fad861a69edbddb2658",
          { lng: bounds[2], lat: bounds[3] },
          { lng: bounds[0], lat: bounds[1] },
          radius
        );

        if (
          JSON.stringify(fetchedParkingData) !== JSON.stringify(parkingData)
        ) {
          dispatch(setParkingData(fetchedParkingData));
        }

        console.log("parkingFilters:::: ", parkingFilters);

        drawParkingMarkers(
          map,
          fetchedParkingData,
          map.getZoom(),
          parkingFilters
        );
        toast.success("Данные парковок успешно загружены!");
      } catch (error) {
        toast.error("Ошибка загрузки данных парковок!");
        console.error(error);
      }
    };

    const handleZoomEnd = () => {
      const zoomLevel = map.getZoom();
      drawParkingMarkers(map, parkingData, zoomLevel, parkingFilters);
    };

    const handleDoubleClick = async (e) => {
      const center = e.lngLat;

      const handleMouseMove = (moveEvent) => {
        radius = calculateRadius(center, moveEvent.lngLat);
        if (map.getSource("circle-source")) {
          map.getSource("circle-source").setData(
            turf.circle([center.lng, center.lat], radius, {
              steps: 64,
              units: "meters",
            })
          );
        } else {
          map.addSource("circle-source", {
            type: "geojson",
            data: turf.circle([center.lng, center.lat], radius, {
              steps: 64,
              units: "meters",
            }),
          });

          map.addLayer({
            id: "circle-layer",
            type: "fill",
            source: "circle-source",
            paint: { "fill-color": "#007cbf", "fill-opacity": 0.4 },
          });
        }
      };

      const handleMouseUp = () => {
        map.off("mousemove", handleMouseMove);
        map.off("mouseup", handleMouseUp);

        if (map.getSource("circle-source")) {
          map.getSource("circle-source").radius = radius;
          map.getSource("circle-source").center = center;
        }

        loadParkingData(center, radius);
      };

      map.on("mousemove", handleMouseMove);
      map.on("mouseup", handleMouseUp);
    };

    map.on("zoomend", handleZoomEnd);
    map.on("dblclick", handleDoubleClick);

    return () => {
      map.off("zoomend", handleZoomEnd);
      map.off("dblclick", handleDoubleClick);

      if (map.getLayer("circle-layer")) {
        map.removeLayer("circle-layer");
      }
      if (map.getSource("circle-source")) {
        map.removeSource("circle-source");
      }
    };
  }, [map, parkingData, dispatch, parkingFilters]);

  return null;
};

export default ParkingCircle;
