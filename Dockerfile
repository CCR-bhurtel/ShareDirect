FROM golang:alpine

WORKDIR /app

COPY signaling_server/go.mod signaling_server/go.sum ./
RUN go mod download

COPY signaling_server/. .

RUN go build -o main .

ENV PORT=8080
EXPOSE 8080

CMD ["./main"]