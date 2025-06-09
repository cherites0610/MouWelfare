import { Filiter } from "@/src/type/filiterType";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const initialState: Filiter = {
    locations: [],
    categories: [],
    family: "",
    identities: [],
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
        resetFilters(state) {
            state.locations = [];
            state.categories = [];
            state.family = "";
            state.identities = [];
            state.searchQuery = '';
        },
    }
})

export const { setLocations, setCategories, setFamilies, setIdentities, setSearchQuery, resetFilters } =
    filiterSlice.actions;
export default filiterSlice.reducer