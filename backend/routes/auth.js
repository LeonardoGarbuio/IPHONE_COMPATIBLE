const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../database');

const router = express.Router();

// Chave secreta para JWT (em produção, usar variável de ambiente)
const JWT_SECRET = 'greentech-secret-key-2024';

// Middleware para verificar token JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Token de acesso necessário' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user;
    next();
  });
};

// POST /api/auth/register - Cadastro de usuário
router.post('/register', async (req, res) => {
  try {
    const { nome, email, telefone, perfil } = req.body;

    // Validações básicas
    if (!nome || !perfil) {
      return res.status(400).json({ 
        error: 'Nome e perfil são obrigatórios' 
      });
    }

    if (!email && !telefone) {
      return res.status(400).json({ 
        error: 'Email ou telefone é obrigatório' 
      });
    }

    if (!['gerador', 'catador'].includes(perfil)) {
      return res.status(400).json({ 
        error: 'Perfil deve ser "gerador" ou "catador"' 
      });
    }

    // Verificar se usuário já existe
    const checkQuery = email 
      ? 'SELECT * FROM users WHERE email = ? OR telefone = ?'
      : 'SELECT * FROM users WHERE telefone = ?';
    
    const checkParams = email ? [email, telefone] : [telefone];

    db.get(checkQuery, checkParams, (err, existingUser) => {
      if (err) {
        console.error('Erro ao verificar usuário existente:', err);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }

      if (existingUser) {
        return res.status(409).json({ 
          error: 'Usuário já existe com este email ou telefone' 
        });
      }

      // Inserir novo usuário
      const insertQuery = `
        INSERT INTO users (nome, email, telefone, perfil) 
        VALUES (?, ?, ?, ?)
      `;
      
      db.run(insertQuery, [nome, email, telefone, perfil], function(err) {
        if (err) {
          console.error('Erro ao inserir usuário:', err);
          return res.status(500).json({ error: 'Erro interno do servidor' });
        }

        // Buscar usuário criado
        db.get('SELECT * FROM users WHERE id = ?', [this.lastID], (err, user) => {
          if (err) {
            console.error('Erro ao buscar usuário criado:', err);
            return res.status(500).json({ error: 'Erro interno do servidor' });
          }

          // Gerar token JWT
          const token = jwt.sign(
            { 
              id: user.id, 
              nome: user.nome, 
              perfil: user.perfil 
            }, 
            JWT_SECRET, 
            { expiresIn: '7d' }
          );

          res.status(201).json({
            message: 'Usuário criado com sucesso',
            user: {
              id: user.id,
              nome: user.nome,
              email: user.email,
              telefone: user.telefone,
              perfil: user.perfil
            },
            token
          });
        });
      });
    });

  } catch (error) {
    console.error('Erro no cadastro:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/auth/login - Login de usuário
router.post('/login', async (req, res) => {
  try {
    const { email, telefone } = req.body;

    if (!email && !telefone) {
      return res.status(400).json({ 
        error: 'Email ou telefone é obrigatório' 
      });
    }

    // Buscar usuário
    const query = email 
      ? 'SELECT * FROM users WHERE email = ? OR telefone = ?'
      : 'SELECT * FROM users WHERE telefone = ?';
    
    const params = email ? [email, telefone] : [telefone];

    db.get(query, params, (err, user) => {
      if (err) {
        console.error('Erro ao buscar usuário:', err);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }

      if (!user) {
        return res.status(401).json({ 
          error: 'Usuário não encontrado' 
        });
      }

      // Gerar token JWT
      const token = jwt.sign(
        { 
          id: user.id, 
          nome: user.nome, 
          perfil: user.perfil 
        }, 
        JWT_SECRET, 
        { expiresIn: '7d' }
      );

      res.json({
        message: 'Login realizado com sucesso',
        user: {
          id: user.id,
          nome: user.nome,
          email: user.email,
          telefone: user.telefone,
          perfil: user.perfil
        },
        token
      });
    });

  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/auth/me - Obter dados do usuário logado
router.get('/me', authenticateToken, (req, res) => {
  try {
    db.get('SELECT * FROM users WHERE id = ?', [req.user.id], (err, user) => {
      if (err) {
        console.error('Erro ao buscar usuário:', err);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }

      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      res.json({
        user: {
          id: user.id,
          nome: user.nome,
          email: user.email,
          telefone: user.telefone,
          perfil: user.perfil,
          created_at: user.created_at
        }
      });
    });

  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/auth/logout - Logout (invalidação de token)
router.post('/logout', authenticateToken, (req, res) => {
  // Em uma implementação mais robusta, você poderia adicionar o token a uma blacklist
  // Por enquanto, apenas retornamos sucesso
  res.json({ message: 'Logout realizado com sucesso' });
});

// GET /api/catadores
router.get('/catadores', (req, res) => {
  console.log('Recebida requisição GET /api/catadores');
  db.all(
    `SELECT id, nome, email, telefone, latitude, longitude FROM users WHERE perfil = 'catador'`,
    [],
    (err, rows) => {
      if (err) {
        console.error('Erro ao buscar catadores:', err);
        return res.status(500).json({ error: 'Erro ao buscar catadores' });
      }
      res.json({ catadores: rows });
    }
  );
});

// PUT /api/catadores/:id/localizacao
router.put('/catadores/:id/localizacao', (req, res) => {
  const { id } = req.params;
  let { latitude, longitude } = req.body;
  console.log('Recebida requisição PUT /api/catadores/' + id + '/localizacao com body:', req.body);

  // Permitir null explícito para remover localização
  const isLatNull = latitude === null || latitude === 'null' || latitude === '' || typeof latitude === 'undefined';
  const isLngNull = longitude === null || longitude === 'null' || longitude === '' || typeof longitude === 'undefined';

  if (isLatNull && isLngNull) {
    // Remover localização
    db.run(
      `UPDATE users SET latitude = NULL, longitude = NULL WHERE id = ? AND perfil = 'catador'`,
      [id],
      function (err) {
        if (err) {
          console.error('Erro ao remover localização do catador:', err);
          return res.status(500).json({ error: 'Erro ao remover localização do catador.' });
        }
        if (this.changes === 0) {
          return res.status(404).json({ error: 'Catador não encontrado.' });
        }
        res.json({ success: true });
      }
    );
    return;
  }

  latitude = Number(latitude);
  longitude = Number(longitude);
  if (isNaN(latitude) || isNaN(longitude)) {
    return res.status(400).json({ error: 'Latitude e longitude são obrigatórias e devem ser números ou null.' });
  }
  db.run(
    `UPDATE users SET latitude = ?, longitude = ? WHERE id = ? AND perfil = 'catador'`,
    [latitude, longitude, id],
    function (err) {
      if (err) {
        console.error('Erro ao atualizar localização do catador:', err);
        return res.status(500).json({ error: 'Erro ao atualizar localização do catador.' });
      }
      // Sempre retorna sucesso se não houve erro de SQL
      res.json({ success: true });
    }
  );
});

module.exports = router; 