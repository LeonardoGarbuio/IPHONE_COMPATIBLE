// Para testes: se estiver usando Cordova, aguarda o 'deviceready'; 
// caso contrário, aguarda o DOM estar carregado.
if (window.cordova) {
  document.addEventListener('deviceready', onDeviceReady, false);
} else {
  document.addEventListener('DOMContentLoaded', onDeviceReady);
}

// Configuração da API
const BASE_URL = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
  ? "http://localhost:3000/api"
  : "https://iphone-compatible-1.onrender.com/api";

// Gerenciamento de autenticação
let currentUser = null;

// Verificar se o usuário está autenticado
function checkAuth() {
  const token = localStorage.getItem('greentech_token');
  const userData = localStorage.getItem('greentech_user');
  
  console.log('[DEBUG] checkAuth - token:', !!token, 'userData:', !!userData);
  
  if (token && userData) {
    try {
      currentUser = JSON.parse(userData);
      console.log('[DEBUG] checkAuth - usuário carregado:', currentUser);
      return true;
    } catch (error) {
      console.error('Erro ao parsear dados do usuário:', error);
      logout();
      return false;
    }
  }
  console.log('[DEBUG] checkAuth - não autenticado');
  return false;
}

// Fazer logout
function logout() {
  localStorage.removeItem('greentech_token');
  localStorage.removeItem('greentech_user');
  currentUser = null;
  window.location.href = '/login/';
}

// Verificar se a rota requer autenticação
function requiresAuth(route) {
  const protectedRoutes = ['/index/', '/link2/', '/link3/', '/link4/'];
  return protectedRoutes.includes(route);
}

// Função para forçar redirecionamento para login se não autenticado
function forceAuth(page, router) {
  console.log('[DEBUG] forceAuth - verificando autenticação para página:', page.name);
  if (!checkAuth()) {
    console.log('[DEBUG] forceAuth - não autenticado, redirecionando para login');
    router.navigate('/login/');
    return false;
  }
  console.log('[DEBUG] forceAuth - autenticado, permitindo acesso');
  return true;
}

var app = new Framework7({
  // Elemento raiz do app
  el: '#app',
  // Nome do app
  name: 'GreenTech',
  // ID do app
  id: 'com.greentech.app',
  // Habilita o painel deslizante
  panel: {
    swipe: true,
  },
  // Configura os diálogos
  dialog: {
    buttonOk: 'Sim',
    buttonCancel: 'Cancelar',
  },
  // Define as rotas
  routes: [
    {
      path: '/historico/',
      url: '/historico.html',
      animate: false,
      on: {
        pageBeforeIn: function (event, page) {
          console.log('[DEBUG] /historico/ - pageBeforeIn iniciado');
          if (!forceAuth(page, app.views.main.router)) {
            console.log('[DEBUG] /historico/ - forceAuth falhou, saindo');
            return;
          }
          console.log('[DEBUG] /historico/ - forceAuth passou, carregando histórico');
          // Carregar histórico detalhado se necessário
          if (window.GreenTechApp && window.GreenTechApp.renderHistoricoDetalhado) {
            console.log('[DEBUG] /historico/ - chamando renderHistoricoDetalhado');
            window.GreenTechApp.renderHistoricoDetalhado();
          } else {
            console.log('[DEBUG] /historico/ - GreenTechApp ou renderHistoricoDetalhado não disponível');
          }
        },
        pageAfterIn: function (event, page) {
          console.log('[DEBUG] /historico/ - pageAfterIn');
        },
        pageInit: function (event, page) {
          console.log('[DEBUG] /historico/ - pageInit');
        },
        pageBeforeRemove: function (event, page) {
          console.log('[DEBUG] /historico/ - pageBeforeRemove');
        },
      },
    },
    {
      path: '/login/',
      url: '/login.html',
      animate: false,
      on: {
        pageBeforeIn: function (event, page) {
          if (checkAuth()) {
            app.views.main.router.navigate('/index/');
          }
        },
        pageAfterIn: function (event, page) {
          // Executa algo depois da página ser exibida
        },
        pageInit: function (event, page) {
          // Executa algo quando a página for inicializada
        },
        pageBeforeRemove: function (event, page) {
          // Executa algo antes da página ser removida do DOM
        },
      },
    },
    {
      path: '/index/',
      url: '/index.html',
      animate: false,
      on: {
        pageBeforeIn: function (event, page) {
          if (!forceAuth(page, app.views.main.router)) return;
          // Recarregar dados ao entrar na Home
          if (window.GreenTechApp) {
            window.GreenTechApp.loadMaterials().then(() => {
              window.GreenTechApp.updateStats();
              window.GreenTechApp.updateHomeStats();
            });
          }
        },
        pageAfterIn: function (event, page) {
          // Atualiza o nome do usuário no topo
          const currentUser = window.GreenTechAuth.getCurrentUser();
          const userNameEl = document.getElementById('user-name');
          if (currentUser && userNameEl) {
            userNameEl.textContent = currentUser.nome;
          }
        },
        pageInit: function (event, page) {
          // Executa algo quando a página for inicializada
        },
        pageBeforeRemove: function (event, page) {
          // Executa algo antes da página ser removida do DOM
        },
      },
    },
    {
      path: '/link2/',
      url: '/link2.html',
      animate: false,
      on: {
        pageBeforeIn: function (event, page) {
          if (!forceAuth(page, app.views.main.router)) return;
          // Recarregar dados ao entrar na página de adicionar material
          if (window.GreenTechApp) {
            window.GreenTechApp.loadMaterials().then(() => {
              window.GreenTechApp.updateStats();
            });
          }
        },
        pageAfterIn: function (event, page) {},
        pageInit: function (event, page) {},
        pageBeforeRemove: function (event, page) {},
      },
    },
    {
      path: '/link3/',
      url: '/link3.html',
      animate: false,
      on: {
        pageBeforeIn: function (event, page) {
          if (!forceAuth(page, app.views.main.router)) return;
          // Recarregar dados ao entrar na página de busca
          if (window.GreenTechApp) {
            window.GreenTechApp.loadMaterials().then(() => {
              window.GreenTechApp.performSearch('', 'all');
            });
          }
        },
        pageAfterIn: function (event, page) {},
        pageInit: function (event, page) {},
        pageBeforeRemove: function (event, page) {},
      },
    },
    {
      path: '/link4/',
      url: '/link4.html',
      animate: false,
      on: {
        pageBeforeIn: function (event, page) {
          if (!forceAuth(page, app.views.main.router)) return;
          // Recarregar dados ao entrar na página de dados/estatísticas
          if (window.GreenTechApp) {
            window.GreenTechApp.loadMaterials().then(() => {
              window.GreenTechApp.updateStats();
            });
          }
        },
        pageAfterIn: function (event, page) {},
        pageInit: function (event, page) {},
        pageBeforeRemove: function (event, page) {},
      },
    },
  ],
});

// Evento para atualizar o item ativo no menu conforme a rota muda
app.on('routeChange', function (route) {
  var currentRoute = route.url;
  console.log('Rota atual:', currentRoute);
  
  // Atualizar tabs apenas se não estiver na página de login
  if (currentRoute !== '/login/') {
    document.querySelectorAll('.tab-link').forEach(function (el) {
      el.classList.remove('active');
    });
    var targetEl = document.querySelector('.tab-link[href="' + currentRoute + '"]');
    if (targetEl) {
      targetEl.classList.add('active');
    }
  }
});

function onDeviceReady() {
  console.log('[DEBUG] onDeviceReady - iniciado');
  // Verificar autenticação inicial
  if (!checkAuth()) {
    console.log('[DEBUG] onDeviceReady - não autenticado, indo para login');
    // Se não estiver logado, ir para login
    var mainView = app.views.create('.view-main', { url: '/login/' });
  } else {
    console.log('[DEBUG] onDeviceReady - autenticado');
    // Se estiver logado, verificar se há uma rota específica na URL
    const currentPath = window.location.pathname;
    console.log('[DEBUG] onDeviceReady - currentPath:', currentPath);
    if (currentPath && currentPath !== '/' && currentPath !== '/index/') {
      // Se há uma rota específica, usar ela
      console.log('[DEBUG] onDeviceReady - usando rota específica:', currentPath);
      var mainView = app.views.create('.view-main', { url: currentPath });
    } else {
      // Se não há rota específica, ir para home
      console.log('[DEBUG] onDeviceReady - indo para index');
      var mainView = app.views.create('.view-main', { url: '/index/' });
    }
  }

  // Trata o botão voltar (Android)
  document.addEventListener('backbutton', function (e) {
    e.preventDefault();
    if (mainView.router.currentRoute && mainView.router.currentRoute.path === '/index/') {
      app.dialog.confirm('Deseja sair do aplicativo?', function () {
        navigator.app.exitApp();
      });
    } else {
      mainView.router.back({ force: true });
    }
  }, false);
}

// Funções globais para autenticação
window.GreenTechAuth = {
  checkAuth,
  logout,
  getCurrentUser: () => currentUser,
  getToken: () => localStorage.getItem('greentech_token')
};
