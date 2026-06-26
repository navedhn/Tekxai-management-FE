#!/bin/bash
# Run this ONCE on EC2 to prepare the /downloads/ directory and nginx rule.
# ssh ubuntu@your-ec2-ip 'bash -s' < setup-downloads-nginx.sh

set -e

mkdir -p /home/ubuntu/downloads
chmod 755 /home/ubuntu/downloads

# Add /downloads location to nginx if not already present
NGINX_CONF=$(ls /etc/nginx/sites-enabled/*)
if ! grep -q "location /downloads" "$NGINX_CONF"; then
  sudo sed -i '/location \/ {/i \
    location /downloads/ {\
        alias /home\/ubuntu\/downloads\/;\
        add_header Content-Disposition attachment;\
        autoindex off;\
    }\
' "$NGINX_CONF"
  sudo nginx -t && sudo systemctl reload nginx
  echo "nginx updated"
else
  echo "nginx already has /downloads rule"
fi

echo "Done. Place .dmg and .exe files in /home/ubuntu/downloads/"
