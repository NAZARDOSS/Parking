import React, { useState } from "react";
import { Icon } from "@iconify/react";
import parking from "../assets/parking-icon.svg";

function Bar(props) {
  // Состояние для отслеживания активности парковки
  const [isParkingData, setIsParkingData] = useState(false);

  // Обработчик клика по иконке парковки
  const handleParkingClick = () => {
    setIsParkingData((prevState) => !prevState); // Переключаем значение
    console.log('isParkingData:', !isParkingData); // Для отладки
    // Можно передать состояние в родительский компонент или Redux (если нужно)
  };

  return (
    <div className="flex flex-col m-5">
      <button className="btn bg-[#002457] m-5 border-[#0777F7] border-2 rounded-2xl shadow-blurred-3xl hover:bg-[#001957ae]">
        <Icon
          icon="bi:toggles"
          className="w-12 h-12 m-4 text-white transition duration-200 ease-in-out"
        />
      </button>

      {/* Кнопка для парковки */}
      <button
        className="btn bg-white m-5 border-[#0777F7] border-2 rounded-2xl shadow-blurred-3xl group"
        onClick={handleParkingClick} // Добавляем обработчик клика
      >
        <img
          src={parking}
          alt="Parking Icon"
          className="w-12 h-12 m-4 group-hover:brightness-150 transition duration-200 ease-in-out"
        />
      </button>

      <button className="btn bg-[#002457] m-5 border-[#0777F7] border-2 rounded-2xl shadow-blurred-3xl hover:bg-[#001957ae]">
        <Icon
          icon="mdi:database-location"
          className="w-12 h-12 m-4 text-white  transition duration-200 ease-in-out"
        />
      </button>

      <button className="btn bg-[#002457] m-5 border-[#0777F7] border-2 rounded-2xl shadow-blurred-3xl hover:bg-[#001957ae]">
        <Icon
          icon="fa6-solid:user"
          className="w-12 h-12 m-4 text-white transition duration-200 ease-in-out"
        />
      </button>
    </div>
  );
}

export default Bar;
