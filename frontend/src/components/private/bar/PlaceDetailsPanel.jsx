import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import mapboxgl from "mapbox-gl";
import { MAPBOX_ACCESS_TOKEN } from "../../../config/env.js";
import { getParkingOccupancyPrediction } from "../lib/Requests.ts";

const formatValue = (value, fallback = "Unknown") => {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return value;
};

const formatDate = (value) => {
  if (!value) return "Unknown";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const getParkingProps = (place) => place?.properties || {};

const getEvProps = (place) => place?.properties || {};

const getParkingMedia = (place) => {
  const media = getParkingProps(place).media || [];
  return media.filter((item) => item.type === "image" && item.url && item.source !== "placeholder");
};

const getEvMedia = (place) => {
  const media = getEvProps(place).mediaItems || [];
  return media.filter((item) => item.url || item.thumbnailUrl);
};

const Section = ({ title, children }) => (
  <section className="border-t border-white/10 px-5 py-5">
    <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-blue-200">
      {title}
    </h3>
    <div className="space-y-3">{children}</div>
  </section>
);

const DetailRow = ({ icon, label, value }) => {
  if (value === undefined || value === null || value === "") return null;

  return (
    <div className="flex items-start gap-3 text-sm">
      <Icon icon={icon} className="mt-0.5 h-5 w-5 shrink-0 text-blue-300" />
      <div className="min-w-0">
        <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
        <div className="break-words text-slate-100">{formatValue(value)}</div>
      </div>
    </div>
  );
};

const Badge = ({ children, tone = "blue" }) => {
  const tones = {
    blue: "border-blue-300/30 bg-blue-400/15 text-blue-100",
    green: "border-emerald-300/30 bg-emerald-400/15 text-emerald-100",
    amber: "border-amber-300/30 bg-amber-400/15 text-amber-100",
    slate: "border-slate-300/20 bg-white/10 text-slate-100",
  };

  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
};

const predictionTone = (prediction) =>
  ({
    green: {
      badge: "green",
      ring: "border-emerald-300/30 bg-emerald-400/10",
      bar: "bg-emerald-400",
      text: "text-emerald-100",
    },
    yellow: {
      badge: "amber",
      ring: "border-amber-300/30 bg-amber-400/10",
      bar: "bg-amber-400",
      text: "text-amber-100",
    },
    red: {
      badge: "amber",
      ring: "border-red-300/30 bg-red-400/10",
      bar: "bg-red-400",
      text: "text-red-100",
    },
  }[prediction?.color] || {
    badge: "slate",
    ring: "border-white/10 bg-white/5",
    bar: "bg-slate-400",
    text: "text-slate-100",
  });

const Stat = ({ label, value }) => (
  <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
    <div className="text-xs text-slate-400">{label}</div>
    <div className="mt-1 text-sm font-bold text-white">{formatValue(value)}</div>
  </div>
);

const AvailabilityForecast = ({ prediction, isLoading }) => {
  if (isLoading && !prediction) {
    return (
      <Section title="Availability Forecast">
        <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
          Calculating traffic-based availability...
        </div>
      </Section>
    );
  }

  if (!prediction) return null;

  const tone = predictionTone(prediction);
  const percent = Math.round((prediction.probability || 0) * 100);

  return (
    <Section title="Availability Forecast">
      <div className={`rounded-lg border p-3 ${tone.ring}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className={`text-lg font-black ${tone.text}`}>{percent}% free chance</div>
            <div className="mt-1 text-sm text-slate-300">{prediction.label}</div>
          </div>
          <Badge tone={tone.badge}>C-index {prediction.congestionIndex}</Badge>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full ${tone.bar}`}
            style={{ width: `${Math.max(4, percent)}%` }}
          />
        </div>
        <p className="mt-3 text-sm leading-relaxed text-slate-200">
          {prediction.explanation}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-300">
          <span>Zone: {prediction.zoneType}</span>
          <span>Time: {prediction.timeSegment}</span>
          <span>Country: {prediction.countryCode || "Unknown"}</span>
          <span>Confidence: {prediction.confidence}</span>
        </div>
      </div>
    </Section>
  );
};

const ExternalLink = ({ href, children }) => {
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-md bg-blue-500 px-3 py-2 text-sm font-bold text-white hover:bg-blue-400"
    >
      {children}
      <Icon icon="mdi:open-in-new" className="h-4 w-4" />
    </a>
  );
};

const isPolygonGeometry = (geometry) =>
  geometry?.type === "Polygon" || geometry?.type === "MultiPolygon";

const getParkingGeometry = (place) => {
  if (isPolygonGeometry(place?.geometry)) return place.geometry;
  if (isPolygonGeometry(getParkingProps(place).geometry)) return getParkingProps(place).geometry;
  return null;
};

const flattenGeometryCoordinates = (geometry) => {
  if (geometry?.type === "Polygon") return geometry.coordinates.flat(1);
  if (geometry?.type === "MultiPolygon") return geometry.coordinates.flat(2);
  return [];
};

const getGeometryBounds = (geometry, fallbackCenter) => {
  const coordinates = flattenGeometryCoordinates(geometry)
    .filter(([lng, lat]) => Number.isFinite(Number(lng)) && Number.isFinite(Number(lat)));

  if (coordinates.length) {
    return coordinates.reduce(
      (bounds, coordinate) => bounds.extend(coordinate),
      new mapboxgl.LngLatBounds(coordinates[0], coordinates[0])
    );
  }

  if (!fallbackCenter) return null;

  return new mapboxgl.LngLatBounds(fallbackCenter, fallbackCenter);
};

const ParkingSatellitePreview = ({ place }) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const geometry = getParkingGeometry(place);
  const geometryKey = useMemo(() => JSON.stringify(geometry || null), [geometry]);
  const center = Number.isFinite(Number(place?.lon)) && Number.isFinite(Number(place?.lat))
    ? [Number(place.lon), Number(place.lat)]
    : null;

  useEffect(() => {
    if (!containerRef.current || !MAPBOX_ACCESS_TOKEN || !center) return undefined;

    const parsedGeometry = geometryKey ? JSON.parse(geometryKey) : null;
    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

    const satelliteMap = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/satellite-streets-v12",
      center,
      zoom: parsedGeometry ? 19 : 18,
      minZoom: 15,
      maxZoom: 20,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      cooperativeGestures: true,
    });

    mapRef.current = satelliteMap;
    satelliteMap.scrollZoom.disable();
    satelliteMap.touchZoomRotate.disableRotation();
    satelliteMap.addControl(
      new mapboxgl.AttributionControl({ compact: true }),
      "bottom-right"
    );

    satelliteMap.once("load", () => {
      if (parsedGeometry) {
        satelliteMap.addSource("parking-footprint", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: parsedGeometry,
          },
        });

        satelliteMap.addLayer({
          id: "parking-footprint-fill",
          type: "fill",
          source: "parking-footprint",
          paint: {
            "fill-color": "#3b82f6",
            "fill-opacity": 0.28,
          },
        });

        satelliteMap.addLayer({
          id: "parking-footprint-line",
          type: "line",
          source: "parking-footprint",
          paint: {
            "line-color": "#fbbf24",
            "line-width": 3,
            "line-opacity": 0.95,
          },
        });
      }

      const bounds = getGeometryBounds(parsedGeometry, center);
      if (bounds) {
        satelliteMap.fitBounds(bounds, {
          padding: 32,
          maxZoom: parsedGeometry ? 20 : 18,
          duration: 0,
        });
      }
    });

    return () => {
      mapRef.current = null;
      satelliteMap.remove();
    };
  }, [center?.[0], center?.[1], geometryKey]);

  if (!MAPBOX_ACCESS_TOKEN) {
    return (
      <div className="flex h-56 items-center justify-center bg-slate-950 px-5 text-center text-sm text-slate-300">
        Satellite preview requires Mapbox token.
      </div>
    );
  }

  if (!center) {
    return (
      <div className="flex h-56 items-center justify-center bg-slate-950 px-5 text-center text-sm text-slate-300">
        Coordinates are missing for this parking.
      </div>
    );
  }

  return (
    <div className="relative h-60 overflow-hidden border-b border-white/10 bg-slate-950">
      <div ref={containerRef} className="h-full w-full" />
      <div className="pointer-events-none absolute left-4 top-4 rounded-md border border-white/15 bg-[#031A3A]/90 px-3 py-2 shadow-xl backdrop-blur">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-blue-100">
          <Icon icon="mdi:satellite-variant" className="h-4 w-4" />
          Satellite footprint
        </div>
        <div className="mt-1 text-xs text-slate-300">
          {geometry ? "OSM polygon overlay · z19-z20" : "OSM polygon unavailable"}
        </div>
      </div>
      {geometry ? (
        <div className="pointer-events-none absolute bottom-4 left-4 flex items-center gap-2 rounded-full border border-amber-200/40 bg-black/45 px-3 py-1.5 text-xs font-bold text-amber-100 backdrop-blur">
          <span className="h-2.5 w-2.5 rounded-sm border border-amber-200 bg-blue-500/50" />
          Exact parking boundary
        </div>
      ) : null}
    </div>
  );
};

const ConnectorList = ({ connections = [] }) => {
  if (!connections.length) {
    return <div className="text-sm text-slate-400">No connector details available.</div>;
  }

  return (
    <div className="space-y-2">
      {connections.map((connection, index) => (
        <div key={`${connection.id || index}`} className="rounded-lg border border-white/10 bg-white/5 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="font-semibold text-white">
              {connection.connectionType || "Connector"}
            </div>
            {connection.powerKw ? (
              <Badge tone="green">{connection.powerKw} kW</Badge>
            ) : null}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-300">
            <span>{formatValue(connection.currentType, "Current unknown")}</span>
            <span>{formatValue(connection.level, "Level unknown")}</span>
            <span>{connection.quantity ? `${connection.quantity} point(s)` : "Quantity unknown"}</span>
            <span>{connection.voltage ? `${connection.voltage} V` : "Voltage unknown"}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

const ParkingDetails = ({ place }) => {
  const properties = getParkingProps(place);
  const tags = properties.tags || {};
  const media = getParkingMedia(place);
  const initialPrediction = place.occupancyPrediction || properties.occupancyPrediction || null;
  const [occupancyPrediction, setOccupancyPrediction] = useState(initialPrediction);
  const [isPredictionLoading, setIsPredictionLoading] = useState(false);
  const paymentMethods = properties.paymentMethods || {};
  const paymentLabels = [
    paymentMethods.cash || paymentMethods.coins ? "Cash" : null,
    paymentMethods.credit_cards || paymentMethods.debit_cards ? "Card" : null,
    paymentMethods.contactless ? "Contactless" : null,
    paymentMethods.app ? "App" : null,
  ].filter(Boolean);
  const prediction = occupancyPrediction || initialPrediction;
  const predictionBadgeTone = predictionTone(prediction);

  useEffect(() => {
    setOccupancyPrediction(initialPrediction);

    if (initialPrediction || !place?.lat || !place?.lon) return undefined;

    let isCancelled = false;
    setIsPredictionLoading(true);

    getParkingOccupancyPrediction({ parking: place })
      .then((result) => {
        if (!isCancelled) {
          setOccupancyPrediction(result.prediction || null);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setOccupancyPrediction(null);
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsPredictionLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [initialPrediction, place]);

  return (
    <>
      <ParkingSatellitePreview place={place} />

      <div className="space-y-3 px-5 pb-5 pt-5">
        <div className="flex flex-wrap gap-2">
          <Badge tone={properties.isFree ? "green" : properties.isPaid ? "amber" : "slate"}>
            {properties.isFree ? "Free" : properties.isPaid ? "Paid" : "Fee unknown"}
          </Badge>
          <Badge tone={properties.isPublic ? "green" : "amber"}>
            {properties.access || "public"}
          </Badge>
          {properties.twentyFourHour ? <Badge tone="green">24/7</Badge> : null}
          {prediction ? (
            <Badge tone={predictionBadgeTone.badge}>{prediction.label}</Badge>
          ) : null}
        </div>

        <h2 className="text-2xl font-bold leading-tight text-white">
          {place.name || "Parking"}
        </h2>
        {place.address ? <p className="text-sm text-slate-300">{place.address}</p> : null}

        <div className="grid grid-cols-3 gap-2">
          <Stat label="Type" value={properties.parkingType || properties.amenity} />
          <Stat label="Capacity" value={properties.capacity} />
          <Stat label="Free chance" value={prediction ? `${Math.round(prediction.probability * 100)}%` : isPredictionLoading ? "Calculating" : "Unknown"} />
        </div>
      </div>

      <AvailabilityForecast prediction={prediction} isLoading={isPredictionLoading} />

      <Section title="Parking Info">
        <DetailRow icon="mdi:parking" label="Parking type" value={properties.parkingType} />
        <DetailRow icon="mdi:account-lock" label="Access" value={properties.access || "public"} />
        <DetailRow icon="mdi:cash" label="Fee" value={properties.fee || properties.charge} />
        <DetailRow icon="mdi:clock-outline" label="Opening hours" value={properties.openingHours} />
        <DetailRow icon="mdi:car-multiple" label="Capacity" value={properties.capacity} />
        <DetailRow icon="mdi:wheelchair-accessibility" label="Disabled spaces" value={properties.disabledCapacity} />
      </Section>

      <Section title="Limits And Facilities">
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Max height" value={properties.maxHeight ? `${properties.maxHeight} m` : null} />
          <Stat label="Max stay" value={properties.maxStay} />
          <Stat label="Covered" value={properties.covered} />
          <Stat label="Lit" value={properties.lit} />
          <Stat label="Supervised" value={properties.supervised} />
          <Stat label="Surveillance" value={properties.surveillance} />
        </div>
      </Section>

      <Section title="Payment">
        {paymentLabels.length ? (
          <div className="flex flex-wrap gap-2">
            {paymentLabels.map((label) => (
              <Badge key={label}>{label}</Badge>
            ))}
          </div>
        ) : (
          <div className="text-sm text-slate-400">No payment method data in OpenStreetMap.</div>
        )}
      </Section>

      <Section title="Contact And Source">
        <DetailRow icon="mdi:domain" label="Operator" value={properties.operator} />
        <DetailRow icon="mdi:phone" label="Phone" value={properties.phone} />
        <DetailRow icon="mdi:email" label="Email" value={properties.email} />
        <DetailRow icon="mdi:map-marker" label="Coordinates" value={`${place.lat}, ${place.lon}`} />
        <div className="flex flex-wrap gap-2">
          <ExternalLink href={properties.website}>Website</ExternalLink>
          <ExternalLink href={`https://www.openstreetmap.org/${properties.osmType}/${properties.osmId}`}>
            OpenStreetMap
          </ExternalLink>
        </div>
      </Section>

      <Section title="Photos And Community">
        {media.length ? (
          <div className="grid grid-cols-2 gap-2">
            {media.slice(0, 4).map((item) => (
              <a key={item.url} href={item.url} target="_blank" rel="noreferrer">
                <img
                  src={item.url}
                  alt={item.label || "Parking media"}
                  className="h-24 w-full rounded-lg object-cover"
                />
              </a>
            ))}
          </div>
        ) : (
          <div className="text-sm text-slate-400">
            OSM usually does not provide Google-style photos, reviews or ratings. The satellite footprint above gives the more reliable top-down parking view.
          </div>
        )}
      </Section>

      <Section title="Advanced OSM Tags">
        <details className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-slate-300">
          <summary className="cursor-pointer font-semibold text-slate-100">Show raw tags</summary>
          <dl className="mt-3 space-y-2">
            {Object.entries(tags).map(([key, value]) => (
              <div key={key} className="grid grid-cols-[110px_1fr] gap-3">
                <dt className="truncate text-slate-400">{key}</dt>
                <dd className="break-words">{String(value)}</dd>
              </div>
            ))}
          </dl>
        </details>
      </Section>
    </>
  );
};

const EvDetails = ({ place }) => {
  const properties = getEvProps(place);
  const media = getEvMedia(place);
  const heroImage = media[0]?.thumbnailUrl || media[0]?.url;

  return (
    <>
      {heroImage ? (
        <img
          src={heroImage}
          alt={place.name || "EV charger"}
          className="h-48 w-full object-cover"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : null}

      <div className="space-y-3 px-5 pb-5 pt-5">
        <div className="flex flex-wrap gap-2">
          <Badge tone={properties.isOperational ? "green" : "amber"}>
            {properties.status || "Status unknown"}
          </Badge>
          {properties.recentlyVerified ? <Badge tone="green">Recently verified</Badge> : null}
          {properties.averageRating ? <Badge tone="amber">{properties.averageRating}/5</Badge> : null}
        </div>

        <h2 className="text-2xl font-bold leading-tight text-white">
          {place.name || "EV charger"}
        </h2>
        {place.address ? <p className="text-sm text-slate-300">{place.address}</p> : null}

        <div className="grid grid-cols-3 gap-2">
          <Stat label="Power" value={properties.maxPowerKw ? `${properties.maxPowerKw} kW` : null} />
          <Stat label="Points" value={properties.numberOfPoints || properties.totalConnectorQuantity} />
          <Stat label="Rating" value={properties.averageRating ? `${properties.averageRating}/5` : null} />
        </div>
      </div>

      <Section title="Charging Info">
        <DetailRow icon="mdi:domain" label="Operator" value={properties.operator} />
        <DetailRow icon="mdi:account-key" label="Usage" value={properties.usageType} />
        <DetailRow icon="mdi:cash" label="Usage cost" value={properties.usageCost} />
        <DetailRow icon="mdi:calendar-check" label="Last verified" value={formatDate(properties.dateLastVerified)} />
        <DetailRow icon="mdi:map-marker" label="Coordinates" value={`${place.position?.latitude}, ${place.position?.longitude}`} />
      </Section>

      <Section title="Connectors">
        <ConnectorList connections={properties.connections || []} />
      </Section>

      <Section title="Community">
        {properties.generalComments ? (
          <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-slate-200">
            {properties.generalComments}
          </div>
        ) : null}
        {(properties.userComments || []).length ? (
          <div className="space-y-2">
            {properties.userComments.slice(0, 3).map((comment, index) => (
              <div key={comment.id || index} className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="flex items-center justify-between gap-3 text-xs text-slate-400">
                  <span>{comment.userName || "OCM user"}</span>
                  {comment.rating ? <span>{comment.rating}/5</span> : null}
                </div>
                {comment.text ? <p className="mt-2 text-sm text-slate-100">{comment.text}</p> : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-slate-400">No community comments for this charger yet.</div>
        )}
      </Section>

      <Section title="Photos And Check-ins">
        {media.length ? (
          <div className="grid grid-cols-2 gap-2">
            {media.slice(0, 4).map((item) => (
              <a key={item.url} href={item.url} target="_blank" rel="noreferrer">
                <img
                  src={item.thumbnailUrl || item.url}
                  alt={item.title || "Charger media"}
                  className="h-24 w-full rounded-lg object-cover"
                />
              </a>
            ))}
          </div>
        ) : (
          <div className="text-sm text-slate-400">No photos in Open Charge Map for this charger.</div>
        )}
        {(properties.userCheckins || []).length ? (
          <div className="space-y-2 pt-2">
            {properties.userCheckins.slice(0, 3).map((checkin, index) => (
              <div key={checkin.id || index} className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-slate-200">
                <div className="font-semibold">{checkin.status || "Check-in"}</div>
                {checkin.comment ? <div className="mt-1 text-slate-300">{checkin.comment}</div> : null}
              </div>
            ))}
          </div>
        ) : null}
      </Section>

      <Section title="Source">
        <ExternalLink href={`https://openchargemap.org/site/poi/details/${properties.id}`}>
          Open Charge Map
        </ExternalLink>
      </Section>
    </>
  );
};

function PlaceDetailsPanel({ selection, onClose }) {
  if (!selection?.place) return null;

  const isParking = selection.type === "parking";
  const icon = isParking ? "mdi:parking" : "mdi:ev-station";

  return (
    <aside className="absolute left-0 top-0 z-30 flex h-full w-[430px] max-w-[calc(100vw-1rem)] flex-col overflow-hidden bg-[#031A3A] text-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20 text-blue-200">
            <Icon icon={icon} className="h-6 w-6" />
          </div>
          <div>
            <div className="text-sm font-bold uppercase tracking-[0.16em] text-blue-200">
              {isParking ? "Parking details" : "EV charger details"}
            </div>
            <div className="text-xs text-slate-400">
              {isParking ? "OpenStreetMap data" : "Open Charge Map data"}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20"
          aria-label="Close details"
        >
          <Icon icon="mdi:close" className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isParking ? <ParkingDetails place={selection.place} /> : <EvDetails place={selection.place} />}
      </div>
    </aside>
  );
}

export default PlaceDetailsPanel;
