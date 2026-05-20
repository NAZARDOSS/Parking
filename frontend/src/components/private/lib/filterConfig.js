export const parkingFilterGroups = [
  {
    title: "Access",
    filters: [
      ["publicAccess", "Public"],
      ["private", "Private"],
      ["customers", "Customers"],
      ["permit", "Permit / residents"],
    ],
  },
  {
    title: "Price",
    filters: [
      ["free", "Free"],
      ["paid", "Paid"],
      ["acceptsCash", "Cash"],
      ["acceptsCard", "Card"],
      ["acceptsContactless", "Contactless"],
      ["acceptsApp", "App payment"],
    ],
  },
  {
    title: "Type",
    filters: [
      ["garage", "Garage"],
      ["underground", "Underground"],
      ["multistorey", "Multistorey"],
      ["surface", "Surface"],
      ["street", "Street parking"],
      ["streetSide", "Street side"],
      ["parkingSpace", "Single spaces"],
    ],
  },
  {
    title: "Facilities",
    filters: [
      ["wheelchair", "Wheelchair"],
      ["disabledSpaces", "Disabled spaces"],
      ["twentyFour", "24/7"],
      ["hasOpeningHours", "Opening hours"],
      ["covered", "Covered"],
      ["lit", "Lit"],
      ["supervised", "Supervised"],
      ["surveillance", "Surveillance"],
      ["chargingSpaces", "Charging spaces"],
    ],
  },
  {
    title: "Limits",
    filters: [
      ["hasCapacity", "Capacity known"],
      ["hasMaxStay", "Max stay known"],
      ["hasMaxHeight", "Max height known"],
    ],
  },
];

export const evFilterGroups = [
  {
    title: "Status",
    filters: [
      ["operational", "Operational"],
      ["available", "Available"],
      ["planned", "Planned"],
      ["recentlyVerified", "Recently verified"],
    ],
  },
  {
    title: "Access",
    filters: [
      ["publicAccess", "Public"],
      ["privateAccess", "Private / customers"],
      ["payAtLocation", "Pay at location"],
      ["membershipRequired", "Membership"],
      ["accessKeyRequired", "Access key"],
      ["free", "Free"],
      ["paid", "Paid"],
    ],
  },
  {
    title: "Power",
    filters: [
      ["level1", "Level 1"],
      ["level2", "Level 2"],
      ["level3", "Level 3"],
      ["ac", "AC"],
      ["dc", "DC"],
    ],
  },
  {
    title: "Connectors",
    filters: [
      ["type1", "Type 1 / J1772"],
      ["type2", "Type 2"],
      ["ccs", "CCS"],
      ["chademo", "CHAdeMO"],
      ["teslaConnector", "Tesla"],
      ["nacs", "NACS"],
      ["schuko", "Schuko"],
      ["cee", "CEE"],
    ],
  },
  {
    title: "Data",
    filters: [
      ["tesla", "Tesla network"],
      ["hasComments", "Comments"],
      ["hasMedia", "Media"],
      ["hasCheckins", "Check-ins"],
    ],
  },
];

const parkingFilterLabels = {
  search: "Search",
  operator: "Operator",
  minCapacity: "Min capacity",
  maxHeightMeters: "Vehicle height",
  ...Object.fromEntries(
    parkingFilterGroups.flatMap((group) => group.filters)
  ),
};

export const countActiveFilters = (filters = {}) =>
  Object.values(filters).filter((value) => {
    if (typeof value === "boolean") return value;
    return String(value ?? "").trim() !== "";
  }).length;

export const getActiveParkingFilterLabels = (filters = {}) =>
  Object.entries(filters)
    .filter(([, value]) => {
      if (typeof value === "boolean") return value;
      return String(value ?? "").trim() !== "";
    })
    .map(([key, value]) => {
      const label = parkingFilterLabels[key] || key;
      return typeof value === "boolean" ? label : `${label}: ${value}`;
    });
