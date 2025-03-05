package utils

import (
	"log"
	"os"
)

// Initialize Logger
var (
	Info  = log.New(os.Stdout, "INFO: ", log.Ldate|log.Ltime|log.Lshortfile)
	Error = log.New(os.Stderr, "ERROR: ", log.Ldate|log.Ltime|log.Lshortfile)
)
