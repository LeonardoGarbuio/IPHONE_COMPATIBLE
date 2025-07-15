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
        // Remover chamada global de setupEventListeners()
        // this.setupEventListeners();
        this.updateStats();
        this.updateHomeStats();
        await this.renderHistoricoColetas(); // Chamar renderHistoricoColetas ao entrar na tela de estatísticas
    }

    // Carrega materiais do backend
    async loadMaterials() {
        try {
            const user = this.api.getCurrentUser();
            let response;
            if (user) {
                if (user.perfil === 'catador') {
                    // Para catadores, buscar materiais que eles coletaram
                    const url = `${BASE_URL}/materials?catador_id=${user.id}`;
                    console.log('[DEBUG] URL materiais (catador):', url);
                    response = await fetch(url);
                } else {
                    // Para geradores, buscar materiais que eles criaram
                    const url = `${BASE_URL}/materials?user_id=${user.id}&perfil=${user.perfil}`;
                    console.log('[DEBUG] URL materiais (gerador):', url);
                    response = await fetch(url);
                }
                response = await response.json();
            } else {
                response = await this.api.getMaterials();
            }
            this.materials = response.materials || [];
            console.log('[DEBUG] loadMaterials - materiais carregados:', this.materials);
        } catch (error) {
            console.error('Erro ao carregar materiais:', error);
            this.materials = [];
        }
    }

    // Adiciona um novo material
    async addMaterial(material) {
        try {
            console.log('[DEBUG] addMaterial - material a ser enviado:', material);
            const newMaterial = await this.api.addMaterial(material);
            console.log('[DEBUG] addMaterial - resposta do backend:', newMaterial);
            
            // Recarrega materiais para garantir dados atualizados
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
            const user = this.api.getCurrentUser();
            const stats = await this.api.getStats(user && user.perfil === 'catador' ? { catador_id: user.id } : {});
            console.log('[DEBUG] updateStats - stats recebidas:', stats);
            // Atualiza elementos na página de dados
            const totalItemsEl = document.getElementById('total-items');
            const totalWeightEl = document.getElementById('total-weight');
            const monthItemsEl = document.getElementById('month-items');
            const totalWeightAllEl = document.getElementById('total-weight-all');

            if (totalItemsEl) {
                totalItemsEl.textContent = stats.totalItems || 0;
            } else {
                console.log('[DEBUG] Elemento total-items não encontrado');
            }
            if (totalWeightEl) {
                totalWeightEl.textContent = (stats.todayItemsWeight || 0).toFixed(1) + ' kg';
            } else {
                console.log('[DEBUG] Elemento total-weight não encontrado');
            }
            if (monthItemsEl) {
                monthItemsEl.textContent = stats.monthItems || 0;
            } else {
                console.log('[DEBUG] Elemento month-items não encontrado');
            }
            if (totalWeightAllEl) {
                totalWeightAllEl.textContent = (stats.totalWeight || 0).toFixed(1) + ' kg';
            } else {
                console.log('[DEBUG] Elemento total-weight-all não encontrado');
            }

            // Atualiza lista de itens recentes
            this.updateRecentItems();
        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
        }
    }

    // Atualiza estatísticas da página inicial
    updateHomeStats() {
        const totalMaterials = this.materials.length;
        const totalWeight = this.materials.reduce((sum, material) => {
            const peso = parseFloat(material.peso) || 0;
            console.log('[DEBUG] Material:', material.tipo, 'peso:', peso);
            return sum + peso;
        }, 0);
        const today = new Date().toDateString();
        const todayCount = this.materials.filter(material => 
            new Date(material.data_criacao).toDateString() === today).length;
        
        console.log('[DEBUG] updateHomeStats - totalMaterials:', totalMaterials, 'totalWeight:', totalWeight, 'todayCount:', todayCount);
        
        const totalMaterialsEl = document.getElementById('total-materials');
        const totalWeightHomeEl = document.getElementById('total-weight-home');
        const todayCountEl = document.getElementById('today-count');

        if (totalMaterialsEl) {
            totalMaterialsEl.textContent = totalMaterials;
        } else {
            console.log('[DEBUG] Elemento total-materials não encontrado');
        }
        if (totalWeightHomeEl) {
            totalWeightHomeEl.textContent = totalWeight.toFixed(1);
        } else {
            console.log('[DEBUG] Elemento total-weight-home não encontrado');
        }
        if (todayCountEl) {
            todayCountEl.textContent = todayCount;
        } else {
            console.log('[DEBUG] Elemento today-count não encontrado');
        }
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

    // Renderiza histórico de coletas
    async renderHistoricoDetalhado() {
        const historicoLista = document.getElementById('historico-lista');
        const totalColetas = document.getElementById('total-coletas');
        const pesoTotal = document.getElementById('peso-total');
        if (!historicoLista) return;
        try {
            const user = this.api.getCurrentUser();
            if (!user || user.perfil !== 'catador') {
                historicoLista.innerHTML = `<div class="text-align-center"><i class="mdi mdi-history" style="font-size: 3rem; color: #ccc;"></i><p>Nenhuma coleta registrada ainda</p></div>`;
                if (totalColetas) totalColetas.textContent = '0';
                if (pesoTotal) pesoTotal.textContent = '0.0 kg';
                return;
            }
            // Buscar histórico diretamente do endpoint correto
            const historico = await this.api.getHistoricoColetas(user.id);
            const materiais = historico.coletas || [];
            // Calcular estatísticas
            const total = materiais.length;
            const peso = materiais.reduce((sum, m) => sum + (parseFloat(m.peso) || 0), 0);
            if (totalColetas) totalColetas.textContent = total;
            if (pesoTotal) pesoTotal.textContent = peso.toFixed(1) + ' kg';
            if (materiais.length === 0) {
                historicoLista.innerHTML = `<div class="text-align-center"><i class="mdi mdi-history" style="font-size: 3rem; color: #ccc;"></i><p>Nenhuma coleta registrada ainda</p></div>`;
                return;
            }
            const historicoHTML = materiais
                .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
                .map(material => `
                    <div class="historico-item">
                        <div class="historico-item-content">
                            <div>
                                <strong>${this.getTipoDisplayName(material.tipo)}</strong>
                                <div class="historico-info">
                                    Quantidade: ${material.quantidade}
                                    ${material.peso ? ` | Peso: ${material.peso} kg` : ''}
                                </div>
                                <div class="historico-data">
                                    Coletado em: ${material.updated_at ? new Date(material.updated_at).toLocaleDateString('pt-BR') : (material.created_at ? new Date(material.created_at).toLocaleDateString('pt-BR') : '-')}
                                </div>
                            </div>
                            <div>
                                <span class="badge-coletado">Coletado</span>
                            </div>
                        </div>
                    </div>
                `).join('');
            historicoLista.innerHTML = historicoHTML;
        } catch (error) {
            console.error('Erro ao carregar histórico:', error);
            historicoLista.innerHTML = `<div class="text-align-center"><i class="mdi mdi-alert" style="font-size: 3rem; color: #f44336;"></i><p>Erro ao carregar histórico</p></div>`;
        }
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
        console.log('[DEBUG] setupEventListeners chamado');
        
        // Formulário de adicionar material
        const addForm = document.getElementById('add-material-form');
        console.log('[DEBUG] addForm encontrado:', addForm);
        
        if (addForm) {
            addForm.addEventListener('submit', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('[DEBUG] Formulário submetido, prevenindo redirecionamento');
                this.handleAddMaterial(e);
                return false;
            });
            console.log('[DEBUG] Event listener do formulário configurado');
        } else {
            console.log('[DEBUG] Formulário add-material-form não encontrado');
        }

        // Event listener direto no botão de adicionar material
        const addBtn = document.getElementById('btn-add-material');
        console.log('[DEBUG] addBtn encontrado:', addBtn);
        
        if (addBtn) {
            addBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('[DEBUG] Botão de adicionar material clicado');
                // Pega os dados do formulário manualmente
                const form = document.getElementById('add-material-form');
                if (form) {
                    // Antes de permitir o cadastro, verifica se localização foi preenchida
                    const latInput = document.getElementById('latitude');
                    const lngInput = document.getElementById('longitude');
                    const status = document.getElementById('location-status');
                    const lat = latInput ? latInput.value : '';
                    const lng = lngInput ? lngInput.value : '';
                    if (!lat || !lng) {
                        alert('Por favor, clique em "Usar minha localização" para preencher a latitude e longitude antes de cadastrar.');
                        if (status) {
                            status.textContent = 'Preencha a localização antes de cadastrar!';
                            status.style.color = '#e53935';
                        }
                        return;
                    }
                    const formData = new FormData(form);
                    const material = {
                        tipo: formData.get('tipo'),
                        quantidade: formData.get('quantidade'),
                        peso: formData.get('peso'),
                        descricao: formData.get('descricao'),
                        latitude: lat,
                        longitude: lng
                    };
                    console.log('[DEBUG] Material extraído do formulário (via botão):', material);
                    if (!material.tipo || !material.quantidade) {
                        alert('Por favor, preencha os campos obrigatórios.');
                        return;
                    }
                    // Chama a função de adicionar material
                    this.handleAddMaterial({ target: form, preventDefault: () => {} });
                }
                return false;
            });
            console.log('[DEBUG] Event listener do botão configurado');
        } else {
            console.log('[DEBUG] Botão btn-add-material não encontrado');
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
        // (Removido o listener direto do botão para evitar duplicidade)
    }

    // Manipula adição de material
    async handleAddMaterial(e) {
        console.log('[DEBUG] handleAddMaterial chamado');
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const material = {
            tipo: formData.get('tipo'),
            quantidade: formData.get('quantidade'),
            peso: formData.get('peso'),
            descricao: formData.get('descricao')
        };

        // LOGS DETALHADOS DE DEPURAÇÃO
        const latInput = document.getElementById('latitude');
        const lngInput = document.getElementById('longitude');
        const lat = latInput ? latInput.value : '';
        const lng = lngInput ? lngInput.value : '';
        console.log('[DEBUG] Valor do input latitude:', lat);
        console.log('[DEBUG] Valor do input longitude:', lng);

        if (lat && lng && !isNaN(Number(lat)) && !isNaN(Number(lng))) {
            material.latitude = Number(lat);
            material.longitude = Number(lng);
            console.log('[Cadastro] Latitude enviada:', material.latitude, 'Longitude enviada:', material.longitude);
        } else {
            console.log('[Cadastro] Localização não preenchida ou inválida, não será enviada.');
        }

        console.log('[DEBUG] Objeto material FINAL a ser enviado:', material);

        if (!material.tipo || !material.quantidade) {
            alert('Por favor, preencha os campos obrigatórios.');
            return;
        }

        try {
            console.log('[Cadastro] Material a ser enviado:', material);
            await this.addMaterial(material);
            
            // Recarrega materiais e atualiza estatísticas
            await this.loadMaterials();
            this.updateStats();
            this.updateHomeStats();
            
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
            const fileNameEl = document.getElementById('file-name');
            if (fileNameEl) fileNameEl.textContent = '';
            
            // Limpa campos de localização
            if (latInput) latInput.value = '';
            if (lngInput) lngInput.value = '';
            
            console.log('[Cadastro] Material adicionado com sucesso!');
            
        } catch (error) {
            console.error('[Cadastro] Erro ao adicionar material:', error);
            alert('Erro ao adicionar material. Tente novamente.');
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

        // Antes de mapear os materiais para HTML, filtrar para não exibir status 'coletado'
        const filteredMaterials = materials.filter(material => material.status !== 'coletado');

        if (filteredMaterials.length === 0) {
            resultsContainer.innerHTML = `
                <div class="no-results">
                    <i class="mdi mdi-magnify"></i>
                    <p>Nenhum material encontrado</p>
                </div>
            `;
            return;
        }

        const user = window.GreenTechAPI.getCurrentUser();
        const resultsHTML = filteredMaterials.map(material => {
            let aceitarBtn = '';
            if (user && user.perfil === 'catador') {
                if (material.status === 'disponivel') {
                    aceitarBtn = `<button class="btn-contact" onclick="aceitarMaterial(${material.id})"><i class="mdi mdi-phone"></i> Aceitar</button>`;
                } else if (material.status === 'reservado') {
                    if (material.catador_id === user.id) {
                        aceitarBtn = `<button class="btn-contact" disabled style="background:#4caf50;color:#fff;"><i class="mdi mdi-check"></i> Reservado por você</button>`;
                        aceitarBtn += `<button class="btn-coletar" style="margin-left:8px;background:#1976d2;color:#fff;" onclick="coletarMaterial(${material.id})"><i class="mdi mdi-truck-check"></i> Coletar</button>`;
                    } else {
                        aceitarBtn = `<button class="btn-contact" disabled style="background:#aaa;color:#fff;"><i class="mdi mdi-lock"></i> Reservado</button>`;
                    }
                } else if (material.status === 'coletado') {
                    aceitarBtn = `<button class="btn-contact" disabled style="background:#aaa;color:#fff;"><i class="mdi mdi-check-all"></i> Coletado</button>`;
                }
            }
            return `
                <div class="material-item">
                    <div class="material-info">
                        <h4>${this.getTipoDisplayName(material.tipo)}</h4>
                        <p><strong>Quantidade:</strong> ${material.quantidade}</p>
                        ${material.peso ? `<p><strong>Peso:</strong> ${material.peso} kg</p>` : ''}
                        ${material.descricao ? `<p><strong>Descrição:</strong> ${material.descricao}</p>` : ''}
                        <small>Criado em: ${new Date(material.data_criacao).toLocaleDateString('pt-BR')}</small>
                    </div>
                    <div class="material-actions">
                        ${aceitarBtn}
                    </div>
                </div>
            `;
        }).join('');

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
                await fetch(`${BASE_URL}/catadores/${user.id}/localizacao`, {
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

    async renderHistoricoColetas() {
        const user = this.api.getCurrentUser();
        if (!user || user.perfil !== 'catador') return;
        const historico = await this.api.getHistoricoColetas(user.id);
        const container = document.getElementById('historico-coletas');
        if (!container) return;
        if (!historico.coletas || historico.coletas.length === 0) {
            container.innerHTML = '<p style="color:#607d8b;text-align:center;">Nenhuma coleta realizada ainda.</p>';
            return;
        }
        container.innerHTML = historico.coletas.map(item => `
            <div style="background:#fff;border-radius:10px;padding:14px 18px;margin:10px 0;box-shadow:0 2px 8px rgba(0,0,0,0.04);display:flex;justify-content:space-between;align-items:center;">
                <div>
                    <b>${this.getTipoDisplayName(item.tipo)}</b><br>
                    <small>${item.quantidade || ''}</small>
                </div>
                <div style="text-align:right;">
                    <span style="font-weight:bold;">${item.peso || 0} kg</span><br>
                    <small>${new Date(item.updated_at || item.created_at).toLocaleDateString('pt-BR')}</small>
                </div>
            </div>
        `).join('');
    }


}

// --- INÍCIO: Função para traçar rota no mapa usando Leaflet Routing Machine ---
let routingControl = null;
function mostrarRotaNoMapa(origem, destino) {
    // Converte para número se vier como string
    if (origem && destino) {
        origem.lat = Number(origem.lat);
        origem.lng = Number(origem.lng);
        destino.lat = Number(destino.lat);
        destino.lng = Number(destino.lng);
    }
    if (!window._greentech_map) {
        console.error('[ROTA] Mapa não está inicializado!');
        alert('Mapa não carregado!');
        return;
    }
    if (!origem || !destino) {
        console.error('[ROTA] Origem ou destino não definidos:', origem, destino);
        alert('Não foi possível obter a localização de origem ou destino.');
        return;
    }
    if (
        typeof origem.lat !== 'number' || typeof origem.lng !== 'number' ||
        typeof destino.lat !== 'number' || typeof destino.lng !== 'number' ||
        isNaN(origem.lat) || isNaN(origem.lng) || isNaN(destino.lat) || isNaN(destino.lng)
    ) {
        console.error('[ROTA] Coordenadas inválidas:', origem, destino);
        alert('Coordenadas inválidas para traçar a rota.');
        return;
    }
    console.log('[ROTA] Parâmetros recebidos para rota:', origem, destino);
    if (routingControl && window._greentech_map) {
        window._greentech_map.removeControl(routingControl);
    }
    try {
        routingControl = L.Routing.control({
            waypoints: [
                L.latLng(origem.lat, origem.lng),
                L.latLng(destino.lat, destino.lng)
            ],
            routeWhileDragging: false,
            draggableWaypoints: false,
            addWaypoints: false,
            show: false,
            createMarker: function() { return null; }
        }).addTo(window._greentech_map);
        console.log('[ROTA] Rota traçada no mapa:', origem, destino);
    } catch (err) {
        console.error('[ROTA] Erro ao traçar rota:', err);
        alert('Erro ao traçar rota no mapa. Verifique sua conexão ou tente novamente.');
    }
}
// --- FIM: Função para traçar rota no mapa ---

// Função global para aceitar material (catador)
window.aceitarMaterial = async function(materialId) {
    console.log('[DEBUG] aceitarMaterial chamado para materialId:', materialId);
    const user = window.GreenTechAPI.getCurrentUser();
    console.log('[DEBUG] Usuário atual em aceitarMaterial:', user);
    if (!user || user.perfil !== 'catador') return;
    try {
        const apiUrl = window.GreenTechAPI.baseURL + `/materials/${materialId}/reservar`;
        console.log('[DEBUG] Fazendo requisição PUT para:', apiUrl);
        const response = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${window.GreenTechAPI.token}`
            }
        });
        console.log('[DEBUG] Resposta da requisição:', response);
        if (!response.ok) {
            let data = {};
            try { data = await response.json(); } catch(e){}
            console.log('[DEBUG] Erro ao aceitar material:', data);
            return;
        }
        // Buscar dados do material aceito para pegar lat/lng
        let material = null;
        try {
            const resMat = await fetch(window.GreenTechAPI.baseURL + `/materials/${materialId}`);
            const dataMat = await resMat.json();
            material = dataMat.material || null;
        } catch (e) { material = null; }
        // Traçar rota se possível
        if (!material || !material.latitude || !material.longitude) {
            alert('O material não possui localização cadastrada. Não é possível traçar rota.');
            return;
        }
        if (!navigator.geolocation) {
            alert('Seu navegador não suporta geolocalização.');
            return;
        }
        navigator.geolocation.getCurrentPosition(function(pos) {
            if (!pos || !pos.coords || isNaN(pos.coords.latitude) || isNaN(pos.coords.longitude)) {
                alert('Não foi possível obter sua localização atual.');
                return;
            }
            mostrarRotaNoMapa(
                { lat: pos.coords.latitude, lng: pos.coords.longitude },
                { lat: material.latitude, lng: material.longitude }
            );
        }, function(err) {
            alert('Erro ao obter sua localização: ' + (err && err.message ? err.message : 'Desconhecido'));
        });
        // Não tenta atualizar array ou chamar filtrarMateriaisReativo
        // Apenas atualiza a busca na página link3.html com delay
        const searchInput = document.getElementById('search-input');
        const filterBtn = document.querySelector('.filter-btn.active');
        const query = searchInput ? searchInput.value : '';
        const filter = filterBtn ? filterBtn.dataset.filter : 'all';
        setTimeout(() => {
            console.log('[DEBUG] Chamando performSearch após aceitar:', query, filter);
            if (window.GreenTechApp && window.GreenTechApp.performSearch) {
                window.GreenTechApp.performSearch(query, filter);
            }
        }, 700);
    } catch (e) {
        console.error('[DEBUG] Erro inesperado em aceitarMaterial:', e);
    }
}

// Função global para coletar material (catador)
window.coletarMaterial = async function(materialId) {
    const user = window.GreenTechAPI.getCurrentUser();
    if (!user || user.perfil !== 'catador') {
        window.showFeedback('Apenas catadores podem coletar materiais.', 'error');
        return;
    }
    try {
        const apiUrl = window.GreenTechAPI.baseURL + `/materials/${materialId}/coletar`;
        console.log('[DEBUG] Fazendo requisição PUT para:', apiUrl);
        const response = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${window.GreenTechAPI.token}`
            }
        });
        let data = {};
        try { data = await response.json(); } catch(e) { data = {}; }
        if (!response.ok || !data.success) {
            window.showFeedback((data && data.error) ? data.error : 'Erro ao coletar material.', 'error');
            return;
        }
        window.showFeedback('Material coletado com sucesso!', 'success');
        // Atualizar histórico e lista de materiais após coletar
        if (window.GreenTechApp && window.GreenTechApp.loadMaterials) {
            await window.GreenTechApp.loadMaterials();
            if (window.GreenTechApp.updateStats) window.GreenTechApp.updateStats();
            if (window.GreenTechApp.updateHomeStats) window.GreenTechApp.updateHomeStats();
        }
        if (window.GreenTechApp && window.GreenTechApp.renderHistoricoColetas) {
            await window.GreenTechApp.renderHistoricoColetas();
        }
        // Atualizar painel de coleta do dia, se existir
        if (window._greentech_updateCatadorDashboard) {
            window._greentech_updateCatadorDashboard();
        }
        // Atualizar lista de busca para sumir imediatamente
        const searchInput = document.getElementById('search-input');
        const filterBtn = document.querySelector('.filter-btn.active');
        const query = searchInput ? searchInput.value : '';
        const filter = filterBtn ? filterBtn.dataset.filter : 'all';
        if (window.GreenTechApp && window.GreenTechApp.performSearch) {
            setTimeout(() => {
                window.GreenTechApp.performSearch(query, filter);
            }, 300);
        }
        console.log('[DEBUG] Coleta realizada, histórico e lista atualizados.');
    } catch (e) {
        console.error('[DEBUG] Erro ao coletar material:', e);
        window.showFeedback('Erro ao coletar material.', 'error');
    }
};

// Função para contatar coletor (placeholder)
function contactCollector(materialId) {
    alert(`Funcionalidade de contato para material ${materialId} será implementada em breve!`);
}

// Função para exibir/ocultar elementos da home conforme perfil
function ajustarHomePorPerfil() {
    const user = window.GreenTechAPI && window.GreenTechAPI.getCurrentUser && window.GreenTechAPI.getCurrentUser();
    const fab = document.getElementById('catador-only-fab');
    const filtroRaio = document.getElementById('filtro-raio-container');
    const quickStats = document.querySelector('.quick-stats');
    if (user && user.perfil === 'catador') {
        if (fab) fab.style.display = 'block';
        if (filtroRaio) filtroRaio.style.display = 'none';
        if (quickStats) quickStats.style.display = 'none';
    } else {
        if (fab) fab.style.display = 'none';
        if (filtroRaio) filtroRaio.style.display = '';
        if (quickStats) quickStats.style.display = '';
    }
}

function atribuirListenersCatadorFABs() {
    const btnUpdate = document.getElementById('btn-update-location-fab');
    const btnReativar = document.getElementById('btn-reativar-location-fab');
    const btnRemove = document.getElementById('btn-remove-location-fab');
    if (btnUpdate) btnUpdate.onclick = function() {
        const user = window.GreenTechAPI.getCurrentUser && window.GreenTechAPI.getCurrentUser();
        if (user && user.perfil === 'catador') {
            if (!navigator.geolocation) {
                showFeedback('Geolocalização não suportada.', 'error');
                return;
            }
            navigator.geolocation.getCurrentPosition(function(pos) {
                fetch(`${BASE_URL}/catadores/${user.id}/localizacao`, {
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
    if (btnReativar) btnReativar.onclick = function() {
        const user = window.GreenTechAPI.getCurrentUser && window.GreenTechAPI.getCurrentUser();
        if (user && user.perfil === 'catador') {
            window.reativarLocalizacaoCatador(user.id);
        } else {
            showFeedback('Apenas catadores podem reativar localização.', 'error');
        }
    };
    if (btnRemove) btnRemove.onclick = function() {
        const user = window.GreenTechAPI.getCurrentUser && window.GreenTechAPI.getCurrentUser();
        if (user && user.perfil === 'catador') {
            fetch(`${BASE_URL}/catadores/${user.id}/localizacao`, {
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
                    if (window._greentech_map && window._greentech_userMarker) {
                        window._greentech_map.removeLayer(window._greentech_userMarker);
                        window._greentech_userMarker = null;
                    }
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

// Inicializa o app quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    window.GreenTechApp = new GreenTechApp();
    console.log('[DEBUG] GreenTechApp instanciado:', window.GreenTechApp);
    // Inicializa o app
    window.GreenTechApp.init();
    // Sobrescrever displaySearchResults na instância criada
    window.GreenTechApp.displaySearchResults = GreenTechApp.prototype.displaySearchResults;
    window.GreenTechApp.performSearch = GreenTechApp.prototype.performSearch;
    
    // Event listener global para logout (backup)
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        console.log('[DEBUG] Configurando event listener global do logout');
        
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('[DEBUG] Botão de logout clicado (global)');
            
            // Confirma logout
            if (confirm('Tem certeza que deseja sair?')) {
                // Limpa dados do localStorage
                localStorage.removeItem('greentech_token');
                localStorage.removeItem('greentech_user');
                
                // Redireciona para login
                window.location.href = '/login/';
            }
            return false;
        });
        console.log('[DEBUG] Event listener global do logout configurado');
    }
});

// Event listeners para navegação entre páginas
document.addEventListener('page:init', function(e) {
    console.log('[DEBUG] page:init disparado para:', e.target.getAttribute('data-name'));
    
    // Se estiver na página de adicionar material, configura os event listeners
    if (e.target.getAttribute('data-name') === 'link2') {
        console.log('[DEBUG] Configurando event listeners para página link2');
        
        // Event listener para o formulário
        const addForm = document.getElementById('add-material-form');
        if (addForm) {
            addForm.addEventListener('submit', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('[DEBUG] Formulário submetido (page:init)');
                
                const formData = new FormData(e.target);
                const material = {
                    tipo: formData.get('tipo'),
                    quantidade: formData.get('quantidade'),
                    peso: formData.get('peso'),
                    descricao: formData.get('descricao')
                };
                
                console.log('[DEBUG] Material extraído (page:init):', material);
                
                if (!material.tipo || !material.quantidade) {
                    alert('Por favor, preencha os campos obrigatórios.');
                    return;
                }
                
                // Pega latitude/longitude
                const latInput = document.getElementById('latitude');
                const lngInput = document.getElementById('longitude');
                const lat = latInput ? latInput.value : '';
                const lng = lngInput ? lngInput.value : '';
                
                if (lat && lng) {
                    material.latitude = lat;
                    material.longitude = lng;
                }
                
                // Chama a função de adicionar material
                if (window.GreenTechApp && window.GreenTechApp.handleAddMaterial) {
                    window.GreenTechApp.handleAddMaterial({ target: e.target, preventDefault: () => {} });
                } else {
                    console.log('[DEBUG] GreenTechApp não disponível, tentando adicionar diretamente');
                    // Tenta adicionar diretamente via API
                    if (window.GreenTechAPI) {
                        window.GreenTechAPI.addMaterial(material).then(response => {
                            console.log('[DEBUG] Material adicionado via API direta:', response);
                            alert('Material adicionado com sucesso!');
                            e.target.reset();
                        }).catch(error => {
                            console.error('[DEBUG] Erro ao adicionar material:', error);
                            alert('Erro ao adicionar material. Tente novamente.');
                        });
                    }
                }
                return false;
            });
            console.log('[DEBUG] Event listener do formulário configurado (page:init)');
        }
        
        // Event listener para o botão
        const addBtn = document.getElementById('btn-add-material');
        if (addBtn) {
            addBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('[DEBUG] Botão clicado (page:init)');
                
                const form = document.getElementById('add-material-form');
                if (form) {
                    const formData = new FormData(form);
                    const material = {
                        tipo: formData.get('tipo'),
                        quantidade: formData.get('quantidade'),
                        peso: formData.get('peso'),
                        descricao: formData.get('descricao')
                    };
                    
                    console.log('[DEBUG] Material extraído do botão (page:init):', material);
                    
                    if (!material.tipo || !material.quantidade) {
                        alert('Por favor, preencha os campos obrigatórios.');
                        return;
                    }
                    
                    // Pega latitude/longitude
                    const latInput = document.getElementById('latitude');
                    const lngInput = document.getElementById('longitude');
                    const lat = latInput ? latInput.value : '';
                    const lng = lngInput ? lngInput.value : '';
                    
                    if (lat && lng) {
                        material.latitude = lat;
                        material.longitude = lng;
                    }
                    
                    // Chama a função de adicionar material
                    if (window.GreenTechApp && window.GreenTechApp.handleAddMaterial) {
                        window.GreenTechApp.handleAddMaterial({ target: form, preventDefault: () => {} });
                    } else {
                        console.log('[DEBUG] GreenTechApp não disponível, tentando adicionar diretamente');
                        // Tenta adicionar diretamente via API
                        if (window.GreenTechAPI) {
                            window.GreenTechAPI.addMaterial(material).then(response => {
                                console.log('[DEBUG] Material adicionado via API direta:', response);
                                alert('Material adicionado com sucesso!');
                                form.reset();
                            }).catch(error => {
                                console.error('[DEBUG] Erro ao adicionar material:', error);
                                alert('Erro ao adicionar material. Tente novamente.');
                            });
                        }
                    }
                }
                return false;
            });
            console.log('[DEBUG] Event listener do botão configurado (page:init)');
        }
    }
    
    // Configura event listener do logout para todas as páginas
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        console.log('[DEBUG] Configurando event listener do logout (page:init)');
        
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('[DEBUG] Botão de logout clicado (page:init)');
            
            // Confirma logout
            if (confirm('Tem certeza que deseja sair?')) {
                // Limpa dados do localStorage
                localStorage.removeItem('greentech_token');
                localStorage.removeItem('greentech_user');
                
                // Redireciona para login
                window.location.href = '/login/';
            }
            return false;
        });
        console.log('[DEBUG] Event listener do logout configurado (page:init)');
    }
});

// Event listener adicional para page:afterin (quando a página termina de carregar)
document.addEventListener('page:afterin', function(e) {
    console.log('[DEBUG] page:afterin disparado para:', e.target.getAttribute('data-name'));
    
    // Se estiver na página de adicionar material, configura os event listeners novamente
    if (e.target.getAttribute('data-name') === 'link2') {
        console.log('[DEBUG] Configurando event listeners para página link2 (page:afterin)');
        
        // Event listener para o botão (backup)
        const addBtn = document.getElementById('btn-add-material');
        if (addBtn) {
            // Remove event listeners anteriores para evitar duplicação
            addBtn.replaceWith(addBtn.cloneNode(true));
            const newAddBtn = document.getElementById('btn-add-material');
            
            newAddBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('[DEBUG] Botão clicado (page:afterin)');
                
                const form = document.getElementById('add-material-form');
                if (form) {
                    const formData = new FormData(form);
                    const material = {
                        tipo: formData.get('tipo'),
                        quantidade: formData.get('quantidade'),
                        peso: formData.get('peso'),
                        descricao: formData.get('descricao')
                    };
                    
                    console.log('[DEBUG] Material extraído do botão (page:afterin):', material);
                    
                    if (!material.tipo || !material.quantidade) {
                        alert('Por favor, preencha os campos obrigatórios.');
                        return;
                    }
                    
                    // Pega latitude/longitude
                    const latInput = document.getElementById('latitude');
                    const lngInput = document.getElementById('longitude');
                    const lat = latInput ? latInput.value : '';
                    const lng = lngInput ? lngInput.value : '';
                    
                    if (lat && lng) {
                        material.latitude = lat;
                        material.longitude = lng;
                    }
                    
                    // Chama a função de adicionar material
                    if (window.GreenTechApp && window.GreenTechApp.handleAddMaterial) {
                        window.GreenTechApp.handleAddMaterial({ target: form, preventDefault: () => {} });
                    } else {
                        console.log('[DEBUG] GreenTechApp não disponível, tentando adicionar diretamente');
                        // Tenta adicionar diretamente via API
                        if (window.GreenTechAPI) {
                            window.GreenTechAPI.addMaterial(material).then(response => {
                                console.log('[DEBUG] Material adicionado via API direta:', response);
                                alert('Material adicionado com sucesso!');
                                form.reset();
                            }).catch(error => {
                                console.error('[DEBUG] Erro ao adicionar material:', error);
                                alert('Erro ao adicionar material. Tente novamente.');
                            });
                        }
                    }
                }
                return false;
            });
            console.log('[DEBUG] Event listener do botão configurado (page:afterin)');
        }
    }
    
    // Configura event listener do logout para todas as páginas
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        console.log('[DEBUG] Configurando event listener do logout (page:afterin)');
        
        // Remove event listeners anteriores para evitar duplicação
        logoutBtn.replaceWith(logoutBtn.cloneNode(true));
        const newLogoutBtn = document.getElementById('logout-btn');
        
        newLogoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('[DEBUG] Botão de logout clicado');
            
            // Confirma logout
            if (confirm('Tem certeza que deseja sair?')) {
                // Limpa dados do localStorage
                localStorage.removeItem('greentech_token');
                localStorage.removeItem('greentech_user');
                
                // Redireciona para login
                window.location.href = '/login/';
            }
            return false;
        });
        console.log('[DEBUG] Event listener do logout configurado (page:afterin)');
    }
    const page = e.target;
    const pageName = page && page.getAttribute('data-name');
    if (pageName === 'index') {
        setTimeout(ajustarHomePorPerfil, 100);
    }
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
    // Antes de criar o mapa, remova todos os outros mapas duplicados
    document.querySelectorAll('#map').forEach((el, idx) => {
        if (idx > 0) el.parentNode && el.parentNode.removeChild(el);
    });
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
    fetch(`${BASE_URL}/catadores`)
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

// Inicializa o mapa no primeiro carregamento (F5, reload)
document.addEventListener('DOMContentLoaded', function() {
    // Só inicializa se estiver na home
    const page = document.querySelector('.page[data-name="index"]');
    if (page && document.getElementById('map')) {
        setTimeout(() => {
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
        }, 200);
    }
});

// E também ao navegar para a home (SPA)
document.addEventListener('page:init', function(e) {
    const page = e.target;
    const pageName = page && page.getAttribute('data-name');
    if (pageName === 'index') {
        setTimeout(() => {
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
        }, 200);
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

// Função para catador marcar material como coletado
window.marcarComoColetado = function(materialId) {
    const user = window.GreenTechAPI.getCurrentUser();
    if (!user || user.perfil !== 'catador') {
        showFeedback('Apenas catadores podem coletar materiais.', 'error');
        return;
    }
    
    // Fazer requisição para marcar como coletado
    fetch(`https://iphone-compatible-1.onrender.com/api/materials/${materialId}/coletar`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${window.GreenTechAPI.token}`
        }
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showFeedback('Material coletado com sucesso!', 'success');
            // Atualizar o histórico do catador
            if (window.GreenTechApp) {
                window.GreenTechApp.loadMaterials().then(() => {
                    window.GreenTechApp.updateStats();
                    window.GreenTechApp.updateHomeStats();
                });
            }
            // Atualizar a lista de materiais disponíveis
            if (window._greentech_updateCatadorDashboard) {
                window._greentech_updateCatadorDashboard();
            }
        } else {
            showFeedback(data.error || 'Erro ao coletar material.', 'error');
        }
    })
    .catch(error => {
        console.error('Erro ao coletar material:', error);
        showFeedback('Erro ao coletar material.', 'error');
    });
};

// Função para catador sinalizar interesse em coletar
window.wantCollect = function(materialId) {
    const user = window.GreenTechAPI.getCurrentUser();
    if (!user || user.perfil !== 'catador') {
        showFeedback('Apenas catadores podem coletar materiais.', 'error');
        return;
    }
    
    // Fazer requisição para reservar o material
    fetch(`https://iphone-compatible-1.onrender.com/api/materials/${materialId}/reservar`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${window.GreenTechAPI.token}`
        }
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showFeedback('Material reservado com sucesso!', 'success');
            // Atualizar a lista de materiais disponíveis
            if (window._greentech_updateCatadorDashboard) {
                window._greentech_updateCatadorDashboard();
            }
        } else {
            showFeedback(data.error || 'Erro ao reservar material.', 'error');
        }
    })
    .catch(error => {
        console.error('Erro ao reservar material:', error);
        showFeedback('Erro ao reservar material.', 'error');
    });
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
    window._greentech_materiais = materiais; // Salva referência global para atualização reativa
    const lista = document.getElementById('materiais-lista');
    if (!lista) return;
    if (!materiais || materiais.length === 0) {
        lista.innerHTML = '<div style="color:#888;text-align:center;padding:24px;">Nenhum material disponível para coleta.</div>';
        return;
    }
    
    const user = window.GreenTechAPI.getCurrentUser();
    const isCatador = user && user.perfil === 'catador';
    
    lista.innerHTML = materiais.map(mat => {
        const dist = (mat.latitude && mat.longitude && userLat && userLng) ? calcularDistanciaKm(userLat, userLng, mat.latitude, mat.longitude).toFixed(2) : '--';
        const isReservadoPorMim = isCatador && mat.status === 'reservado' && mat.catador_id === user.id;
        const isDisponivel = mat.status === 'disponivel';
        
        let actionButton = '';
        if (isCatador) {
            if (isReservadoPorMim) {
                actionButton = `<button onclick="marcarComoColetado(${mat.id})" style="background:#43a047;color:#fff;border:none;border-radius:6px;padding:6px 14px;cursor:pointer;">Marcar como Coletado</button>`;
            } else if (isDisponivel) {
                actionButton = `<button onclick="wantCollect(${mat.id})" style="background:#ffb300;color:#fff;border:none;border-radius:6px;padding:6px 14px;cursor:pointer;">Quero coletar</button>`;
            } else {
                actionButton = `<span style="color:#888;font-size:12px;">${mat.status === 'reservado' ? 'Reservado' : 'Coletado'}</span>`;
            }
        }
        
        return `<div data-material-id="${mat.id}" style="background:#f9fbe7;border-radius:12px;padding:16px 18px;margin-bottom:12px;box-shadow:0 2px 8px rgba(76,175,80,0.06);display:flex;flex-direction:column;gap:6px;">
            <b>${mat.tipo ? GreenTechApp.prototype.getTipoDisplayName(mat.tipo) : 'Material'}</b>
            <span><b>Quantidade:</b> ${mat.quantidade || '-'}</span>
            ${mat.peso ? `<span><b>Peso:</b> ${mat.peso} kg</span>` : ''}
            ${mat.descricao ? `<span><b>Descrição:</b> ${mat.descricao}</span>` : ''}
            <span><b>Distância:</b> ${dist} km</span>
            <span><b>Status:</b> ${mat.status || 'disponivel'}</span>
            <div style="display:flex;gap:10px;margin-top:6px;">
                <button onclick="mostrarRotaNoMapa(${mat.latitude},${mat.longitude})" style="background:#388e3c;color:#fff;border:none;border-radius:6px;padding:6px 14px;cursor:pointer;">Rota</button>
                <button onclick="contactMaterialOwner('${mat.telefone || ''}','${mat.email || ''}')" style="background:#1976d2;color:#fff;border:none;border-radius:6px;padding:6px 14px;cursor:pointer;">Contato</button>
                ${actionButton}
            </div>
        </div>`;
    }).join('');
};

// Função global para mostrar rota no mapa do app
window.mostrarRotaNoMapa = function(destLat, destLng) {
    if (!window._greentech_map) {
        alert('Mapa não carregado!');
        return;
    }
    if (!navigator.geolocation) {
        alert('Geolocalização não suportada.');
        return;
    }
    navigator.geolocation.getCurrentPosition(function(pos) {
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;
        // Remove rota anterior se existir
        if (window._greentech_routeLine) {
            window._greentech_map.removeLayer(window._greentech_routeLine);
        }
        // Desenha a linha da rota
        window._greentech_routeLine = L.polyline([[userLat, userLng], [destLat, destLng]], {color: '#1976d2', weight: 5, opacity: 0.8}).addTo(window._greentech_map);
        // Centraliza o mapa na rota
        window._greentech_map.fitBounds([[userLat, userLng], [destLat, destLng]], {padding: [40, 40]});
        // Marcadores de início e fim
        if (window._greentech_routeStart) window._greentech_map.removeLayer(window._greentech_routeStart);
        if (window._greentech_routeEnd) window._greentech_map.removeLayer(window._greentech_routeEnd);
        window._greentech_routeStart = L.marker([userLat, userLng], {title: 'Você'}).addTo(window._greentech_map);
        window._greentech_routeEnd = L.marker([destLat, destLng], {title: 'Destino'}).addTo(window._greentech_map);
    }, function() {
        alert('Não foi possível obter sua localização.');
    });
};

// Função global para limpar rota do mapa
window.limparRotaDoMapa = function() {
    if (window._greentech_routeLine) window._greentech_map.removeLayer(window._greentech_routeLine);
    if (window._greentech_routeStart) window._greentech_map.removeLayer(window._greentech_routeStart);
    if (window._greentech_routeEnd) window._greentech_map.removeLayer(window._greentech_routeEnd);
};

// Alterar botão 'Rota' em renderMateriaisLista para mostrarRotaNoMapa
const oldRenderMateriaisLista = window.renderMateriaisLista;
window.renderMateriaisLista = function(materiais, userLat, userLng) {
    window._greentech_materiais = materiais;
    const lista = document.getElementById('materiais-lista');
    if (!lista) return;
    if (!materiais || materiais.length === 0) {
        lista.innerHTML = '<div style="color:#888;text-align:center;padding:24px;">Nenhum material disponível para coleta.</div>';
        return;
    }
    const user = window.GreenTechAPI.getCurrentUser();
    const isCatador = user && user.perfil === 'catador';
    lista.innerHTML = materiais.map(mat => {
        const dist = (mat.latitude && mat.longitude && userLat && userLng) ? calcularDistanciaKm(userLat, userLng, mat.latitude, mat.longitude).toFixed(2) : '--';
        const isReservadoPorMim = isCatador && mat.status === 'reservado' && mat.catador_id === user.id;
        const isDisponivel = mat.status === 'disponivel';
        let actionButton = '';
        if (isCatador) {
            if (isReservadoPorMim) {
                actionButton = `<button onclick="marcarComoColetado(${mat.id})" style="background:#43a047;color:#fff;border:none;border-radius:6px;padding:6px 14px;cursor:pointer;">Marcar como Coletado</button>`;
            } else if (isDisponivel) {
                actionButton = `<button onclick="wantCollect(${mat.id})" style="background:#ffb300;color:#fff;border:none;border-radius:6px;padding:6px 14px;cursor:pointer;">Quero coletar</button>`;
            } else {
                actionButton = `<span style="color:#888;font-size:12px;">${mat.status === 'reservado' ? 'Reservado' : 'Coletado'}</span>`;
            }
        }
        // Botão Rota chama mostrarRotaNoMapa
        return `<div data-material-id="${mat.id}" style="background:#f9fbe7;border-radius:12px;padding:16px 18px;margin-bottom:12px;box-shadow:0 2px 8px rgba(76,175,80,0.06);display:flex;flex-direction:column;gap:6px;">
            <b>${mat.tipo ? GreenTechApp.prototype.getTipoDisplayName(mat.tipo) : 'Material'}</b>
            <span><b>Quantidade:</b> ${mat.quantidade || '-'}</span>
            ${mat.peso ? `<span><b>Peso:</b> ${mat.peso} kg</span>` : ''}
            ${mat.descricao ? `<span><b>Descrição:</b> ${mat.descricao}</span>` : ''}
            <span><b>Distância:</b> ${dist} km</span>
            <span><b>Status:</b> ${mat.status || 'disponivel'}</span>
            <div style="display:flex;gap:10px;margin-top:6px;">
                <button onclick="mostrarRotaNoMapa(${mat.latitude},${mat.longitude})" style="background:#388e3c;color:#fff;border:none;border-radius:6px;padding:6px 14px;cursor:pointer;">Rota</button>
                <button onclick="contactMaterialOwner('${mat.telefone || ''}','${mat.email || ''}')" style="background:#1976d2;color:#fff;border:none;border-radius:6px;padding:6px 14px;cursor:pointer;">Contato</button>
                ${actionButton}
            </div>
        </div>`;
    }).join('');
    // Adiciona botão Limpar Rota se for catador
    if (isCatador) {
        lista.innerHTML += `<div style="text-align:center;margin-top:12px;"><button onclick="limparRotaDoMapa()" style="background:#e53935;color:#fff;border:none;border-radius:8px;padding:8px 22px;font-size:1rem;cursor:pointer;">Limpar Rota</button></div>`;
    }
};

// Atualizar lista de materiais disponíveis para coleta
window.updateMateriaisLista = function(userLat, userLng) {
    let url = 'https://iphone-compatible-1.onrender.com/api/materials';
    const tipo = document.getElementById('material-type-filter')?.value;
    const busca = document.getElementById('material-search')?.value.trim().toLowerCase();
    if (tipo) url += `?tipo=${tipo}`;
    fetch(url)
        .then(res => res.json())
        .then(data => {
            let materiais = data.materials || [];
            window._greentech_materiais = materiais; // Salva global para reatividade
            window._greentech_userLat = userLat;
            window._greentech_userLng = userLng;
            window.renderMateriaisLista(window._greentech_materiais, userLat, userLng);
        })
        .catch(error => {
            console.error('Erro ao carregar materiais:', error);
        });
};

// Função para aplicar filtros SEMPRE no array global
window.filtrarMateriaisReativo = function() {
    let materiais = window._greentech_materiais || [];
    const tipoEl = document.getElementById('material-type-filter');
    const buscaEl = document.getElementById('material-search');
    const filtroEl = document.getElementById('distance-filter');
    const tipo = tipoEl ? tipoEl.value : '';
    const busca = buscaEl ? buscaEl.value.trim().toLowerCase() : '';
    const filtro = filtroEl ? parseFloat(filtroEl.value) : 9999;
    const userLat = window._greentech_userLat;
    const userLng = window._greentech_userLng;
    if (tipo) {
        materiais = materiais.filter(m => m.tipo === tipo);
    }
    if (busca) {
        materiais = materiais.filter(m =>
            (m.tipo && GreenTechApp.prototype.getTipoDisplayName(m.tipo).toLowerCase().includes(busca)) ||
            (m.descricao && m.descricao.toLowerCase().includes(busca))
        );
    }
    if (userLat && userLng && filtro < 9999) {
        materiais = materiais.filter(m => m.latitude && m.longitude && calcularDistanciaKm(userLat, userLng, m.latitude, m.longitude) <= filtro);
    }
    window.renderMateriaisLista(materiais, userLat, userLng);
};

// Atualizar lista ao mudar filtros
window.addEventListener('DOMContentLoaded', function() {
    ['material-type-filter','material-search','distance-filter'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', window.filtrarMateriaisReativo);
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
    const user = window.GreenTechAPI.getCurrentUser();
    
    // Só manipula FABs se for catador
    if (!user || user.perfil !== 'catador') {
        console.log('[DEBUG] Não é catador, não manipular FABs de localização');
        return;
    }
    
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
                    fetch(`${BASE_URL}/catadores/${user.id}/localizacao`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${window.GreenTechAPI.token}`
                        },
                        body: JSON.stringify({ latitude: pos.coords.latitude, longitude: pos.coords.longitude })
                    });
                    alert('Localização atualizada com sucesso!');
                }, function(err) {
                    alert('Erro ao obter localização: ' + err.message);
                });
            }
        };
    }
});

// Delegação global para o botão de localização

document.addEventListener('click', function(e) {
    if (e.target && e.target.id === 'btn-get-location') {
        const latInput = document.getElementById('latitude');
        const lngInput = document.getElementById('longitude');
        const status = document.getElementById('location-status');
        console.log('[DEBUG] Clique detectado no botão de localização (btn-get-location) [delegado]');
        if (!navigator.geolocation) {
            status.textContent = 'Geolocalização não suportada neste navegador.';
            status.style.color = '#e53935';
            console.log('[DEBUG] Geolocalização não suportada');
            return;
        }
        status.textContent = 'Obtendo localização...';
        status.style.color = '#388e3c';
        navigator.geolocation.getCurrentPosition(function(pos) {
            latInput.value = pos.coords.latitude;
            lngInput.value = pos.coords.longitude;
            status.textContent = 'Localização preenchida com sucesso!';
            status.style.color = '#388e3c';
            console.log('[APP.JS LOCALIZAÇÃO] Latitude preenchida:', latInput.value);
            console.log('[APP.JS LOCALIZAÇÃO] Longitude preenchida:', lngInput.value);
        }, function(err) {
            status.textContent = 'Não foi possível obter localização: ' + err.message;
            status.style.color = '#e53935';
            latInput.value = '';
            lngInput.value = '';
            console.log('[APP.JS LOCALIZAÇÃO] Erro ao obter localização:', err.message);
        });
        setTimeout(() => {
            console.log('[DEBUG] Após clique, latitude:', latInput ? latInput.value : '(input não encontrado)');
            console.log('[DEBUG] Após clique, longitude:', lngInput ? lngInput.value : '(input não encontrado)');
        }, 2000);
    }
});

// Event listener específico para o botão de histórico do catador

document.addEventListener('click', function(e) {
    if (e.target && e.target.id === 'catador-historico-btn') {
        e.preventDefault();
        e.stopPropagation();
        console.log('[DEBUG] Clique no botão de histórico do catador');
        // Navegar para a página de histórico
        if (typeof app !== 'undefined' && app.views && app.views.main && app.views.main.router) {
            app.views.main.router.navigate('/historico/');
        } else {
            window.location.href = '/historico/';
        }
        return false;
    }
});

// Função utilitária para obter perfil do usuário direto do localStorage
function getUserPerfilDireto() {
  try {
    const userStr = localStorage.getItem('greentech_user');
    if (!userStr) return null;
    const user = JSON.parse(userStr);
    return user && user.perfil ? user.perfil : null;
  } catch (e) { return null; }
}

// Função para exibir blocos exclusivos do catador na página de dados
function mostrarBlocosSeCatadorTentativas(tentativas = 0) {
  var perfil = getUserPerfilDireto();
  console.log('[DEBUG] mostrarBlocosSeCatadorTentativas tentativa', tentativas, '| perfil:', perfil);
  if (perfil !== 'catador') {
    console.log('[DEBUG] Não é catador, não mostrar blocos especiais');
    return;
  }
  var totalDiv = document.getElementById('catador-total');
  var histBtn = document.getElementById('catador-historico-btn');
  if (totalDiv && histBtn) {
    totalDiv.style.display = '';
    histBtn.style.display = '';
    console.log('[DEBUG] Exibindo blocos exclusivos do catador');
  } else if (tentativas < 5) {
    setTimeout(function() { mostrarBlocosSeCatadorTentativas(tentativas + 1); }, 200);
  } else {
    console.log('[DEBUG] Elementos não encontrados após 5 tentativas');
  }
}

// Chamar função ao carregar página de dados (link4)
document.addEventListener('page:init', function(e) {
  if (e.target && e.target.getAttribute('data-name') === 'link4') {
    setTimeout(mostrarBlocosSeCatadorTentativas, 100);
  }
});

// Inicializa o mapa ao carregar a página (primeiro load)
document.addEventListener('DOMContentLoaded', function() {
    const page = document.querySelector('.page[data-name="index"]');
    if (page && document.getElementById('map')) {
        setTimeout(() => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(function(position) {
                    window._greentech_userLat = position.coords.latitude;
                    window._greentech_userLng = position.coords.longitude;
                    window.initGreenTechMap(window._greentech_userLat, window._greentech_userLng);
                    console.log('[DEBUG] Mapa inicializado na home (DOMContentLoaded)');
                }, function(error) {
                    window._greentech_userLat = -25.4284;
                    window._greentech_userLng = -49.2733;
                    window.initGreenTechMap(window._greentech_userLat, window._greentech_userLng);
                    console.log('[DEBUG] Mapa inicializado na home (fallback Curitiba)');
                });
            } else {
                window._greentech_userLat = -25.4284;
                window._greentech_userLng = -49.2733;
                window.initGreenTechMap(window._greentech_userLat, window._greentech_userLng);
                console.log('[DEBUG] Mapa inicializado na home (no geolocation)');
            }
        }, 200);
    }
});
// Inicializa o mapa ao voltar para a home (SPA)
document.addEventListener('page:init', function(e) {
    const page = e.target;
    const pageName = page && page.getAttribute('data-name');
    if (pageName === 'index') {
        setTimeout(() => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(function(position) {
                    window._greentech_userLat = position.coords.latitude;
                    window._greentech_userLng = position.coords.longitude;
                    window.initGreenTechMap(window._greentech_userLat, window._greentech_userLng);
                    console.log('[DEBUG] Mapa inicializado na home (page:init)');
                }, function(error) {
                    window._greentech_userLat = -25.4284;
                    window._greentech_userLng = -49.2733;
                    window.initGreenTechMap(window._greentech_userLat, window._greentech_userLng);
                    console.log('[DEBUG] Mapa inicializado na home (fallback Curitiba)');
                });
            } else {
                window._greentech_userLat = -25.4284;
                window._greentech_userLng = -49.2733;
                window.initGreenTechMap(window._greentech_userLat, window._greentech_userLng);
                console.log('[DEBUG] Mapa inicializado na home (no geolocation)');
            }
        }, 200);
    }
});

document.addEventListener('page:beforeremove', function(e) {
    const page = e.target;
    const pageName = page && page.getAttribute('data-name');
    if (pageName === 'index') {
        if (window._greentech_map) {
            window._greentech_map.remove();
            window._greentech_map = null;
        }
        if (window.routingControl) {
            window.routingControl.remove();
            window.routingControl = null;
        }
    }
});