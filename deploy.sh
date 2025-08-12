#!/bin/bash
# Déploiement VwaKreol sur DigitalOcean

set -e

echo "🚀 Déploiement VwaKreol sur DigitalOcean"

# Variables (à configurer via environnement ou modifier ici)
SERVER_IP="${SERVER_IP:-YOUR_SERVER_IP}"
SERVER_USER="${SERVER_USER:-root}"
APP_DIR="/var/www/vwakreol"
DOMAIN="vwakreol.potomitan.io"

# 1. Upload des fichiers
echo "📂 Upload des fichiers vers le serveur..."
rsync -avz --exclude='__pycache__' --exclude='.DS_Store' --exclude='*.log' \
  ./ ${SERVER_USER}@${SERVER_IP}:${APP_DIR}/

# 2. Installation sur le serveur
echo "🔧 Installation sur le serveur..."
ssh ${SERVER_USER}@${SERVER_IP} << EOF
cd ${APP_DIR}

# Installation des dépendances système
apt update
apt install -y python3 python3-pip python3-venv nginx ffmpeg

# Création environnement virtuel
python3 -m venv venv
source venv/bin/activate
pip install -r requirements-clean.txt

# Création des dossiers nécessaires
mkdir -p audio data sync_reports
chmod 755 audio data sync_reports

# Configuration Nginx
cat > /etc/nginx/sites-available/vwakreol << 'NGINX_EOF'
server {
    listen 80;
    server_name ${DOMAIN};
    
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    location /static/ {
        alias ${APP_DIR}/static/;
    }
    
    location /audio/ {
        alias ${APP_DIR}/audio/;
    }
}
NGINX_EOF

# Activer le site
ln -sf /etc/nginx/sites-available/vwakreol /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# Service systemd pour VwaKreol
cat > /etc/systemd/system/vwakreol.service << 'SERVICE_EOF'
[Unit]
Description=VwaKreol Flask App
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=${APP_DIR}
Environment=PATH=${APP_DIR}/venv/bin
ExecStart=${APP_DIR}/venv/bin/gunicorn -c gunicorn.conf.py app:app
Restart=always

[Install]
WantedBy=multi-user.target
SERVICE_EOF

# Permissions et démarrage
chown -R www-data:www-data ${APP_DIR}
systemctl daemon-reload
systemctl enable vwakreol
systemctl start vwakreol
systemctl status vwakreol

echo "✅ Déploiement terminé !"
echo "🌐 Configurez maintenant le DNS pour pointer ${DOMAIN} vers ${SERVER_IP}"
EOF