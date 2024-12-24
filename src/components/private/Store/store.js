import { configureStore, createSlice } from "@reduxjs/toolkit";

const filterSlice = createSlice({
  name: "filters",
  initialState: {
    isFiltersVisible: false,
    parkingFilters: {
      free: false,
      wheelchair: false,
      twentyFour: false,
      garage: false,
      private: false,
    },
    evFilters: {
      tesla: false
    },
  },
  reducers: {
    toggleFiltersVisibility: (state) => {
      state.isFiltersVisible = !state.isFiltersVisible;
      console.log(state.isFiltersVisible);
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

const store = configureStore({
  reducer: {
    parkings: parkingsSlice.reducer,
    chargers: chargersSlice.reducer,
    filters: filterSlice.reducer,
  },
});

export const { setParkingData, setIsParkingData } = parkingsSlice.actions;
export const { setEvData, setIsChargerData } = chargersSlice.actions;
export const { toggleFiltersVisibility, setParkingFilters, setEVfilters } = filterSlice.actions;
export default store;
