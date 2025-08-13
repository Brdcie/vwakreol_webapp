#!/usr/bin/env node
// Sync bidirectionnel : Serveur → Mac et Mac → POTOMITAN
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SERVER_USER = process.env.SERVER_USER || 'root';
const SERVER_IP = process.env.SERVER_IP || 'potomitan.io';
const SERVER_PATH = process.env.SERVER_PATH || '/var/www/vwakreol';
const LOCAL_PATH = process.env.LOCAL_PATH || '/Users/brigitte/Dropbox/00-POTOMITAN/vwakreol_webapp';
const POTOMITAN_PATH = process.env.POTOMITAN_PATH || '/path/to/potomitan-prototype';

console.log('🔄 Sync Bidirectionnel VwaKreol');

function runCommand(command, description) {
  try {
    console.log(`📡 ${description}...`);
    const result = execSync(command, { encoding: 'utf8' });
    if (result.trim()) console.log(result.trim());
    return true;
  } catch (error) {
    console.error(`❌ Erreur ${description}:`, error.message);
    return false;
  }
}

// 1. Récupérer les nouveaux audios du serveur
console.log('\n🔽 Étape 1: Serveur → VwaKreol local');
runCommand(
  `rsync -avz --update -e "ssh -i ~/.ssh/id_rsa" ${SERVER_USER}@${SERVER_IP}:${SERVER_PATH}/audio/ ${LOCAL_PATH}/audio/`,
  'Récupération audios serveur'
);

// 2. Récupérer le JSON du serveur
console.log('\n📄 Étape 2: Récupération JSON serveur');
runCommand(
  `scp -i ~/.ssh/id_rsa ${SERVER_USER}@${SERVER_IP}:${SERVER_PATH}/data/phrases_data.json ${LOCAL_PATH}/data/phrases_data_server.json`,
  'Récupération JSON serveur'
);

// 3. Fusionner les données (priorité au serveur pour les champs audio)
console.log('\n🔀 Étape 3: Fusion des données');
try {
  const localData = JSON.parse(fs.readFileSync(`${LOCAL_PATH}/data/phrases_data.json`, 'utf8'));
  const serverData = JSON.parse(fs.readFileSync(`${LOCAL_PATH}/data/phrases_data_server.json`, 'utf8'));
  
  let updatedCount = 0;
  
  // Fusionner : garder les audios du serveur s'ils existent
  const mergedData = localData.map(localPhrase => {
    const serverPhrase = serverData.find(p => p.id === localPhrase.id);
    
    if (serverPhrase && serverPhrase.audio && serverPhrase.audio !== 'paniaudio.mp3') {
      // Le serveur a un audio, on le garde + synchroniser updated_at si présent
      if (localPhrase.audio !== serverPhrase.audio || (serverPhrase.updated_at && localPhrase.updated_at !== serverPhrase.updated_at)) {
        updatedCount++;
        return { ...localPhrase, audio: serverPhrase.audio, updated_at: serverPhrase.updated_at };
      }
    }
    
    return localPhrase;
  });
  
  // Sauvegarder le JSON fusionné
  fs.writeFileSync(`${LOCAL_PATH}/data/phrases_data.json`, JSON.stringify(mergedData, null, 2));
  console.log(`✅ ${updatedCount} phrases mises à jour depuis le serveur`);
  
  // Nettoyer le fichier temporaire
  fs.unlinkSync(`${LOCAL_PATH}/data/phrases_data_server.json`);
  
} catch (error) {
  console.error('❌ Erreur fusion données:', error.message);
}

// 4. Sync vers POTOMITAN (comme avant)
console.log('\n🔄 Étape 4: VwaKreol → POTOMITAN');
try {
  const { execSync } = require('child_process');
  execSync(`node ${LOCAL_PATH}/sync_to_potomitan.js`, { 
    stdio: 'inherit',
    cwd: LOCAL_PATH 
  });
} catch (error) {
  console.error('❌ Erreur sync POTOMITAN:', error.message);
}

console.log('\n✅ Sync bidirectionnel terminé !');
console.log('📊 Vérifiez sync.log pour les détails');