# 🎤 VwaKreol - Guide Commandes

## 🌐 URL VwaKreol Production
**https://vwakreol.potomitan.io**
*(URL permanente avec certificat SSL)*

## 📍 Aller dans le dossier VwaKreol
```bash
cd /Users/brigitte/Dropbox/00-POTOMITAN/vwakreol_webapp
```

## 🔄 Synchronisation Bidirectionnelle

### Vérifier sync automatique
```bash
crontab -l                    # Voir tâches cron
cat sync.log                  # Voir logs sync
```

### Sync manuel bidirectionnel
```bash
node sync_from_server.js      # Serveur → Mac → POTOMITAN
```

### Sync simple (ancien)
```bash
node sync_to_potomitan.js     # Mac → POTOMITAN uniquement
```

## 🌐 Gestion Serveur Production

### Connexion SSH
```bash
ssh root@YOUR_SERVER_IP
```

### Vérifier l'accès VwaKreol
```bash
curl -I https://vwakreol.potomitan.io
```

### Redéployer après modifications
```bash
./deploy.sh
```

## 🖥️ Gestion Services Serveur

### Vérifier services
```bash
ssh root@YOUR_SERVER_IP "systemctl status vwakreol"
ssh root@YOUR_SERVER_IP "systemctl status nginx"
```

### Redémarrer services
```bash
ssh root@YOUR_SERVER_IP "systemctl restart vwakreol"
ssh root@YOUR_SERVER_IP "systemctl restart nginx"
```

### Voir les logs en temps réel
```bash
ssh root@YOUR_SERVER_IP "journalctl -u vwakreol -f"
ssh root@YOUR_SERVER_IP "tail -f /var/log/nginx/access.log"
```

## 📁 Gestion Fichiers Serveur

### Voir les enregistrements
```bash
ssh root@YOUR_SERVER_IP "ls -la /var/www/vwakreol/audio/"
```

### Voir les plus récents
```bash
ssh root@YOUR_SERVER_IP "ls -lat /var/www/vwakreol/audio/ | head -10"
```

### Compter les fichiers
```bash
ssh root@YOUR_SERVER_IP "ls -1 /var/www/vwakreol/audio/*.mp3 | wc -l"
```

## 🧪 Tests rapides

### Test complet
```bash
# 1. Test accès VwaKreol
curl -s https://vwakreol.potomitan.io | grep title

# 2. Sync bidirectionnel
node sync_from_server.js
```

### Compteur phrases sans audio (serveur)
```bash
curl -s https://vwakreol.potomitan.io/api/todo | python3 -c "import sys, json; print('Phrases sans audio:', json.load(sys.stdin)['count'])"
```

## 🔒 Débloquer fichier .lock

### Si uploads ne marchent plus (VwaKreol bloqué)
```bash
rm /Users/brigitte/Dropbox/00-POTOMITAN/vwakreol_webapp/data/phrases_data.json.lock
```

### Débloquer sur le serveur
```bash
ssh root@YOUR_SERVER_IP "rm /var/www/vwakreol/data/phrases_data.json.lock"
```

### Vérifier s'il y a un lock orphelin
```bash
ls -la /Users/brigitte/Dropbox/00-POTOMITAN/vwakreol_webapp/data/*.lock
```

## 🆘 Redémarrage complet

### Si VwaKreol plante sur le serveur
```bash
# 1. Redémarrer le service
ssh root@YOUR_SERVER_IP "systemctl restart vwakreol"

# 2. Si problème persiste, redéployer
./deploy.sh
```

### Si sync plante localement
```bash
# 1. Aller dans dossier
cd /Users/brigitte/Dropbox/00-POTOMITAN/vwakreol_webapp

# 2. Supprimer lock orphelin (si présent)
rm data/phrases_data.json.lock 2>/dev/null

# 3. Relancer sync
node sync_from_server.js
```

## 📊 Monitoring

### Stats serveur
```bash
ssh root@YOUR_SERVER_IP "df -h && free -h"    # Ressources serveur
```

### Stats VwaKreol local
```bash
ls -la audio/                # Voir fichiers MP3 créés
wc -l sync.log               # Nombre syncs effectuées
```

### Surveillance temps réel
```bash
ssh root@YOUR_SERVER_IP "watch -n 5 'ls -lat /var/www/vwakreol/audio/ | head -5'"
```

## 🔐 Certificat SSL

### Renouveler manuellement (si nécessaire)
```bash
ssh root@YOUR_SERVER_IP "certbot renew"
```

### Vérifier validité SSL
```bash
curl -I https://vwakreol.potomitan.io | grep -i "strict-transport"
```

---

**💡 Commandes les plus utiles :**
- `node sync_from_server.js` - Sync bidirectionnel
- `./deploy.sh` - Redéploiement serveur  
- `ssh root@YOUR_SERVER_IP` - Connexion serveur
- `rm data/phrases_data.json.lock` - Débloquer uploads
- `systemctl restart vwakreol` - Redémarrer service

**🔗 URL VwaKreol : https://vwakreol.potomitan.io**