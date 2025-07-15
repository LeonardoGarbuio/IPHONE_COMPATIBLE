const { db } = require('./database');

// Teste para verificar se latitude e longitude estão sendo salvas
console.log('🧪 Testando coleta com latitude e longitude...');

// Primeiro, vamos verificar um material existente
db.get('SELECT * FROM materials WHERE id = 1', (err, material) => {
  if (err) {
    console.error('Erro ao buscar material:', err);
    return;
  }
  
  console.log('Material antes da coleta:', material);
  
  // Simular uma coleta com latitude e longitude
  const latitude = -23.550520;
  const longitude = -46.633308;
  
  const query = `
    UPDATE materials 
    SET status = ?, 
        catador_id = ?, 
        latitude = ?, 
        longitude = ?, 
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;
  
  db.run(query, ['coletado', 2, latitude, longitude, 1], function(err) {
    if (err) {
      console.error('Erro ao atualizar material:', err);
      return;
    }
    
    console.log('✅ Material atualizado com sucesso!');
    
    // Verificar se foi salvo corretamente
    db.get('SELECT * FROM materials WHERE id = 1', (err, updatedMaterial) => {
      if (err) {
        console.error('Erro ao buscar material atualizado:', err);
        return;
      }
      
      console.log('Material após a coleta:', updatedMaterial);
      console.log('Latitude salva:', updatedMaterial.latitude);
      console.log('Longitude salva:', updatedMaterial.longitude);
      
      if (updatedMaterial.latitude === latitude && updatedMaterial.longitude === longitude) {
        console.log('✅ Latitude e longitude foram salvas corretamente!');
      } else {
        console.log('❌ Latitude e longitude NÃO foram salvas corretamente!');
      }
      
      db.close();
    });
  });
}); 