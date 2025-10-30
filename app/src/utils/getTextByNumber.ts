export const ServiceNum = 7;
export const GenderNum = 3;
export const LocationNum = 21;
export const IdentityNum = 12;

// Service Mapping
const serviceTextMapping: { [key: number]: string } = {
    0: "未設定",
    1: "兒童及青少年福利",
    2: "婦女與幼兒福利",
    3: "老人福利",
    4: "社會救助福利",
    5: "身心障礙福利",
    6: "其他福利",
};

export function getTextByService(number: number): string {
    return serviceTextMapping[number] || "其他服務";
}

export function getIdByServiceText(text: string): number | undefined {
    return Object.keys(serviceTextMapping).find(
        (key) => serviceTextMapping[Number(key)] === text
    ) as number | undefined;
}

// Gender Mapping
const genderTextMapping: { [key: number]: string } = {
    0: "未設定",
    1: "男性",
    2: "女性",
};

export function getTextByGender(number: number): string {
    return genderTextMapping[number] || "對應文字不存在";
}

export function getIdByGenderText(text: string): number | undefined {
    return Object.keys(genderTextMapping).find(
        (key) => genderTextMapping[Number(key)] === text
    ) as number | undefined;
}

// Location Mapping
const locationTextMapping: { [key: number]: string } = {
    0:"未設定",
    1:"臺北市",
    2:"新北市",
    3:"桃園市",
    4:"臺中市",
    5:"臺南市",
    6:"高雄市",
    7:"基隆市",
    8:"新竹縣",
    9:"嘉義市",
    10:"苗栗縣",
    11:"彰化縣",
    12:"南投縣",
    13:"雲林縣",
    14:"屏東縣",
    15:"宜蘭縣",
    16:"花蓮縣",
    17:"臺東縣",
    18:"澎湖縣",
    19:"金門縣",
    20:"連江縣"
};

export function getTextByLocation(number: number): string {
    return locationTextMapping[number] || "對應文字不存在";
}

export function getIdByLocationText(text: string): number | undefined {
    return Object.keys(locationTextMapping).find(
        (key) => locationTextMapping[Number(key)] === text
    ) as number | undefined;
}

// Identity Mapping
const identityTextMapping: { [key: number]: string } = {
    0: "未設定",
    1: "20歲以下",
    2: "20歲-65歲",
    3: "65歲以上",
    4: "男性",
    5: "女性",
    6: "中低收入戶",
    7: "低收入戶",
    8: "榮民",
    9: "身心障礙者",
    10: "原住民",
    11: "外籍配偶家庭",
};

export function getTextByIdentity(number: number): string {
    return identityTextMapping[number] || "對應文字不存在";
}

export function getIdByIdentityText(text: string): number | undefined {
    return Object.keys(identityTextMapping).find(
        (key) => identityTextMapping[Number(key)] === text
    ) as number | undefined;
}