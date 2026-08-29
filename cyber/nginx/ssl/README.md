# SSL Certificates

Place your SSL certificate and private key here:

- `fullchain.pem` — Full certificate chain (Let's Encrypt or your CA)
- `privkey.pem` — Private key (must be kept secret)

## Obtaining certificates with Let's Encrypt (certbot)

```bash
certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com
```

Then copy the certificates:

```bash
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ./nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ./nginx/ssl/
sudo chown 101:101 ./nginx/ssl/privkey.pem
sudo chmod 600 ./nginx/ssl/privkey.pem
```

## Automated renewal

Add to crontab (`crontab -e`):

```
0 12 * * * /usr/bin/certbot renew --quiet && docker-compose -f docker-compose.production.yml exec nginx nginx -s reload
```
