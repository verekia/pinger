docker buildx build --platform linux/amd64 --load -t verekia/pinger -f Dockerfile .
docker save verekia/pinger | gzip > /tmp/pinger.tar.gz
scp /tmp/pinger.tar.gz wutai:/tmp/
ssh wutai docker load --input /tmp/pinger.tar.gz
ssh wutai docker compose up -d pinger
