package constants

const (
	創建者 = 1
	管理者 = 2
	成員  = 3
)

var roleMap = map[uint]string{
	創建者: "創建者",
	管理者: "管理者",
	成員:  "成員",
}

func RoleToString(role uint) string {
	if str, exists := roleMap[role]; exists {
		return str
	}
	return "未知角色"
}
