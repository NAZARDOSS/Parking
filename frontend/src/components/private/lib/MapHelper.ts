import mapboxgl from "mapbox-gl";

let activeEVMarkers = [];
let activeMarkers = [];

const getEVPosition = (station) => {
  const latitude = Number(station.position?.latitude ?? station.position?.lat);
  const longitude = Number(station.position?.longitude ?? station.position?.lng);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return { latitude, longitude };
};

const normalizeText = (value) => String(value ?? "").trim().toLowerCase();

const normalizeTagValue = (value) => normalizeText(value).replace(/\s+/g, "_");

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const hasActiveFilters = (filters = {}) =>
  Object.values(filters).some((value) => {
    if (typeof value === "boolean") return value;
    return String(value ?? "").trim() !== "";
  });

const includesText = (value, needle) => normalizeText(value).includes(normalizeText(needle));

const hasAnyText = (values, needle) =>
  !String(needle ?? "").trim() || values.some((value) => includesText(value, needle));

const getParkingProperties = (parking) => parking.properties || {};

const getParkingTags = (parking) => getParkingProperties(parking).tags || {};

const getParkingType = (parking) => normalizeTagValue(getParkingProperties(parking).parkingType);

const getPaymentMethods = (parking) => getParkingProperties(parking).paymentMethods || {};

const hasParkingCategory = (parking, category) =>
  (getParkingProperties(parking).categories || []).includes(category);

const isStreetParking = (parking) => {
  const type = getParkingType(parking);
  return (
    hasParkingCategory(parking, "parking.street") ||
    ["street_side", "lane", "on_kerb", "half_on_kerb", "shoulder"].includes(type)
  );
};

const matchesParkingFilters = (parking, filters = {}) => {
  const properties = getParkingProperties(parking);
  const tags = getParkingTags(parking);
  const parkingType = getParkingType(parking);
  const capacity = toNumber(properties.capacity);
  const disabledCapacity = toNumber(properties.disabledCapacity);
  const maxHeight = toNumber(properties.maxHeight);
  const paymentMethods = getPaymentMethods(parking);
  const searchableValues = [
    parking.name,
    parking.address,
    properties.operator,
    properties.parkingType,
    properties.access,
    properties.fee,
    tags.ref,
  ];

  if (!hasAnyText(searchableValues, filters.search)) return false;
  if (!hasAnyText([properties.operator], filters.operator)) return false;

  if (filters.free && !properties.isFree) return false;
  if (filters.paid && !properties.isPaid) return false;
  if (filters.publicAccess && !properties.isPublic) return false;
  if (filters.private && !properties.private) return false;
  if (filters.customers && !properties.isCustomersOnly) return false;
  if (filters.permit && !properties.isPermitOnly) return false;

  if (filters.wheelchair && !hasParkingCategory(parking, "wheelchair")) return false;
  if (filters.disabledSpaces && !(disabledCapacity > 0)) return false;
  if (filters.twentyFour && !properties.twentyFourHour) return false;
  if (filters.hasOpeningHours && !properties.openingHours) return false;

  if (filters.garage && !["underground", "multistorey"].includes(parkingType)) return false;
  if (filters.underground && parkingType !== "underground") return false;
  if (filters.multistorey && parkingType !== "multistorey") return false;
  if (filters.surface && !["surface", ""].includes(parkingType)) return false;
  if (filters.street && !isStreetParking(parking)) return false;
  if (filters.streetSide && parkingType !== "street_side") return false;
  if (filters.parkingSpace && !hasParkingCategory(parking, "parking.space")) return false;

  if (filters.covered && !properties.covered) return false;
  if (filters.lit && !properties.lit) return false;
  if (filters.supervised && !properties.supervised) return false;
  if (filters.surveillance && !properties.surveillance) return false;
  if (filters.hasCapacity && !(capacity > 0)) return false;
  if (filters.minCapacity && !(capacity >= Number(filters.minCapacity))) return false;
  if (filters.hasMaxStay && !properties.maxStay) return false;
  if (filters.hasMaxHeight && !(maxHeight > 0)) return false;
  if (filters.maxHeightMeters && !(maxHeight >= Number(filters.maxHeightMeters))) return false;
  if (filters.acceptsCash && !(paymentMethods.cash || paymentMethods.coins)) return false;
  if (filters.acceptsCard && !(paymentMethods.credit_cards || paymentMethods.debit_cards)) return false;
  if (filters.acceptsContactless && !paymentMethods.contactless) return false;
  if (filters.acceptsApp && !paymentMethods.app) return false;
  if (filters.chargingSpaces && !properties.hasChargingSpaces) return false;

  return true;
};

const getEVProperties = (station) => station.properties || {};

const getEVConnectionValues = (station) => {
  const properties = getEVProperties(station);
  const connections = properties.connections || [];

  return [
    ...(properties.connectionTypes || []),
    ...(properties.currentTypes || []),
    ...(properties.levels || []),
    ...connections.flatMap((connection) => [
      connection.connectionType,
      connection.currentType,
      connection.level,
    ]),
  ].filter(Boolean);
};

const evConnectionIncludes = (station, needle) =>
  getEVConnectionValues(station).some((value) => includesText(value, needle));

const evHasLevel = (station, levelId, label) => {
  const properties = getEVProperties(station);
  return (properties.levelIds || []).includes(levelId) || evConnectionIncludes(station, label);
};

const evHasCurrent = (station, kind) => {
  const values = getEVConnectionValues(station).map(normalizeText).join(" ");
  return kind === "dc"
    ? values.includes("dc") || values.includes("direct current")
    : values.includes("ac") || values.includes("alternating current");
};

const isFreeEVCharging = (station) => {
  const usageCost = normalizeText(getEVProperties(station).usageCost);
  return Boolean(usageCost) && (usageCost.includes("free") || usageCost.includes("no cost") || usageCost === "0");
};

const isPaidEVCharging = (station) => {
  const properties = getEVProperties(station);
  return Boolean(properties.isPayAtLocation || (properties.usageCost && !isFreeEVCharging(station)));
};

const matchesEVFilters = (station, filters = {}) => {
  const properties = getEVProperties(station);
  const maxPowerKw = toNumber(properties.maxPowerKw);
  const points = toNumber(properties.numberOfPoints) || toNumber(properties.totalConnectorQuantity) || 0;
  const usageType = normalizeText(properties.usageType);
  const status = normalizeText(properties.status);
  const searchableValues = [
    station.name,
    station.address,
    properties.operator,
    properties.usageType,
    properties.status,
    properties.usageCost,
    ...getEVConnectionValues(station),
  ];

  if (!hasAnyText(searchableValues, filters.search)) return false;
  if (!hasAnyText([properties.operator], filters.operator)) return false;
  if (filters.tesla && !hasAnyText(searchableValues, "tesla")) return false;
  if (filters.operational && !(properties.isOperational || status.includes("operational"))) return false;
  if (filters.available && !status.includes("available")) return false;
  if (filters.planned && !status.includes("planned")) return false;
  if (filters.recentlyVerified && !properties.recentlyVerified) return false;
  if (filters.publicAccess && !usageType.includes("public")) return false;
  if (filters.privateAccess && !(usageType.includes("private") || usageType.includes("staff") || usageType.includes("customer"))) return false;
  if (filters.payAtLocation && !properties.isPayAtLocation) return false;
  if (filters.membershipRequired && !properties.isMembershipRequired) return false;
  if (filters.accessKeyRequired && !properties.isAccessKeyRequired) return false;
  if (filters.free && !isFreeEVCharging(station)) return false;
  if (filters.paid && !isPaidEVCharging(station)) return false;
  if (filters.level1 && !evHasLevel(station, 1, "Level 1")) return false;
  if (filters.level2 && !evHasLevel(station, 2, "Level 2")) return false;
  if (filters.level3 && !evHasLevel(station, 3, "Level 3")) return false;
  if (filters.ac && !evHasCurrent(station, "ac")) return false;
  if (filters.dc && !evHasCurrent(station, "dc")) return false;
  if (filters.type1 && !(evConnectionIncludes(station, "Type 1") || evConnectionIncludes(station, "J1772"))) return false;
  if (filters.type2 && !evConnectionIncludes(station, "Type 2")) return false;
  if (filters.ccs && !evConnectionIncludes(station, "CCS")) return false;
  if (filters.chademo && !evConnectionIncludes(station, "CHAdeMO")) return false;
  if (filters.teslaConnector && !evConnectionIncludes(station, "Tesla")) return false;
  if (filters.nacs && !evConnectionIncludes(station, "NACS")) return false;
  if (filters.schuko && !evConnectionIncludes(station, "Schuko")) return false;
  if (filters.cee && !evConnectionIncludes(station, "CEE")) return false;
  if (filters.minPowerKw && !(maxPowerKw >= Number(filters.minPowerKw))) return false;
  if (filters.minPoints && !(points >= Number(filters.minPoints))) return false;
  if (filters.hasComments && !properties.hasComments) return false;
  if (filters.hasMedia && !properties.hasMedia) return false;
  if (filters.hasCheckins && !properties.hasCheckins) return false;

  return true;
};

const removeClusterSource = (map, sourceId) => {
  if (!map?.getSource(sourceId)) return;

  [`${sourceId}-clusters`, `${sourceId}-cluster-count`, `${sourceId}-unclustered-point`].forEach((layerId) => {
    if (map.getLayer(layerId)) {
      map.removeLayer(layerId);
    }
  });

  map.removeSource(sourceId);
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
  if (!map) return;

  removeClusterSource(map, sourceId);

  if (!data || data.length === 0) return;

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

const filterEVData = (map: mapboxgl.Map, data, filters, sourceId) => {
  removeClusterSource(map, sourceId);

  return data.filter((station) => matchesEVFilters(station, filters));
};


export const drawEVMarkers = (map, evStations, zoomValue, filters, onSelectPlace) => {
  const sourceId = "ev-clusters";
  const clusterColors = ["#3cb371", "#2e8b57", "#006400"];
  const pointColor = "#228b22";
  
  activeEVMarkers.forEach((marker) => marker.remove());
  activeEVMarkers = [];

  if (hasActiveFilters(filters)) {
    evStations = filterEVData(map, evStations, filters, sourceId);
  }

  const bounds = map.getBounds();

  const filteredEVStations = evStations.filter((station) => {
    const position = getEVPosition(station);
    if (!position) return false;

    const { latitude, longitude } = position;
    const lngLat = [longitude, latitude];
    return bounds.contains(lngLat);
  });

  if (zoomValue < 14) {
    const clusterData = filteredEVStations
      .map((station) => {
        const position = getEVPosition(station);
        return position
          ? {
              lon: position.longitude,
              lat: position.latitude,
            }
          : null;
      })
      .filter(Boolean);

    addClusters(map, clusterData, sourceId, clusterColors, pointColor);
  } else {
    removeClusterSource(map, sourceId);

    filteredEVStations.forEach((station) => {
      const position = getEVPosition(station);
      if (!position) return;

      const { latitude, longitude } = position;
      const markerLngLat = [longitude, latitude];

      const marker = new mapboxgl.Marker()
        .setLngLat(markerLngLat)
        .addTo(map);

      const element = marker.getElement();
      element.style.cursor = "pointer";
      element.setAttribute("title", station.name || "EV charger");
      element.addEventListener("click", (event) => {
        event.stopPropagation();
        onSelectPlace?.(station);
      });

      activeEVMarkers.push(marker); 
    });
  }
};




const filterParkingData = (map, data, filters, sourceId) => {  
  removeClusterSource(map, sourceId);

  return data.filter((parking) => matchesParkingFilters(parking, filters));
};

export const drawParkingMarkers = (map, parkingData, zoomValue, filters, onSelectPlace) => {
  activeMarkers.forEach((marker) => marker.remove());
  activeMarkers = [];
  const sourceId = "parking-clusters";
  const clusterColors = ["#51bbd6", "#f1f075", "#f28cb1"];
  const pointColor = "#11b4da";
  
  const bounds = map.getBounds();
  const filteredParkingData = parkingData.filter((parking) => {
    const lngLat = [parking.lon, parking.lat];
    return bounds.contains(lngLat);
  });

  let visibleParkingData = filteredParkingData;
  if (hasActiveFilters(filters)) {
    visibleParkingData = filterParkingData(map, filteredParkingData, filters, sourceId);
  }

  if (zoomValue < 14) {
    addClusters(map, visibleParkingData, sourceId, clusterColors, pointColor);
  } else {
    removeClusterSource(map, sourceId);

    visibleParkingData.forEach((parking) => {
      const markerLngLat = [parking.lon, parking.lat];
      const existingMarker = activeMarkers.find((marker) => {
        const { lng, lat } = marker.getLngLat();
        return lng === parking.lon && lat === parking.lat;
      });

      if (!existingMarker) {
        const el = document.createElement("div");
        el.className = "marker";
        el.setAttribute("role", "button");
        el.setAttribute("tabindex", "0");
        el.setAttribute("title", parking.name || "Parking");

        const icon = document.createElement("div");
        icon.className = "marker-icon";
        el.appendChild(icon);

        const marker = new mapboxgl.Marker({
          element: el,
          anchor: "bottom",
        })
          .setLngLat(markerLngLat)
          .addTo(map);

        const handleSelect = (event) => {
          event.stopPropagation();
          onSelectPlace?.(parking);
        };

        el.addEventListener("click", handleSelect);
        el.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            handleSelect(event);
          }
        });

        activeMarkers.push(marker);
      }
    });
  }
};
