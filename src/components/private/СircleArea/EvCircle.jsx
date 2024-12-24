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
    "eyJhbGciOiJSUzUxMiIsImN0eSI6IkpXVCIsImlzcyI6IkhFUkUiLCJhaWQiOiJGZE5kOXpEN1ZBck52anhGOUNnUiIsImlhdCI6MTczNTA1ODI1MCwiZXhwIjoxNzM1MTQ0NjUwLCJraWQiOiJqMSJ9.ZXlKaGJHY2lPaUprYVhJaUxDSmxibU1pT2lKQk1qVTJRMEpETFVoVE5URXlJbjAuLjJ1TVp2SVlxR2h6cklZV3pvTm9xU2cuNUx6dHFsbHVnclM4MnhUQzVLQVVDcXZMTTFKUWdUQ3hTYWlKRUxDRF9ocFdUNVQ0bHVoOWU4OEw5Q3JmZXN2SlU2dkNpNWZTRVFkbzUzSFRLNTJzVXF4bGllN1dpSGZVZ05VdGQ1QTdJZWZTT2t6ZjMyT2xmcFlVZUlIWGl6LWhTUUp4eW9xUmppYTA4OXh2TnNuaWR3T2I3dS02RlB4RXh3c0lOU1JoOU9ZLkJqUnJnYXplQTllLUZPbXZfV01XR1VHczZHOFRJUE9CVEt6SE5BLS1udHc.nvXOk6gndPgwcbieOJRvbC7X49s-2yF1_dZ744c1sR3zxa6L46_WgZ7S_OmUkVpuUXOPsnFfnAIsbf4266qzWu_bknCSPk_1dn1RQFmmZleh48XSIVSqh7Une4stU1h2fBTjMlfqwDB1Z3bAzm4ihsKCZeO_0ykiwPJXZAs48Ot0_t2A0-C5jlb9E_xX1psnO9t3x2ePG9MxFrF3ItQj26U4mtABDE53lwJobMEoXY3VoKE_Kt2B_8SrQUW6bo-i0QicaX_YIo5q110VvhoKDhRZ7bbxNPK8KhKxBG0LjK94-SFsTPbrRiejk_NxpiscHmpbGV3WgRPM3UL1-HdYIg";

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
          console.log("Обновление данных зарядных станций");
          dispatch(setEvData(fetchedEVData));
        }

        drawEVMarkers(map, fetchedEVData, map.getZoom(), evFilters);
        toast.success("Данные зарядных станций успешно загружены!");
      } catch (error) {
        toast.error("Ошибка загрузки данных зарядных станций!");
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
