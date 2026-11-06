FROM oven/bun:1.4.4-alpine AS builder

WORKDIR /app

COPY package.json bun.lock ./

RUN bun i --frozen-lockfile

COPY . .

RUN bun run build

FROM alpine:3.22

RUN apk add --no-cache libgcc libstdc++

WORKDIR /app

COPY --from=builder /app/pinger-bin ./pinger-bin
COPY --from=builder /app/.env ./.env

EXPOSE 3000

CMD ["./pinger-bin"]
