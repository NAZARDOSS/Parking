import React, { useEffect, useState } from "react";

const SpeedTracker = () => {
  const [speed, setSpeed] = useState(null);

  useEffect(() => {
    if ("geolocation" in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          if (position.coords.speed !== null) {
            // Скорость предоставляется в м/с
            setSpeed(position.coords.speed * 3.6); // Перевод в км/ч
          } else {
            // Если скорость недоступна
            setSpeed("Нет данных");
          }
        },
        (error) => {
          console.error("Ошибка получения данных о местоположении", error);
          setSpeed("Ошибка");
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
        }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    } else {
      console.error("Geolocation API недоступен");
      setSpeed("Недоступно");
    }
  }, []);

  return (
    <div>
      <h1>Ваша скорость: {speed ? `${speed} км/ч` : "Загрузка..."}</h1>
    </div>
  );
};

export default SpeedTracker;
