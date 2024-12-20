import { configureStore, createSlice } from '@reduxjs/toolkit';

const parkingsSlice = createSlice({
  name: 'parkings',
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
    },
  },
});

const chargersSlice = createSlice({
  name: 'chargers',
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
    },
  },
});

// Создаем Redux store с нашими слайсами
const store = configureStore({
  reducer: {
    parkings: parkingsSlice.reducer,
    chargers: chargersSlice.reducer,
  },
});

export const { setParkingData, setIsParkingData } = parkingsSlice.actions;
export const { setEvData, setIsChargerData } = chargersSlice.actions;
export default store;
