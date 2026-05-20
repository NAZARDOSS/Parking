import { useEffect } from "react";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import * as turf from "@turf/turf";
import { drawEVMarkers } from "../lib/MapHelper.ts";
import { fetchEVChargers } from "../lib/Requests.ts";
import { toast } from "react-hot-toast";
import { setEvData } from "../Store/store.js";

const EvCircle = ({ map, onPlaceSelect }) => {
  const evData = useSelector((state) => state.chargers.evData, shallowEqual);
  const evFilters = useSelector(
    (state) => state.filters.evFilters,
    shallowEqual
  );
  const dispatch = useDispatch();

  let radius;

  useEffect(() => {
    if (map && evFilters && evData) {
      drawEVMarkers(map, evData, map.getZoom(), evFilters, onPlaceSelect);
    }
  }, [map, evFilters, evData, onPlaceSelect]);

  useEffect(() => {
    if (!map) return;

    const MAX_RADIUS = 1500;

    const calculateRadius = (center, cursor) => {
      const from = turf.point([center.lng, center.lat]);
      const to = turf.point([cursor.lng, cursor.lat]);
      const distance = turf.distance(from, to, { units: "meters" });
      return Math.min(distance, MAX_RADIUS);
    };

    const loadEVChargersData = async (circleCenter, radius) => {
      try {
        const fetchedEVData = await fetchEVChargers(
          `${circleCenter.lat},${circleCenter.lng}`,
          radius
        );

        if (JSON.stringify(fetchedEVData) !== JSON.stringify(evData)) {
          dispatch(setEvData(fetchedEVData));
        }

        drawEVMarkers(map, fetchedEVData, map.getZoom(), evFilters, onPlaceSelect);
        toast.success("Данні зарядних станцій успішно завантажені!");
      } catch (error) {
        toast.error("Помилка при завантаженні зарядних станцій");
      }
    };

    const handleZoomEnd = () => {
      const zoomLevel = map.getZoom();
      drawEVMarkers(map, evData, zoomLevel, evFilters, onPlaceSelect);
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

        loadEVChargersData(center, radius);
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
  }, [map, evData, evFilters, dispatch, onPlaceSelect]);

  return null;
};

export default EvCircle;
