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
		return "未設定"
	case GenderMale:
		return "男性"
	case GenderFemale:
		return "女性"
	default:
		return "未知"
	}
}

func StringToGender(genderStr string) uint {
	switch genderStr {
	case "未設定":
		return 0
	case "男性":
		return 1
	case "女性":
		return 2
	default:
		return 0
	}
}
