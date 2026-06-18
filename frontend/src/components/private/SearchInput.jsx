import { useCallback, useEffect, useRef, useState } from "react";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import { Icon } from "@iconify/react";
import mapboxgl from "mapbox-gl";
import { apiRequest } from "../../config/apiClient.js";
import { setParkingFilters, setRoutePlannerVisible } from "./Store/store.js";
import {
  countActiveFilters,
  getActiveParkingFilterLabels,
  parkingFilterGroups,
} from "./lib/filterConfig.js";

const travelModes = [
  { id: "driving", label: "Авто", icon: "mdi:car", description: "Найшвидший маршрут" },
  { id: "walking", label: "Пішки", icon: "mdi:walk", description: "Пішохідний маршрут" },
  { id: "cycling", label: "Велосипед", icon: "mdi:bike", description: "Маршрут велосипедом" },
];

const pluralTimes = (n) => {
  if (n === 1) return "раз";
  if (n >= 2 && n <= 4) return "рази";
  return "разів";
};

const formatDuration = (seconds = 0) => {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} хв`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem ? `${hours} г ${rem} хв` : `${hours} г`;
};

const formatDistance = (meters = 0) => {
  if (meters < 1000) return `${Math.round(meters)} м`;
  return `${(meters / 1000).toFixed(1)} км`;
};

const formatScore = (score = 0) => `${Math.round(score * 100)}%`;

const formatCoordinateLabel = (point) =>
  `${point[1].toFixed(5)}, ${point[0].toFixed(5)}`;

const availabilityTone = (prediction) =>
  ({
    green: {
      border: "border-emerald-300/40",
      badge: "bg-emerald-400 text-emerald-950",
      text: "text-emerald-200",
    },
    yellow: {
      border: "border-amber-300/40",
      badge: "bg-amber-400 text-blue-950",
      text: "text-amber-200",
    },
    red: {
      border: "border-red-300/40",
      badge: "bg-red-400 text-red-950",
      text: "text-red-200",
    },
  }[prediction?.color] || {
    border: "border-white/10",
    badge: "bg-amber-400 text-blue-950",
    text: "text-slate-300",
  });

const routeFilterInputClass =
  "min-w-0 rounded-md border border-white/10 bg-white/10 px-2 py-2 text-sm font-semibold text-white outline-none placeholder:text-slate-500 focus:border-blue-300";

const suggestionTitle = (suggestion) =>
  suggestion?.name || suggestion?.name_preferred || suggestion?.text || "Невідоме місце";

const suggestionSubtitle = (suggestion) =>
  suggestion?.place_formatted ||
  suggestion?.full_address ||
  suggestion?.address ||
  suggestion?.context?.place?.name ||
  "Немає додаткової інформації";

const fieldConfig = {
  start: {
    label: "Початок",
    placeholder: "Оберіть початкову точку",
    icon: "mdi:map-marker-radius",
  },
  finish: {
    label: "Призначення",
    placeholder: "Куди ви їдете?",
    icon: "mdi:flag-checkered",
  },
};

const toLngLat = (latitude, longitude) => {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return [lng, lat];
};

const routeKey = (route) =>
  [
    Number(route.start_latitude).toFixed(4),
    Number(route.start_longitude).toFixed(4),
    Number(route.finish_latitude).toFixed(4),
    Number(route.finish_longitude).toFixed(4),
    String(route.finish_name || "").trim().toLowerCase(),
  ].join("|");

const getPopularRoutes = (routes = []) => {
  const groups = new Map();
  routes.forEach((route) => {
    const startPoint = toLngLat(route.start_latitude, route.start_longitude);
    const finishPoint = toLngLat(route.finish_latitude, route.finish_longitude);
    if (!startPoint || !finishPoint) return;
    const key = routeKey(route);
    const current = groups.get(key);
    const createdAt = new Date(route.created_at || 0).getTime() || 0;
    if (!current) {
      groups.set(key, { ...route, startPoint, finishPoint, count: 1, lastUsedAt: createdAt });
      return;
    }
    current.count += 1;
    current.lastUsedAt = Math.max(current.lastUsedAt, createdAt);
  });
  return Array.from(groups.values())
    .sort((a, b) => b.count - a.count || b.lastUsedAt - a.lastUsedAt)
    .slice(0, 6);
};

const createDraftMarkerElement = (field) => {
  const element = document.createElement("div");
  const isStart = field === "start";
  element.className = `flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-xs font-black text-white shadow-xl ${
    isStart ? "bg-emerald-500" : "bg-blue-600"
  }`;
  element.textContent = isStart ? "A" : "B";
  element.setAttribute("aria-label", isStart ? "Початок маршруту" : "Кінцева точка маршруту");
  return element;
};

// Ukrainian translations for filter labels (filterConfig.js stays in English for FilterBlock)
const ukGroupTitles = {
  Access: "Доступ",
  Price: "Ціна",
  Type: "Тип",
  Facilities: "Умови",
  Limits: "Обмеження",
};

const ukFilterLabels = {
  Public: "Публічний",
  Private: "Приватний",
  Customers: "Для клієнтів",
  "Permit / residents": "Дозвіл",
  Free: "Безкоштовно",
  Paid: "Платний",
  Cash: "Готівка",
  Card: "Картка",
  Contactless: "Безконтактний",
  "App payment": "Застосунок",
  Garage: "Гараж",
  Underground: "Підземний",
  Multistorey: "Поверховий",
  Surface: "Наземний",
  "Street parking": "Вулична",
  "Street side": "Узбіч",
  "Single spaces": "Поодинокі",
  Wheelchair: "Для візків",
  "Disabled spaces": "Для інвалідів",
  "24/7": "Цілодобово",
  "Opening hours": "Відомі години",
  Covered: "Накритий",
  Lit: "Освітлений",
  Supervised: "З охороною",
  Surveillance: "Відеонагляд",
  "Charging spaces": "Для зарядки",
  "Capacity known": "Відома місткість",
  "Max stay known": "Відомий макс. час",
  "Max height known": "Відома макс. висота",
  Search: "Пошук",
  Operator: "Оператор",
  "Min capacity": "Мін. місць",
  "Vehicle height": "Висота авто",
};

const translateFilterLabel = (label) => {
  const colonIdx = label.indexOf(": ");
  if (colonIdx > -1) {
    const key = label.slice(0, colonIdx);
    const val = label.slice(colonIdx + 2);
    return `${ukFilterLabels[key] || key}: ${val}`;
  }
  return ukFilterLabels[label] || label;
};

const SearchInput = ({
  map,
  apiKey,
  onResultSelect,
  onParkingRecommendationSelect,
  onClearRoute,
  userLocation,
}) => {
  const dispatch = useDispatch();
  const savedParkingFilters = useSelector(
    (state) => state.filters.parkingFilters,
    shallowEqual
  );
  const isVisible = useSelector((state) => state.routePlanner.isRoutePlannerVisible);

  const [queries, setQueries] = useState({ start: "", finish: "" });
  const [points, setPoints] = useState({ start: null, finish: null });
  const [suggestions, setSuggestions] = useState({ start: [], finish: [] });
  const [focusedField, setFocusedField] = useState(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState({ start: false, finish: false });
  const [travelMode, setTravelMode] = useState("driving");
  const [route, setRoute] = useState(null);
  const [parkingRecommendations, setParkingRecommendations] = useState([]);
  const [routeError, setRouteError] = useState("");
  const [isBuildingRoute, setIsBuildingRoute] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isParkingFiltersOpen, setIsParkingFiltersOpen] = useState(false);
  const [popularRoutes, setPopularRoutes] = useState([]);
  const [pickMode, setPickMode] = useState(null);
  const [routeParkingFilters, setRouteParkingFilters] = useState(savedParkingFilters);

  const sessionTokenRef = useRef(Math.random().toString(36).slice(2));
  const containerRef = useRef(null);
  const draftMarkersRef = useRef({ start: null, finish: null });
  const mapPickCleanupRef = useRef(null);

  const activeFilterCount = countActiveFilters(routeParkingFilters);
  const activeFilterLabels = getActiveParkingFilterLabels(routeParkingFilters).map(translateFilterLabel);

  const clearMapPicker = useCallback(() => {
    mapPickCleanupRef.current?.();
    mapPickCleanupRef.current = null;
    setPickMode(null);
  }, []);

  const removeDraftMarker = useCallback((field) => {
    draftMarkersRef.current[field]?.remove();
    draftMarkersRef.current[field] = null;
  }, []);

  const clearDraftMarkers = useCallback(() => {
    removeDraftMarker("start");
    removeDraftMarker("finish");
  }, [removeDraftMarker]);

  const updateDraftMarker = useCallback(
    (field, point) => {
      if (!map || !point) return;
      removeDraftMarker(field);
      draftMarkersRef.current[field] = new mapboxgl.Marker({
        element: createDraftMarkerElement(field),
        anchor: "bottom",
      })
        .setLngLat(point)
        .addTo(map);
    },
    [map, removeDraftMarker]
  );

  // Cancel map pick when panel is hidden
  useEffect(() => {
    if (!isVisible) {
      clearMapPicker();
      setFocusedField(null);
    }
  }, [isVisible, clearMapPicker]);

  useEffect(() => {
    setRouteParkingFilters(savedParkingFilters);
  }, [savedParkingFilters]);

  useEffect(() => {
    let isMounted = true;
    apiRequest("/requests/getRoutes")
      .then((routes) => {
        if (isMounted) {
          setPopularRoutes(getPopularRoutes(Array.isArray(routes) ? routes : []));
        }
      })
      .catch(() => {
        if (isMounted) setPopularRoutes([]);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setFocusedField(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(
    () => () => {
      clearMapPicker();
      clearDraftMarkers();
    },
    [clearDraftMarkers, clearMapPicker]
  );

  const fetchSuggestions = useCallback(
    async (query, field) => {
      const trimmedQuery = query.trim();
      if (trimmedQuery.length < 2 || !apiKey) {
        setSuggestions((current) => ({ ...current, [field]: [] }));
        return;
      }
      setLoadingSuggestions((current) => ({ ...current, [field]: true }));
      try {
        const url = new URL("https://api.mapbox.com/search/searchbox/v1/suggest");
        url.searchParams.set("q", trimmedQuery);
        url.searchParams.set("access_token", apiKey);
        url.searchParams.set("session_token", sessionTokenRef.current);
        url.searchParams.set("limit", "6");
        url.searchParams.set("types", "poi,address,place,street");
        if (userLocation) {
          url.searchParams.set("proximity", `${userLocation.lng},${userLocation.lat}`);
        }
        const response = await fetch(url);
        const data = await response.json();
        setSuggestions((current) => ({ ...current, [field]: data.suggestions || [] }));
      } catch {
        setSuggestions((current) => ({ ...current, [field]: [] }));
      } finally {
        setLoadingSuggestions((current) => ({ ...current, [field]: false }));
      }
    },
    [apiKey, userLocation]
  );

  useEffect(() => {
    const timeout = setTimeout(() => fetchSuggestions(queries.start, "start"), 250);
    return () => clearTimeout(timeout);
  }, [queries.start, fetchSuggestions]);

  useEffect(() => {
    const timeout = setTimeout(() => fetchSuggestions(queries.finish, "finish"), 250);
    return () => clearTimeout(timeout);
  }, [queries.finish, fetchSuggestions]);

  const setFieldValue = (field, value) => {
    setQueries((current) => ({ ...current, [field]: value }));
    setPoints((current) => ({ ...current, [field]: null }));
    removeDraftMarker(field);
    setRoute(null);
    setParkingRecommendations([]);
    setRouteError("");
  };

  const setPickedPoint = useCallback(
    (field, point, label) => {
      setQueries((current) => ({ ...current, [field]: label }));
      setPoints((current) => ({ ...current, [field]: point }));
      setSuggestions((current) => ({ ...current, [field]: [] }));
      setFocusedField(null);
      setRoute(null);
      setParkingRecommendations([]);
      setRouteError("");
      updateDraftMarker(field, point);
    },
    [updateDraftMarker]
  );

  const selectCurrentLocation = (field) => {
    if (!userLocation) {
      setRouteError("Поточне місцезнаходження ще недоступне.");
      return;
    }
    const point = [userLocation.lng, userLocation.lat];
    setPickedPoint(field, point, "Поточне місцезнаходження");
    map?.flyTo({ center: point, zoom: 14, essential: true });
  };

  const startMapPick = useCallback(
    (field) => {
      if (!map) {
        setRouteError("Карта ще не готова.");
        return;
      }
      clearMapPicker();
      setPickMode(field);
      setFocusedField(null);
      setRouteError(`Клікніть на карту для встановлення точки "${fieldConfig[field].label}".`);
      const canvas = map.getCanvas();
      const previousCursor = canvas.style.cursor;
      canvas.style.cursor = "crosshair";
      const handleClick = (event) => {
        const point = [event.lngLat.lng, event.lngLat.lat];
        setPickedPoint(
          field,
          point,
          field === "start"
            ? `Закріплений початок (${formatCoordinateLabel(point)})`
            : `Закріплений пункт (${formatCoordinateLabel(point)})`
        );
        map.flyTo({ center: point, zoom: Math.max(map.getZoom(), 15), essential: true });
        clearMapPicker();
      };
      map.once("click", handleClick);
      mapPickCleanupRef.current = () => {
        map.off("click", handleClick);
        canvas.style.cursor = previousCursor;
      };
    },
    [clearMapPicker, map, setPickedPoint]
  );

  const selectSuggestion = async (field, suggestion) => {
    if (!suggestion?.mapbox_id) return;
    try {
      const url = new URL(
        `https://api.mapbox.com/search/searchbox/v1/retrieve/${suggestion.mapbox_id}`
      );
      url.searchParams.set("access_token", apiKey);
      url.searchParams.set("session_token", sessionTokenRef.current);
      const response = await fetch(url);
      const data = await response.json();
      const coordinates = data?.features?.[0]?.geometry?.coordinates;
      if (!coordinates) return;
      setPickedPoint(field, coordinates, suggestionTitle(suggestion));
      map?.flyTo({ center: coordinates, zoom: 14, essential: true });
    } catch {
      setRouteError("Не вдалося обрати це місце.");
    }
  };

  const selectPopularRoute = (route) => {
    setQueries({
      start: `Старт з історії (${formatCoordinateLabel(route.startPoint)})`,
      finish: route.finish_name || "Збережений пункт",
    });
    setPoints({ start: route.startPoint, finish: route.finishPoint });
    setSuggestions({ start: [], finish: [] });
    setFocusedField(null);
    setRoute(null);
    setParkingRecommendations([]);
    setRouteError("");
    updateDraftMarker("start", route.startPoint);
    updateDraftMarker("finish", route.finishPoint);
    map?.flyTo({ center: route.finishPoint, zoom: 14, essential: true });
  };

  const swapPoints = () => {
    setQueries((current) => ({ start: current.finish, finish: current.start }));
    setPoints((current) => ({ start: current.finish, finish: current.start }));
    if (points.finish) updateDraftMarker("start", points.finish);
    else removeDraftMarker("start");
    if (points.start) updateDraftMarker("finish", points.start);
    else removeDraftMarker("finish");
    setRoute(null);
    setParkingRecommendations([]);
    setRouteError("");
  };

  const saveRoute = async () => {
    if (!points.start || !points.finish) return;
    setIsSaving(true);
    try {
      await apiRequest("/requests/routeInfo", {
        method: "POST",
        body: {
          startLatitude: points.start[1],
          startLongitude: points.start[0],
          finishLatitude: points.finish[1],
          finishLongitude: points.finish[0],
          finishName: queries.finish || "Призначення",
        },
      });
    } catch (error) {
      setRouteError(error.message || "Маршрут побудовано, але не вдалося зберегти.");
    } finally {
      setIsSaving(false);
    }
  };

  const buildRoute = async () => {
    if (!points.start || !points.finish || isBuildingRoute) return;
    setIsBuildingRoute(true);
    setRouteError("");
    dispatch(setParkingFilters(routeParkingFilters));
    try {
      const nextRoute = await onResultSelect?.({
        startPoint: points.start,
        finishPoint: points.finish,
        travelMode,
        parkingFilters: routeParkingFilters,
      });
      if (nextRoute) {
        setRoute(nextRoute);
        setParkingRecommendations(nextRoute.parkingRecommendations || []);
        clearDraftMarkers();
        await saveRoute();
      }
    } catch (error) {
      setRouteError(error.message || "Не вдалося побудувати маршрут.");
    } finally {
      setIsBuildingRoute(false);
    }
  };

  const clearRoute = () => {
    setQueries({ start: "", finish: "" });
    setPoints({ start: null, finish: null });
    setSuggestions({ start: [], finish: [] });
    setRoute(null);
    setParkingRecommendations([]);
    setRouteError("");
    clearMapPicker();
    clearDraftMarkers();
    onClearRoute?.();
  };

  const updateRouteParkingFilter = (name, value) => {
    setRouteParkingFilters((current) => ({ ...current, [name]: value }));
    setRoute(null);
    setParkingRecommendations([]);
    setRouteError("");
  };

  const handleRouteParkingFilterChange = (event) => {
    const { name, type, checked, value } = event.target;
    updateRouteParkingFilter(name, type === "checkbox" ? checked : value);
  };

  const clearRouteParkingFilters = () => {
    setRouteParkingFilters((current) =>
      Object.fromEntries(
        Object.entries(current).map(([key, value]) => [
          key,
          typeof value === "boolean" ? false : "",
        ])
      )
    );
    setRoute(null);
    setParkingRecommendations([]);
    setRouteError("");
  };

  const renderRouteNumberInput = (name, label, step = "1") => (
    <label className="flex min-w-0 flex-col gap-1 text-xs font-bold uppercase text-blue-200">
      {label}
      <input
        type="number"
        min="0"
        step={step}
        name={name}
        value={routeParkingFilters[name] || ""}
        onChange={handleRouteParkingFilterChange}
        className={routeFilterInputClass}
      />
    </label>
  );

  const renderRouteFilterToggle = ([name, label]) => {
    const isActive = Boolean(routeParkingFilters[name]);
    return (
      <button
        key={name}
        type="button"
        onClick={() => updateRouteParkingFilter(name, !isActive)}
        className={`flex min-h-9 items-center justify-between gap-2 rounded-md border px-2 py-2 text-left text-xs font-bold transition-colors ${
          isActive
            ? "border-blue-300 bg-blue-500 text-white"
            : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
        }`}
        aria-pressed={isActive}
      >
        <span className="min-w-0 leading-tight">{ukFilterLabels[label] || label}</span>
        {isActive ? <Icon icon="mdi:check" className="h-4 w-4 shrink-0" /> : null}
      </button>
    );
  };

  const renderRouteFilterGroup = (group) => (
    <section key={group.title} className="space-y-2 border-t border-white/10 pt-3">
      <div className="text-xs font-bold uppercase text-slate-400">
        {ukGroupTitles[group.title] || group.title}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {group.filters.map(renderRouteFilterToggle)}
      </div>
    </section>
  );

  const renderRouteParkingFilters = () => (
    <div className="overflow-hidden rounded-lg border border-white/10 bg-white/5">
      <button
        type="button"
        onClick={() => setIsParkingFiltersOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left hover:bg-white/5"
        aria-expanded={isParkingFiltersOpen}
      >
        <span className="min-w-0">
          <span className="block text-xs font-bold uppercase text-blue-200">
            Фільтри паркінгів
          </span>
          <span className="block truncate text-sm font-bold text-white">
            {activeFilterCount ? `${activeFilterCount} активних` : "Будь-який паркінг"}
          </span>
        </span>
        <span className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white/10 text-blue-100">
            <Icon icon="mdi:tune-variant" className="h-5 w-5" />
          </span>
          <Icon
            icon={isParkingFiltersOpen ? "mdi:chevron-up" : "mdi:chevron-down"}
            className="h-5 w-5 text-slate-300"
          />
        </span>
      </button>

      {activeFilterLabels.length ? (
        <div className="flex gap-2 overflow-x-auto border-t border-white/10 px-3 py-2">
          {activeFilterLabels.slice(0, 5).map((label) => (
            <span
              key={label}
              className="shrink-0 rounded-full bg-blue-500/20 px-2 py-1 text-xs font-bold text-blue-100"
            >
              {label}
            </span>
          ))}
          {activeFilterLabels.length > 5 ? (
            <span className="shrink-0 rounded-full bg-white/10 px-2 py-1 text-xs font-bold text-slate-300">
              +{activeFilterLabels.length - 5}
            </span>
          ) : null}
        </div>
      ) : null}

      {isParkingFiltersOpen ? (
        <div className="max-h-[340px] space-y-3 overflow-y-auto border-t border-white/10 p-3">
          {activeFilterCount ? (
            <button
              type="button"
              onClick={clearRouteParkingFilters}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-white/10"
            >
              <Icon icon="mdi:filter-remove-outline" className="h-4 w-4" />
              Скинути фільтри
            </button>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            <label className="flex min-w-0 flex-col gap-1 text-xs font-bold uppercase text-blue-200">
              Пошук
              <input
                type="text"
                name="search"
                value={routeParkingFilters.search || ""}
                onChange={handleRouteParkingFilterChange}
                className={routeFilterInputClass}
              />
            </label>
            <label className="flex min-w-0 flex-col gap-1 text-xs font-bold uppercase text-blue-200">
              Оператор
              <input
                type="text"
                name="operator"
                value={routeParkingFilters.operator || ""}
                onChange={handleRouteParkingFilterChange}
                className={routeFilterInputClass}
              />
            </label>
            {renderRouteNumberInput("minCapacity", "Мін. місць")}
            {renderRouteNumberInput("maxHeightMeters", "Макс. висота, м", "0.1")}
          </div>

          {parkingFilterGroups.map(renderRouteFilterGroup)}
        </div>
      ) : null}
    </div>
  );

  const renderSuggestions = (field) => {
    if (focusedField !== field) return null;

    const popularRouteMatches =
      field === "finish"
        ? popularRoutes.filter((route) =>
            !queries.finish.trim() ||
            String(route.finish_name || "Збережений пункт")
              .toLowerCase()
              .includes(queries.finish.trim().toLowerCase())
          )
        : [];

    return (
      <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-[320px] overflow-y-auto rounded-lg border border-white/10 bg-[#061f45] shadow-2xl">
        <button
          type="button"
          className="flex w-full items-center gap-3 px-3 py-3 text-left text-sm text-white hover:bg-white/10"
          onMouseDown={(event) => {
            event.preventDefault();
            selectCurrentLocation(field);
          }}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500/20 text-blue-200">
            <Icon icon="mdi:crosshairs-gps" className="h-5 w-5" />
          </span>
          <span className="font-semibold">Поточне місцезнаходження</span>
        </button>

        <button
          type="button"
          className="flex w-full items-center gap-3 border-t border-white/10 px-3 py-3 text-left text-sm text-white hover:bg-white/10"
          onMouseDown={(event) => {
            event.preventDefault();
            startMapPick(field);
          }}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-400/20 text-amber-100">
            <Icon icon="mdi:map-marker-plus" className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="block font-semibold">Обрати на карті</span>
            <span className="block truncate text-xs text-slate-300">
              Клікніть на будь-яку точку карти
            </span>
          </span>
        </button>

        {popularRouteMatches.length ? (
          <div className="border-t border-white/10">
            <div className="px-3 pb-1 pt-3 text-xs font-bold uppercase text-blue-200">
              Популярні маршрути
            </div>
            {popularRouteMatches.map((route) => (
              <button
                key={`${route.startPoint.join(",")}-${route.finishPoint.join(",")}-${route.finish_name}`}
                type="button"
                className="flex w-full gap-3 px-3 py-3 text-left hover:bg-white/10"
                onMouseDown={(event) => {
                  event.preventDefault();
                  selectPopularRoute(route);
                }}
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-500/20 text-blue-100">
                  <Icon icon="mdi:history" className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-white">
                    {route.finish_name || "Збережений пункт"}
                  </span>
                  <span className="block truncate text-xs text-slate-300">
                    {route.count} {pluralTimes(route.count)} · {formatCoordinateLabel(route.finishPoint)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        ) : null}

        {loadingSuggestions[field] ? (
          <div className="px-3 py-3 text-sm text-slate-300">Пошук...</div>
        ) : null}

        {suggestions[field].map((suggestion) => (
          <button
            key={suggestion.mapbox_id}
            type="button"
            className="flex w-full gap-3 border-t border-white/10 px-3 py-3 text-left hover:bg-white/10"
            onMouseDown={(event) => {
              event.preventDefault();
              selectSuggestion(field, suggestion);
            }}
          >
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/10 text-blue-200">
              <Icon icon="mdi:map-marker" className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold text-white">
                {suggestionTitle(suggestion)}
              </span>
              <span className="block truncate text-xs text-slate-300">
                {suggestionSubtitle(suggestion)}
              </span>
            </span>
          </button>
        ))}

        {!loadingSuggestions[field] &&
        suggestions[field].length === 0 &&
        queries[field].trim().length > 1 ? (
          <div className="border-t border-white/10 px-3 py-3 text-sm text-slate-300">
            Нічого не знайдено. Спробуйте точнішу адресу.
          </div>
        ) : null}
      </div>
    );
  };

  const renderField = (field) => {
    const config = fieldConfig[field];
    return (
      <div className="relative">
        <label className="mb-1 block text-xs font-bold uppercase text-blue-200">
          {config.label}
        </label>
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white px-3 py-2 text-slate-950 shadow-sm focus-within:border-blue-400">
          <Icon icon={config.icon} className="h-5 w-5 shrink-0 text-blue-800" />
          <input
            type="text"
            value={queries[field]}
            placeholder={config.placeholder}
            onFocus={() => setFocusedField(field)}
            onChange={(event) => {
              setFocusedField(field);
              setFieldValue(field, event.target.value);
            }}
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400"
          />
          {queries[field] ? (
            <button
              type="button"
              onClick={() => setFieldValue(field, "")}
              className="flex h-6 w-6 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label={`Очистити ${config.label.toLowerCase()}`}
            >
              <Icon icon="mdi:close" className="h-4 w-4" />
            </button>
          ) : null}
          {points[field] ? (
            <Icon icon="mdi:check-circle" className="h-5 w-5 text-emerald-500" />
          ) : null}
        </div>
        {renderSuggestions(field)}
      </div>
    );
  };

  const hasContent = queries.start || queries.finish || route;

  return (
    <div
      ref={containerRef}
      className="flex max-h-[calc(100vh-2.5rem)] w-[400px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-lg border border-blue-300/20 bg-[#031A3A]/95 text-white shadow-2xl backdrop-blur"
    >
      {/* Header */}
      <div className="border-b border-white/10 px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold uppercase text-blue-200">Навігація</div>
            <h2 className="text-xl font-bold leading-tight">Планувальник маршрутів</h2>
          </div>
          <div className="flex items-center gap-1">
            {hasContent ? (
              <button
                type="button"
                onClick={clearRoute}
                className="flex h-9 w-9 items-center justify-center rounded-md bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white"
                aria-label="Очистити маршрут"
                title="Очистити маршрут"
              >
                <Icon icon="mdi:delete-outline" className="h-5 w-5" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => dispatch(setRoutePlannerVisible(false))}
              className="flex h-9 w-9 items-center justify-center rounded-md bg-white/10 text-white hover:bg-white/20"
              aria-label="Закрити планувальник"
              title="Закрити"
            >
              <Icon icon="mdi:close" className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Map pick banner */}
      {pickMode ? (
        <div className="border-b border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-50">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 font-semibold">
              <Icon icon="mdi:map-marker-plus" className="h-5 w-5" />
              Клікніть на карту — {fieldConfig[pickMode].label.toLowerCase()}
            </span>
            <button
              type="button"
              onClick={clearMapPicker}
              className="rounded-md bg-white/10 px-2 py-1 text-xs font-bold hover:bg-white/20"
            >
              Скасувати
            </button>
          </div>
        </div>
      ) : null}

      {/* Body */}
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {renderField("start")}

        <div className="flex justify-center">
          <button
            type="button"
            onClick={swapPoints}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/10 text-blue-100 hover:bg-white/20"
            aria-label="Поміняти початок та призначення"
          >
            <Icon icon="mdi:swap-vertical" className="h-5 w-5" />
          </button>
        </div>

        {renderField("finish")}

        <div className="grid grid-cols-3 gap-2 rounded-lg bg-white/5 p-1">
          {travelModes.map((mode) => (
            <button
              key={mode.id}
              type="button"
              title={mode.description}
              onClick={() => {
                setTravelMode(mode.id);
                setRoute(null);
                setParkingRecommendations([]);
              }}
              className={`flex items-center justify-center gap-2 rounded-md px-2 py-2 text-sm font-bold transition-colors ${
                travelMode === mode.id
                  ? "bg-blue-500 text-white"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon icon={mode.icon} className="h-5 w-5" />
              {mode.label}
            </button>
          ))}
        </div>

        {renderRouteParkingFilters()}

        <button
          type="button"
          disabled={!points.start || !points.finish || isBuildingRoute}
          onClick={buildRoute}
          className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-bold transition-colors ${
            points.start && points.finish && !isBuildingRoute
              ? "bg-blue-500 text-white hover:bg-blue-400"
              : "bg-slate-600 text-slate-300"
          }`}
        >
          <Icon
            icon={isBuildingRoute ? "mdi:loading" : "mdi:navigation-variant"}
            className={`h-5 w-5 ${isBuildingRoute ? "animate-spin" : ""}`}
          />
          {isBuildingRoute ? "Будую маршрут..." : "Побудувати маршрут"}
        </button>

        {routeError ? (
          <div className="rounded-lg border border-red-300/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
            {routeError}
          </div>
        ) : null}

        {route ? (
          <div className="overflow-hidden rounded-lg border border-white/10 bg-white/5">
            <div className="grid grid-cols-3 gap-2 border-b border-white/10 p-3">
              <div>
                <div className="text-xs text-slate-400">Час</div>
                <div className="text-sm font-bold">{formatDuration(route.duration)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Відстань</div>
                <div className="text-sm font-bold">{formatDistance(route.distance)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Тип</div>
                <div className="text-sm font-bold">
                  {travelModes.find((m) => m.id === travelMode)?.label || travelMode}
                </div>
              </div>
            </div>

            <div className="border-t border-white/10 p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="text-xs font-bold uppercase text-blue-200">
                  Паркінги поруч ({parkingRecommendations.length})
                </div>
                <div className="text-xs text-slate-400">Оцінка</div>
              </div>

              {parkingRecommendations.length > 0 ? (
                <div className="space-y-2">
                  {parkingRecommendations.map((recommendation, index) => {
                    const prediction = recommendation.occupancyPrediction;
                    const tone = availabilityTone(prediction);
                    return (
                      <button
                        key={`${recommendation.parking.properties?.osmId || recommendation.parking.name}-${index}`}
                        type="button"
                        onClick={() =>
                          onParkingRecommendationSelect?.(recommendation, {
                            startPoint: points.start,
                            finishPoint: points.finish,
                          })
                        }
                        className={`w-full rounded-lg border ${tone.border} bg-white/5 px-3 py-3 text-left hover:bg-white/10`}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${tone.badge} text-sm font-black`}
                          >
                            {index + 1}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-start justify-between gap-2">
                              <span className="min-w-0 truncate text-sm font-bold text-white">
                                {recommendation.parking.name || "Паркінг"}
                              </span>
                              <span className="shrink-0 text-sm font-black text-amber-200">
                                {formatScore(recommendation.score)}
                              </span>
                            </span>
                            <span className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-300">
                              <span>Авто: {formatDuration(recommendation.metrics.driveDuration)}</span>
                              <span>Пішки: {formatDuration(recommendation.metrics.walkDuration)}</span>
                              <span>Вартість: {recommendation.metrics.costLabel}</span>
                              <span className={tone.text}>
                                Вільно:{" "}
                                {prediction ? formatScore(prediction.probability) : "Невідомо"}
                              </span>
                            </span>
                            {prediction?.explanation ? (
                              <span className="mt-2 block line-clamp-2 text-xs text-slate-400">
                                {prediction.explanation}
                              </span>
                            ) : null}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-sm text-slate-300">
                  Поблизу немає кандидатів для паркування на цьому маршруті.
                </div>
              )}
            </div>

            {isSaving ? (
              <div className="border-t border-white/10 px-3 py-2 text-xs text-slate-400">
                Зберігаю маршрут...
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default SearchInput;
