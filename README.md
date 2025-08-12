# 🎤 VwaKreol - Audio Contribution Backend

**VwaKreol** est le backend de contribution audio pour le projet **POTOMITAN**, permettant l'enregistrement collaboratif de pronunciations créoles guadeloupéennes pour les situations d'urgence.

## 🌟 Fonctionnalités

- **Interface Contribution** : Upload et conversion audio WebM → MP3
- **Synchronisation Bidirectionnelle** : Serveur ↔ VwaKreol ↔ POTOMITAN  
- **Production DigitalOcean** : Déployé sur https://vwakreol.potomitan.io
- **Conversion ffmpeg** : Audio optimisé pour l'urgence (mono, 44.1kHz, 192kbps)
- **Gestion Conflits** : FileLock pour uploads concurrents
- **Monitoring** : Logs temps réel et statistiques

## 🎯 Contexte

VwaKreol fait partie du projet **POTOMITAN**, une PWA de traduction français-créole pour les urgentistes en Guadeloupe. Les contributeurs créolophones enregistrent les pronunciations authentiques des phrases d'urgence.

**Écosystème POTOMITAN** :
- [potomitan-prototype](https://github.com/brigittegoglin/potomitan-prototype) : PWA React frontend
- **vwakreol-webapp** (ce repo) : Backend Flask contribution audio

## 🚀 Installation

### Prérequis
- Python 3.11+
- ffmpeg installé (`brew install ffmpeg` sur macOS)
- Node.js (pour les scripts de sync)

### Setup Local
```bash
# Cloner le repo
git clone https://github.com/brigittegoglin/vwakreol-webapp.git
cd vwakreol-webapp

# Créer environnement virtuel
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
# ou .venv\Scripts\activate  # Windows

# Installer dépendances
pip install -r requirements.txt

# Copier données exemple
cp data/phrases_data.example.json data/phrases_data.json

# Créer dossiers
mkdir audio sync_reports

# Lancer serveur développement
python app.py
```

Interface disponible sur : http://localhost:8000

## 📁 Structure

```
vwakreol_webapp/
├── app.py                    # Application Flask principale
├── data/
│   ├── phrases_data.json     # Base phrases (ignoré par git)
│   └── phrases_data.example.json  # Structure exemple
├── audio/                    # Fichiers MP3 générés (ignoré)
├── templates/
│   └── index.html           # Interface contributeur
├── sync_from_server.js      # Sync bidirectionnel
├── deploy.sh               # Script déploiement
├── gunicorn.conf.py        # Config production
└── docs/
    ├── GUIDE_CONTRIBUTEUR.md  # Guide utilisateur
    ├── commandes.md          # Guide admin
    └── plan.md              # Roadmap développement
```

## 🔄 Synchronisation

### Sync Bidirectionnel (Recommandé)
```bash
node sync_from_server.js
```
Synchronise : **Serveur** → **Local** → **POTOMITAN**

### Sync Manuel POTOMITAN
```bash 
node sync_to_potomitan.js
```
Synchronise : **Local** → **POTOMITAN** uniquement

### Automatisation (Cron)
```bash
# Sync toutes les 30min entre 9h-24h
0,30 9-24 * * * cd /path/to/vwakreol && node sync_from_server.js >> sync.log 2>&1
```

## 🌐 Déploiement Production

### DigitalOcean + Nginx + Gunicorn

```bash
# Sur le serveur
./deploy.sh

# Vérifier services
systemctl status vwakreol
systemctl status nginx

# Logs temps réel
journalctl -u vwakreol -f
```

**Configuration Nginx** et **certificat SSL** Let's Encrypt inclus.

### Variables Environnement
```bash
# Production
PORT=8000
FLASK_ENV=production

# Développement
PORT=8000
FLASK_ENV=development
```

## 📊 API Endpoints

### Core
- `GET /` : Interface contributeur
- `GET /api/todo` : Liste phrases sans audio
- `POST /api/upload` : Upload + conversion audio
- `GET /audio/<filename>` : Lecture fichiers MP3

### Format Upload
```javascript
// FormData avec :
{
  "id": "phr123",           // ID phrase
  "audio": File             // Fichier WebM du navigateur
}
```

### Réponse Upload
```json
{
  "ok": true,
  "mp3": "/audio/phr123.mp3"
}
```

## 🎯 Architecture Technique

### Stack
- **Backend** : Flask 3.0 + Python 3.11
- **Audio** : ffmpeg conversion WebM→MP3  
- **Production** : Gunicorn + Nginx
- **Sync** : Node.js scripts + rsync
- **Monitoring** : SystemD + logs

### Sécurité
- Headers sécurité production
- FileLock prévention conflits
- Validation uploads
- Timeout optimisés (300s)

### Performance
- Conversion audio optimisée urgence
- Gestion mémoire (mono, compression)
- Sync intelligente (bidirectionnelle)
- Cache nginx statiques

## 📈 Statistiques

### Utilisation Actuelle (Août 2025)
- **Contributeurs actifs** : 5 personnes
- **Phrases disponibles** : 1700+
- **Uptime production** : 99.9%
- **Sync automatique** : Toutes les 30min

### Performance
- **Conversion audio** : <2 secondes
- **Upload timeout** : 300 secondes
- **Taille moyenne MP3** : 150KB
- **Bande passante** : Optimisée mobile

## 🛠️ Développement

### Tests Locaux
```bash
# Test conversion ffmpeg
ffmpeg -version

# Test upload
curl -X POST -F "id=test" -F "audio=@test.webm" http://localhost:8000/api/upload

# Test API
curl http://localhost:8000/api/todo
```

### Debug
```bash
# Logs Flask
python app.py

# Vérifier locks
ls -la data/*.lock

# Nettoyer locks orphelins  
rm data/phrases_data.json.lock
```

## 📋 Roadmap

### ✅ Phase 1-2 Terminées (Août 2025)
- Interface contribution fonctionnelle
- Déploiement production DigitalOcean
- Synchronisation bidirectionnelle
- 5 contributeurs actifs

### ⏳ Phase 3 - PostgreSQL (Sept-Oct 2025)
- Migration base relationnelle
- Interface admin/modération  
- Authentification contributeurs
- API publique développeurs
- Système réservations phrases

## 🤝 Contribution

### Pour Contributeurs Audio
Consultez le [GUIDE_CONTRIBUTEUR.md](GUIDE_CONTRIBUTEUR.md) pour enregistrer des pronunciations créoles.

### Pour Développeurs
1. Fork le projet
2. Créer branche feature (`git checkout -b feature/nouvelle-fonctionnalite`)
3. Commit changements (`git commit -m 'Ajout: nouvelle fonctionnalité'`)
4. Push branche (`git push origin feature/nouvelle-fonctionnalite`) 
5. Créer Pull Request

## 📞 Support

- **Issues** : [GitHub Issues](https://github.com/brigittegoglin/vwakreol-webapp/issues)
- **Email** : brigitte.democrite@brdcie.com
- **Prod** : https://vwakreol.potomitan.io

## 📜 Licence

MIT License - voir [LICENSE](LICENSE) pour détails.

## 🏆 Impact Social

VwaKreol contribue à :
- **Préserver** le créole guadeloupéen authentique
- **Aider** les urgentistes à communiquer efficacement
- **Enrichir** l'écosystème numérique créole
- **Transmettre** la culture aux nouvelles générations

---

**Projet POTOMITAN** - *Technologie au service de l'urgence créole* 🇬🇵