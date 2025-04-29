package constants

const (
	家庭與育兒福利     = 1
	教育福利        = 2
	健康與退休福利     = 3
	老人與退休福利     = 4
	低收入戶與弱勢族群   = 5
	殘疾與特殊需求福利   = 6
	就業與創業福利     = 7
	社會安全與基本生活支援 = 8
	兒童及少年福利     = 9
	其他特定族群福利    = 10
)

// textMapping 將福利類型常量映射到字串
var textMapping = map[uint]string{
	未設定:         "未設定",
	家庭與育兒福利:     "家庭與育兒福利",
	教育福利:        "教育福利",
	健康與退休福利:     "健康與退休福利",
	老人與退休福利:     "老人與退休福利",
	低收入戶與弱勢族群:   "低收入戶與弱勢族群",
	殘疾與特殊需求福利:   "殘疾與特殊需求福利",
	就業與創業福利:     "就業與創業福利",
	社會安全與基本生活支援: "社會安全與基本生活支援",
	兒童及少年福利:     "兒童及少年福利",
	其他特定族群福利:    "其他特定族群福利",
}

// WelfareTypeToString 將福利類型常量轉為字串
func CategoryToString(Category uint) string {
	if str, exists := textMapping[Category]; exists {
		return str
	}
	return "未設定" // 預設值，處理未定義的輸入
}

// StringToLocation 將字串轉為地區常量
func StringToCategory(categoryStr string) uint {
	for id, str := range textMapping {
		if str == categoryStr {
			return id
		}
	}
	return 不明 // 預設值，處理未定義的輸入
}
