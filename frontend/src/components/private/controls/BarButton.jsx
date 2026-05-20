import { useEffect } from "react";
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
          className="bar-button absolute left-5 top-5 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-blue-300/30 bg-blue-950/95 p-0 text-white shadow-2xl backdrop-blur hover:bg-blue-800"
          aria-label="Open navigation"
          title="Open navigation"
        >
          <Icon icon="mingcute:menu-fill" className="w-6 h-6 text-white" />
        </button>
      )}

      <div
        className="bar absolute left-0 top-0 z-40 h-full w-20 border-r border-white/10 bg-[#031A3A]/95 text-white shadow-2xl backdrop-blur"
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
