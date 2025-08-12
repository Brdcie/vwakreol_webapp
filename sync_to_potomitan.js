#!/usr/bin/env node

// Script de synchronisation VwaKreol → POTOMITAN-PROTOTYPE
const fs = require('fs').promises;
const path = require('path');

// Chemins
const VWAKREOL_AUDIO = path.join(__dirname, 'audio');
const VWAKREOL_JSON = path.join(__dirname, 'data', 'phrases_data.json');
const POTOMITAN_AUDIO = path.join(__dirname, '..', 'potomitan-prototype', 'public', 'audio');
const POTOMITAN_JSON = path.join(__dirname, '..', 'potomitan-prototype', 'src', 'data', 'phrases_data.json');

console.log('🔄 VwaKreol → POTOMITAN Sync');
console.log('Source Audio:', VWAKREOL_AUDIO);
console.log('Target Audio:', POTOMITAN_AUDIO);

async function syncAudioFiles() {
  try {
    // 1. Lire tous les MP3 VwaKreol
    const vwakreolFiles = await fs.readdir(VWAKREOL_AUDIO);
    const mp3Files = vwakreolFiles.filter(f => f.endsWith('.mp3'));
    
    console.log(`📂 Trouvé ${mp3Files.length} fichiers MP3 dans VwaKreol`);
    
    let copiedCount = 0;
    let skippedCount = 0;
    
    for (const mp3File of mp3Files) {
      const sourcePath = path.join(VWAKREOL_AUDIO, mp3File);
      const targetPath = path.join(POTOMITAN_AUDIO, mp3File);
      
      try {
        // Vérifier si le fichier existe déjà dans POTOMITAN
        await fs.access(targetPath);
        console.log(`⏭️  Existe déjà: ${mp3File}`);
        skippedCount++;
      } catch (error) {
        // Fichier n'existe pas, le copier
        await fs.copyFile(sourcePath, targetPath);
        console.log(`✅ Copié: ${mp3File}`);
        copiedCount++;
      }
    }
    
    console.log(`📊 Audio: ${copiedCount} copiés, ${skippedCount} existants`);
    return { copiedCount, skippedCount, totalFiles: mp3Files.length };
    
  } catch (error) {
    console.error('❌ Erreur sync audio:', error);
    return null;
  }
}

async function syncPhrasesJSON() {
  try {
    // 1. Charger les deux JSON
    const vwakreolData = JSON.parse(await fs.readFile(VWAKREOL_JSON, 'utf8'));
    const potomitanData = JSON.parse(await fs.readFile(POTOMITAN_JSON, 'utf8'));
    
    console.log(`📄 VwaKreol JSON: ${vwakreolData.length} phrases`);
    console.log(`📄 POTOMITAN JSON: ${potomitanData.length} phrases`);
    
    let updatedCount = 0;
    let newAudioCount = 0;
    
    // 2. Mettre à jour les chemins audio dans POTOMITAN
    for (const vwakreolPhrase of vwakreolData) {
      const potomitanPhrase = potomitanData.find(p => p.id === vwakreolPhrase.id);
      
      if (potomitanPhrase) {
        // Vérifier si l'audio a été mis à jour
        if (vwakreolPhrase.audio && 
            vwakreolPhrase.audio !== 'paniaudio.mp3' && 
            potomitanPhrase.audio !== vwakreolPhrase.audio) {
          
          potomitanPhrase.audio = vwakreolPhrase.audio;
          potomitanPhrase.updated_at = vwakreolPhrase.updated_at || Date.now();
          potomitanPhrase.source = vwakreolPhrase.source || 'vwakreol_contrib';
          
          updatedCount++;
          
          // Si c'était 'paniaudio.mp3' avant, c'est un nouvel audio
          if (potomitanPhrase.audio === 'paniaudio.mp3') {
            newAudioCount++;
          }
          
          console.log(`🔄 Mis à jour: ${vwakreolPhrase.id} → ${vwakreolPhrase.audio}`);
        }
      } else {
        console.log(`⚠️  Phrase VwaKreol non trouvée dans POTOMITAN: ${vwakreolPhrase.id}`);
      }
    }
    
    // 3. Sauvegarder POTOMITAN JSON mis à jour
    if (updatedCount > 0) {
      await fs.writeFile(POTOMITAN_JSON, JSON.stringify(potomitanData, null, 2), 'utf8');
      console.log(`💾 POTOMITAN JSON sauvegardé avec ${updatedCount} mises à jour`);
    } else {
      console.log(`✅ Aucune mise à jour nécessaire`);
    }
    
    return { updatedCount, newAudioCount, totalPhrases: potomitanData.length };
    
  } catch (error) {
    console.error('❌ Erreur sync JSON:', error);
    return null;
  }
}

async function generateSyncReport() {
  const now = new Date().toISOString();
  const audioStats = await syncAudioFiles();
  const jsonStats = await syncPhrasesJSON();
  
  const report = {
    timestamp: now,
    audio: audioStats,
    phrases: jsonStats,
    status: (audioStats && jsonStats) ? 'success' : 'error'
  };
  
  // Sauvegarder rapport
  const reportPath = path.join(__dirname, 'sync_reports', `sync_${Date.now()}.json`);
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  
  console.log('\n📊 Rapport de Sync:');
  console.log('===================');
  console.log(`🕐 Timestamp: ${now}`);
  
  if (audioStats) {
    console.log(`🎵 Audio: ${audioStats.copiedCount} nouveaux, ${audioStats.totalFiles} total`);
  }
  
  if (jsonStats) {
    console.log(`📝 Phrases: ${jsonStats.updatedCount} mises à jour, ${jsonStats.newAudioCount} nouveaux audios`);
  }
  
  console.log(`📁 Rapport: ${reportPath}`);
  console.log('\n✅ Synchronisation terminée !');
  
  return report;
}

// Exécution
if (require.main === module) {
  generateSyncReport().catch(console.error);
}

module.exports = {
  syncAudioFiles,
  syncPhrasesJSON,
  generateSyncReport
};