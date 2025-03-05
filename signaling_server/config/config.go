package config

import "os"

func GetPort() string {
	port := os.Getenv("PORT")

	if port == "" {
		port = "5001"
	}

	return port
}
