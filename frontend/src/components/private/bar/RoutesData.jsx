import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { Icon } from "@iconify/react";
import { toast } from "react-hot-toast";
import { toggleRoutesVisibility } from "../Store/store.js";
import { apiRequest } from "../../../config/apiClient.js";

const formatDuration = (seconds = 0) => {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours} h ${remainingMinutes} min` : `${hours} h`;
};

const formatDistance = (meters = 0) => {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
};

const formatDate = (value) => {
  if (!value) return "Saved route";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Saved route";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const toLngLat = (latitude, longitude) => {
  const lat = Number(latitude);
  const lng = Number(longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return [lng, lat];
};

function RoutesData({ onResultSelect }) {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [activeRouteSummary, setActiveRouteSummary] = useState(null);
  const [isDrawingRoute, setIsDrawingRoute] = useState(false);
  const isMountedRef = useRef(true);
  const dispatch = useDispatch();

  const fetchRoutes = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest("/requests/getRoutes");
      if (!isMountedRef.current) return;
      setRoutes(Array.isArray(data) ? data : []);
    } catch (requestError) {
      if (!isMountedRef.current) return;
      setError(requestError.message || "Could not load routes.");
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    fetchRoutes();

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const filteredRoutes = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return routes;

    return routes.filter((route) =>
      [
        route.finish_name,
        route.start_latitude,
        route.start_longitude,
        route.finish_latitude,
        route.finish_longitude,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [routes, search]);

  const handleClose = () => {
    dispatch(toggleRoutesVisibility());
  };

  const handleRefresh = () => {
    setSelectedRouteId(null);
    setActiveRouteSummary(null);
    fetchRoutes();
  };

  const handleRouteClick = async (route) => {
    if (!onResultSelect || isDrawingRoute) return;

    const startPoint = toLngLat(route.start_latitude, route.start_longitude);
    const finishPoint = toLngLat(route.finish_latitude, route.finish_longitude);

    if (!startPoint || !finishPoint) {
      toast.error("This saved route has invalid coordinates.");
      return;
    }

    setIsDrawingRoute(true);
    setSelectedRouteId(route.id);
    setActiveRouteSummary(null);

    try {
      const routeDetails = await onResultSelect({
        startPoint,
        finishPoint,
        travelMode: "driving",
      });

      if (!routeDetails || !isMountedRef.current) return;

      setActiveRouteSummary({
        duration: routeDetails.duration,
        distance: routeDetails.distance,
      });
    } catch (routeError) {
      toast.error(routeError.message || "Could not build this route.");
    } finally {
      setIsDrawingRoute(false);
    }
  };

  return (
    <aside className="absolute bottom-5 left-24 top-5 z-30 flex w-[390px] max-w-[calc(100vw-8rem)] flex-col overflow-hidden rounded-lg border border-blue-300/20 bg-[#031A3A]/95 text-white shadow-2xl backdrop-blur">
      <header className="border-b border-white/10 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-bold uppercase text-blue-200">Navigation</div>
            <h2 className="text-xl font-bold leading-tight">Saved routes</h2>
            <p className="mt-1 text-sm text-slate-300">{routes.length} saved destinations</p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              className="flex h-9 w-9 items-center justify-center rounded-md bg-white/10 text-white hover:bg-white/20"
              aria-label="Refresh saved routes"
              title="Refresh"
            >
              <Icon icon="mdi:refresh" className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="flex h-9 w-9 items-center justify-center rounded-md bg-white/10 text-white hover:bg-white/20"
              aria-label="Close saved routes"
              title="Close"
            >
              <Icon icon="mdi:close" className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-lg border border-white/10 bg-white px-3 py-2 text-slate-950">
          <Icon icon="mdi:magnify" className="h-5 w-5 shrink-0 text-blue-800" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search route history"
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400"
          />
        </div>
      </header>

      {activeRouteSummary ? (
        <section className="grid grid-cols-2 gap-3 border-b border-white/10 bg-white/5 px-4 py-3">
          <div>
            <div className="text-xs text-slate-400">Estimated time</div>
            <div className="text-base font-bold">{formatDuration(activeRouteSummary.duration)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Distance</div>
            <div className="text-base font-bold">{formatDistance(activeRouteSummary.distance)}</div>
          </div>
        </section>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex h-40 flex-col items-center justify-center gap-3 text-slate-300">
            <Icon icon="mdi:loading" className="h-7 w-7 animate-spin text-blue-200" />
            <span className="text-sm font-semibold">Loading saved routes...</span>
          </div>
        ) : null}

        {!loading && error ? (
          <div className="rounded-lg border border-red-300/30 bg-red-500/10 px-3 py-3 text-sm text-red-100">
            {error}
          </div>
        ) : null}

        {!loading && !error && filteredRoutes.length === 0 ? (
          <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-6 text-center">
            <Icon icon="mdi:map-search-outline" className="mx-auto mb-2 h-8 w-8 text-blue-200" />
            <div className="font-bold">No routes found</div>
            <div className="mt-1 text-sm text-slate-300">Build a route from the planner to save it here.</div>
          </div>
        ) : null}

        {!loading && !error && filteredRoutes.length > 0 ? (
          <ul className="space-y-3">
            {filteredRoutes.map((route, index) => {
              const routeId = route.id ?? `${route.finish_latitude}-${route.finish_longitude}-${index}`;
              const isActive = selectedRouteId === route.id;

              return (
                <li key={routeId}>
                  <button
                    type="button"
                    onClick={() => handleRouteClick(route)}
                    className={`w-full rounded-lg border px-3 py-3 text-left transition-colors ${
                      isActive
                        ? "border-blue-300 bg-blue-500/20"
                        : "border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-500 text-white">
                        <Icon icon={isActive && isDrawingRoute ? "mdi:loading" : "mdi:map-marker-path"} className={`h-5 w-5 ${isActive && isDrawingRoute ? "animate-spin" : ""}`} />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-white">
                          {route.finish_name || "Saved destination"}
                        </span>
                        <span className="mt-1 block text-xs text-slate-300">
                          {formatDate(route.created_at)}
                        </span>
                        <span className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                          <Icon icon="mdi:crosshairs-gps" className="h-4 w-4" />
                          {Number(route.start_latitude).toFixed(4)}, {Number(route.start_longitude).toFixed(4)}
                        </span>
                      </span>

                      <Icon icon="mdi:chevron-right" className="mt-2 h-5 w-5 shrink-0 text-blue-200" />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </aside>
  );
}

export default RoutesData;
