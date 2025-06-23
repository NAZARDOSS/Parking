import React, { useState, useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "../../styles/searchInput.css";
import RouteSelectionForm from "./RouteSelectionForm.jsx";

const API_URL = `${process.env.REACT_APP_HOST}:8080/api`;
const SearchInput = ({ map, placeholder = "Search", apiKey, onResultSelect, userLocation }) => {
  const [startPointQuery, setStartPointQuery] = useState("");
  const [finishPointQuery, setFinishPointQuery] = useState("");
  const [startPointSuggestions, setStartPointSuggestions] = useState([]);
  const [finishPointSuggestions, setFinishPointSuggestions] = useState([]);
  const [selectedStartPointIndex, setSelectedStartPointIndex] = useState(-1);
  const [selectedFinishPointIndex, setSelectedFinishPointIndex] = useState(-1);
  const [showStartPointSuggestions, setShowStartPointSuggestions] = useState(false);
  const [showFinishPointSuggestions, setShowFinishPointSuggestions] = useState(false);
  const [sessionToken, setSessionToken] = useState("");
  const [startPoint, setStartPoint] = useState(null);
  const [finishPoint, setFinishPoint] = useState(null);
  const [startPointMarker, setStartPointMarker] = useState(null);
  const [finishPointMarker, setFinishPointMarker] = useState(null);
  const [isFinishPointSelected, setIsFinishPointSelected] = useState(false);

  const searchInputRef = useRef(null);

  useEffect(() => {
    setSessionToken(Math.random().toString(36).substring(2, 15));

    const handleClickOutside = (event) => {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target)) {
        setShowFinishPointSuggestions(false);
        setShowStartPointSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const saveRouteInfo = async (startPointCoordinates, finishPointCoordinates, finishPointQuery) => {
    try {
      const response = await fetch(`${API_URL}/requests/routeInfo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startLatitude: startPointCoordinates[1],
          startLongitude: startPointCoordinates[0],
          finishLatitude: finishPointCoordinates[1],
          finishLongitude: finishPointCoordinates[0],
          finishName: finishPointQuery,
        }),
      });
  
      const data = await response.json();
      console.log('Response:', data);
    } catch (error) {
      console.error('Error saving route info:', error);
    }
  };


  const fetchSuggestions = async (query) => {
    if (!query) return [];
    try {
      const response = await fetch(
        `https://api.mapbox.com/search/searchbox/v1/suggest?q=${encodeURIComponent(
          query
        )}&session_token=${sessionToken}&access_token=${apiKey}`
      );
      const data = await response.json();
      return data.suggestions || [];
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      return [];
    }
  };

  useEffect(() => {
    if (startPointQuery.length > 2) {
      fetchSuggestions(startPointQuery).then(setStartPointSuggestions);
    } else {
      setStartPointSuggestions([]);
    }
  }, [startPointQuery]);

  useEffect(() => {
    if (finishPointQuery.length > 2) {
      fetchSuggestions(finishPointQuery).then(setFinishPointSuggestions);
    } else {
      setFinishPointSuggestions([]);
    }
  }, [finishPointQuery]);

  const handleGeolocationClick = async (type) => {
    if (userLocation) {
      const { lat, lng } = userLocation;
      const geoPoint = [lng, lat];

      map.flyTo({ center: geoPoint, zoom: 14 });
      await selectPointSuggestion(-1, type, geoPoint);
    }
  };

  const handleFinishPointChange = (event) => {
    setFinishPointQuery(event.target.value);
    setShowFinishPointSuggestions(true);
  };

  const handleStartPointChange = (event) => {
    setStartPointQuery(event.target.value);
    setShowStartPointSuggestions(true);
  };

  const selectPointSuggestion = async (index, type, geoPoint = null) => {
    let point;
  
    if (geoPoint) {
      point = geoPoint;
    } else {
      const suggestions = type === "start" ? startPointSuggestions : finishPointSuggestions;
      const suggestion = suggestions[index];
      const response = await fetch(
        `https://api.mapbox.com/search/searchbox/v1/retrieve/${suggestion.mapbox_id}?session_token=${sessionToken}&access_token=${apiKey}`
      );
      const data = await response.json();
      if (data?.features?.[0]?.geometry?.coordinates) {
        point = data.features[0].geometry.coordinates;
      } else {
        return;
      }
    }
  
    if (type === "start") {
      setStartPointQuery(geoPoint ? "My Geolocation" : startPointSuggestions[index]?.name || "Unknown place");
      setStartPoint(point);
      setShowStartPointSuggestions(false);
    } else {
      setFinishPointQuery(finishPointSuggestions[index]?.name || "Unknown place");
      setFinishPoint(point);
      setIsFinishPointSelected(true);
      setShowFinishPointSuggestions(false);
    }
  };

  const handleSubmit = () => {
    console.log('startPoint: ', startPoint, "finishPoint", finishPoint);
    
    if (startPoint || finishPoint) {
      if (startPoint) {
        if (startPointMarker) {
          startPointMarker.remove();
        }
        const marker = new mapboxgl.Marker().setLngLat(startPoint).addTo(map);
        setStartPointMarker(marker);
        map.flyTo({ center: startPoint, zoom: 14 });
      }
      if (finishPoint) {
        if (finishPointMarker) {
          finishPointMarker.remove();
        }
        const marker = new mapboxgl.Marker().setLngLat(finishPoint).addTo(map);
        setFinishPointMarker(marker);
        map.flyTo({ center: finishPoint, zoom: 14 });
      }
    }

    if (startPoint && finishPoint && onResultSelect) {
      onResultSelect({ startPoint, finishPoint });
    }
  };

  return (
    <div ref={searchInputRef} className="search-input-container relative w-full z-5 h-fit">
      {!isFinishPointSelected ? (
        <div>
          <div className="input-wrapper rounded-3xl px-4 w-full bg-white shadow-blurred-3xl">
            <input
              type="text"
              value={finishPointQuery}
              placeholder="Finish Point"
              onFocus={() => setShowFinishPointSuggestions(true)}
              onChange={handleFinishPointChange}
              className="input input-bordered w-full my-1 py-1 mx-2 focus:outline-none z-6"
            />
          </div>
          {(showFinishPointSuggestions || finishPointSuggestions.length > 0) && (
            <ul className="results max-h-52 max-w-48 ml-6 my-0 overflow-y-auto rounded-b-lg bg-white shadow-lg z-2">
              <li
                className="rounded-lg p-2 cursor-pointer hover:bg-gray-200"
                onClick={() => handleGeolocationClick("finish")}
              >
              </li>
              {finishPointSuggestions.map((suggestion, i) => (
                <li
                  key={i}
                  className={`rounded-lg p-2 cursor-pointer ${
                    i === selectedFinishPointIndex ? "bg-blue-500 text-white" : "hover:bg-gray-200"
                  }`}
                  onClick={() => selectPointSuggestion(i, "finish")}
                >
                  <strong>{suggestion.name || "Unknown place"}</strong>
                  <br />
                  <span className="text-sm text-gray-600">{suggestion.address || "No additional information"}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <RouteSelectionForm
          startPointCoordinates = {startPoint}
          finishPointCoordinates = {finishPoint}
          apiKey={apiKey}
          userLocation={userLocation}
          startPointQuery={startPointQuery}
          finishPointQuery={finishPointQuery}
          handleStartPointChange={handleStartPointChange}
          handleFinishPointChange={handleFinishPointChange}
          showStartPointSuggestions={showStartPointSuggestions}
          startPointSuggestions={startPointSuggestions}
          setShowStartPointSuggestions = {setShowStartPointSuggestions}
          selectPointSuggestion={selectPointSuggestion}
          showFinishPointSuggestions={showFinishPointSuggestions}
          finishPointSuggestions={finishPointSuggestions}
          selectedStartPointIndex={selectedStartPointIndex}
          selectedFinishPointIndex={selectedFinishPointIndex}
          handleSubmit={handleSubmit}
        />
      )}
    </div>
  );
};

export default SearchInput;
