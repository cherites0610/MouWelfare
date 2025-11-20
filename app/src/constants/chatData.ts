import { Item } from "../type/chatTypes";

export const categorySynonyms: { [key: string]: string[] } = {
  兒童: ["兒童及青少年福利"],
  小孩: ["兒童及青少年福利"],
  兒少: ["兒童及青少年福利"],
  青少年: ["兒童及青少年福利"],
  孩童: ["兒童及青少年福利"],
  少年: ["兒童及青少年福利"],
  學生: ["兒童及青少年福利"],
  學費: ["兒童及青少年福利"],
  就學: ["兒童及青少年福利"],
  獎學金: ["兒童及青少年福利"],
  扶養: ["兒童及青少年福利"],
  婦女: ["婦女與幼兒福利"],
  媽媽: ["婦女與幼兒福利"],
  母親: ["婦女與幼兒福利"],
  孕婦: ["婦女與幼兒福利"],
  懷孕: ["婦女與幼兒福利"],
  生育: ["婦女與幼兒福利"],
  生產: ["婦女與幼兒福利"],
  產後: ["婦女與幼兒福利"],
  坐月子: ["婦女與幼兒福利"],
  單親: ["婦女與幼兒福利", "社會救助福利"],
  育兒: ["婦女與幼兒福利", "兒童及青少年福利"],
  托育: ["兒童及青少年福利", "婦女與幼兒福利"],
  幼兒: ["婦女與幼兒福利", "兒童及青少年福利"],
  托嬰: ["婦女與幼兒福利", "兒童及青少年福利"],
  嬰兒: ["婦女與幼兒福利", "兒童及青少年福利"],
  老人: ["老人福利"],
  長者: ["老人福利"],
  長輩: ["老人福利"],
  銀髮族: ["老人福利"],
  阿公: ["老人福利"],
  阿嬤: ["老人福利"],
  獨居: ["老人福利", "社會救助福利"],
  退休: ["老人福利"],
  長照: ["老人福利"],
  敬老: ["老人福利"],
  安養: ["老人福利"],
  養老: ["老人福利"],
  假牙: ["老人福利"],
  救助: ["社會救助福利"],
  補助: ["社會救助福利"],
  津貼: ["社會救助福利"],
  急難: ["社會救助福利"],
  困難: ["社會救助福利"],
  失業: ["社會救助福利"],
  沒工作: ["社會救助福利"],
  租屋: ["社會救助福利"],
  房租: ["社會救助福利"],
  醫療: ["社會救助福利", "身心障礙福利"],
  醫藥費: ["社會救助福利"],
  清寒: ["社會救助福利"],
  弱勢: ["社會救助福利"],
  低收入: ["社會救助福利"],
  身心障礙: ["身心障礙福利"],
  身障: ["身心障礙福利"],
  殘障: ["身心障礙福利"],
  障友: ["身心障礙福利"],
  行動不便: ["身心障礙福利"],
  輔具: ["身心障礙福利"],
  復健: ["身心障礙福利"],
  照護: ["身心障礙福利", "老人福利"],
};

export const ewlfareItems: Item[] = [
  {
    id: 1,
    name: "兒童及青少年福利",
    image: require("@/assets/images/Mou/baby.jpeg"),
  },
  {
    id: 2,
    name: "婦女與幼兒福利",
    image: require("@/assets/images/Mou/school.jpeg"),
  },
  {
    id: 3,
    name: "老人福利",
    image: require("@/assets/images/Mou/elderly.jpeg"),
  },
  {
    id: 4,
    name: "社會救助福利",
    image: require("@/assets/images/Mou/elderly.jpeg"),
  },
  {
    id: 5,
    name: "身心障礙福利",
    image: require("@/assets/images/Mou/accessibility.jpeg"),
  },
  { id: 6, name: "其他", image: require("@/assets/images/Mou/school.jpeg") },
];

const northItems: Item[] = [
  { id: 1, name: "臺北市", image: require("@/assets/images/Mou/school.jpeg") },
  { id: 2, name: "新北市", image: require("@/assets/images/Mou/school.jpeg") },
  { id: 3, name: "基隆市", image: require("@/assets/images/Mou/school.jpeg") },
  { id: 4, name: "桃園市", image: require("@/assets/images/Mou/school.jpeg") },
  { id: 5, name: "宜蘭縣", image: require("@/assets/images/Mou/school.jpeg") },
  { id: 6, name: "新竹縣", image: require("@/assets/images/Mou/school.jpeg") },
  { id: 7, name: "新竹市", image: require("@/assets/images/Mou/school.jpeg") },
];

const midItems: Item[] = [
  { id: 8, name: "臺中市", image: require("@/assets/images/Mou/school.jpeg") },
  { id: 9, name: "苗栗縣", image: require("@/assets/images/Mou/school.jpeg") },
  { id: 10, name: "彰化縣", image: require("@/assets/images/Mou/school.jpeg") },
  { id: 11, name: "南投縣", image: require("@/assets/images/Mou/school.jpeg") },
  { id: 12, name: "雲林縣", image: require("@/assets/images/Mou/school.jpeg") },
];

const southItems: Item[] = [
  { id: 13, name: "高雄市", image: require("@/assets/images/Mou/school.jpeg") },
  { id: 14, name: "臺南市", image: require("@/assets/images/Mou/school.jpeg") },
  { id: 15, name: "嘉義市", image: require("@/assets/images/Mou/school.jpeg") },
  { id: 16, name: "嘉義縣", image: require("@/assets/images/Mou/school.jpeg") },
  { id: 17, name: "屏東縣", image: require("@/assets/images/Mou/school.jpeg") },
];

const eastItems: Item[] = [
  { id: 18, name: "花蓮縣", image: require("@/assets/images/Mou/school.jpeg") },
  { id: 19, name: "臺東縣", image: require("@/assets/images/Mou/school.jpeg") },
];

const offshoreItems: Item[] = [
  { id: 20, name: "澎湖縣", image: require("@/assets/images/Mou/school.jpeg") },
  { id: 21, name: "金門縣", image: require("@/assets/images/Mou/school.jpeg") },
  { id: 22, name: "連江縣", image: require("@/assets/images/Mou/school.jpeg") },
];

export const allLocations = [
  ...northItems,
  ...midItems,
  ...southItems,
  ...eastItems,
  ...offshoreItems,
];

export const sortedCategories = [
  ...Object.keys(categorySynonyms),
  ...ewlfareItems.map((i) => i.name),
].sort((a, b) => b.length - a.length);

export const sortedLocations = allLocations
  .map((i) => i.name)
  .sort((a, b) => b.length - a.length);
