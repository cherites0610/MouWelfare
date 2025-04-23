package dto

type DTO struct {
	StatusCode int         `json:"status_code"`
	Message    string      `json:"message"`
	Data       interface{} `json:"data"`
}

type StatusCode uint

const (
	Success      StatusCode = iota + 200
	BadRequest   StatusCode = 400
	Unauthorized StatusCode = 401
)
