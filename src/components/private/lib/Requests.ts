export const fetchEVChargers = async (hereToken, centerCoords, radius, map, maxStations = 50) => {
    console.log('radius!:::::: ', radius);
    if (radius > 15000) return;
  
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
        console.log('stations: ', stations);
        
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

  export const getRoute = async (start, end, travelMode, mapboxAccessToken) => {
    const url = `https://api.mapbox.com/directions/v5/mapbox/${travelMode}/${start[0]},${start[1]};${end[0]},${end[1]}?access_token=${mapboxAccessToken}&geometries=geojson&steps=true&overview=full`;
  
    const response = await fetch(url);
    const data = await response.json();
  
    if (!data.routes || data.routes.length === 0) {
      throw new Error("Маршрут не найден");
    }
  
    return data.routes[0].geometry;
  };

  export const fetchParkingData = async (apiKey, northEast, southWest, radius) => {
    console.log('radius:::', radius);
    
    console.log('fetchParkingData fetchParkingData fetchParkingData fetchParkingData');
    
    const url = `https://api.geoapify.com/v2/places?categories=parking&filter=rect:${northEast.lng},${northEast.lat},${southWest.lng},${southWest.lat}&limit=500&apiKey=${apiKey}`;
  
    if (radius > 15000) return;
  
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Ошибка загрузки данных о парковках");
    }
  
    const data = await response.json();
    console.log('parkingData: ', data);
    
    return data.features.map((feature) => ({
      name: feature.properties.name,
      address: feature.properties.address,
      lat: feature.geometry.coordinates[1],
      lon: feature.geometry.coordinates[0],
      properties: feature.properties,
    }));
  };