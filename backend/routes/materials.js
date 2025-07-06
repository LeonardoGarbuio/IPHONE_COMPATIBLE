const express = require('express');
const { db } = require('../database');

const router = express.Router();

// Middleware para verificar token JWT (simplificado)
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de acesso necessário' });
  }

  // Decodifica o token JWT para pegar o id do usuário
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    req.user = { id: payload.id };
  } catch (e) {
    // Fallback: tenta pegar o id do usuário do header (caso o frontend envie)
    const userId = req.headers['x-user-id'];
    if (userId) {
      req.user = { id: parseInt(userId) };
    } else {
      req.user = { id: 1 }; // Último fallback
    }
  }
  next();
};

// GET /api/materials/stats - Estatísticas dos materiais
router.get('/stats', (req, res) => {
  try {
    // Estatísticas gerais
    const statsQuery = `
      SELECT 
        COUNT(*) as totalItems,
        SUM(CAST(peso AS REAL)) as totalWeight,
        COUNT(CASE WHEN DATE(created_at) = DATE('now') THEN 1 END) as todayItems,
        COUNT(CASE WHEN DATE(created_at) >= DATE('now', 'start of month') THEN 1 END) as monthItems
      FROM materials
    `;

    db.get(statsQuery, [], (err, stats) => {
      if (err) {
        console.error('Erro ao buscar estatísticas:', err);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }

      res.json({
        totalItems: stats.totalItems || 0,
        totalWeight: stats.totalWeight || 0,
        todayItems: stats.todayItems || 0,
        monthItems: stats.monthItems || 0
      });
    });

  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/materials/search - Busca de materiais
router.get('/search', (req, res) => {
  try {
    const { q, filter } = req.query;
    
    let query = `
      SELECT m.*, u.nome as user_nome, u.perfil as user_perfil
      FROM materials m
      JOIN users u ON m.user_id = u.id
      WHERE 1=1
    `;
    
    const params = [];

    if (filter && filter !== 'all') {
      query += ' AND m.tipo = ?';
      params.push(filter);
    }

    if (q) {
      query += ` AND (
        m.tipo LIKE ? OR 
        m.quantidade LIKE ? OR 
        m.descricao LIKE ?
      )`;
      const searchTerm = `%${q}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY m.created_at DESC';

    db.all(query, params, (err, materials) => {
      if (err) {
        console.error('Erro na busca:', err);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }

      res.json({
        materials: materials.map(material => ({
          id: material.id,
          tipo: material.tipo,
          quantidade: material.quantidade,
          peso: material.peso,
          descricao: material.descricao,
          imagem: material.imagem,
          latitude: material.latitude,
          longitude: material.longitude,
          status: material.status,
          data_criacao: material.created_at,
          user: {
            id: material.user_id,
            nome: material.user_nome,
            perfil: material.user_perfil
          }
        }))
      });
    });

  } catch (error) {
    console.error('Erro na busca:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/materials/nearby - Buscar materiais próximos
router.get('/nearby', (req, res) => {
  try {
    const { latitude, longitude, radius = 10 } = req.query; // radius em km

    if (!latitude || !longitude) {
      return res.status(400).json({ 
        error: 'Latitude e longitude são obrigatórios' 
      });
    }

    // Fórmula de Haversine para calcular distância
    const query = `
      SELECT m.*, u.nome as user_nome, u.perfil as user_perfil,
             (6371 * acos(cos(radians(?)) * cos(radians(m.latitude)) * 
              cos(radians(m.longitude) - radians(?)) + 
              sin(radians(?)) * sin(radians(m.latitude)))) AS distance
      FROM materials m
      JOIN users u ON m.user_id = u.id
      WHERE m.status = 'disponivel'
      HAVING distance <= ?
      ORDER BY distance ASC
    `;

    db.all(query, [latitude, longitude, latitude, radius], (err, materials) => {
      if (err) {
        console.error('Erro ao buscar materiais próximos:', err);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }

      res.json({
        materials: materials.map(material => ({
          id: material.id,
          tipo: material.tipo,
          quantidade: material.quantidade,
          peso: material.peso,
          descricao: material.descricao,
          imagem: material.imagem,
          latitude: material.latitude,
          longitude: material.longitude,
          status: material.status,
          created_at: material.created_at,
          distance: Math.round(material.distance * 100) / 100, // Arredondar para 2 casas decimais
          user: {
            id: material.user_id,
            nome: material.user_nome,
            perfil: material.user_perfil
          }
        }))
      });
    });

  } catch (error) {
    console.error('Erro ao buscar materiais próximos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/materials/:id - Buscar material específico
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;

    db.get(`
      SELECT m.*, u.nome as user_nome, u.perfil as user_perfil
      FROM materials m
      JOIN users u ON m.user_id = u.id
      WHERE m.id = ?
    `, [id], (err, material) => {
      if (err) {
        console.error('Erro ao buscar material:', err);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }

      if (!material) {
        return res.status(404).json({ error: 'Material não encontrado' });
      }

      res.json({
        material: {
          id: material.id,
          tipo: material.tipo,
          quantidade: material.quantidade,
          peso: material.peso,
          descricao: material.descricao,
          imagem: material.imagem,
          latitude: material.latitude,
          longitude: material.longitude,
          status: material.status,
          created_at: material.created_at,
          user: {
            id: material.user_id,
            nome: material.user_nome,
            perfil: material.user_perfil
          }
        }
      });
    });

  } catch (error) {
    console.error('Erro ao buscar material:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/materials?user_id=ID
router.get('/', (req, res) => {
  const userId = req.query.user_id;
  let sql = 'SELECT * FROM materials';
  let params = [];
  if (userId) {
    sql += ' WHERE user_id = ?';
    params.push(userId);
  }
  db.all(sql, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar materiais' });
    }
    res.json({ materials: rows });
  });
});

// POST /api/materials - Criar novo material
router.post('/', authenticateToken, (req, res) => {
  try {
    console.log('--- [POST /api/materials] ---');
    console.log('Corpo recebido:', req.body);
    console.log('Usuário autenticado:', req.user);
    const { tipo, quantidade, peso, descricao, imagem, latitude, longitude } = req.body;
    const user_id = req.user.id;

    // Validações básicas
    if (!tipo || !quantidade) {
      console.log('Erro: Tipo e quantidade são obrigatórios');
      return res.status(400).json({ 
        error: 'Tipo e quantidade são obrigatórios' 
      });
    }

    const query = `
      INSERT INTO materials (user_id, tipo, quantidade, peso, descricao, imagem, latitude, longitude)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(query, [user_id, tipo, quantidade, peso, descricao, imagem, latitude, longitude], function(err) {
      if (err) {
        console.error('Erro ao criar material:', err);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }

      // Buscar material criado
      db.get(`
        SELECT m.*, u.nome as user_nome, u.perfil as user_perfil
        FROM materials m
        JOIN users u ON m.user_id = u.id
        WHERE m.id = ?
      `, [this.lastID], (err, material) => {
        if (err) {
          console.error('Erro ao buscar material criado:', err);
          return res.status(500).json({ error: 'Erro interno do servidor' });
        }

        console.log('Material criado com sucesso:', material);
        res.status(201).json({
          message: 'Material criado com sucesso',
          material: {
            id: material.id,
            tipo: material.tipo,
            quantidade: material.quantidade,
            peso: material.peso,
            descricao: material.descricao,
            imagem: material.imagem,
            latitude: material.latitude,
            longitude: material.longitude,
            status: material.status,
            created_at: material.created_at,
            user: {
              id: material.user_id,
              nome: material.user_nome,
              perfil: material.user_perfil
            }
          }
        });
      });
    });

  } catch (error) {
    console.error('Erro ao criar material:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/materials/:id - Atualizar material
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { tipo, quantidade, peso, descricao, imagem, latitude, longitude, status } = req.body;
    const user_id = req.user.id;

    // Verificar se o material existe e pertence ao usuário
    db.get('SELECT * FROM materials WHERE id = ? AND user_id = ?', [id, user_id], (err, material) => {
      if (err) {
        console.error('Erro ao verificar material:', err);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }

      if (!material) {
        return res.status(404).json({ error: 'Material não encontrado ou não autorizado' });
      }

      // Atualizar material
      const query = `
        UPDATE materials 
        SET tipo = ?, quantidade = ?, peso = ?, descricao = ?, imagem = ?, 
            latitude = ?, longitude = ?, status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      db.run(query, [tipo, quantidade, peso, descricao, imagem, latitude, longitude, status, id], function(err) {
        if (err) {
          console.error('Erro ao atualizar material:', err);
          return res.status(500).json({ error: 'Erro interno do servidor' });
        }

        res.json({ message: 'Material atualizado com sucesso' });
      });
    });

  } catch (error) {
    console.error('Erro ao atualizar material:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /api/materials/:id - Deletar material
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;

    // Verificar se o material existe e pertence ao usuário
    db.get('SELECT * FROM materials WHERE id = ? AND user_id = ?', [id, user_id], (err, material) => {
      if (err) {
        console.error('Erro ao verificar material:', err);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }

      if (!material) {
        return res.status(404).json({ error: 'Material não encontrado ou não autorizado' });
      }

      // Deletar material
      db.run('DELETE FROM materials WHERE id = ?', [id], function(err) {
        if (err) {
          console.error('Erro ao deletar material:', err);
          return res.status(500).json({ error: 'Erro interno do servidor' });
        }

        res.json({ message: 'Material deletado com sucesso' });
      });
    });

  } catch (error) {
    console.error('Erro ao deletar material:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router; 