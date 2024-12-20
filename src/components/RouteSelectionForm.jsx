import React, { useState, useEffect } from "react";
import locationIcon from "../assets/locationIcon.svg";
import finishIcon from "../assets/finishIcon.svg";
import { Icon } from "@iconify/react";
import "../styles/searchInput.css";
import Select_ from './Select';

const RouteSelectionForm = ({
  apiKey,
  startPointQuery,
  finishPointQuery,
  handleStartPointChange,
  handleFinishPointChange,
  showStartPointSuggestions,
  startPointSuggestions,
  showFinishPointSuggestions,
  finishPointSuggestions,
  selectPointSuggestion,
  selectedStartPointIndex,
  selectedFinishPointIndex,
  handleSubmit,
  userLocation,
}) => {
  const [isStartInputFocused, setIsStartInputFocused] = useState(false);
  const [isFinishInputFocused, setIsFinishInputFocused] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);
  const [travelTime, setTravelTime] = useState(null); // Для отображения времени пути

  useEffect(() => {
    const timer = setTimeout(() => setFadeIn(true), 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Вызываем handleSubmit, когда обе точки заполнены
    if (startPointQuery && finishPointQuery) {
      handleSubmit();
      fetchTravelTime(); // Вызываем функцию для получения времени пути
    }
  }, [startPointQuery, finishPointQuery]);

  const handleGeolocationSelect = (type) => {
    if (userLocation) {
      const { lat, lng } = userLocation;
      const geoPoint = [lng, lat];
      selectPointSuggestion(-1, type, geoPoint);

      if (type === "start") {
        setIsStartInputFocused(false);
      } else if (type === "finish") {
        setIsFinishInputFocused(false);
      }
    } else {
      alert("Geolocation is not available.");
    }
  };

  const fetchTravelTime = async () => {
    try {
      // Предполагается, что startPointQuery и finishPointQuery — это массивы с координатами [lng, lat]
      const startCoordinates = startPointQuery.split(",").map(Number); // Пример преобразования строки в [lng, lat]
      const finishCoordinates = finishPointQuery.split(",").map(Number);

      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/8.24177578965498,48.75784885050939;8.19298929479595,48.783037827491114?access_token=${apiKey}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch travel time");
      }

      const data = await response.json();
      if (data.routes && data.routes.length > 0) {
        const durationInSeconds = data.routes[0].duration;
        const travelTimeMinutes = Math.ceil(durationInSeconds / 60);
        setTravelTime(`${travelTimeMinutes} min`);
      } else {
        setTravelTime("Route not found");
      }
    } catch (error) {
      console.error("Error fetching travel time:", error);
      setTravelTime("Error fetching time");
    }
  };

  return (
    <div
      className={`flex flex-col p-5 rounded-xl bg-custom-blue border-regal-blue border-4 ${
        fadeIn ? "fade-in" : ""
      }`}
    >
      {/* Start Point Input */}
      <div className="mb-4">
        <div className="flex flex-row items-center">
          <span className="w-9 h-9 mx-3">
            <img
              src={locationIcon}
              alt="Location Icon"
              className="w-9 h-9 transition duration-200"
            />
          </span>
          <div className="input-wrapper flex rounded-3xl px-1 w-full bg-white shadow-blurred-3xl">
            <input
              type="text"
              value={startPointQuery}
              placeholder="Start Point"
              onChange={handleStartPointChange}
              onFocus={() => setIsStartInputFocused(true)}
              onBlur={() =>
                setTimeout(() => setIsStartInputFocused(false), 100)
              }
              className="input input-bordered my-1 py-1 mx-2 w-full focus:outline-none"
            />
          </div>
        </div>
        {(showStartPointSuggestions || isStartInputFocused) && (
          <ul className="results max-h-52 max-w-40 ml-[4.5rem] my-0 overflow-y-auto rounded-b-lg bg-white shadow-lg">
            <li
              className="rounded-lg p-2 cursor-pointer hover:bg-gray-200"
              onMouseDown={(e) => {
                e.preventDefault();
                handleGeolocationSelect("start");
              }}
            >
              <strong>Use My Location</strong>
            </li>
            {startPointSuggestions.map((suggestion, i) => (
              <li
                key={i}
                className={`rounded-lg p-2 cursor-pointer ${
                  i === selectedStartPointIndex
                    ? "bg-blue-500 text-white"
                    : "hover:bg-gray-200"
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectPointSuggestion(i, "start");
                  setIsStartInputFocused(false);
                }}
              >
                <strong>{suggestion.name || "Unknown place"}</strong>
                <br />
                <span className="text-sm text-gray-600">
                  {suggestion.address || "No additional information"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Finish Point Input */}
      <div className="mb-4">
        <div className="flex flex-row items-center">
          <span className="w-9 h-9 mx-3">
            <img
              src={finishIcon}
              alt="Location Icon"
              className="w-9 h-9 transition duration-200"
            />
          </span>
          <div className="input-wrapper flex rounded-3xl w-full px-1 bg-white shadow-blurred-3xl">
            <input
              type="text"
              value={finishPointQuery}
              placeholder="Finish Point"
              onChange={handleFinishPointChange}
              onFocus={() => setIsFinishInputFocused(true)}
              onBlur={() =>
                setTimeout(() => setIsFinishInputFocused(false), 100)
              }
              className="input input-bordered w-full my-1 py-1 mx-2 focus:outline-none"
            />
          </div>
        </div>
        {(showFinishPointSuggestions || isFinishInputFocused) && (
          <ul className="results max-h-52 max-w-40 ml-[4.5rem] my-0 overflow-y-auto rounded-b-lg bg-white shadow-lg">
            <li
              className="rounded-lg p-2 cursor-pointer hover:bg-gray-200"
              onMouseDown={(e) => {
                e.preventDefault();
                handleGeolocationSelect("finish");
              }}
            >
              <strong>Use My Location</strong>
            </li>
            {finishPointSuggestions.map((suggestion, i) => (
              <li
                key={i}
                className={`rounded-lg p-2 cursor-pointer ${
                  i === selectedFinishPointIndex
                    ? "bg-blue-500 text-white"
                    : "hover:bg-gray-200"
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectPointSuggestion(i, "finish");
                  setIsFinishInputFocused(false);
                }}
              >
                <strong>{suggestion.name || "Unknown place"}</strong>
                <br />
                <span className="text-sm text-gray-600">
                  {suggestion.address || "No additional information"}
                </span>
              </li>
            ))}
          </ul>
        )}
        <Select_ />
      </div>

      {travelTime && (
        <div className="text-center mb-4 text-lg font-semibold text-white">
          Estimated Travel Time: {travelTime}
        </div>
      )}

      {/* Select Route Button */}
      <button
        className="px-4 py-2 rounded-full text-white bg-gray-400 cursor-not-allowed"
        disabled={true}
      >
        Select Route
      </button>
    </div>
  );
};

export default RouteSelectionForm;
