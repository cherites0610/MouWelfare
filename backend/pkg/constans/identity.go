package constants

const (
	未設定   = 0
	低收入戶  = 1
	中低收入戶 = 2
	身心障礙  = 3
)

// identityMap 將身份常量映射到字串
var identityMap = map[uint]string{
	未設定:   "未設定",
	低收入戶:  "低收入戶",
	中低收入戶: "中低收入戶",
	身心障礙:  "身心障礙",
}

// IdentityToString 將身份常量切片轉為字串切片
func IdentityToString(identities []uint) []string {
	result := make([]string, 0, len(identities)) // 預分配容量
	for _, identity := range identities {
		if str, exists := identityMap[identity]; exists {
			result = append(result, str)
		} else {
			result = append(result, "未設定") // 預設值
		}
	}
	return result
}
