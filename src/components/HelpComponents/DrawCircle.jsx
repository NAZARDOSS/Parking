import React, { useState, useEffect } from "react";
import * as turf from "@turf/turf";
import {
  fetchParkingData,
  fetchEVChargers,
  drawParkingMarkers,
  drawEVMarkers,
} from "../../lib/MapHelper.ts";
import { toast } from "react-hot-toast";

const DrawCircle = ({ map }) => {
  const [parkingData, setParkingData] = useState([]);
  const [EVchargersData, setEVchargersData] = useState([]);

  useEffect(() => {
    if (!map) return;

    const MAX_RADIUS = 5000;

    const calculateRadius = (center, cursor) => {
      const from = turf.point([center.lng, center.lat]);
      const to = turf.point([cursor.lng, cursor.lat]);
      const distance = turf.distance(from, to, { units: "meters" });
      return Math.min(distance, MAX_RADIUS);
    };

    const loadParkingAndEVData = async (circleCenter, radius) => {
      try {
        const bounds = turf.bbox(
          turf.circle([circleCenter.lng, circleCenter.lat], radius, {
            units: "meters",
          })
        );

        const [fetchedParkingData, fetchedEVData] = await Promise.all([
          fetchParkingData(
            "b8568cb9afc64fad861a69edbddb2658",
            { lng: bounds[2], lat: bounds[3] },
            { lng: bounds[0], lat: bounds[1] },
            radius
          ),
          fetchEVChargers(
            "eyJhbGciOiJSUzUxMiIsImN0eS... (token truncated)",
            `${circleCenter.lat},${circleCenter.lng}`,
            radius
          ),
        ]);

        setParkingData(fetchedParkingData);
        setEVchargersData(fetchedEVData);

        // После обновления состояния данных парковок и зарядных станций
        drawParkingMarkers(map, fetchedParkingData, map.getZoom());
        drawEVMarkers(map, fetchedEVData, map.getZoom());

        toast.success("Данные успешно загружены!");
      } catch (error) {
        toast.error("Ошибка загрузки данных!");
        console.error(error);
      }
    };

    map.on("zoomend", () => {
      const zoomLevel = map.getZoom();
      const radius = map.getSource("circle-source")?.radius || 5000;
      const center = map.getSource("circle-source")?.center;
      drawParkingMarkers(map, parkingData, zoomLevel); // Вызываем для обновления маркеров на зум
    });

    map.on("dblclick", async (e) => {
      const center = e.lngLat;

      const handleMouseMove = (moveEvent) => {
        const radius = calculateRadius(center, moveEvent.lngLat);

        if (map.getSource("circle-source")) {
          map
            .getSource("circle-source")
            .setData(
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
            paint: {
              "fill-color": "#007cbf",
              "fill-opacity": 0.4,
            },
          });
        }
      };

      map.on("mousemove", handleMouseMove);

      const handleMouseUp = () => {
        const radius = calculateRadius(center, map.getCenter());
        map.off("mousemove", handleMouseMove);
        map.off("mouseup", handleMouseUp);

        if (map.getSource("circle-source")) {
          map.getSource("circle-source").radius = radius;
          map.getSource("circle-source").center = center;
        }

        loadParkingAndEVData(center, radius); // Загружаем данные после завершения работы с мышью
      };

      map.on("mouseup", handleMouseUp);
    });

    return () => {
      if (map.getLayer("circle-layer")) {
        map.removeLayer("circle-layer");
      }

      if (map.getSource("circle-source")) {
        map.removeSource("circle-source");
      }
    };
  }, [map, parkingData]); // добавлен parkingData, чтобы правильно обновить маркеры

  return null;
};

export default DrawCircle;
