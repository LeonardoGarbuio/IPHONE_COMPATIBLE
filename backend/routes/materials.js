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
    const catadorId = req.query.catador_id;
    let statsQuery = `
      SELECT 
        COUNT(*) as totalItems,
        SUM(CAST(peso AS REAL)) as totalWeight,
        COUNT(CASE WHEN DATE(created_at) = DATE('now') THEN 1 END) as todayItems,
        COUNT(CASE WHEN DATE(created_at) >= DATE('now', 'start of month') THEN 1 END) as monthItems
      FROM materials
      WHERE status = 'coletado'`;
    const params = [];
    if (catadorId) {
      statsQuery += ' AND catador_id = ?';
      params.push(catadorId);
    }
    // Soma do peso só dos itens coletados hoje
    let todayWeightQuery = `SELECT SUM(CAST(peso AS REAL)) as todayItemsWeight FROM materials WHERE status = 'coletado' AND DATE(created_at) = DATE('now')`;
    const todayParams = [];
    if (catadorId) {
      todayWeightQuery += ' AND catador_id = ?';
      todayParams.push(catadorId);
    }
    db.get(statsQuery, params, (err, stats) => {
      if (err) {
        console.error('Erro ao buscar estatísticas:', err);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }
      db.get(todayWeightQuery, todayParams, (err2, todayStats) => {
        if (err2) {
          console.error('Erro ao buscar peso do dia:', err2);
          return res.status(500).json({ error: 'Erro interno do servidor' });
        }
        res.json({
          totalItems: stats.totalItems || 0,
          totalWeight: stats.totalWeight || 0,
          todayItems: stats.todayItems || 0,
          monthItems: stats.monthItems || 0,
          todayItemsWeight: todayStats && todayStats.todayItemsWeight ? todayStats.todayItemsWeight : 0
        });
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
          catador_id: material.catador_id,
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
          catador_id: material.catador_id,
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
          catador_id: material.catador_id,
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

// GET /api/materials?user_id=ID&perfil=catador|gerador ou ?catador_id=ID
router.get('/', (req, res) => {
  const userId = req.query.user_id;
  const perfil = req.query.perfil; // Recebe o perfil do usuário
  const catadorId = req.query.catador_id; // Novo parâmetro para buscar por catador
  let sql = 'SELECT * FROM materials';
  let params = [];
  
  if (catadorId) {
    // Buscar materiais coletados por um catador específico
    sql += ' WHERE catador_id = ?';
    params.push(catadorId);
  } else if (userId && perfil === 'catador') {
    // Mostra materiais reservados/coletados pelo catador OU disponíveis para coleta
    sql += ' WHERE (catador_id = ? OR status = "disponivel")';
    params.push(userId);
  } else if (userId && perfil === 'gerador') {
    sql += ' WHERE user_id = ?';
    params.push(userId);
  } else if (userId) {
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

// Endpoint de debug para listar todos os materiais
router.get('/debug/all-materials', (req, res) => {
  const query = 'SELECT * FROM materials';
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('[DEBUG] Erro ao buscar todos os materiais:', err);
      return res.status(500).json({ error: 'Erro ao buscar materiais' });
    }
    res.json({ materials: rows });
  });
});

// Endpoint para histórico de coletas do catador
router.get('/historico/coletas', (req, res) => {
  const catadorId = req.query.catador_id;
  if (!catadorId) {
    return res.status(400).json({ error: 'catador_id é obrigatório' });
  }
  const query = `SELECT * FROM materials WHERE status = 'coletado' AND catador_id = ? ORDER BY created_at DESC`;
  db.all(query, [catadorId], (err, rows) => {
    if (err) {
      console.error('[HISTORICO] Erro ao buscar coletas:', err);
      return res.status(500).json({ error: 'Erro ao buscar histórico de coletas' });
    }
    res.json({ coletas: rows });
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

    // Conversão segura de latitude/longitude
    const latitudeNum = (latitude !== undefined && latitude !== null && latitude !== '' && !isNaN(Number(latitude))) ? Number(latitude) : null;
    const longitudeNum = (longitude !== undefined && longitude !== null && longitude !== '' && !isNaN(Number(longitude))) ? Number(longitude) : null;

    // Adicione o campo status no insert
    const query = `
      INSERT INTO materials (user_id, tipo, quantidade, peso, descricao, imagem, latitude, longitude, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(query, [user_id, tipo, quantidade, peso, descricao, imagem, latitudeNum, longitudeNum, 'disponivel'], function(err) {
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
            catador_id: material.catador_id,
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

// Reservar material (catador)
router.put('/:id/reservar', authenticateToken, (req, res) => {
  const { id } = req.params;
  const catadorId = req.user.id;
  console.log('[RESERVAR] id:', id, '| catadorId:', catadorId);
  db.get('SELECT * FROM materials WHERE id = ?', [id], (err, material) => {
    if (err || !material) {
      console.error('[RESERVAR] Material não encontrado ou erro:', err);
      return res.status(404).json({ error: 'Material não encontrado' });
    }
    if (material.status !== 'disponivel') {
      console.warn('[RESERVAR] Material não disponível:', material.status);
      return res.status(400).json({ error: 'Material já reservado ou coletado' });
    }
    // Atualiza status e catador_id mesmo que já estejam preenchidos
    db.run('UPDATE materials SET status = ?, catador_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', ['reservado', catadorId, id], function (err) {
      if (err) {
        console.error('[RESERVAR] Erro ao atualizar material:', err);
        return res.status(500).json({ error: 'Erro ao reservar material' });
      }
      console.log('[RESERVAR] Material reservado com sucesso! Status e catador_id atualizados.');
      // Buscar material atualizado para debug
      db.get('SELECT * FROM materials WHERE id = ?', [id], (err, updatedMaterial) => {
        if (err) {
          console.error('[RESERVAR] Erro ao buscar material atualizado:', err);
          return res.status(500).json({ error: 'Erro ao buscar material atualizado' });
        }
        console.log('[RESERVAR] Material atualizado:', updatedMaterial);
        res.json({ success: true, material: updatedMaterial });
      });
    });
  });
});

// Marcar material como coletado (catador)
router.put('/:id/coletar', authenticateToken, (req, res) => {
  const { id } = req.params;
  const catadorId = req.user.id;
  console.log('[COLETAR] Requisição recebida para material id:', id, '| catadorId:', catadorId);
  db.get('SELECT * FROM materials WHERE id = ?', [id], (err, material) => {
    if (err || !material) {
      console.log('[COLETAR] Material não encontrado ou erro:', err);
      return res.status(404).json({ error: 'Material não encontrado' });
    }
    console.log('[COLETAR] Material encontrado:', material);
    // Permitir coletar se status for 'disponivel' ou 'reservado', e atualizar catador_id
    if (material.status === 'coletado') {
      return res.status(400).json({ error: 'Material já coletado' });
    }
    db.run('UPDATE materials SET status = ?, catador_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', ['coletado', catadorId, id], function (err) {
      if (err) {
        console.log('[COLETAR] Erro ao marcar como coletado:', err);
        return res.status(500).json({ error: 'Erro ao marcar como coletado' });
      }
      console.log('[COLETAR] Material marcado como coletado com sucesso!');
      res.json({ success: true });
    });
  });
});

// Deletar material após coleta (apenas pelo catador que reservou)
router.delete('/:id/coletado', authenticateToken, (req, res) => {
  const { id } = req.params;
  const catadorId = req.user.id;
  db.get('SELECT * FROM materials WHERE id = ?', [id], (err, material) => {
    if (err || !material) return res.status(404).json({ error: 'Material não encontrado' });
    if (material.status !== 'coletado' || material.catador_id !== catadorId) {
      return res.status(403).json({ error: 'Apenas o catador responsável pode apagar após coleta' });
    }
    db.run('DELETE FROM materials WHERE id = ?', [id], function (err) {
      if (err) return res.status(500).json({ error: 'Erro ao apagar material' });
      res.json({ success: true });
    });
  });
});

module.exports = router; 