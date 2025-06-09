import { fetchApi } from "@/src/api/userApi";
import { User, UserState } from "@/src/type/user";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncThunk, createSlice, GetState, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "..";

const initialState: UserState = {
    user: null,
    status: 'idle',
    error: null,
}

const userSlice = createSlice({
    name: 'user',
    initialState,
    reducers: {
        login: (state, action: PayloadAction<User>) => {
            state.user = action.payload;
            state.status = 'succeeded'
            state.error = null;
        },
        logout: (state) => {
            state.user = null;
            state.status = 'idle';
            state.error = null;
            AsyncStorage.removeItem("token")
        }
    },
    extraReducers: (builder) => {
        // 處理 fetchUser
        builder
            .addCase(fetchUser.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(fetchUser.fulfilled, (state, action: PayloadAction<User>) => {
                state.status = 'succeeded';
                state.user = action.payload;
                state.error = null;
            })
            .addCase(fetchUser.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload || 'Unknown error';
            })
            // 處理 updateUser
            .addCase(updateUser.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(updateUser.fulfilled, (state, action: PayloadAction<User>) => {
                state.status = 'succeeded';
                state.user = { ...state.user, ...action.payload } as User;
                state.error = null;
            })
            .addCase(updateUser.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload || 'Unknown error';
            });
    },
})

export const fetchUser = createAsyncThunk<User, void, { rejectValue: string, getState: GetState<RootState> }>(
    'user/fetchUser',
    async (_, { rejectWithValue, getState }) => {
        try {
            const state = getState() as RootState
            const { authToken } = state.config

            if (!authToken) {
                return rejectWithValue("Don't have token")
            }

            const response = await fetchApi(authToken);
            if (!response.data) {
                return rejectWithValue('Invalid API response');
            }

            return response.data
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to fetch user');
        }
    }
);

// 模擬非同步 API：更新用戶資料
export const updateUser = createAsyncThunk<User, Partial<User>, { rejectValue: string }>(
    'user/updateUser',
    async (userData, { rejectWithValue }) => {
        try {
            // 模擬 API 請求
            const response = await new Promise<{ data: User }>((resolve) =>
                setTimeout(() => resolve({ data: userData as User }), 1000)
            );
            return response.data;
        } catch (error) {
            return rejectWithValue('Failed to update user');
        }
    }
);

export const { login, logout } = userSlice.actions;
export default userSlice.reducer;