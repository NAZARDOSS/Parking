import mapboxgl from "mapbox-gl";

export const fetchEVChargers = async (hereToken, centerCoords, radius, map, maxStations = 50) => {
  console.log('radius!:::::: ', radius);
  if(radius > 15000) return;
  
  const url = `https://ev-v2.cc.api.here.com/ev/stations.json?prox=${centerCoords},${radius}`;
  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${hereToken}`,
      },
    });

    if (!response.ok) {
      throw new Error("Ошибка загрузки данных о зарядных станциях");
    }

    const data = await response.json();

    if (data.evStations && data.evStations.evStation) {
      const stations = data.evStations.evStation.map((station) => ({
        name: station.name,
        position: station.position,
      }));

      return stations;
    } else {
      console.error("Нет данных о зарядных станциях.");
      return [];
    }

  } catch (error) {
    console.error("Ошибка:", error);
    return [];
  }
};




let activeEVMarkers = [];

export const drawEVMarkers = (map, evStations, zoomValue) => {
  // Удаляем существующие маркеры
  activeEVMarkers.forEach((marker) => marker.remove());
  activeEVMarkers = []; // Очистка массива маркеров

  const sourceId = "ev-clusters";
  const clusterColors = ["#3cb371", "#2e8b57", "#006400"];
  const pointColor = "#228b22";

  if (zoomValue < 15) {
    // Преобразуем данные `evStations` в формат для `addClusters`
    const clusterData = evStations.map((station) => ({
      lon: station.position.longitude,
      lat: station.position.latitude,
    }));

    addClusters(map, clusterData, sourceId, clusterColors, pointColor);
  } else {
    // Отображаем одиночные маркеры, если зум высокий
    evStations.forEach((station) => {
      const { latitude, longitude } = station.position;
      const markerLngLat = [longitude, latitude];

      const marker = new mapboxgl.Marker()
        .setLngLat(markerLngLat)
        .addTo(map);

      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <h3>${station.name}</h3>
        <p>Latitude: ${latitude}</p>
        <p>Longitude: ${longitude}</p>
      `);

      marker.setPopup(popup);
      activeEVMarkers.push(marker); // Сохраняем маркер в массив
    });
  }
};






let activeMarkers = []; // Массив для хранения всех активных маркеров

// Удаление всех маркеров, которые вышли за пределы видимости
const clearMarkers = () => {
  activeMarkers.forEach((marker) => marker.remove());
  activeMarkers = [];
};

// Проверка, находится ли маркер в пределах видимости карты
const isMarkerInBounds = (map, markerLngLat) => {
  const bounds = map.getBounds();
  return bounds.contains(markerLngLat);
};

// Инициализация карты
export const initializeMap = (container, mapboxAccessToken) => {
  mapboxgl.accessToken = mapboxAccessToken;
  return new mapboxgl.Map({
    container,
    style: "mapbox://styles/nazardos/cm27a8krf00dq01pe0rjtbz9z", // Стиль карты
    center: [8.2437103, 48.7550959], // Центр карты
    zoom: 14, // Уровень зума
  });
};

// Обновление местоположения пользователя
export const updateUserLocation = (map, location, isFollowing) => {
  if (!map.getSource("user-location")) {
    map.addSource("user-location", {
      type: "geojson",
      data: {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [location.lng, location.lat],
        },
      },
    });

    map.addLayer({
      id: "user-location",
      type: "circle",
      source: "user-location",
      paint: {
        "circle-radius": 8,
        "circle-color": "#007cbf",
      },
    });
  } else {
    const source = map.getSource("user-location");
    source.setData({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [location.lng, location.lat],
      },
    });
  }

  if (isFollowing) {
    map.flyTo({ center: [location.lng, location.lat], zoom: 14 });
  }
};

// Запрос маршрута от точки до точки
export const getRoute = async (start, end, travelMode, mapboxAccessToken) => {
  const url = `https://api.mapbox.com/directions/v5/mapbox/${travelMode}/${start[0]},${start[1]};${end[0]},${end[1]}?access_token=${mapboxAccessToken}&geometries=geojson&steps=true&overview=full`;

  const response = await fetch(url);
  const data = await response.json();

  if (!data.routes || data.routes.length === 0) {
    throw new Error("Маршрут не найден");
  }

  return data.routes[0].geometry;
};

// Отображение маршрута на карте
export const drawRoute = (map, route) => {
  const geojson = {
    type: "Feature",
    properties: {},
    geometry: route,
  };

  if (map.getSource("route")) {
    const source = map.getSource("route");
    source.setData(geojson);
  } else {
    map.addSource("route", {
      type: "geojson",
      data: geojson,
    });

    map.addLayer({
      id: "route",
      type: "line",
      source: "route",
      layout: {
        "line-join": "round",
        "line-cap": "round",
      },
      paint: {
        "line-color": "#3887be",
        "line-width": ["interpolate", ["linear"], ["zoom"], 12, 3, 22, 12],
        "line-opacity": 0.75,
      },
    });
  }
};

export const fetchParkingData = async (apiKey, northEast, southWest, radius) => {
  const url = `https://api.geoapify.com/v2/places?categories=parking&filter=rect:${northEast.lng},${northEast.lat},${southWest.lng},${southWest.lat}&limit=500&apiKey=${apiKey}`;

  if(radius > 15000) return;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Ошибка загрузки данных о парковках");
  }

  const data = await response.json();
  return data.features.map((feature) => ({
    name: feature.properties.name,
    address: feature.properties.address,
    lat: feature.geometry.coordinates[1],
    lon: feature.geometry.coordinates[0],
    properties: feature.properties,
  }));
};

const addClusters = (
  map: mapboxgl.Map,
  data: Array<{ lon: number; lat: number; position?: { lng: number; lat: number } }>,
  sourceId: string,
  clusterColors: string[],
  pointColor: string
): void => {
  if (!map || !data || data.length === 0) return;

  // Удаляем старые слои и источник перед добавлением новых
  if (map.getSource(sourceId)) {
    map.removeLayer(`${sourceId}-clusters`);
    map.removeLayer(`${sourceId}-cluster-count`);
    map.removeLayer(`${sourceId}-unclustered-point`);
    map.removeSource(sourceId);
  }

  map.addSource(sourceId, {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: data.map((item) => ({
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [
            item.lon || item.position?.lng || 0,
            item.lat || item.position?.lat || 0,
          ],
        },
      })),
    },
    cluster: true,
    clusterMaxZoom: 15,
    clusterRadius: 50,
  });

  // Слой кластеров
  map.addLayer({
    id: `${sourceId}-clusters`,
    type: "circle",
    source: sourceId,
    filter: ["has", "point_count"],
    paint: {
      "circle-color": [
        "step",
        ["get", "point_count"],
        clusterColors[0],
        10,
        clusterColors[1],
        25,
        clusterColors[2],
      ],
      "circle-radius": [
        "step",
        ["get", "point_count"],
        15,
        20,
        20,
        50,
        25,
      ],
    },
  });

  // Слой текста для кластеров
  map.addLayer({
    id: `${sourceId}-cluster-count`,
    type: "symbol",
    source: sourceId,
    filter: ["has", "point_count"],
    layout: {
      "text-field": "{point_count_abbreviated}",
      "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
      "text-size": 12,
    },
  });

  // Слой одиночных точек
  map.addLayer({
    id: `${sourceId}-unclustered-point`,
    type: "circle",
    source: sourceId,
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-color": pointColor,
      "circle-radius": 5,
      "circle-stroke-width": 1,
      "circle-stroke-color": "#fff",
    },
  });
};

export const drawParkingMarkers = (map, parkingData, zoomValue) => {
  activeMarkers.forEach((marker) => marker.remove());
  activeMarkers = [];

  console.log('zoomValue: ', zoomValue);
  
  if (zoomValue < 13) {
    const sourceId = "parking-clusters";
    const clusterColors = ["#51bbd6", "#f1f075", "#f28cb1"];
    const pointColor = "#11b4da";

    addClusters(map, parkingData, sourceId, clusterColors, pointColor);
  } else {
    activeMarkers = activeMarkers.filter((marker) => {
      if (isMarkerInBounds(map, marker.getLngLat())) {
        return true;
      } else {
        marker.remove();
        return false;
      }
    });

    parkingData.forEach((parking) => {
      const markerLngLat = [parking.lon, parking.lat];

      const existingMarker = activeMarkers.find((marker) => {
        const { lng, lat } = marker.getLngLat();
        return lng === parking.lon && lat === parking.lat;
      });

      if (!existingMarker) {
        const el = document.createElement("div");
        el.className = "marker";

        const icon = document.createElement("div");
        icon.className = "marker-icon";
        el.appendChild(icon);

        const marker = new mapboxgl.Marker({
          element: el,
          anchor: "bottom",
        })
          .setLngLat(markerLngLat)
          .addTo(map);

        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <h3>Информация о парковке</h3>
          <p>Широта: ${parking.lat}</p>
          <p>Долгота: ${parking.lon}</p>
        `);

        marker.setPopup(popup);
        activeMarkers.push(marker);
      }
    });
  }

};
