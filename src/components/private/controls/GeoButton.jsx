import React, { useState, useEffect } from "react";
import mapboxgl from "mapbox-gl";
import { Icon } from "@iconify/react";
import MapDialog from "../MapDialog";

const GeoButton = ({ map, isFollowing, setIsFollowing }) => {
  const [marker, setMarker] = useState(null);
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

    if (!marker) {
      const customMarker = document.createElement("div");
      customMarker.className = "custom-marker";
      customMarker.style.backgroundImage = `url('/path/to/marker-icon.svg')`;
      customMarker.style.width = "50px";
      customMarker.style.height = "50px";
      customMarker.style.backgroundSize = "cover";

      const newMarker = new mapboxgl.Marker(customMarker)
        .setLngLat([longitude, latitude])
        .addTo(map);

      setMarker(newMarker);
    } else {
      marker.setLngLat([longitude, latitude]);
    }

    if (heading !== null) {
      marker.getElement().style.transform = `rotate(${heading}deg)`;
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
          } else {
            console.error("Error fetching geolocation:", error);
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
      (error) => {
        console.error("Error watching geolocation:", error);
      },
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
        className="flex items-center justify-center absolute bottom-10 right-10 z-5 bg-blue-950 opacity-90 text-white p-0 rounded-full hover:bg-blue-800 shadow-blurred-3xl"
        title="Go to my location"
        style={{ width: "80px", height: "80px" }}
      >
        <span className="absolute icon-park-twotone--aiming w-full h-full text-white cursor-pointer"></span>
        <Icon icon="tabler:navigation-filled" className="absolute w-6 h-6 text-white" />
      </button>

      {isLoading && <div className="loading-indicator">Loading...</div>}

      <MapDialog 
        key={isOpen ? "open" : "closed"} 
        open={isOpen} 
        handleClose={handleCloseSnackbar} 
      />
    </div>
  );
};

export default GeoButton;
