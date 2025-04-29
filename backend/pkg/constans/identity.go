package constants

const (
	未設定      = 0
	_20歲以下   = 1
	_20歲_65歲 = 2
	_65歲以上   = 3
	男性       = 4
	女性       = 5
	中低收入戶    = 6
	低收入戶     = 7
	榮名       = 8
	身心障礙者    = 9
	原住民      = 10
	外籍配偶家庭   = 11
)

// demographicMapping 將人口統計常量映射到字串
var IdentitiesMapping = map[uint]string{
	未設定:      "未設定",
	_20歲以下:   "20歲以下",
	_20歲_65歲: "20歲-65歲",
	_65歲以上:   "65歲以上",
	男性:       "男性",
	女性:       "女性",
	中低收入戶:    "中低收入戶",
	低收入戶:     "低收入戶",
	榮名:       "榮民",
	身心障礙者:    "身心障礙者",
	原住民:      "原住民",
	外籍配偶家庭:   "外籍配偶家庭",
}

// DemographicToString 將人口統計常量轉為字串
func IdentityToString(identity uint) string {
	if str, exists := IdentitiesMapping[identity]; exists {
		return str
	}
	return "未設定" // 預設值，處理未定義的輸入
}

// StringToDemographic 將字串轉為人口統計常量
func StringToIdentity(identityStr string) uint {
	for id, str := range IdentitiesMapping {
		if str == identityStr {
			return id
		}
	}
	return 未設定 // 預設值，處理未定義的輸入
}
