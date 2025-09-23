import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { RootState } from ".."; // Adjust path if necessary
import { Config } from "@/src/type/configType";

// --- Constants ---
const ASYNC_STORAGE_CONFIG_KEY = "appConfig";

const initialState: Config = {
    elderlyMode: false,
    autoFilterUserData: false,
    authToken: "",
    appLaunchCount: 0,
    needsNewChat: null
};

export const loadConfig = createAsyncThunk<Config, void, { rejectValue: string }>(
    "config/load",
    async (_, { rejectWithValue }) => {
        try {
            const configJson = await AsyncStorage.getItem(ASYNC_STORAGE_CONFIG_KEY);
            if (configJson !== null) {
                const loadedConfig = JSON.parse(configJson) as Partial<Config>;
                return { ...initialState, ...loadedConfig };
            } else {
                return initialState;
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to load config";
            console.error("Load Config Error:", message);
            return rejectWithValue(message);
        }
    }
);


export const writeConfig = createAsyncThunk<Config, void, { state: RootState, rejectValue: string }>(
    "config/write",
    async (_, { getState, rejectWithValue }) => {
        try {
            const state = getState();
            const configToSave = state.config;

            const configJson = JSON.stringify(configToSave);
            await AsyncStorage.setItem(ASYNC_STORAGE_CONFIG_KEY, configJson);

            return configToSave;
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to write config";
            console.error("Write Config Error:", message);
            return rejectWithValue(message);
        }
    }
);

// --- Slice Definition ---
const configSlice = createSlice({
    name: "config",
    initialState,
    reducers: {
        updateConfig: (state, action: PayloadAction<Partial<Config>>) => {
            // Immer handles immutable updates here
            Object.assign(state, action.payload);
        },
        resetNewChatSignal: (state) => {
            state.needsNewChat = null;
        },
        incrementAppLaunchCount: (state) => {
            state.appLaunchCount += 1;
        },
        setAuthToken: (state, action: PayloadAction<string>) => {
            state.authToken = action.payload;
        },
        clearAuthToken: (state) => {
            state.authToken = "";
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(loadConfig.fulfilled, (state, action: PayloadAction<Config>) => {
                return action.payload;
            })
            .addCase(loadConfig.rejected, (state, action) => {
                return state;
            })
            .addCase(writeConfig.fulfilled, (state, action: PayloadAction<Config>) => {
                return action.payload;
            })
            .addCase(writeConfig.rejected, (state, action) => {
                console.error("Write config rejected:", action.payload);
                return state; // Keep the current state
            });
    },
});

// --- Exports ---
export const {
    updateConfig,
    incrementAppLaunchCount,
    setAuthToken,
    clearAuthToken,
    resetNewChatSignal 
} = configSlice.actions;

export default configSlice.reducer;