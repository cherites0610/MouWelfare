import { configureStore } from "@reduxjs/toolkit";
import userReducer from "./slices/userSlice"
import configReducer from "./slices/configSlice"

// 先定義 store
const store = configureStore({
    reducer: {
        user: userReducer,
        config: configReducer,
    },
    devTools: process.env.NODE_ENV !== "production",
});

// 再定義 RootState 和 AppDispatch
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;