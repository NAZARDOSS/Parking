import React, { useEffect } from "react";
import { Icon } from "@iconify/react";
import Bar from "../Bar";

function BarButton({ isBarVisible, setIsBarVisible }) {
  const toggleBar = () => {
    setIsBarVisible(!isBarVisible);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        event.target.closest(".bar") === null &&
        event.target.closest(".bar-button") === null
      ) {
        setIsBarVisible(false);
      }
    };

    document.addEventListener("click", handleClickOutside);

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [setIsBarVisible]);

  return (
    <div>
      {!isBarVisible && (
        <button
          onClick={toggleBar}
          className="bar-button flex items-center justify-center absolute top-5 left-5 z-10 bg-blue-950 opacity-90 text-white p-0 rounded-full hover:bg-blue-800 shadow-blurred-3xl"
          style={{
            width: "50px",
            height: "50px",
          }}
        >
          <Icon icon="mingcute:menu-fill" className="w-6 h-6 text-white" />
        </button>
      )}

      <div
        className="bar absolute top-0 left-0 bg-[#031A3ACC] text-white w-1/7 h-full z-20"
        style={{
          transform: isBarVisible ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.3s ease",
        }}
      >
        <Bar />
      </div>
    </div>
  );
}

export default BarButton;
