# Etapa 1: Build do Frontend (Node.js)
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY client/package*.json ./client/
RUN cd client && npm install
COPY client/ ./client/
RUN cd client && npm run build

# Etapa 2: Build do Backend (Go)
FROM golang:1.22-alpine AS backend-builder
WORKDIR /app
# Baixar dependências Go primeiro (cache)
COPY go.mod go.sum ./
RUN go mod download
# Copiar resto do código
COPY . .
# Copiar o dist gerado no passo anterior
COPY --from=frontend-builder /app/client/dist ./client/dist
# Compilar o binário
RUN CGO_ENABLED=0 GOOS=linux go build -o wacalls ./cmd/server

# Etapa 3: Imagem Final Leve
FROM alpine:latest
WORKDIR /app
# Necessário para certificados SSL
RUN apk --no-cache add ca-certificates tzdata

COPY --from=backend-builder /app/wacalls .
COPY --from=frontend-builder /app/client/dist ./client/dist

# Criar diretórios que o app usa
RUN mkdir -p data media

EXPOSE 8080

CMD ["./wacalls", "-addr", ":8080", "-db", "data/wacalls.db"]
