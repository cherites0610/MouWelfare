package util

import (
	"fmt"
	"net/smtp"
)

func SendEmail(email, subject, body string) {
	smtpHost := "live.smtp.mailtrap.io"
	smtpPort := "587"
	from := "hello@demomailtrap.co"                // 替換為你的發件人郵箱
	password := "0a12b441800b869f781e9feff7176e60" // 你的 Mailtrap 密碼
	to := []string{email}                          // 替換為收件人郵箱

	// 邮件内容
	msg := []byte("To: " + to[0] + "\r\n" +
		"Subject: " + subject + "\r\n" +
		"\r\n" +
		body + "\r\n")

	// 认证
	auth := smtp.PlainAuth("", "api", password, smtpHost)

	// 发送邮件
	err := smtp.SendMail(smtpHost+":"+smtpPort, auth, from, to, msg)
	if err != nil {
		fmt.Println("Error sending email:", err)
		return
	}
	fmt.Println("Email sent successfully!")
}
