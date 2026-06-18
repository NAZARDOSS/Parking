import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Icon } from "@iconify/react";
import { setFiltersVisible, setParkingFilters, setEVfilters } from "../Store/store.js";
import { drawParkingMarkers } from "../lib/MapHelper.ts";
import { evFilterGroups, parkingFilterGroups } from "../lib/filterConfig.js";

const inputClass =
  "w-full rounded-md border border-white/10 bg-white/10 px-2 py-1.5 text-sm text-white outline-none focus:border-blue-300 placeholder:text-slate-500";

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
  const [position, setPosition] = useState({ top: 50, left: 100 });
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
    dispatch(setFiltersVisible(false));
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
    <label key={name} className="flex items-center gap-2 text-sm text-slate-200 cursor-pointer">
      <input
        type="checkbox"
        name={name}
        checked={values[name] || false}
        onChange={onChange}
        className="h-4 w-4 rounded accent-blue-400"
      />
      <span>{label}</span>
    </label>
  );

  const renderGroup = (group, values, onChange) => (
    <section key={group.title} className="border-t border-white/10 pt-3">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-blue-200">{group.title}</h3>
      <div className="grid grid-cols-2 gap-2">
        {group.filters.map((filter) => renderCheckbox(filter, values, onChange))}
      </div>
    </section>
  );

  const renderNumberInput = (name, label, values, onChange, step = "1") => (
    <label className="flex flex-col gap-1 text-xs font-bold uppercase tracking-[0.1em] text-blue-200">
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
      className="absolute z-20 flex max-h-[80vh] w-96 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-lg border border-blue-300/20 bg-[#031A3A]/95 text-white shadow-2xl backdrop-blur"
      style={{ top: position.top, left: position.left }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div
        className="flex cursor-move select-none items-center justify-between border-b border-white/10 bg-[#0a2351] px-4 py-3"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          <Icon icon="bi:toggles" className="h-4 w-4 text-blue-300" />
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-blue-200">Filters</span>
        </div>
        <button
          onClick={handleClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20"
          type="button"
          aria-label="Close filters"
        >
          <Icon icon="mdi:close" className="h-4 w-4" />
        </button>
      </div>

      <div className="flex border-b border-white/10">
        {["Parkings", "EV Chargers"].map((tab) => (
          <button
            key={tab}
            type="button"
            className={`flex-1 px-4 py-2.5 text-sm font-bold transition-colors ${
              activeTab === tab
                ? "border-b-2 border-blue-400 bg-blue-500/10 text-white"
                : "text-slate-400 hover:bg-white/5 hover:text-white"
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
              <label className="flex flex-col gap-1 text-xs font-bold uppercase tracking-[0.1em] text-blue-200">
                Search
                <input
                  type="text"
                  name="search"
                  value={tempFilters.search || ""}
                  onChange={handleParkingChange}
                  className={inputClass}
                  placeholder="Name..."
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-bold uppercase tracking-[0.1em] text-blue-200">
                Operator
                <input
                  type="text"
                  name="operator"
                  value={tempFilters.operator || ""}
                  onChange={handleParkingChange}
                  className={inputClass}
                  placeholder="Operator..."
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
              <label className="flex flex-col gap-1 text-xs font-bold uppercase tracking-[0.1em] text-blue-200">
                Search
                <input
                  type="text"
                  name="search"
                  value={tempEVFilters.search || ""}
                  onChange={handleEVChange}
                  className={inputClass}
                  placeholder="Name..."
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-bold uppercase tracking-[0.1em] text-blue-200">
                Operator
                <input
                  type="text"
                  name="operator"
                  value={tempEVFilters.operator || ""}
                  onChange={handleEVChange}
                  className={inputClass}
                  placeholder="Operator..."
                />
              </label>
              {renderNumberInput("minPowerKw", "Min power, kW", tempEVFilters, handleEVChange)}
              {renderNumberInput("minPoints", "Min points", tempEVFilters, handleEVChange)}
            </div>
            {evFilterGroups.map((group) => renderGroup(group, tempEVFilters, handleEVChange))}
          </>
        )}
      </div>

      <div className="border-t border-white/10 p-4">
        <button
          onClick={handleActivateFilters}
          className={`w-full rounded-lg px-4 py-2.5 text-sm font-bold transition-colors ${
            hasChanges
              ? "bg-blue-500 text-white hover:bg-blue-400"
              : "bg-white/5 text-slate-500"
          }`}
          disabled={!hasChanges}
          type="button"
        >
          Apply filters
        </button>
      </div>
    </div>
  );
}

export default FilterBlock;
