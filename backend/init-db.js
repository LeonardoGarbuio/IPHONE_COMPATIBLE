const { initDatabase } = require('./database');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'greentech.db');
const db = new sqlite3.Database(dbPath);

console.log('🚀 Inicializando banco de dados GreenTech...');

initDatabase()
  .then(() => {
    console.log('✅ Banco de dados inicializado com sucesso!');
    console.log('📊 Tabelas criadas:');
    console.log('   - users (usuários)');
    console.log('   - materials (materiais/anúncios)');
    console.log('   - messages (mensagens/chat)');
    console.log('');
    console.log('👥 Usuários de exemplo criados:');
    console.log('   - João Silva (gerador)');
    console.log('   - Maria Santos (catador)');
    console.log('   - Cooperativa Recicla (catador)');
    console.log('');
    console.log('♻️ Materiais de exemplo criados:');
    console.log('   - 2 sacos de garrafas PET (5.5 kg)');
    console.log('   - 1 saco de latinhas (3.2 kg)');
    console.log('   - Caixas de papelão (8.0 kg)');
    console.log('');
    console.log('🎯 Próximos passos:');
    console.log('   1. Execute: npm install (para instalar dependências)');
    console.log('   2. Execute: npm run dev (para iniciar o servidor)');
    console.log('   3. Acesse: http://localhost:3000');

    // MIGRAÇÃO: Adiciona latitude e longitude se não existirem
    function addLatLngColumnsIfNeeded() {
      db.all("PRAGMA table_info(users)", (err, columns) => {
        if (err) {
          console.error('Erro ao checar colunas da tabela users:', err);
          return;
        }
        const colNames = columns.map(c => c.name);
        if (!colNames.includes('latitude')) {
          db.run("ALTER TABLE users ADD COLUMN latitude REAL", (err) => {
            if (err) {
              console.error('Erro ao adicionar coluna latitude:', err);
            } else {
              console.log('Coluna latitude adicionada com sucesso!');
            }
          });
        }
        if (!colNames.includes('longitude')) {
          db.run("ALTER TABLE users ADD COLUMN longitude REAL", (err) => {
            if (err) {
              console.error('Erro ao adicionar coluna longitude:', err);
            } else {
              console.log('Coluna longitude adicionada com sucesso!');
            }
          });
        }
      });
      // MIGRAÇÃO: Adiciona catador_id na tabela materials se não existir
      db.all("PRAGMA table_info(materials)", (err, columns) => {
        if (err) {
          console.error('Erro ao checar colunas da tabela materials:', err);
          return;
        }
        const colNames = columns.map(c => c.name);
        if (!colNames.includes('catador_id')) {
          db.run("ALTER TABLE materials ADD COLUMN catador_id INTEGER", (err) => {
            if (err) {
              console.error('Erro ao adicionar coluna catador_id:', err);
            } else {
              console.log('Coluna catador_id adicionada com sucesso!');
            }
          });
        }
      });
    }

    addLatLngColumnsIfNeeded();

    db.all("SELECT id, nome, perfil FROM users", (err, rows) => {
      if (err) {
        console.error('Erro ao listar usuários:', err);
      } else {
        console.log('Usuários cadastrados no banco:', rows);
      }
    });

    // Adiciona a coluna catador_id se não existir
    const addCatadorIdColumn = async () => {
      return new Promise((resolve, reject) => {
        db.all("PRAGMA table_info(materials)", (err, columns) => {
          if (err) {
            console.error('Erro ao checar colunas:', err);
            return reject(err);
          }
          const hasCatadorId = columns.some(col => col.name === 'catador_id');
          if (!hasCatadorId) {
            db.run('ALTER TABLE materials ADD COLUMN catador_id INTEGER REFERENCES users(id)', (err) => {
              if (err) {
                console.error('Erro ao adicionar coluna catador_id:', err);
                return reject(err);
              } else {
                console.log('Coluna catador_id adicionada com sucesso!');
                db.all("PRAGMA table_info(materials)", (err, cols) => {
                  if (!err) console.log('Colunas atuais da tabela materials:', cols.map(c => c.name));
                  resolve();
                });
              }
            });
          } else {
            console.log('Coluna catador_id já existe.');
            console.log('Colunas atuais da tabela materials:', columns.map(c => c.name));
            resolve();
          }
        });
      });
    };

    (async () => {
      try {
        await addCatadorIdColumn();
        process.exit(0);
      } catch (e) {
        process.exit(1);
      }
    })();
  })
  .catch((error) => {
    console.error('❌ Erro ao inicializar banco de dados:', error);
    // process.exit(1);
  }); 