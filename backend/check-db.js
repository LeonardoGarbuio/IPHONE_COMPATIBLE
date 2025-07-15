const { db } = require('./database');

console.log('🔍 Verificando banco de dados...');

// Verificar materiais
db.all('SELECT * FROM materials', (err, materials) => {
  if (err) {
    console.error('Erro ao buscar materiais:', err);
  } else {
    console.log(`📦 Materiais encontrados: ${materials.length}`);
    if (materials.length > 0) {
      console.log('Primeiro material:', materials[0]);
    }
  }
  
  // Verificar usuários
  db.all('SELECT * FROM users', (err, users) => {
    if (err) {
      console.error('Erro ao buscar usuários:', err);
    } else {
      console.log(`👥 Usuários encontrados: ${users.length}`);
      if (users.length > 0) {
        console.log('Primeiro usuário:', users[0]);
      }
    }
    
    db.close();
  });
}); 