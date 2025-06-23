import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { toggleRoutesVisibility } from '../Store/store.js';
import { getRoute } from '../lib/Requests.ts';
import mapboxgl from 'mapbox-gl';
import { toast } from 'react-toastify';

const API_URL = `${process.env.REACT_APP_HOST}:${process.env.REACT_APP_PORT}/api`;
function RoutesData({ map, mapboxAccessToken }) {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [position, setPosition] = useState({ top: 100, left: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const dispatch = useDispatch();

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.left, y: e.clientY - position.top });
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPosition({
        top: e.clientY - dragStart.y,
        left: e.clientX - dragStart.x,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const fetchRoutes = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/requests/getRoutes`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch routes');
      }

      const data = await response.json();
      setRoutes(data);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutes();
  }, []);

  const handleRefresh = () => {
    fetchRoutes();
  };

  const handleClose = () => {
    dispatch(toggleRoutesVisibility());
  };

  const drawRoute = (map, geometry) => {
    if (!map.getSource('route')) {
      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry,
        },
      });

      map.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#3b82f6',
          'line-width': 6,
        },
      });
    } else {
      const source = map.getSource('route');
      source.setData({
        type: 'Feature',
        properties: {},
        geometry,
      });
    }
  };

  const handleRouteRequest = async (start, end, travelMode) => {
    if (!map) return;
    console.log('handleRoute');
    
    try {
      const geometry = await getRoute(start, end, travelMode, mapboxAccessToken);
      drawRoute(map, geometry);
    } catch (error) {
      toast.error('Ошибка при запросе маршрута.');
      console.error('Ошибка при запросе маршрута:', error);
    }
  };

  const handleSearchResult = ({ startPoint, finishPoint }) => {
    console.log('handleSearchResult');
    console.log('startPoint: ', startPoint, 'finishPoint: ', finishPoint);
  
    if (!map || !finishPoint) return;
  
    const correctedStartPoint = [parseFloat(startPoint[1]), parseFloat(startPoint[0])];
    const correctedFinishPoint = [parseFloat(finishPoint[1]), parseFloat(finishPoint[0])];
  
    console.log('Corrected startPoint: ', correctedStartPoint, 'Corrected finishPoint: ', correctedFinishPoint);
  
    handleRouteRequest(correctedStartPoint, correctedFinishPoint, 'driving');
    map.flyTo({ center: correctedFinishPoint, zoom: 14, essential: true });
    new mapboxgl.Marker().setLngLat(correctedFinishPoint).addTo(map);
  };
  

  return (
    <div
      className="w-96 bg-blue-900 p-4 rounded-lg shadow-md flex flex-col items-center absolute cursor-move select-none"
      style={{ top: position.top, left: position.left }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="w-full flex justify-between items-center mb-4">
        <h2 className="text-white text-xl font-bold">Routes History</h2>
        <button
          onClick={handleClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
        >
          ×
        </button>
      </div>

      <button
        onClick={handleRefresh}
        className="bg-blue-500 text-white font-bold py-2 px-4 rounded-lg mb-4 hover:bg-blue-600 transition"
      >
        Refresh
      </button>

      <div
        className="w-full overflow-y-auto bg-white rounded-lg"
        style={{ maxHeight: '300px' }}
      >
        {loading && <p className="text-center p-4 text-blue-900">Loading...</p>}
        {error && <p className="text-center p-4 text-red-500">{error}</p>}
        {!loading && !error && (
          <ul className="w-full">
            {routes.map((route, index) => (
              <li
                key={route.id || index}
                className="flex justify-between items-center bg-white text-black rounded-lg p-3 mb-2 shadow cursor-pointer hover:bg-gray-100"
                onClick={() =>
                  handleSearchResult({
                    startPoint: [route.start_latitude, route.start_longitude],
                    finishPoint: [route.finish_latitude, route.finish_longitude],
                  })
                }
              >
                <div className="flex items-center">
                  <span className="bg-blue-500 text-white font-bold rounded-full h-8 w-8 flex items-center justify-center mr-3">
                    G
                  </span>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold">
                      Start Coord: {parseFloat(route.start_latitude).toFixed(3)}, {parseFloat(route.start_longitude).toFixed(3)}
                    </span>
                    <span className="text-sm font-bold">
                      Finish: {route.finish_name}
                    </span>
                  </div>
                </div>
                <button className="bg-blue-500 text-white font-bold rounded-full h-8 w-8 flex items-center justify-center">
                  →
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default RoutesData;
