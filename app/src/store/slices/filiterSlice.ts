import { Filiter } from "@/src/type/filiterType";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const initialState: Filiter = {
    locations: [],
    categories: [],
    family: "",
    identities: [],
    age: null,        // 單選，初始為 null
    gender: null,     // 單選，初始為 null
    income: [],      // 新增
    searchQuery: ""
}

const filiterSlice = createSlice({
    name: 'filiter',
    initialState,
    reducers: {
        setLocations(state, action: PayloadAction<string[]>) {
            state.locations = action.payload;
        },
        setCategories(state, action: PayloadAction<string[]>) {
            state.categories = action.payload;
        },
        setFamilies(state, action: PayloadAction<string>) {
            state.family = action.payload;
        },
        setIdentities(state, action: PayloadAction<string[]>) {
            state.identities = action.payload;
        },
        setSearchQuery(state, action: PayloadAction<string>) {
            state.searchQuery = action.payload;
        },
        setAge(state, action: PayloadAction<string | null>) {
            state.age = action.payload;
        },
        setGender(state, action: PayloadAction<string | null>) {
            state.gender = action.payload;
        },
        setIncome(state, action: PayloadAction<string[]>) {
            state.income = action.payload;
        },
        resetFilters(state) {
            state.locations = [];
            state.categories = [];
            state.family = "";
            state.identities = [];
            state.searchQuery = '';
            state.age = null;
            state.gender = null;
            state.income = [];
        },
    }
})

export const { setLocations, setCategories, setFamilies, setIdentities, setSearchQuery, resetFilters,setAge,
    setGender,
    setIncome } =
    filiterSlice.actions;
export default filiterSlice.reducer