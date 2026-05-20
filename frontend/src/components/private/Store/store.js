import { configureStore, createSlice } from "@reduxjs/toolkit";

const filterSlice = createSlice({
  name: "filters",
  initialState: {
    isFiltersVisible: false,
    parkingFilters: {
      search: "",
      operator: "",
      free: false,
      paid: false,
      publicAccess: false,
      wheelchair: false,
      disabledSpaces: false,
      twentyFour: false,
      hasOpeningHours: false,
      garage: false,
      underground: false,
      multistorey: false,
      surface: false,
      street: false,
      streetSide: false,
      parkingSpace: false,
      covered: false,
      lit: false,
      supervised: false,
      surveillance: false,
      private: false,
      customers: false,
      permit: false,
      hasCapacity: false,
      minCapacity: "",
      hasMaxStay: false,
      hasMaxHeight: false,
      maxHeightMeters: "",
      acceptsCash: false,
      acceptsCard: false,
      acceptsContactless: false,
      acceptsApp: false,
      chargingSpaces: false,
    },
    evFilters: {
      search: "",
      operator: "",
      tesla: false,
      operational: false,
      available: false,
      planned: false,
      recentlyVerified: false,
      publicAccess: false,
      privateAccess: false,
      payAtLocation: false,
      membershipRequired: false,
      accessKeyRequired: false,
      free: false,
      paid: false,
      level1: false,
      level2: false,
      level3: false,
      ac: false,
      dc: false,
      type1: false,
      type2: false,
      ccs: false,
      chademo: false,
      teslaConnector: false,
      nacs: false,
      schuko: false,
      cee: false,
      minPowerKw: "",
      minPoints: "",
      hasComments: false,
      hasMedia: false,
      hasCheckins: false,
    },
  },
  reducers: {
    toggleFiltersVisibility: (state) => {
      state.isFiltersVisible = !state.isFiltersVisible;
    },
    setParkingFilters: (state, action) => {
      state.parkingFilters = {
        ...state.parkingFilters,
        ...action.payload,
      };
    },
    setEVfilters: (state, action) => {
      state.evFilters = {
        ...state.evFilters,
        ...action.payload,
      };
    },
  },
});

const parkingsSlice = createSlice({
  name: "parkings",
  initialState: {
    parkingData: [],
    isParkingData: false,
  },
  reducers: {
    setParkingData: (state, action) => {
      state.parkingData = action.payload;
    },
    setIsParkingData: (state, action) => {
      state.isParkingData = action.payload;
      if (!action.payload) {
        state.parkingData = [];
      }
    },
  },
});

const chargersSlice = createSlice({
  name: "chargers",
  initialState: {
    evData: [],
    isChargerData: false,
  },
  reducers: {
    setEvData: (state, action) => {
      state.evData = action.payload;
    },
    setIsChargerData: (state, action) => {
      state.isChargerData = action.payload;
      if (!action.payload) {
        state.evData = [];
      }
    },
  },
});

const profileSlice = createSlice({
  name: "profile",
  initialState: {
    isProfileVisible: false,
  },
  reducers: {
    toggleProfileVisibility: (state) => {
      state.isProfileVisible = !state.isProfileVisible;
    },
  },
});

const routesSlice = createSlice({
  name: "routes",
  initialState: {
    isRoutesVisible: false,
  },
  reducers: {
    toggleRoutesVisibility: (state) => {
      state.isRoutesVisible = !state.isRoutesVisible;
    },
  },
});

const store = configureStore({
  reducer: {
    parkings: parkingsSlice.reducer,
    chargers: chargersSlice.reducer,
    filters: filterSlice.reducer,
    profile: profileSlice.reducer,
    routes: routesSlice.reducer
  },
});

export const { setParkingData, setIsParkingData } = parkingsSlice.actions;
export const { setEvData, setIsChargerData } = chargersSlice.actions;
export const { toggleFiltersVisibility, setParkingFilters, setEVfilters } = filterSlice.actions;
export const { toggleProfileVisibility } = profileSlice.actions;
export const { toggleRoutesVisibility } = routesSlice.actions

export default store;
