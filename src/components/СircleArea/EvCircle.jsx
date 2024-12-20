import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import * as turf from "@turf/turf";
import { fetchEVChargers, drawEVMarkers } from "../../lib/MapHelper.ts";
import { toast } from "react-hot-toast";

const setEVData = (data) => ({
  type: "SET_EV_DATA",
  payload: data,
});

const EvCircle = ({ map }) => {
  const evData = useSelector((state) => state.chargers.evData);
  const dispatch = useDispatch();
  const token =
    "eyJhbGciOiJSUzUxMiIsImN0eSI6IkpXVCIsImlzcyI6IkhFUkUiLCJhaWQiOiJGZE5kOXpEN1ZBck52anhGOUNnUiIsImlhdCI6MTczNDU1MjkxMywiZXhwIjoxNzM0NjM5MzEzLCJraWQiOiJqMSJ9.ZXlKaGJHY2lPaUprYVhJaUxDSmxibU1pT2lKQk1qVTJRMEpETFVoVE5URXlJbjAuLlZQc0V1VDZzTWdPY0FBRDhIREVFbHcuSkhUNG5vV2RUTm5PZE9mb1VVUzJiNl84RXdKdXlqelo2ZVRLUUlLN0lkcU1JYkx1b3F1Z2E1ZVNkNU40bDRRZVNXQjdjQmhyb1Nqa3YtU25rbEs4V3V1TXdpU0MzMHZJdnYyQW1aN1ROYUMyMXM2OHRjUXhUS3I1TlBWNHhrU2RJMXhnMkJvckg4eWxNekVkU29xem93cS01RHdwUm1sSzV5X2tUY3c4YnNJLmdlOTJaYUlTcXVQdHFROUFaQXVGZ25uR3pLQlRkTy12Mkx4MU0yQnVmM2M.reXSu5kGQqVIhcGeLt0zH6mvPlBcYNmOQftwM2lw7CELpjSyRa5456lNAVsAvTwegtLc81jxkJxLqNG65cbbpKfUe7IMmLLodDXQyIPwfAPqgLkWsr-8cA0wHunzFiNQLe1DuB00ApvnW_CzxyOKDZp9kh8JXOJ4xCXJls2tRC1liuPWLsBsWjm9uyDAQUwCp5FM5Fh6OUoRblR3jwWGnc4K7qLNyZ4pdpeA6AXVo1rMcDn092swBOCBKAAJW_n6F5p_YIAZitupn1SD5pWAD8PTf4BL3jbw_wUHcN5YaygPL6ny5zdm_o5WrUBBSuJzOTGThRJoCndjDnTG-rQsQQ";

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
          token,
          `${circleCenter.lat},${circleCenter.lng}`,
          radius
        );

        dispatch(setEVData(fetchedEVData));

        drawEVMarkers(map, fetchedEVData, map.getZoom());
        toast.success("Данные зарядных станций успешно загружены!");
      } catch (error) {
        toast.error("Ошибка загрузки данных зарядных станций!");
        console.error(error);
      }
    };

    map.on("zoomend", () => {
      const zoomLevel = map.getZoom();
      const radius = map.getSource("circle-source")?.radius || 5000;
      const center = map.getSource("circle-source")?.center;
      drawEVMarkers(map, evData, zoomLevel);
    });

    map.on("dblclick", async (e) => {
      const center = e.lngLat;

      const handleMouseMove = (moveEvent) => {
        const radius = calculateRadius(center, moveEvent.lngLat);

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

      map.on("mousemove", handleMouseMove);

      const handleMouseUp = () => {
        const radius = calculateRadius(center, map.getCenter());
        map.off("mousemove", handleMouseMove);
        map.off("mouseup", handleMouseUp);

        if (map.getSource("circle-source")) {
          map.getSource("circle-source").radius = radius;
          map.getSource("circle-source").center = center;
        }

        loadEVChargersData(center, radius);
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
  }, [map, evData, dispatch]);

  return null;
};

export default EvCircle;
