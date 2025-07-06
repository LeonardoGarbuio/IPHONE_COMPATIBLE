# GreenTech Backend

Backend para o app GreenTech - "Uber do lixo" - desenvolvido com Node.js, Express e SQLite.

## 🚀 Funcionalidades

- **Autenticação de usuários** (cadastro/login)
- **Gestão de materiais** (CRUD completo)
- **Busca por proximidade** (geolocalização)
- **API REST** para integração com o app mobile
- **Banco de dados SQLite** local

## 📋 Pré-requisitos

- Node.js (versão 14 ou superior)
- npm ou yarn

## 🔧 Instalação

1. **Instalar dependências:**
```bash
npm install
```

2. **Inicializar banco de dados:**
```bash
npm run init-db
```

3. **Iniciar servidor:**
```bash
# Desenvolvimento (com auto-reload)
npm run dev

# Produção
npm start
```

## 🌐 Endpoints da API

### Autenticação
- `POST /api/auth/register` - Cadastro de usuário
- `POST /api/auth/login` - Login de usuário
- `GET /api/auth/me` - Dados do usuário logado
- `POST /api/auth/logout` - Logout

### Materiais
- `GET /api/materials` - Listar materiais
- `GET /api/materials/:id` - Buscar material específico
- `POST /api/materials` - Criar material
- `PUT /api/materials/:id` - Atualizar material
- `DELETE /api/materials/:id` - Deletar material
- `GET /api/materials/nearby` - Buscar materiais próximos

### Utilitários
- `GET /api/health` - Verificar status da API

## 📊 Estrutura do Banco

### Tabela `users`
- `id` - ID único do usuário
- `nome` - Nome completo
- `email` - Email (único)
- `telefone` - Telefone (único)
- `perfil` - 'gerador' ou 'catador'
- `created_at` - Data de criação
- `updated_at` - Data de atualização

### Tabela `materials`
- `id` - ID único do material
- `user_id` - ID do usuário que criou
- `tipo` - Tipo do material (plastic, metal, paper, glass, etc.)
- `quantidade` - Descrição da quantidade
- `peso` - Peso em kg
- `descricao` - Descrição detalhada
- `imagem` - Caminho da imagem
- `latitude` - Latitude da localização
- `longitude` - Longitude da localização
- `status` - 'disponivel', 'reservado', 'coletado'
- `created_at` - Data de criação
- `updated_at` - Data de atualização

### Tabela `messages`
- `id` - ID único da mensagem
- `material_id` - ID do material relacionado
- `from_user_id` - ID do usuário que enviou
- `to_user_id` - ID do usuário que recebeu
- `message` - Conteúdo da mensagem
- `created_at` - Data de criação

## 🔐 Autenticação

A API usa JWT (JSON Web Tokens) para autenticação. Para endpoints protegidos, inclua o header:

```
Authorization: Bearer SEU_TOKEN_JWT
```

## 📝 Exemplos de Uso

### Cadastro de usuário
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "João Silva",
    "email": "joao@email.com",
    "telefone": "11999999999",
    "perfil": "gerador"
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "joao@email.com"
  }'
```

### Criar material
```bash
curl -X POST http://localhost:3000/api/materials \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "tipo": "plastic",
    "quantidade": "2 sacos de garrafas PET",
    "peso": 5.5,
    "descricao": "Garrafas limpas e organizadas",
    "latitude": -23.550520,
    "longitude": -46.633308
  }'
```

### Buscar materiais próximos
```bash
curl "http://localhost:3000/api/materials/nearby?latitude=-23.550520&longitude=-46.633308&radius=10"
```

## 🛠️ Desenvolvimento

### Estrutura de arquivos
```
backend/
├── server.js          # Servidor principal
├── database.js        # Configuração do banco
├── routes/
│   ├── auth.js        # Rotas de autenticação
│   └── materials.js   # Rotas de materiais
├── init-db.js         # Script de inicialização
├── package.json       # Dependências
└── greentech.db      # Banco SQLite (criado automaticamente)
```

### Scripts disponíveis
- `npm start` - Inicia o servidor em produção
- `npm run dev` - Inicia o servidor em desenvolvimento (com nodemon)
- `npm run init-db` - Inicializa o banco de dados

## 🔧 Configuração

### Variáveis de ambiente (opcional)
- `PORT` - Porta do servidor (padrão: 3000)
- `JWT_SECRET` - Chave secreta para JWT (padrão: 'greentech-secret-key-2024')

## 📱 Integração com o App

O backend serve automaticamente os arquivos do app em `../www/` na rota raiz (`/`).

Para acessar o app: http://localhost:3000

## 🚀 Próximos passos

1. Implementar upload de imagens
2. Adicionar sistema de mensagens/chat
3. Implementar notificações push
4. Adicionar validações mais robustas
5. Implementar rate limiting
6. Adicionar logs estruturados 