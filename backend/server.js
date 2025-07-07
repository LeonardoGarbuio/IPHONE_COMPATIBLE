const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./database');
const authRoutes = require('./routes/auth');
const materialsRoutes = require('./routes/materials');


const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos (para o app)
app.use(express.static(path.join(__dirname, '../www')));

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/materials', materialsRoutes);
app.use('/api', authRoutes);

// Rota para verificar se a API está funcionando
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'GreenTech API está funcionando!',
    timestamp: new Date().toISOString()
  });
});

// Rota para servir login.html
app.get('/login/', (req, res) => {
  res.sendFile(path.join(__dirname, '../www/login.html'));
});

// Rota para servir index.html
app.get('/index/', (req, res) => {
  res.sendFile(path.join(__dirname, '../www/index.html'));
});

// Rota para servir link2.html
app.get('/link2/', (req, res) => {
  res.sendFile(path.join(__dirname, '../www/link2.html'));
});

// Rota para servir link3.html
app.get('/link3/', (req, res) => {
  res.sendFile(path.join(__dirname, '../www/link3.html'));
});

// Rota para servir link4.html
app.get('/link4/', (req, res) => {
  res.sendFile(path.join(__dirname, '../www/link4.html'));
});

// Fallback SPA para rotas não-API e não-arquivo estático
app.get(/^\/(index|link2|link3|link4)\/?$/, (req, res) => {
  res.sendFile(path.join(__dirname, `../www/${req.params[0]}.html`));
});
app.get('*', (req, res) => {
  // Se não for API nem arquivo estático, serve index.html
  res.sendFile(path.join(__dirname, '../www/index.html'));
});

// Rota padrão - redireciona para login
app.get('/', (req, res) => {
  res.redirect('/login/');
});

// Middleware global de erro para logar todos os erros não tratados
app.use((err, req, res, next) => {
  console.error('Erro global:', err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

// Rota para qualquer caminho não encontrado
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Rota não encontrada',
    path: req.originalUrl 
  });
});

// Inicializar banco de dados e iniciar servidor
async function startServer() {
  try {
    console.log('🚀 Inicializando banco de dados...');
    await initDatabase();
    console.log('✅ Banco de dados inicializado!');
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Servidor GreenTech rodando na porta ${PORT}`);
      if (process.env.RENDER) {
        console.log(`🌎 App disponível em: https://${process.env.RENDER_EXTERNAL_HOSTNAME || 'SEU-APP.onrender.com'}`);
      } else {
        console.log(`📱 App disponível em: http://localhost:${PORT}`);
      }
      console.log(`🔗 API disponível em: /api`);
      console.log(` Health check: /api/health`);
    });
  } catch (error) {
    console.error('❌ Erro ao inicializar servidor:', error);
    process.exit(1);
  }
}

startServer(); 