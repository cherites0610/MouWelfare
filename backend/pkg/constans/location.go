package constants

const (
	臺北市 = 1
	新北市 = 2
	桃園市 = 3
	台中市 = 4
	台南市 = 5
	高雄市 = 6
	基隆市 = 7
	新竹市 = 8
	嘉義市 = 9
	苗栗市 = 10
	彰化市 = 11
	南投市 = 12
	雲林市 = 13
	屏東市 = 14
	宜蘭市 = 15
	花蓮市 = 16
	台東市 = 17
	澎湖市 = 18
	金門市 = 19
	連江市 = 20
	其他  = 21
	海外  = 22
)

// locationMap 將地區常量映射到字串
var locationMap = map[uint]string{
	未設定: "未設定",
	臺北市: "臺北市",
	新北市: "新北市",
	桃園市: "桃園市",
	台中市: "台中市",
	台南市: "台南市",
	高雄市: "高雄市",
	基隆市: "基隆市",
	新竹市: "新竹市",
	嘉義市: "嘉義市",
	苗栗市: "苗栗市",
	彰化市: "彰化市",
	南投市: "南投市",
	雲林市: "雲林市",
	屏東市: "屏東市",
	宜蘭市: "宜蘭市",
	花蓮市: "花蓮市",
	台東市: "台東市",
	澎湖市: "澎湖市",
	金門市: "金門市",
	連江市: "連江市",
	其他:  "其他",
	海外:  "海外",
}

// LocationToString 將地區常量轉為字串
func LocationToString(location uint) string {
	if str, exists := locationMap[location]; exists {
		return str
	}
	return "不明" // 預設值，處理未定義的輸入
}

// StringToLocation 將字串轉為地區常量
func StringToLocation(locationStr string) uint {
	for id, str := range locationMap {
		if str == locationStr {
			return id
		}
	}
	return 未設定 // 預設值，處理未定義的輸入
}
