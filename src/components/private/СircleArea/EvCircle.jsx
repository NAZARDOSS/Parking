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
    "eyJhbGciOiJSUzUxMiIsImN0eSI6IkpXVCIsImlzcyI6IkhFUkUiLCJhaWQiOiJGZE5kOXpEN1ZBck52anhGOUNnUiIsImlhdCI6MTczNzcxNDg0NiwiZXhwIjoxNzM3ODAxMjQ2LCJraWQiOiJqMSJ9.ZXlKaGJHY2lPaUprYVhJaUxDSmxibU1pT2lKQk1qVTJRMEpETFVoVE5URXlJbjAuLmRPM2Q1NmczYUVPaVVBNlFlSThFcWcuSExTc1otd05sUEJzcFFBTndEQVBVcjRGMUtHRUZQRGZaVnVZdVN1Q05EOFpNeFVia1dacEFtVjZEeXZrYXZ6dktVOFdyV1g3cnJZZ1M5NHJuY1pxb0xGYV80bm5zM2d2UnVLcGE0bmVDbHQ1UHIxZGJwdkJOR1JuOFJSSHo0N1pmUDVxbFF3THRHRnZfUnZvclhTVkhfOFl4LXNBaDNROXV5eldyRXV1U040LkprR0VPb1JCMmRZSTJMWjE4ejZncnl6YUd0NDVTWWZmczRSNEVKSEU2SEk.XitRG_M4aJPwr0QUsvbS49fPsrO2QonzGXz0IK7Uhev7csakK9XkvNljE3abLwGZVfwKeQEFRVIPbNtEGeNLWznwY8dlEm0WynogK_Hnn4jNEdq5Xvrlh3-cBAzq2PJ-6px-RqamFP5CxbXVrtaIxfAEfu-I6MjiLRWoGEHs9UBTsjqKeeYQI5_oaBrte6THfG0c2ee_w8VxQNRLDqF9IRxEISldhTyNK7ndAu86C1HO42QMA3CShL-m-bw1OErRg-9Nm1c_BXyNYiA9YAV5RLzBnAsv-2fhyzWwyLsQrpZcJyDz2GBBWbEd-59b7yZvaXp1bkpsnPcLIo-7MgMZdg";

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
