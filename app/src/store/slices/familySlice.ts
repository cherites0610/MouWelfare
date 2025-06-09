import { fetchApi } from "@/src/api/userApi";
import { User, UserState } from "@/src/type/user";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncThunk, createSlice, GetState, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "..";
import { Family, FamilyState } from "@/src/type/family";
import { createFamilyApi, fetchFmailyApi, fetchUserFamilyApi } from "@/src/api/familyApi";

const initialState: FamilyState = {
    familys: [],
    status: 'idle',
    error: null,
}

const familySlice = createSlice({
    name: 'family',
    initialState,
    reducers: {

    },
    extraReducers: (builder) => {
        // 處理 fetchUser
        builder
            .addCase(fetchFamily.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(fetchFamily.fulfilled, (state, action: PayloadAction<Family[]>) => {
                state.status = 'succeeded';
                state.familys = action.payload;
                state.error = null;
            })
            .addCase(fetchFamily.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload || 'Unknown error';
            }) 
    },
})

export const fetchFamily = createAsyncThunk<Family[], void, { rejectValue: string, state: GetState<RootState> }>(
    'family',
    async (_, { rejectWithValue, getState }) => {
        try {
            const state = getState() as RootState;
            const authToken = state.config.authToken;
            
            if (!authToken) {
                return rejectWithValue("Don't have token")
            }
            
            const result = await fetchUserFamilyApi(authToken);
            
            const familyData = result.data as Family[];

            return familyData
        } catch (error:any) {
            return rejectWithValue(error.message);
        }
    }
)

export default familySlice.reducer;