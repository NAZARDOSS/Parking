import React, { useEffect } from "react";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import * as turf from "@turf/turf";
import { drawEVMarkers } from "../lib/MapHelper.ts";
import { fetchEVChargers } from "../lib/Requests.ts";
import { toast } from "react-hot-toast";
import { setEvData } from "../Store/store.js";

const EvCircle = ({ map }) => {
  const evData = useSelector((state) => state.chargers.evData, shallowEqual);
  const evFilters = useSelector(
    (state) => state.filters.evFilters,
    shallowEqual
  );
  const dispatch = useDispatch();

  const token =
    "eyJhbGciOiJSUzUxMiIsImN0eSI6IkpXVCIsImlzcyI6IkhFUkUiLCJhaWQiOiJGZE5kOXpEN1ZBck52anhGOUNnUiIsImlhdCI6MTczNzY2NDYxNCwiZXhwIjoxNzM3NzUxMDE0LCJraWQiOiJqMSJ9.ZXlKaGJHY2lPaUprYVhJaUxDSmxibU1pT2lKQk1qVTJRMEpETFVoVE5URXlJbjAuLmJwSVdqT0xUSWtvR0E1bGp0X2d1RGcuU01iVzB0LTNYS3N6b2NmZ0E3enFhNHFwVFFOUkxadDB4c0lOcUkySDlZRENTTUE2ZzVTSVhzR0pqXzNKX1p0OGRfV01PanpIdHBLYXE4WlJiUlFJSU5hbzVCU2tfbDFzSGZ0SkU1SzN3UTUtd0hOY3d2c2lDWHdzQXUwcHQ2RUJzc2pYa1ZxVXhQS1JpbkppTXk0T21ORXJyMDZ5NUNyYXFoaXhnTmJnSVRjLmIzQzB3dnlVUFhCRlYtQV92b0xkNjY5V0Fub1J1ZW96Uk9ibVBselBQUFE.jKhUDprBW6mpJKETG4twVmzxjDIzPDiXBUKU7UJfoHKJBBxyWcmnHO7J7nU3iDFRVsVEvTV8Ohf9ZtG0HLldRFUIQ-TS33uzjXlkT76ZZSNxvFDFyuuwErnbDInBF195JkaRQiIimSynGQ7sKZZFIHwTRuJvY7zHkvmwRRmCmmOtJui5EdbLQbS4U-9_l5zChLUSLVaL7gHBqW3CtcnVXML0bYq155TzybPYDnWAaqZ09ftcOIdujTHqAOKku8Vy_EDw88HKmD3yq1oIZWKsc0N2rqWn24VqtlFVXoR2a98-UWTZq5OrBO6UtWd5jFCjotoF3htAOSkS1m3QsffzQQ";

  let radius;

  useEffect(() => {
    if (map && evFilters && evData) {
      console.log("Обновление маркеров EV");
      drawEVMarkers(map, evData, map.getZoom(), evFilters);
    }
  }, [map, evFilters, evData]);

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
        const bounds = turf.bbox(
          turf.circle([circleCenter.lng, circleCenter.lat], radius, {
            units: "meters",
          })
        );

        const fetchedEVData = await fetchEVChargers(
          token,
          `${circleCenter.lat},${circleCenter.lng}`,
          radius
        );

        if (JSON.stringify(fetchedEVData) !== JSON.stringify(evData)) {
          console.log("Оновлення зар станцій");
          dispatch(setEvData(fetchedEVData));
        }

        drawEVMarkers(map, fetchedEVData, map.getZoom(), evFilters);
        toast.success("Данні зарядних станцій успішно завантажені!");
      } catch (error) {
        toast.error("Помилка при завантаженні зарядних станцій");
        console.error(error);
      }
    };

    const handleZoomEnd = () => {
      console.log("EV Filters на изменении масштаба: ", evFilters);
      const zoomLevel = map.getZoom();
      drawEVMarkers(map, evData, zoomLevel, evFilters);
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
  }, [map, evData, evFilters, dispatch]);

  return null;
};

export default EvCircle;
