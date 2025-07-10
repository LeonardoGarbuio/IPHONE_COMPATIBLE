const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Caminho para o arquivo do banco de dados
const dbPath = path.join(__dirname, 'greentech.db');
console.log('Banco em uso:', dbPath);

// Criar conexão com o banco
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Erro ao conectar com o banco de dados:', err.message);
  } else {
    console.log('✅ Conectado ao banco de dados SQLite');
  }
});

// Habilitar foreign keys
db.run('PRAGMA foreign_keys = ON');

// Função para inicializar as tabelas
const initDatabase = () => {
  return new Promise((resolve, reject) => {
    // Tabela de usuários
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        email TEXT UNIQUE,
        telefone TEXT UNIQUE,
        perfil TEXT NOT NULL CHECK(perfil IN ('gerador', 'catador')),
        latitude REAL,
        longitude REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Tabela de materiais/anúncios
    const createMaterialsTable = `
      CREATE TABLE IF NOT EXISTS materials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        tipo TEXT NOT NULL,
        quantidade TEXT NOT NULL,
        peso REAL,
        descricao TEXT,
        imagem TEXT,
        latitude REAL,
        longitude REAL,
        status TEXT DEFAULT 'disponivel' CHECK(status IN ('disponivel', 'reservado', 'coletado')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `;

    // Tabela de mensagens/chat
    const createMessagesTable = `
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        material_id INTEGER NOT NULL,
        from_user_id INTEGER NOT NULL,
        to_user_id INTEGER NOT NULL,
        message TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (material_id) REFERENCES materials (id) ON DELETE CASCADE,
        FOREIGN KEY (from_user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (to_user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `;

    // Executar as queries
    db.serialize(() => {
      db.run(createUsersTable, (err) => {
        if (err) {
          console.error('❌ Erro ao criar tabela users:', err.message);
          reject(err);
        } else {
          console.log('✅ Tabela users criada/verificada');
        }
      });

      db.run(createMaterialsTable, (err) => {
        if (err) {
          console.error('❌ Erro ao criar tabela materials:', err.message);
          reject(err);
        } else {
          console.log('✅ Tabela materials criada/verificada');
        }
      });

      db.run(createMessagesTable, (err) => {
        if (err) {
          console.error('❌ Erro ao criar tabela messages:', err.message);
          reject(err);
        } else {
          console.log('✅ Tabela messages criada/verificada');
        }
      });

      // Inserir dados de exemplo (opcional)
      insertSampleData().then(() => {
        console.log('✅ Banco de dados inicializado com sucesso!');
        resolve();
      }).catch(reject);
    });
  });
};

// Função para inserir dados de exemplo
const insertSampleData = () => {
  return new Promise((resolve, reject) => {
    // Verificar se já existem usuários
    db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
      if (err) {
        reject(err);
        return;
      }

      if (row.count === 0) {
        // Inserir usuários de exemplo
        const sampleUsers = [
          ['João Silva', 'joao@email.com', '11999999999', 'gerador'],
          ['Maria Santos', 'maria@email.com', '11888888888', 'catador'],
          ['Cooperativa Recicla', 'coop@email.com', '11777777777', 'catador']
        ];

        const insertUser = db.prepare('INSERT INTO users (nome, email, telefone, perfil) VALUES (?, ?, ?, ?)');
        
        sampleUsers.forEach(user => {
          insertUser.run(user, (err) => {
            if (err) {
              console.error('❌ Erro ao inserir usuário de exemplo:', err.message);
            }
          });
        });

        insertUser.finalize((err) => {
          if (err) {
            reject(err);
          } else {
            console.log('✅ Usuários de exemplo inseridos');
            
            // Inserir materiais de exemplo
            const sampleMaterials = [
              [1, 'plastic', '2 sacos de garrafas PET', 5.5, 'Garrafas limpas e organizadas', null, -23.550520, -46.633308, 'disponivel'],
              [1, 'metal', '1 saco de latinhas', 3.2, 'Latinhas de alumínio', null, -23.550520, -46.633308, 'disponivel'],
              [1, 'paper', 'Caixas de papelão', 8.0, 'Caixas em bom estado', null, -23.550520, -46.633308, 'disponivel']
            ];

            const insertMaterial = db.prepare('INSERT INTO materials (user_id, tipo, quantidade, peso, descricao, imagem, latitude, longitude, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
            
            sampleMaterials.forEach(material => {
              insertMaterial.run(material, (err) => {
                if (err) {
                  console.error('❌ Erro ao inserir material de exemplo:', err.message);
                }
              });
            });

            insertMaterial.finalize((err) => {
              if (err) {
                reject(err);
              } else {
                console.log('✅ Materiais de exemplo inseridos');
                resolve();
              }
            });
          }
        });
      } else {
        resolve();
      }
    });
  });
};

module.exports = {
  db,
  initDatabase
}; 