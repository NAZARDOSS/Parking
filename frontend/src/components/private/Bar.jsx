import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { setIsParkingData, setIsChargerData } from "./Store/store";
import { Icon } from "@iconify/react";
import parking from "../../assets/parking-icon.svg";
import { ChargerIcon } from "../icons/ChargerIcon";
import { toggleFiltersVisibility, toggleProfileVisibility, toggleRoutesVisibility } from "./Store/store";
function Bar() {
  const dispatch = useDispatch();
  const isParkingData = useSelector((state) => state.parkings.isParkingData);
  const isChargerData = useSelector((state) => state.chargers.isChargerData);

  const handleParkingClick = () => {
    dispatch(setIsParkingData(!isParkingData));
  };

  const toggleFilters = () => {
    dispatch(toggleFiltersVisibility())
  }

  const toggleRoutes = () => {
    dispatch(toggleRoutesVisibility())
  }

  const toggleProfile = () => {
    dispatch(toggleProfileVisibility())
  }

  const handleChargersClick = () => {
    dispatch(setIsChargerData(!isChargerData));
  };

  return (
    <div className="flex flex-col m-5">
      <button className="btn bg-[#002457] m-5 border-[#0777F7] border-2 rounded-2xl shadow-blurred-3xl hover:bg-[#001957ae]" onClick={toggleFilters}>
        <Icon
          icon="bi:toggles"
          className="w-12 h-12 m-4 text-white transition duration-200 ease-in-out"
        />
      </button>

      <button
        className={`btn m-5 border-[#0777F7] border-2 rounded-2xl shadow-blurred-3xl group ${isParkingData ? 'bg-white' : 'bg-[#002457]'}`}
        onClick={handleParkingClick}
      >
        <img
          src={parking}
          alt="Parking Icon"
          className="w-12 h-12 m-4 group-hover:brightness-150 transition duration-200 ease-in-out"
        />
      </button>

      <button
        className={`btn m-5 border-[#0777F7] border-2 rounded-2xl shadow-blurred-3xl group ${isChargerData ? 'bg-white' : 'bg-[#002457]'}`}
        onClick={handleChargersClick}
      >
        <ChargerIcon />
      </button>

      <button
      className="btn bg-[#002457] m-5 border-[#0777F7] border-2 rounded-2xl shadow-blurred-3xl hover:bg-[#001957ae]"
      onClick={toggleRoutes}
      >
        <Icon
          icon="mdi:database-location"
          className="w-12 h-12 m-4 text-white  transition duration-200 ease-in-out"
        />
      </button>

      <button className="btn bg-[#002457] m-5 border-[#0777F7] border-2 rounded-2xl shadow-blurred-3xl hover:bg-[#001957ae]">
        <Icon
          icon="fa6-solid:user"
          className="w-12 h-12 m-4 text-white transition duration-200 ease-in-out"
          onClick={toggleProfile}
        />
      </button>
    </div>
  );
}

export default Bar;
