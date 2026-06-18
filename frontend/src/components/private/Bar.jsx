import { useDispatch, useSelector } from "react-redux";
import { Icon } from "@iconify/react";
import parking from "../../assets/parking-icon.svg";
import { ChargerIcon } from "../icons/ChargerIcon";
import {
  setIsParkingData,
  setIsChargerData,
  setFiltersVisible,
  setProfileVisible,
  setRoutesVisible,
  setRoutePlannerVisible,
} from "./Store/store";

const tooltipClass =
  "pointer-events-none absolute left-[68px] top-1/2 z-50 -translate-y-1/2 whitespace-nowrap rounded-md bg-slate-950 px-2 py-1 text-xs font-bold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100";

function Bar() {
  const dispatch = useDispatch();
  const isParkingData = useSelector((state) => state.parkings.isParkingData);
  const isChargerData = useSelector((state) => state.chargers.isChargerData);
  const isFiltersVisible = useSelector((state) => state.filters.isFiltersVisible);
  const isRoutesVisible = useSelector((state) => state.routes.isRoutesVisible);
  const isProfileVisible = useSelector((state) => state.profile.isProfileVisible);
  const isRoutePlannerVisible = useSelector((state) => state.routePlanner.isRoutePlannerVisible);

  const buttonClass = (active) =>
    `group relative flex h-14 w-14 items-center justify-center rounded-lg border transition-colors ${
      active
        ? "border-blue-300 bg-white text-blue-950 shadow-lg"
        : "border-white/10 bg-white/10 text-white hover:border-blue-300/70 hover:bg-white/20"
    }`;

  return (
    <nav className="flex h-full flex-col items-center gap-3 px-3 py-5">
      <button
        type="button"
        className={buttonClass(isRoutePlannerVisible)}
        onClick={() => dispatch(setRoutePlannerVisible(!isRoutePlannerVisible))}
        aria-label="Планувальник маршрутів"
        title="Планувальник маршрутів"
      >
        <Icon icon="mdi:navigation-variant-outline" className="h-6 w-6" />
        <span className={tooltipClass}>Планувальник</span>
      </button>

      <button
        type="button"
        className={buttonClass(isFiltersVisible)}
        onClick={() => {
          const next = !isFiltersVisible;
          dispatch(setFiltersVisible(next));
          if (next) {
            dispatch(setProfileVisible(false));
            dispatch(setRoutesVisible(false));
          }
        }}
        aria-label="Filters"
        title="Filters"
      >
        <Icon icon="bi:toggles" className="h-6 w-6" />
        <span className={tooltipClass}>Filters</span>
      </button>

      <button
        type="button"
        className={buttonClass(isParkingData)}
        onClick={() => dispatch(setIsParkingData(!isParkingData))}
        aria-label="Parkings"
        title="Parkings"
      >
        <img src={parking} alt="" className="h-7 w-7" />
        <span className={tooltipClass}>Parkings</span>
      </button>

      <button
        type="button"
        className={buttonClass(isChargerData)}
        onClick={() => dispatch(setIsChargerData(!isChargerData))}
        aria-label="EV chargers"
        title="EV chargers"
      >
        <ChargerIcon />
        <span className={tooltipClass}>EV chargers</span>
      </button>

      <button
        type="button"
        className={buttonClass(isRoutesVisible)}
        onClick={() => {
          const next = !isRoutesVisible;
          dispatch(setRoutesVisible(next));
          if (next) {
            dispatch(setFiltersVisible(false));
            dispatch(setProfileVisible(false));
          }
        }}
        aria-label="Saved routes"
        title="Saved routes"
      >
        <Icon icon="mdi:map-marker-path" className="h-6 w-6" />
        <span className={tooltipClass}>Saved routes</span>
      </button>

      <div className="flex-1" />

      <button
        type="button"
        className={buttonClass(isProfileVisible)}
        onClick={() => {
          const next = !isProfileVisible;
          dispatch(setProfileVisible(next));
          if (next) {
            dispatch(setFiltersVisible(false));
            dispatch(setRoutesVisible(false));
          }
        }}
        aria-label="Profile"
        title="Profile"
      >
        <Icon icon="fa6-solid:user" className="h-5 w-5" />
        <span className={tooltipClass}>Profile</span>
      </button>
    </nav>
  );
}

export default Bar;
