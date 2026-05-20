import { useState, useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { Icon } from "@iconify/react";
import MapDialog from "../MapDialog";

const GeoButton = ({ map, isFollowing, setIsFollowing }) => {
  const markerRef = useRef(null);
  const [userLocation, setUserLocation] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const updateLocationOnMap = (latitude, longitude, heading = null) => {
    if (!map) return;

    map.flyTo({
      center: [longitude, latitude],
      zoom: 14,
      essential: true,
    });

    if (!markerRef.current) {
      const customMarker = document.createElement("div");
      customMarker.className = "h-5 w-5 rounded-full border-2 border-white bg-blue-500 shadow-lg";

      markerRef.current = new mapboxgl.Marker(customMarker)
        .setLngLat([longitude, latitude])
        .addTo(map);
    } else {
      markerRef.current.setLngLat([longitude, latitude]);
    }

    if (heading !== null) {
      markerRef.current.getElement().style.transform = `rotate(${heading}deg)`;
    }
  };

  const handleGeolocate = () => {
    if (userLocation) {
      updateLocationOnMap(userLocation.lat, userLocation.lng);
    } else {
      setIsLoading(true);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, heading } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          updateLocationOnMap(latitude, longitude, heading);
          setIsLoading(false);
        },
        (error) => {
          setIsLoading(false);
          if (error.code === error.PERMISSION_DENIED) {
            setIsOpen(true);
          }
        },
        { enableHighAccuracy: true }
      );
    }

    setIsFollowing(true);
  };

  useEffect(() => {
    if (!isFollowing || !navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, heading } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        updateLocationOnMap(latitude, longitude, heading);
      },
      () => {},
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isFollowing, map]);

  const handleCloseSnackbar = () => {
    setIsOpen(false);
  };

  return (
    <div>
      <button
        onClick={handleGeolocate}
        className="absolute bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full border border-blue-300/30 bg-blue-950/95 p-0 text-white shadow-2xl backdrop-blur hover:bg-blue-800"
        title="Go to my location"
        aria-label="Go to my location"
      >
        <Icon icon={isLoading ? "mdi:loading" : "tabler:navigation-filled"} className={`h-6 w-6 text-white ${isLoading ? "animate-spin" : ""}`} />
      </button>

      <MapDialog 
        key={isOpen ? "open" : "closed"} 
        open={isOpen} 
        handleClose={handleCloseSnackbar} 
      />
    </div>
  );
};

export default GeoButton;
