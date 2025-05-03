export const ServiceNum = 11;
export const GenderNum = 3;
export const LocationNum = 21;
export const IdentityNum = 12;

// Service Mapping
const serviceTextMapping: { [key: number]: string } = {
    0: "未設定",
    1: "家庭與育兒福利",
    2: "教育福利",
    3: "健康與退休福利",
    4: "老人與退休福利",
    5: "低收入戶與弱勢族群",
    6: "殘疾與特殊需求福利",
    7: "就業與創業福利",
    8: "社會安全與基本生活支援",
    9: "兒童及少年福利",
    10: "其他特定族群福利",
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
    0: "未設定",
    1: "臺北市",
    2: "新北市",
    3: "桃園市",
    4: "台中市",
    5: "台南市",
    6: "高雄市",
    7: "基隆市",
    8: "新竹市",
    9: "嘉義市",
    10: "苗栗市",
    11: "彰化市",
    12: "南投市",
    13: "雲林市",
    14: "屏東市",
    15: "宜蘭市",
    16: "花蓮市",
    17: "台東市",
    18: "澎湖市",
    19: "金門市",
    20: "連江市",
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