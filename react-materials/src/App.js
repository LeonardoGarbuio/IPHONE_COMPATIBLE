import React, { useState, useEffect } from 'react';

const API_URL = 'http://localhost:3000/api'; // URL local para desenvolvimento

function LoginForm({ onLogin }) {
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const resp = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, telefone })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Erro ao logar');
      onLogin(data.user, data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 320, margin: '60px auto', background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 12px #0001' }}>
      <h2>Login</h2>
      <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', marginBottom: 8 }} />
      <input type="text" placeholder="Telefone" value={telefone} onChange={e => setTelefone(e.target.value)} style={{ width: '100%', marginBottom: 8 }} />
      <button type="submit" style={{ width: '100%', marginBottom: 8 }} disabled={loading}>Entrar</button>
      {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
    </form>
  );
}

function MaterialCard({ material, onAceitar, onColetar, loading, user }) {
  console.log('[DEBUG] Renderizando MaterialCard:', {
    id: material.id,
    status: material.status,
    catador_id: material.catador_id,
    user_id: user.id
  });
  return (
    <div style={{ background: '#f9fbe7', borderRadius: 12, padding: 16, marginBottom: 12, opacity: loading ? 0.5 : 1 }}>
      <b>{material.tipo}</b>
      <div>Quantidade: {material.quantidade}</div>
      <div>Peso: {material.peso}</div>
      <div>Descrição: {material.descricao}</div>
      <div style={{ fontSize: 12, color: '#888' }}>[DEBUG] status: {material.status} | catador_id: {material.catador_id} | user_id: {user.id}</div>
      {material.status === 'disponivel' && user.perfil === 'catador' && (
        <button onClick={() => { console.log('[DEBUG] Cliquei em Aceitar', material.id); onAceitar(material.id); }} disabled={loading}>Aceitar</button>
      )}
      {material.status === 'reservado' && material.catador_id === user.id && (
        <>
          <button disabled>Reservado por você</button>
          <button onClick={() => { console.log('[DEBUG] Cliquei em Coletar', material.id); onColetar(material.id); }} disabled={loading}>Coletar</button>
        </>
      )}
      {material.status === 'reservado' && material.catador_id !== user.id && (
        <button disabled>Reservado</button>
      )}
    </div>
  );
}

export default function App({ initialUser, initialToken }) {
  console.log('[DEBUG] ===== App renderizado =====');
  console.log('[DEBUG] initialUser:', initialUser);
  console.log('[DEBUG] initialToken:', initialToken ? 'EXISTE' : 'NÃO EXISTE');
  const [user, setUser] = useState(initialUser || null);
  const [token, setToken] = useState(initialToken || '');
  const [materiais, setMateriais] = useState([]);
  const [loadingId, setLoadingId] = useState(null);
  const [loadingList, setLoadingList] = useState(false);
  const [error, setError] = useState('');

  console.log('[DEBUG] user state:', user);
  console.log('[DEBUG] token state:', token ? 'EXISTE' : 'NÃO EXISTE');

  // Função para buscar materiais (reutilizável)
  const fetchMateriais = async () => {
    setLoadingList(true);
    try {
      const res = await fetch(`${API_URL}/materials`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setMateriais(data.materials || []);
    } catch {
      setError('Erro ao buscar materiais');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    console.log('[DEBUG] useEffect - token mudou:', token);
    if (!token) {
      console.log('[DEBUG] useEffect - sem token, retornando');
      return;
    }
    fetchMateriais();
  }, [token]);

  const aceitarMaterial = async (id) => {
    setLoadingId(id);
    setError('');
    try {
      await fetch(`${API_URL}/materials/${id}/reservar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      });
      await fetchMateriais(); // Atualiza imediatamente após a resposta
    } catch (err) {
      setError('Erro ao reservar material');
    } finally {
      setLoadingId(null);
    }
  };

  const coletarMaterial = async (id) => {
    setLoadingId(id);
    setError('');
    try {
      await fetch(`${API_URL}/materials/${id}/coletar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      });
      await fetchMateriais(); // Atualiza imediatamente após a resposta
    } catch (err) {
      setError('Erro ao coletar material');
    } finally {
      setLoadingId(null);
    }
  };

  if (!user) {
    console.log('[DEBUG] App - renderizando LoginForm');
    return <LoginForm onLogin={(u, t) => { setUser(u); setToken(t); }} />;
  }

  console.log('[DEBUG] App - renderizando interface principal');
  console.log('[DEBUG] App - materiais.length:', materiais.length);
  console.log('[DEBUG] App - loadingList:', loadingList);
  console.log('[DEBUG] App - error:', error);

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', padding: 16 }}>
      <h2>Materiais para Coleta</h2>
      <button onClick={() => console.log('[DEBUG] Botão React fora do card clicado!')}>Teste React</button>
      <div style={{ marginBottom: 16 }}>Usuário: <b>{user.nome}</b> ({user.perfil})</div>
      {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}
      {loadingList && <div>Carregando materiais...</div>}
      {materiais.length === 0 && !loadingList && <div>Nenhum material disponível.</div>}
      {materiais.map((mat) => (
        <MaterialCard
          key={mat.id}
          material={mat}
          onAceitar={aceitarMaterial}
          onColetar={coletarMaterial}
          loading={loadingId === mat.id}
          user={user}
        />
      ))}
    </div>
  );
}
