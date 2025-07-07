// Gerenciamento de dados do GreenTech com integração ao backend

class GreenTechApp {
    constructor() {
        this.materials = [];
        this.api = window.GreenTechAPI;
        this.init();
    }

    // Inicializa o app
    async init() {
        await this.loadMaterials();
        this.setupEventListeners();
        this.updateStats();
        this.updateHomeStats();
    }

    // Carrega materiais do backend
    async loadMaterials() {
        try {
            const user = this.api.getCurrentUser();
            let response;
            if (user) {
                response = await fetch(`https://iphone-compatible-1.onrender.com/api/materials?user_id=${user.id}`);
                response = await response.json();
            } else {
                response = await this.api.getMaterials();
            }
            this.materials = response.materials || [];
        } catch (error) {
            console.error('Erro ao carregar materiais:', error);
            this.materials = [];
        }
    }

    // Adiciona um novo material
    async addMaterial(material) {
        try {
            const newMaterial = await this.api.addMaterial(material);
            this.materials.push(newMaterial);
            await this.loadMaterials();
            this.updateStats();
            this.updateHomeStats();
            return newMaterial;
        } catch (error) {
            console.error('Erro ao adicionar material:', error);
            throw error;
        }
    }

    // Busca materiais
    async searchMaterials(query, filter = 'all') {
        try {
            return await this.api.searchMaterials(query, filter);
        } catch (error) {
            console.error('Erro na busca:', error);
            return [];
        }
    }

    // Atualiza estatísticas
    async updateStats() {
        try {
            const stats = await this.api.getStats();
            
            // Atualiza elementos na página de dados
            const totalItemsEl = document.getElementById('total-items');
            const totalWeightEl = document.getElementById('total-weight');
            const monthItemsEl = document.getElementById('month-items');

            if (totalItemsEl) totalItemsEl.textContent = stats.totalItems || 0;
            if (totalWeightEl) totalWeightEl.textContent = (stats.totalWeight || 0).toFixed(1) + ' kg';
            if (monthItemsEl) monthItemsEl.textContent = stats.monthItems || 0;

            // Atualiza lista de itens recentes
            this.updateRecentItems();
        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
        }
    }

    // Atualiza estatísticas da página inicial
    updateHomeStats() {
        const totalMaterials = this.materials.length;
        const totalWeight = this.materials.reduce((sum, material) => 
            sum + (parseFloat(material.peso) || 0), 0);
        
        const today = new Date().toDateString();
        const todayCount = this.materials.filter(material => 
            new Date(material.data_criacao).toDateString() === today).length;

        const totalMaterialsEl = document.getElementById('total-materials');
        const totalWeightHomeEl = document.getElementById('total-weight-home');
        const todayCountEl = document.getElementById('today-count');

        if (totalMaterialsEl) totalMaterialsEl.textContent = totalMaterials;
        if (totalWeightHomeEl) totalWeightHomeEl.textContent = totalWeight.toFixed(1);
        if (todayCountEl) todayCountEl.textContent = todayCount;
    }

    // Atualiza lista de itens recentes
    updateRecentItems() {
        const recentListEl = document.getElementById('recent-list');
        if (!recentListEl) return;

        const recentItems = this.materials
            .sort((a, b) => new Date(b.data_criacao) - new Date(a.data_criacao))
            .slice(0, 5);

        if (recentItems.length === 0) {
            recentListEl.innerHTML = '<p class="no-data">Nenhum item cadastrado ainda</p>';
            return;
        }

        const itemsHTML = recentItems.map(item => `
            <div class="recent-item">
                <div class="item-info">
                    <strong>${this.getTipoDisplayName(item.tipo)}</strong>
                    <span>${item.quantidade}</span>
                    ${item.peso ? `<small>${item.peso} kg</small>` : ''}
                </div>
                <div class="item-date">
                    ${new Date(item.data_criacao).toLocaleDateString('pt-BR')}
                </div>
            </div>
        `).join('');

        recentListEl.innerHTML = itemsHTML;
    }

    // Converte tipo para nome de exibição
    getTipoDisplayName(tipo) {
        const tipos = {
            'plastic': 'Plástico',
            'metal': 'Metal',
            'paper': 'Papel',
            'glass': 'Vidro',
            'organic': 'Orgânico',
            'other': 'Outro'
        };
        return tipos[tipo] || tipo;
    }

    // Configura event listeners
    setupEventListeners() {
        // Formulário de adicionar material
        const addForm = document.getElementById('add-material-form');
        if (addForm) {
            addForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAddMaterial(e);
            });
        }

        // Input de arquivo
        const fileInput = document.getElementById('imagem');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }

        // Busca
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e));
        }

        // Filtros
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => this.handleFilter(e));
        });

        // Botão de localização
        const btnLocation = document.getElementById('btn-get-location');
        const latInput = document.getElementById('latitude');
        const lngInput = document.getElementById('longitude');
        const status = document.getElementById('location-status');
        if (btnLocation) {
            btnLocation.onclick = function() {
                if (!navigator.geolocation) {
                    status.textContent = 'Geolocalização não suportada neste navegador.';
                    status.style.color = '#e53935';
                    return;
                }
                status.textContent = 'Obtendo localização...';
                status.style.color = '#388e3c';
                navigator.geolocation.getCurrentPosition(function(pos) {
                    latInput.value = pos.coords.latitude;
                    lngInput.value = pos.coords.longitude;
                    status.textContent = 'Localização preenchida com sucesso!';
                    status.style.color = '#388e3c';
                }, function(err) {
                    status.textContent = 'Não foi possível obter localização: ' + err.message;
                    status.style.color = '#e53935';
                });
            };
        }
    }

    // Manipula adição de material
    async handleAddMaterial(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const material = {
            tipo: formData.get('tipo'),
            quantidade: formData.get('quantidade'),
            peso: formData.get('peso'),
            descricao: formData.get('descricao')
        };

        if (!material.tipo || !material.quantidade) {
            alert('Por favor, preencha os campos obrigatórios.');
            return;
        }

        // SEMPRE tenta pegar latitude/longitude dos campos ocultos
        const latInput = document.getElementById('latitude');
        const lngInput = document.getElementById('longitude');
        const lat = latInput ? latInput.value : '';
        const lng = lngInput ? lngInput.value : '';
        if (lat && lng) {
            material.latitude = lat;
            material.longitude = lng;
            console.log('[Cadastro] Latitude enviada:', lat, 'Longitude enviada:', lng);
            try {
                await this.addMaterial(material);
                await this.loadMaterials();
                // Mostra mensagem de sucesso
                const successMsg = document.getElementById('success-message');
                if (successMsg) {
                    successMsg.style.display = 'flex';
                    setTimeout(() => {
                        successMsg.style.display = 'none';
                    }, 3000);
                }
                // Limpa formulário
                e.target.reset();
                document.getElementById('file-name').textContent = '';
            } catch (error) {
                alert('Erro ao adicionar material. Tente novamente.');
            }
            return;
        }

        // Se não houver, tenta obter via geolocalização
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(async (position) => {
                material.latitude = position.coords.latitude;
                material.longitude = position.coords.longitude;
                console.log('[Cadastro] Latitude enviada:', position.coords.latitude, 'Longitude enviada:', position.coords.longitude);
                try {
                    await this.addMaterial(material);
                    await this.loadMaterials();
                    // Mostra mensagem de sucesso
                    const successMsg = document.getElementById('success-message');
                    if (successMsg) {
                        successMsg.style.display = 'flex';
                        setTimeout(() => {
                            successMsg.style.display = 'none';
                        }, 3000);
                    }
                    // Limpa formulário
                    e.target.reset();
                    document.getElementById('file-name').textContent = '';
                } catch (error) {
                    alert('Erro ao adicionar material. Tente novamente.');
                }
            }, (error) => {
                alert('Não foi possível obter sua localização. O cadastro não foi realizado.');
            });
        } else {
            alert('Geolocalização não suportada neste navegador. O cadastro não foi realizado.');
        }
    }

    // Manipula seleção de arquivo
    handleFileSelect(e) {
        const file = e.target.files[0];
        const fileNameEl = document.getElementById('file-name');
        
        if (file) {
            fileNameEl.textContent = file.name;
        } else {
            fileNameEl.textContent = '';
        }
    }

    // Manipula busca
    async handleSearch(e) {
        const query = e.target.value;
        const activeFilter = document.querySelector('.filter-btn.active')?.dataset.filter || 'all';
        await this.performSearch(query, activeFilter);
    }

    // Manipula filtros
    async handleFilter(e) {
        const filter = e.target.dataset.filter;
        const query = document.getElementById('search-input')?.value || '';
        
        // Atualiza botões ativos
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        
        await this.performSearch(query, filter);
    }

    // Executa busca
    async performSearch(query, filter) {
        try {
            const results = await this.searchMaterials(query, filter);
            this.displaySearchResults(results);
        } catch (error) {
            console.error('Erro na busca:', error);
            this.displaySearchResults([]);
        }
    }

    // Exibe resultados da busca
    displaySearchResults(results) {
        const resultsContainer = document.getElementById('search-results');
        if (!resultsContainer) return;

        // Corrigir para pegar o array de materiais
        const materials = results.materials || [];

        if (materials.length === 0) {
            resultsContainer.innerHTML = `
                <div class="no-results">
                    <i class="mdi mdi-magnify"></i>
                    <p>Nenhum material encontrado</p>
                </div>
            `;
            return;
        }

        const resultsHTML = materials.map(material => `
            <div class="material-item">
                <div class="material-info">
                    <h4>${this.getTipoDisplayName(material.tipo)}</h4>
                    <p><strong>Quantidade:</strong> ${material.quantidade}</p>
                    ${material.peso ? `<p><strong>Peso:</strong> ${material.peso} kg</p>` : ''}
                    ${material.descricao ? `<p><strong>Descrição:</strong> ${material.descricao}</p>` : ''}
                    <small>Criado em: ${new Date(material.data_criacao).toLocaleDateString('pt-BR')}</small>
                </div>
                <div class="material-actions">
                    <button class="btn-contact" onclick="openRouteMaterial(${material.latitude},${material.longitude})">
                        <i class="mdi mdi-phone"></i> Aceitar
                    </button>
                </div>
            </div>
        `).join('');

        resultsContainer.innerHTML = resultsHTML;
    }

    // Atualiza localização do catador
    async updateCatadorLocation() {
        const user = this.api.getCurrentUser();
        if (!user || user.perfil !== 'catador') {
            alert('Apenas catadores podem atualizar a localização.');
            return;
        }
        if (!navigator.geolocation) {
            alert('Geolocalização não suportada neste navegador.');
            return;
        }
        navigator.geolocation.getCurrentPosition(async (position) => {
            try {
                const latitude = position.coords.latitude;
                const longitude = position.coords.longitude;
                await fetch(`https://iphone-compatible-1.onrender.com/api/catadores/${user.id}/localizacao`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.api.token}`
                    },
                    body: JSON.stringify({ latitude, longitude })
                });
                alert('Localização atualizada com sucesso!');
            } catch (error) {
                alert('Erro ao atualizar localização.');
            }
        }, (error) => {
            alert('Erro ao obter localização: ' + error.message);
        });
    }
}

// Função para contatar coletor (placeholder)
function contactCollector(materialId) {
    alert(`Funcionalidade de contato para material ${materialId} será implementada em breve!`);
}

// Inicializa o app quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    window.GreenTechApp = new GreenTechApp();
});

// Para compatibilidade com Cordova
if (window.cordova) {
    document.addEventListener('deviceready', () => {
        window.GreenTechApp = new GreenTechApp();
    }, false);
}

// Função utilitária para calcular distância entre dois pontos (Haversine)
function calcularDistanciaKm(lat1, lon1, lat2, lon2) {
    function toRad(x) { return x * Math.PI / 180; }
    const R = 6371; // km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Função para inicializar e atualizar o mapa
window.initGreenTechMap = function(userLat, userLng) {
    if (window._greentech_map) {
        window._greentech_map.remove();
        window._greentech_map = null;
    }
    window._greentech_map = L.map('map').setView([userLat, userLng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(window._greentech_map);
    // Marcador do usuário
    window._greentech_userMarker = L.marker([userLat, userLng]).addTo(window._greentech_map).bindPopup('Você está aqui!');
    let markers = [window._greentech_userMarker];
    // Loading
    document.getElementById('map-loading').style.display = 'block';
    document.getElementById('map-message').style.display = 'none';
    // Filtro de distância
    const filtro = parseFloat(document.getElementById('distance-filter').value);
    fetch('https://iphone-compatible-1.onrender.com/api/catadores')
        .then(res => res.json())
        .then(data => {
            document.getElementById('map-loading').style.display = 'none';
            const user = window.GreenTechAPI.getCurrentUser && window.GreenTechAPI.getCurrentUser();
            if (!data.catadores || data.catadores.length === 0) {
                // Só mostra mensagem se NÃO for catador
                if (!user || user.perfil !== 'catador') {
                    document.getElementById('map-message').textContent = 'Nenhum catador encontrado.';
                    document.getElementById('map-message').style.display = 'block';
                } else {
                    document.getElementById('map-message').style.display = 'none';
                }
                return;
            }
            console.log('[Catadores] Localização de referência:', userLat, userLng, '| Raio:', filtro);
            console.log('[Catadores] Lista recebida:', data.catadores.map(c => ({ id: c.id, nome: c.nome, lat: c.latitude, lng: c.longitude })));
            let count = 0;
            data.catadores.forEach(catador => {
                if (catador.latitude && catador.longitude) {
                    const dist = calcularDistanciaKm(userLat, userLng, catador.latitude, catador.longitude);
                    if (filtro >= 9999 || dist <= filtro) {
                        const popup = `<b>${catador.nome}</b><br>Email: ${catador.email || '-'}<br>Telefone: ${catador.telefone || '-'}<br><button onclick=\"contactCollector(${catador.id})\">Contatar</button><br><button style=\"background:#1976d2;color:#fff;border:none;border-radius:6px;padding:6px 14px;cursor:pointer;margin-top:6px;\" onclick=\"reativarLocalizacaoCatador(${catador.id})\">Reativar Localização</button><br><small>${dist.toFixed(2)} km de você</small>`;
                        const marker = L.marker([catador.latitude, catador.longitude]).addTo(window._greentech_map).bindPopup(popup);
                        markers.push(marker);
                        count++;
                    }
                } else {
                    // Exibe marcador cinza em Ponta Grossa para catadores sem localização
                    const defaultLat = -25.0951; // Ponta Grossa centro aproximado
                    const defaultLng = -50.1619;
                    const popup = `<b>${catador.nome}</b><br><i>Sem localização informada</i><br>Email: ${catador.email || '-'}<br>Telefone: ${catador.telefone || '-'}<br><button onclick=\"contactCollector(${catador.id})\">Contatar</button>`;
                    const marker = L.marker([defaultLat, defaultLng], {icon: L.icon({iconUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.7.1/dist/images/marker-icon-grey.png', iconSize: [25, 41], iconAnchor: [12, 41]})}).addTo(window._greentech_map).bindPopup(popup);
                    markers.push(marker);
                    count++;
                }
            });
            if (count === 0) {
                // Só mostra mensagem se NÃO for catador
                if (!user || user.perfil !== 'catador') {
                    document.getElementById('map-message').textContent = 'Nenhum catador encontrado nesse raio.';
                    document.getElementById('map-message').style.display = 'block';
                } else {
                    document.getElementById('map-message').style.display = 'none';
                }
            }
            window._greentech_markers = markers;
        })
        .catch(() => {
            document.getElementById('map-loading').style.display = 'none';
            document.getElementById('map-message').textContent = 'Erro ao buscar catadores.';
            document.getElementById('map-message').style.display = 'block';
        });
};

// Atualização automática dos marcadores
// setInterval(() => {
//     if (window._greentech_map && window._greentech_userLat && window._greentech_userLng) {
//         window.initGreenTechMap(window._greentech_userLat, window._greentech_userLng);
//     }
// }, 15000);

// Atualiza mapa ao mudar filtro de distância
window.addEventListener('DOMContentLoaded', function() {
    const filtro = document.getElementById('distance-filter');
    if (filtro) {
        filtro.addEventListener('change', () => {
            if (window._greentech_userLat && window._greentech_userLng) {
                window.initGreenTechMap(window._greentech_userLat, window._greentech_userLng);
            }
        });
    }
});

// Inicializa o mapa ao carregar a página
window.addEventListener('DOMContentLoaded', function() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            window._greentech_userLat = position.coords.latitude;
            window._greentech_userLng = position.coords.longitude;
            window.initGreenTechMap(window._greentech_userLat, window._greentech_userLng);
        }, function(error) {
            window._greentech_userLat = -25.4284;
            window._greentech_userLng = -49.2733;
            window.initGreenTechMap(window._greentech_userLat, window._greentech_userLng);
        });
    } else {
        window._greentech_userLat = -25.4284;
        window._greentech_userLng = -49.2733;
        window.initGreenTechMap(window._greentech_userLat, window._greentech_userLng);
    }
});

// Função global para contato (popup)
window.contactCollector = function(materialId) {
    alert(`Funcionalidade de contato para catador ${materialId} será implementada em breve!`);
};

// Função para abrir rota no Google Maps
window.openRoute = function(lat, lng) {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, '_blank');
};

// Função para contato rápido (WhatsApp ou email)
window.contactMaterialOwner = function(telefone, email) {
    if (telefone) {
        window.open(`https://wa.me/${telefone.replace(/\D/g, '')}`, '_blank');
    } else if (email) {
        window.open(`mailto:${email}`);
    } else {
        alert('Contato não disponível.');
    }
};

// Função para catador sinalizar interesse em coletar
window.wantCollect = function(materialId) {
    // Aqui pode ser feita uma requisição para o backend registrar o interesse
    showFeedback('Interesse registrado! O gerador será notificado.', 'success');
};

// Função para mostrar feedback visual
window.showFeedback = function(msg, type) {
    let el = document.getElementById('catador-feedback');
    if (!el) {
        el = document.createElement('div');
        el.id = 'catador-feedback';
        el.style = 'position:fixed;top:24px;left:50%;transform:translateX(-50%);z-index:9999;padding:14px 32px;border-radius:12px;font-size:17px;box-shadow:0 4px 24px rgba(0,0,0,0.10);color:#fff;display:none;';
        document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.background = type === 'success' ? '#43a047' : '#e53935';
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 2500);
};

// Função para renderizar lista de materiais disponíveis
window.renderMateriaisLista = function(materiais, userLat, userLng) {
    const lista = document.getElementById('materiais-lista');
    if (!lista) return;
    if (!materiais || materiais.length === 0) {
        lista.innerHTML = '<div style="color:#888;text-align:center;padding:24px;">Nenhum material disponível para coleta.</div>';
        return;
    }
    lista.innerHTML = materiais.map(mat => {
        const dist = (mat.latitude && mat.longitude && userLat && userLng) ? calcularDistanciaKm(userLat, userLng, mat.latitude, mat.longitude).toFixed(2) : '--';
        return `<div style="background:#f9fbe7;border-radius:12px;padding:16px 18px;margin-bottom:12px;box-shadow:0 2px 8px rgba(76,175,80,0.06);display:flex;flex-direction:column;gap:6px;">
            <b>${mat.tipo ? GreenTechApp.prototype.getTipoDisplayName(mat.tipo) : 'Material'}</b>
            <span><b>Quantidade:</b> ${mat.quantidade || '-'}</span>
            ${mat.peso ? `<span><b>Peso:</b> ${mat.peso} kg</span>` : ''}
            ${mat.descricao ? `<span><b>Descrição:</b> ${mat.descricao}</span>` : ''}
            <span><b>Distância:</b> ${dist} km</span>
            <div style="display:flex;gap:10px;margin-top:6px;">
                <button onclick="openRoute(${mat.latitude},${mat.longitude})" style="background:#388e3c;color:#fff;border:none;border-radius:6px;padding:6px 14px;cursor:pointer;">Rota</button>
                <button onclick="contactMaterialOwner('${mat.telefone || ''}','${mat.email || ''}')" style="background:#1976d2;color:#fff;border:none;border-radius:6px;padding:6px 14px;cursor:pointer;">Contato</button>
                <button onclick="wantCollect(${mat.id})" style="background:#ffb300;color:#fff;border:none;border-radius:6px;padding:6px 14px;cursor:pointer;">Quero coletar</button>
            </div>
        </div>`;
    }).join('');
};

// Atualizar lista de materiais disponíveis para coleta
window.updateMateriaisLista = function(userLat, userLng) {
    let url = 'https://iphone-compatible-1.onrender.com/api/materials?status=disponivel';
    const tipo = document.getElementById('material-type-filter').value;
    const busca = document.getElementById('material-search').value.trim().toLowerCase();
    if (tipo) url += `&tipo=${tipo}`;
    fetch(url)
        .then(res => res.json())
        .then(data => {
            let materiais = data.materials || [];
            // Filtro por busca
            if (busca) {
                materiais = materiais.filter(m =>
                    (m.tipo && GreenTechApp.prototype.getTipoDisplayName(m.tipo).toLowerCase().includes(busca)) ||
                    (m.descricao && m.descricao.toLowerCase().includes(busca))
                );
            }
            // Filtro por distância
            const filtro = parseFloat(document.getElementById('distance-filter').value);
            console.log('[Filtro] Localização de referência:', userLat, userLng, '| Raio:', filtro);
            if (userLat && userLng && filtro < 9999) {
                materiais = materiais.filter(m => m.latitude && m.longitude && calcularDistanciaKm(userLat, userLng, m.latitude, m.longitude) <= filtro);
            }
            window.renderMateriaisLista(materiais, userLat, userLng);
        });
};

// Integrar atualização da lista de materiais e mapa
window._greentech_updateCatadorDashboard = function() {
    if (window._greentech_userLat && window._greentech_userLng) {
        window.initGreenTechMap(window._greentech_userLat, window._greentech_userLng);
        window.updateMateriaisLista(window._greentech_userLat, window._greentech_userLng);
    }
};

// Atualizar lista ao mudar filtros
window.addEventListener('DOMContentLoaded', function() {
    ['material-type-filter','material-search','distance-filter'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', window._greentech_updateCatadorDashboard);
    });
});

// Atualizar lista e mapa periodicamente
// setInterval(window._greentech_updateCatadorDashboard, 15000);

// Atualizar ao carregar página
window.addEventListener('DOMContentLoaded', function() {
    if (window.GreenTechAPI.getCurrentUser()?.perfil === 'catador') {
        setTimeout(window._greentech_updateCatadorDashboard, 800);
    }
});

// Melhorar ícone flutuante de atualização de localização
window.addEventListener('DOMContentLoaded', function() {
    const btn = document.getElementById('btn-update-location-fab');
    if (btn) {
        btn.onclick = () => {
            const user = window.GreenTechAPI.getCurrentUser && window.GreenTechAPI.getCurrentUser();
            if (user && user.perfil === 'catador') {
                if (!navigator.geolocation) {
                    showFeedback('Geolocalização não suportada.', 'error');
                    return;
                }
                navigator.geolocation.getCurrentPosition(function(pos) {
                    fetch(`https://iphone-compatible-1.onrender.com/api/catadores/${user.id}/localizacao`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${window.GreenTechAPI.token}`
                        },
                        body: JSON.stringify({ latitude: pos.coords.latitude, longitude: pos.coords.longitude })
                    })
                    .then(res => res.json())
                    .then(data => {
                        if (data.success) {
                            showFeedback('Localização atualizada com sucesso!', 'success');
                            window._greentech_userLat = pos.coords.latitude;
                            window._greentech_userLng = pos.coords.longitude;
                            window.initGreenTechMap(pos.coords.latitude, pos.coords.longitude);
                        } else {
                            showFeedback('Erro ao atualizar localização.', 'error');
                        }
                    })
                    .catch(() => showFeedback('Erro ao atualizar localização.', 'error'));
                }, function(err) {
                    showFeedback('Não foi possível obter localização: ' + err.message, 'error');
                });
            } else {
                showFeedback('Apenas catadores podem atualizar localização.', 'error');
            }
        };
    }
    // Botão azul de reativar localização
    const btnReativar = document.getElementById('btn-reativar-location-fab');
    if (btnReativar) {
        btnReativar.onclick = () => {
            const user = window.GreenTechAPI.getCurrentUser && window.GreenTechAPI.getCurrentUser();
            if (user && user.perfil === 'catador') {
                window.reativarLocalizacaoCatador(user.id);
            } else {
                showFeedback('Apenas catadores podem reativar localização.', 'error');
            }
        };
    }
    // Botão vermelho de remover localização
    const btnRemover = document.getElementById('btn-remove-location-fab');
    if (btnRemover) {
        btnRemover.onclick = () => {
            const user = window.GreenTechAPI.getCurrentUser && window.GreenTechAPI.getCurrentUser();
            if (user && user.perfil === 'catador') {
                fetch(`https://iphone-compatible-1.onrender.com/api/catadores/${user.id}/localizacao`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${window.GreenTechAPI.token}`
                    },
                    body: JSON.stringify({ latitude: null, longitude: null })
                })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        showFeedback('Localização removida com sucesso!', 'success');
                        // Remover marcador do usuário do mapa
                        if (window._greentech_map && window._greentech_userMarker) {
                            window._greentech_map.removeLayer(window._greentech_userMarker);
                            window._greentech_userMarker = null;
                        }
                        // Remover do array de marcadores, se existir
                        if (window._greentech_markers) {
                            window._greentech_markers = window._greentech_markers.filter(m => m !== window._greentech_userMarker);
                        }
                    } else {
                        showFeedback('Erro ao remover localização.', 'error');
                    }
                })
                .catch(() => showFeedback('Erro ao remover localização.', 'error'));
            } else {
                showFeedback('Apenas catadores podem remover localização.', 'error');
            }
        };
    }
});

// Função global para abrir rota até o material
window.openRouteMaterial = function(lat, lng) {
    console.log('[Rota] Latitude usada:', lat, 'Longitude usada:', lng);
    if (lat && lng) {
        const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
        window.open(url, '_blank');
    } else {
        alert('Localização do material não disponível.');
    }
};

// Atualizar localização do catador
window.updateCatadorLocation = function(lat, lng) {
    window._greentech_userLat = lat;
    window._greentech_userLng = lng;
    console.log('[Catador] Localização atualizada:', lat, lng);
};

// Garante o registro do event listener mesmo em SPAs/Framework7

document.addEventListener('page:init', function (e) {
    // Só registra o listener se estiver na página de adicionar material
    if (e.target && e.target.getAttribute('data-name') === 'link2') {
        const addForm = document.getElementById('add-material-form');
        if (addForm) {
            addForm.addEventListener('submit', (ev) => {
                ev.preventDefault();
                window.GreenTechApp.handleAddMaterial(ev);
            });
        }
    }
});

// Função global para reativar localização do catador
window.reativarLocalizacaoCatador = function(catadorId) {
    if (!navigator.geolocation) {
        showFeedback('Geolocalização não suportada.', 'error');
        return;
    }
    navigator.geolocation.getCurrentPosition(function(pos) {
        fetch(`https://iphone-compatible-1.onrender.com/api/catadores/${catadorId}/localizacao`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${window.GreenTechAPI.token}`
            },
            body: JSON.stringify({ latitude: Number(pos.coords.latitude), longitude: Number(pos.coords.longitude) })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                showFeedback('Localização reativada com sucesso!', 'success');
                // Atualizar interface: esconder azul, mostrar vermelho
                // document.getElementById('btn-reativar-location-fab').style.display = 'none';
                // document.getElementById('btn-remove-location-fab').style.display = '';
                // Opcional: atualizar mapa sem recarregar
            } else {
                showFeedback('Erro ao reativar localização.', 'error');
            }
        })
        .catch(() => showFeedback('Erro ao reativar localização.', 'error'));
    }, function(err) {
        showFeedback('Não foi possível obter localização: ' + err.message, 'error');
    });
};

// Garante que o mapa seja destruído ao sair da página para evitar bugs visuais
window.addEventListener('page:beforeremove', function (e) {
    if (window._greentech_map) {
        window._greentech_map.remove();
        window._greentech_map = null;
    }
}); 