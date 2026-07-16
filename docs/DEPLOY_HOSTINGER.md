# Deploy en Hostinger VPS KVM2 (+ OpenClaw agents)

## 1. Preparar el VPS

```bash
# Ubuntu 24.04 LTS (imagen de Hostinger)
ssh root@TU_IP_VPS
apt update && apt upgrade -y

# Docker + Compose plugin
curl -fsSL https://get.docker.com | sh
apt install docker-compose-plugin -y

# Firewall
ufw allow 22 && ufw allow 80 && ufw allow 443 && ufw enable
```

## 2. Subir el proyecto

```bash
git clone https://github.com/giovanniuy/stayagent-ai.git
cd stayagent-ai
cp .env.example .env && nano .env   # completar claves reales
```

## 3. Levantar los servicios

```bash
docker compose up -d --build
docker compose logs -f backend      # verificar que conectó a PostGIS
```

## 4. HTTPS con Nginx + Let's Encrypt (recomendado)

```bash
apt install nginx certbot python3-certbot-nginx -y
```

`/etc/nginx/sites-available/stayagent`:
```nginx
server {
    server_name tudominio.com;
    location /        { proxy_pass http://localhost:80;   }   # frontend
    location /api/    { proxy_pass http://localhost:4000; }   # backend
    client_max_body_size 10m;
}
```
```bash
ln -s /etc/nginx/sites-available/stayagent /etc/nginx/sites-enabled/
certbot --nginx -d tudominio.com
```

## 5. OpenClaw agents en el KVM2

Los agentes IA del backend (`AI_PROVIDER`) pueden correr contra:

1. **APIs externas** (OpenAI/Anthropic) — solo setear la key en `.env`.
2. **Ollama local en el mismo VPS** (KVM2 tiene 2 vCPU / 8 GB — usar modelos livianos):
   ```bash
   curl -fsSL https://ollama.com/install.sh | sh
   ollama pull llama3.1
   # en .env: AI_PROVIDER=ollama
   ```
3. **OpenClaw**: exponer el endpoint de OpenClaw como API compatible con OpenAI y
   apuntar `OLLAMA_BASE_URL` (o adaptar `aiProvider.js` agregando un provider
   `openclaw` con la URL del gateway de OpenClaw).

## 6. Webhooks de pago (producción)

- Stripe: `https://tudominio.com/api/payments/webhooks/stripe`
- Mercado Pago: `https://tudominio.com/api/payments/webhooks/mercadopago`

## 7. Backups de la base

```bash
docker exec stayagent-db pg_dump -U stayagent stayagent > backup_$(date +%F).sql
# cron diario:
echo "0 3 * * * root docker exec stayagent-db pg_dump -U stayagent stayagent > /backups/sa_\$(date +\%F).sql" >> /etc/crontab
```
