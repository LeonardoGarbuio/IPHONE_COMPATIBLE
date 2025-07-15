# IPHONE_COMPATIBLE

# 🌱 GreenTech - Uber do Lixo

Um aplicativo móvel para conectar pessoas que têm materiais recicláveis com catadores e cooperativas de reciclagem.

## 📱 Sobre o Projeto

O GreenTech é um app desenvolvido com **Cordova**, **Framework7** e **Node.js** que permite:

- ✅ Cadastro e login de usuários
- ✅ Anúncio de materiais recicláveis
- ✅ Busca e filtro de materiais
- ✅ Estatísticas de reciclagem
- ✅ Integração com Google Maps
- ✅ Backend completo com SQLite

## 🚀 Como Executar

### Pré-requisitos

- Node.js (versão 14 ou superior)
- npm ou yarn
- Cordova CLI (opcional, para build mobile)

### 1. Instalar Dependências

```bash
# Instalar dependências do frontend
npm install

# Instalar dependências do backend
cd backend
npm install
cd ..
```

### 2. Inicializar Banco de Dados

```bash
cd backend
npm run init-db
cd ..
```

### 3. Iniciar o Servidor

```bash
# Desenvolvimento (com auto-reload)
npm run dev

# Produção
npm start
```

### 4. Acessar o App

- **PC**: http://localhost:3000
- **Celular**: http://[IP_DO_PC]:3000

## 📁 Estrutura do Projeto

```
greentech/
├── backend/                 # Servidor Node.js
│   ├── routes/             # Rotas da API
│   ├── database.js         # Configuração do banco
│   ├── server.js           # Servidor principal
│   └── greentech.db        # Banco SQLite
├── www/                    # Frontend (Cordova)
│   ├── js/                 # JavaScript
│   ├── css/                # Estilos
│   ├── lib/                # Bibliotecas
│   └── *.html              # Páginas do app
└── platforms/              # Plataformas mobile
```

## 🔧 Funcionalidades

### 🔐 Autenticação
- Login com email/senha
- Cadastro de novos usuários
- Proteção de rotas com JWT
- Sessão persistente

### 📦 Gestão de Materiais
- Adicionar materiais recicláveis
- Categorização por tipo (plástico, metal, papel, etc.)
- Upload de imagens
- Geolocalização

### 🔍 Busca e Filtros
- Busca por texto
- Filtros por tipo de material
- Resultados em tempo real
- Interface intuitiva

### 📊 Estatísticas
- Total de materiais cadastrados
- Peso total reciclado
- Materiais do dia/mês
- Histórico de atividades

### 🗺️ Integração com Maps
- Visualização de pontos de coleta
- Geolocalização do usuário
- Marcadores no mapa

## 🛠️ Tecnologias Utilizadas

### Frontend
- **Cordova**: Framework mobile
- **Framework7**: UI framework
- **jQuery**: Manipulação DOM
- **Google Maps API**: Mapas e localização

### Backend
- **Node.js**: Runtime JavaScript
- **Express**: Framework web
- **SQLite**: Banco de dados
- **JWT**: Autenticação
- **bcryptjs**: Criptografia de senhas

## 📱 Build para Mobile

### Android

```bash
# Adicionar plataforma Android
cordova platform add android

# Build do projeto
cordova build android

# Executar no dispositivo/emulador
cordova run android
```

### iOS (apenas macOS)

```bash
# Adicionar plataforma iOS
cordova platform add ios

# Build do projeto
cordova build ios

# Executar no simulador
cordova run ios
```

## 🔌 API Endpoints

### Autenticação
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Cadastro

### Materiais
- `GET /api/materials` - Listar materiais
- `POST /api/materials` - Criar material
- `GET /api/materials/search` - Buscar materiais
- `GET /api/materials/stats` - Estatísticas

## 🎨 Personalização

### Cores e Tema
Edite `www/css/index.css` para personalizar:
- Cores do tema
- Tipografia
- Layout responsivo

### Configurações
- **Google Maps**: Altere a chave da API em `www/index.html`
- **Porta do servidor**: Configure em `backend/server.js`
- **Banco de dados**: Modifique `backend/database.js`

## 🐛 Solução de Problemas

### Erro de CORS
Se houver problemas de CORS, verifique se o backend está rodando na porta correta.

### Problemas de Conexão
- Verifique se o firewall permite conexões na porta 3000
- Confirme se o IP está correto para acesso mobile

### Banco de Dados
Se houver problemas com o banco:
```bash
cd backend
rm greentech.db
npm run init-db
```

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.

## 🤝 Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📞 Suporte

Para dúvidas ou problemas:
- Abra uma issue no GitHub
- Entre em contato com a equipe de desenvolvimento

---

**GreenTech** - Transformando resíduos em recursos! ♻️ 
