import mapboxgl from "mapbox-gl";

let activeEVMarkers = [];
let activeMarkers = [];

const isMarkerInBounds = (map, markerLngLat) => {
  const bounds = map.getBounds();
  return bounds.contains(markerLngLat);
};

export const initializeMap = (container, mapboxAccessToken) => {
  mapboxgl.accessToken = mapboxAccessToken;
  return new mapboxgl.Map({
    container,
    style: "mapbox://styles/nazardos/cm27a8krf00dq01pe0rjtbz9z",
    center: [8.2437103, 48.7550959],
    zoom: 14,
  });
};

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

const addClusters = (
  map: mapboxgl.Map,
  data: Array<{ lon: number; lat: number; position?: { lng: number; lat: number } }>,
  sourceId: string,
  clusterColors: string[],
  pointColor: string
): void => {
  console.log('add clusters! ');

  if (!map || !data || data.length === 0) return;

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
    clusterMaxZoom: 14,
    clusterRadius: 50,
  });

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

const filterEVData = (data, filters) => {
  console.log('filters.tesla: ', filters.tesla);
  
  return data.filter((station) => {
    if (filters.tesla && station.name !== 'Tesla') {
      console.log(`Excluding ${station.name} because it's not Tesla`);
      return false; 
    }
    return true;  
  });
};

export const drawEVMarkers = (map, evStations, zoomValue, filters) => {
  console.log("drawEV: ", filters);

  activeEVMarkers.forEach((marker) => marker.remove());
  activeEVMarkers = [];

  if (Object.keys(filters).length < 1) {
    console.log("No filters applied: ", evStations);
  } else {
    console.log("Filters applied: ", filters);
    evStations = filterEVData(evStations, filters);
    console.log("evStations after FILTERS", evStations);
  }

  const bounds = map.getBounds();

  const filteredEVStations = evStations.filter((station) => {
    const { latitude, longitude } = station.position;
    const lngLat = [longitude, latitude];
    return bounds.contains(lngLat);
  });

  console.log(
    `Visible EV stations: ${filteredEVStations.length} out of ${evStations.length}`
  );

  const sourceId = "ev-clusters";
  const clusterColors = ["#3cb371", "#2e8b57", "#006400"];
  const pointColor = "#228b22";

  if (zoomValue < 14) {
    const clusterData = filteredEVStations.map((station) => ({
      lon: station.position.longitude,
      lat: station.position.latitude,
    }));

    addClusters(map, clusterData, sourceId, clusterColors, pointColor);
  } else {
    filteredEVStations.forEach((station) => {
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

      popup.on("open", () => {
        console.log("Popup открыт для evStations:", evStations);
      });

      marker.setPopup(popup);
      activeEVMarkers.push(marker); 
    });
  }
};




const filterParkingData = (data, filters) => {  
  return data.filter(parking => {
    const categories = parking.properties.categories || [];
    const restrictions = parking.properties.restrictions || []
    if (filters.garage && !(categories.includes('parking.underground') || categories.includes('parking.multistorey'))) {
      return false
    }

    if (filters.wheelchair && !(categories.includes("wheelchair"))) {
      return false;
    }

    if (filters.free && !(categories.includes("no_fee") || categories.includes("no_fee.no"))) {
      return false;
    }
    

    if (filters.twentyFour && !parking.properties.twentyFourHour) {
      return false;
    }

    if (filters.private && !parking.properties.private) {
      return false; 
    }

    // if (filters.garage && (restrictions.Object.Va('max_height'))) {
    //   console.log('1>>>>>>>0999', restrictions );
    //   return false; 
    // }
    return true; 
  });
};

export const drawParkingMarkers = (map, parkingData, zoomValue, filters) => {
  console.log("drawParkingMarkers");

  activeMarkers.forEach((marker) => marker.remove());
  activeMarkers = [];

  const bounds = map.getBounds();
  const filteredParkingData = parkingData.filter((parking) => {
    const lngLat = [parking.lon, parking.lat];
    return bounds.contains(lngLat);
  });

  console.log(
    `Visible parkingData: ${filteredParkingData.length} из ${parkingData.length}`
  );

  let visibleParkingData = filteredParkingData;
  if (Object.keys(filters).length > 0) {
    console.log("Filters applied: ", filters);
    visibleParkingData = filterParkingData(filteredParkingData, filters);
  }

  if (zoomValue < 14) {
    const sourceId = "parking-clusters";
    const clusterColors = ["#51bbd6", "#f1f075", "#f28cb1"];
    const pointColor = "#11b4da";

    addClusters(map, visibleParkingData, sourceId, clusterColors, pointColor);
  } else {
    visibleParkingData.forEach((parking) => {
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

        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
          `<h3>Информация о парковке</h3>
          <p>Широта: ${parking.lat}</p>
          <p>Долгота: ${parking.lon}</p>`
        );

        popup.on("open", () => {
          console.log("Popup открыт для парковки:", parking);
        });

        marker.setPopup(popup);
        activeMarkers.push(marker);
      }
    });
  }
};




