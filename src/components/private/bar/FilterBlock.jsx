import React, { useState, useEffect } from "react";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import { toggleFiltersVisibility, setParkingFilters, setEVfilters } from "../Store/store.js";
import { drawParkingMarkers } from "../lib/MapHelper.ts";

function FilterBlock(props) {
  const map = props.map;
  const dispatch = useDispatch();
  const parkingFilters = useSelector((state) => state.filters.parkingFilters);
  const EVfilters = useSelector((state) => state.filters.evFilters);
  const parkingData = useSelector((state) => state.parkings.parkingData);
  const evData = useSelector((state) => state.chargers.evData, shallowEqual);
  const [tempFilters, setTempFilters] = useState(parkingFilters);
  const [tempEVFilters, setTempEVFilters] = useState(EVfilters);
  const [activeTab, setActiveTab] = useState("Parkings");
  const [position, setPosition] = useState({ top: 50, left: 200 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hasChanges, setHasChanges] = useState(false);
  
  useEffect(() => {
    setHasChanges(JSON.stringify(tempFilters) !== JSON.stringify(parkingFilters) || JSON.stringify(tempEVFilters) !== JSON.stringify(EVfilters));
  }, [tempFilters, parkingFilters, tempEVFilters, EVfilters]);

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

  const handleClose = () => {
    dispatch(toggleFiltersVisibility());
  };

  const handleCheckboxChange = (event) => {
    const { name, checked } = event.target;
    setTempFilters({
      ...tempFilters,
      [name]: checked,
    });
  };

  const handleEVCheckboxChange = (event) => {
    const { name, checked } = event.target;
    
    setTempEVFilters({
      ...tempEVFilters,
      [name]: checked,
    });
  };
  

  const handleActivateFilters = () => {
    if (hasChanges && activeTab === 'Parkings') {
      dispatch(setParkingFilters(tempFilters));
      drawParkingMarkers(
        map,
        parkingData,
        map.getZoom(),
        parkingFilters
      );
    } else if (hasChanges && activeTab === 'EV Chargers') {
      console.log('tempEVFilters: ',tempEVFilters);
      dispatch(setEVfilters(tempEVFilters));
      console.log('EVfilters::::::', EVfilters);
    
      // drawEVMarkers(map, evData, map.getZoom(), EVfilters);
    }
    
  };

  return (
    <div
      className="w-72 bg-blue-100 p-4 rounded-lg shadow-md flex flex-col items-center transition-transform duration-300 ease-in-out transform hover:scale-105 absolute"
      style={{ top: position.top, left: position.left }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <button
        onClick={handleClose}
        className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
      >
        &#x2715;
      </button>
      <div className="flex w-full mb-4 rounded-lg overflow-hidden bg-gray-200">
        <div
          className={`flex-1 text-center py-2 px-4 font-bold cursor-pointer transition-all duration-300 ${
            activeTab === "Parkings"
              ? "text-white bg-blue-900"
              : "text-black bg-gray-200 hover:bg-gray-300"
          }`}
          onClick={() => setActiveTab("Parkings")}
        >
          Parkings
        </div>
        <div
          className={`flex-1 text-center py-2 px-4 font-bold cursor-pointer transition-all duration-300 ${
            activeTab === "EV Chargers"
              ? "text-white bg-blue-900"
              : "text-black bg-gray-200 hover:bg-gray-300"
          }`}
          onClick={() => setActiveTab("EV Chargers")}
        >
          EV Chargers
        </div>
      </div>
      <div className="w-full flex flex-col gap-2 transition-opacity duration-500 ease-in-out">
        {activeTab === "Parkings" ? (
          <div className="animate-fade-in">
            <label className="flex items-center gap-2 text-lg w-max">
              <input
                type="checkbox"
                name="free"
                checked={tempFilters.free || false}
                onChange={handleCheckboxChange}
                className="w-4 h-4"
              />
              <span>Free</span>
            </label>
            <label className="flex items-center gap-2 text-lg w-max">
              <input
                type="checkbox"
                name="wheelchair"
                checked={tempFilters.wheelchair || false}
                onChange={handleCheckboxChange}
                className="w-4 h-4"
              />
              <span>♿</span>
            </label>
            <label className="flex items-center gap-2 text-lg w-max">
              <input
                type="checkbox"
                name="twentyFour"
                checked={tempFilters.twentyFour || false}
                onChange={handleCheckboxChange}
                className="w-4 h-4"
              />
              <span>24</span>
            </label>
            <label className="flex items-center gap-2 text-lg w-max">
              <input
                type="checkbox"
                name="garage"
                checked={tempFilters.garage || false}
                onChange={handleCheckboxChange}
                className="w-4 h-4"
              />
              <span>Garage</span>
            </label>
            <label className="flex items-center gap-2 text-lg w-max">
              <input
                type="checkbox"
                name="private"
                checked={tempFilters.private || false}
                onChange={handleCheckboxChange}
                className="w-4 h-4"
              />
              <span>Private</span>
            </label>
            <span>inkl Private parkings</span>
          </div>
        ) : (
          <div className="animate-fade-in">
            <label className="flex items-center gap-2 text-lg w-max">
              <input
                type="checkbox"
                name="tesla"
                checked={tempEVFilters.tesla || false}
                onChange={handleEVCheckboxChange}
                className="w-4 h-4"
              />
              <span>Tesla</span>
            </label>
          </div>
        )}
      </div>
      <button
        onClick={handleActivateFilters}
        className={`mt-4 font-bold py-2 px-4 rounded-lg transition-all duration-300 transform ${
          hasChanges
            ? "bg-blue-500 text-white hover:bg-blue-600 hover:scale-110"
            : "bg-gray-200 text-gray-500 cursor-not-allowed"
        }`}
        disabled={!hasChanges}
      >
        Activate Filters
      </button>
    </div>
  );
}

export default FilterBlock;
