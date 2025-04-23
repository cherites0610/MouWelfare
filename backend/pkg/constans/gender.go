package constants

const (
	NotSetting    = 0 // 未設置
	GenderMale    = 1
	GenderFemale  = 2
	GenderUnknown = 3 // 未知
)

// GenderToString 將性別常量轉為字串
func GenderToString(gender uint) string {
	switch gender {
	case NotSetting:
		return "未設置"
	case GenderMale:
		return "男"
	case GenderFemale:
		return "女"
	default:
		return "未知"
	}
}
