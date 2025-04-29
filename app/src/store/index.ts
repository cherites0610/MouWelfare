import { configureStore } from "@reduxjs/toolkit";
import userReducer from "./slices/userSlice"
import configReducer from "./slices/configSlice"
import familyReducer from "./slices/familySlice"
import filiterReducer from "./slices/filiterSlice"

// 先定義 store
const store = configureStore({
    reducer: {
        user: userReducer,
        config: configReducer,
        family: familyReducer,
        filiter: filiterReducer
    },
    devTools: true,
});

// 再定義 RootState 和 AppDispatch
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;