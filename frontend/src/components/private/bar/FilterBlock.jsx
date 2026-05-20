import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toggleFiltersVisibility, setParkingFilters, setEVfilters } from "../Store/store.js";
import { drawParkingMarkers } from "../lib/MapHelper.ts";
import { evFilterGroups, parkingFilterGroups } from "../lib/filterConfig.js";

const inputClass =
  "w-full rounded-md border border-blue-200 bg-white px-2 py-1 text-sm text-gray-900 outline-none focus:border-blue-700";

function FilterBlock(props) {
  const map = props.map;
  const onParkingSelect = props.onParkingSelect;
  const dispatch = useDispatch();
  const parkingFilters = useSelector((state) => state.filters.parkingFilters);
  const EVfilters = useSelector((state) => state.filters.evFilters);
  const parkingData = useSelector((state) => state.parkings.parkingData);
  const [tempFilters, setTempFilters] = useState(parkingFilters);
  const [tempEVFilters, setTempEVFilters] = useState(EVfilters);
  const [activeTab, setActiveTab] = useState("Parkings");
  const [position, setPosition] = useState({ top: 50, left: 200 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setHasChanges(
      JSON.stringify(tempFilters) !== JSON.stringify(parkingFilters) ||
        JSON.stringify(tempEVFilters) !== JSON.stringify(EVfilters)
    );
  }, [tempFilters, parkingFilters, tempEVFilters, EVfilters]);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.left, y: e.clientY - position.top });
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPosition({
        top: Math.max(8, e.clientY - dragStart.y),
        left: Math.max(8, e.clientX - dragStart.x),
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleClose = () => {
    dispatch(toggleFiltersVisibility());
  };

  const handleParkingChange = (event) => {
    const { name, type, checked, value } = event.target;
    setTempFilters({
      ...tempFilters,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleEVChange = (event) => {
    const { name, type, checked, value } = event.target;
    setTempEVFilters({
      ...tempEVFilters,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleActivateFilters = () => {
    if (hasChanges && activeTab === "Parkings") {
      dispatch(setParkingFilters(tempFilters));
      if (map) {
        drawParkingMarkers(map, parkingData, map.getZoom(), tempFilters, onParkingSelect);
      }
    } else if (hasChanges && activeTab === "EV Chargers") {
      dispatch(setEVfilters(tempEVFilters));
    }
  };

  const renderCheckbox = ([name, label], values, onChange) => (
    <label key={name} className="flex items-center gap-2 text-sm text-gray-900">
      <input
        type="checkbox"
        name={name}
        checked={values[name] || false}
        onChange={onChange}
        className="h-4 w-4"
      />
      <span>{label}</span>
    </label>
  );

  const renderGroup = (group, values, onChange) => (
    <section key={group.title} className="border-t border-blue-200 pt-3">
      <h3 className="mb-2 text-sm font-bold text-blue-950">{group.title}</h3>
      <div className="grid grid-cols-2 gap-2">
        {group.filters.map((filter) => renderCheckbox(filter, values, onChange))}
      </div>
    </section>
  );

  const renderNumberInput = (name, label, values, onChange, step = "1") => (
    <label className="flex flex-col gap-1 text-sm font-semibold text-blue-950">
      {label}
      <input
        type="number"
        min="0"
        step={step}
        name={name}
        value={values[name] || ""}
        onChange={onChange}
        className={inputClass}
      />
    </label>
  );

  return (
    <div
      className="absolute z-20 flex max-h-[80vh] w-96 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-lg bg-blue-100 shadow-xl"
      style={{ top: position.top, left: position.left }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div
        className="cursor-move select-none bg-blue-950 px-4 py-3 text-white"
        onMouseDown={handleMouseDown}
      >
        <button
          onClick={handleClose}
          className="absolute right-3 top-2 text-xl leading-none text-white/80 hover:text-white"
          type="button"
        >
          &#x2715;
        </button>
        <div className="pr-8 text-base font-bold">Filters</div>
      </div>

      <div className="flex bg-gray-200">
        {["Parkings", "EV Chargers"].map((tab) => (
          <button
            key={tab}
            type="button"
            className={`flex-1 px-4 py-2 text-sm font-bold transition-colors ${
              activeTab === tab
                ? "bg-blue-800 text-white"
                : "bg-gray-200 text-gray-900 hover:bg-gray-300"
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {activeTab === "Parkings" ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-sm font-semibold text-blue-950">
                Search
                <input
                  type="text"
                  name="search"
                  value={tempFilters.search || ""}
                  onChange={handleParkingChange}
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-semibold text-blue-950">
                Operator
                <input
                  type="text"
                  name="operator"
                  value={tempFilters.operator || ""}
                  onChange={handleParkingChange}
                  className={inputClass}
                />
              </label>
              {renderNumberInput("minCapacity", "Min capacity", tempFilters, handleParkingChange)}
              {renderNumberInput("maxHeightMeters", "Vehicle height, m", tempFilters, handleParkingChange, "0.1")}
            </div>
            {parkingFilterGroups.map((group) => renderGroup(group, tempFilters, handleParkingChange))}
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-sm font-semibold text-blue-950">
                Search
                <input
                  type="text"
                  name="search"
                  value={tempEVFilters.search || ""}
                  onChange={handleEVChange}
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-semibold text-blue-950">
                Operator
                <input
                  type="text"
                  name="operator"
                  value={tempEVFilters.operator || ""}
                  onChange={handleEVChange}
                  className={inputClass}
                />
              </label>
              {renderNumberInput("minPowerKw", "Min power, kW", tempEVFilters, handleEVChange)}
              {renderNumberInput("minPoints", "Min points", tempEVFilters, handleEVChange)}
            </div>
            {evFilterGroups.map((group) => renderGroup(group, tempEVFilters, handleEVChange))}
          </>
        )}
      </div>

      <div className="border-t border-blue-200 p-4">
        <button
          onClick={handleActivateFilters}
          className={`w-full rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
            hasChanges
              ? "bg-blue-700 text-white hover:bg-blue-800"
              : "bg-gray-200 text-gray-500"
          }`}
          disabled={!hasChanges}
          type="button"
        >
          Apply
        </button>
      </div>
    </div>
  );
}

export default FilterBlock;
