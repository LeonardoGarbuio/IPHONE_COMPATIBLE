// Cliente API para integração com o backend GreenTech
class GreenTechAPI {
    constructor() {
        // Usa localhost em dev, Render em produção
        this.baseURL = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
            ? "http://localhost:3000/api"
            : "https://iphone-compatible-1.onrender.com/api";
        this.token = localStorage.getItem('greentech_token');
    }

    // Configura headers padrão
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        return headers;
    }

    async request(endpoint, options = {}) {
        try {
            const url = `${this.baseURL}${endpoint}`;
            const config = {
                headers: this.getHeaders(),
                ...options
            };

            const response = await fetch(url, config);
            
            if (!response.ok) {
                if (response.status === 401) {
                    localStorage.removeItem('greentech_token');
                    window.location.href = '/login/';
                    return;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    async login(email, senha) {
        const response = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, senha })
        });
        
        if (response.token) {
            this.token = response.token;
            localStorage.setItem('greentech_token', response.token);
            localStorage.setItem('greentech_user', JSON.stringify(response.user));
        }
        
        return response;
    }

    async register(userData) {
        const response = await this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
        
        if (response.token) {
            this.token = response.token;
            localStorage.setItem('greentech_token', response.token);
            localStorage.setItem('greentech_user', JSON.stringify(response.user));
        }
        
        return response;
    }

    // Materiais
    async getMaterials() {
        return await this.request('/materials');
    }

    async addMaterial(materialData) {
        return await this.request('/materials', {
            method: 'POST',
            body: JSON.stringify(materialData)
        });
    }

    async updateMaterial(id, materialData) {
        return await this.request(`/materials/${id}`, {
            method: 'PUT',
            body: JSON.stringify(materialData)
        });
    }

    async deleteMaterial(id) {
        return await this.request(`/materials/${id}`, {
            method: 'DELETE'
        });
    }

    async searchMaterials(query, filter = 'all') {
        const params = new URLSearchParams();
        if (query) params.append('q', query);
        if (filter !== 'all') params.append('filter', filter);
        
        return await this.request(`/materials/search?${params.toString()}`);
    }

    // Estatísticas
    async getStats(params = {}) {
        let query = '';
        if (params.catador_id) {
            query = `?catador_id=${params.catador_id}`;
        }
        return await this.request(`/materials/stats${query}`);
    }

    // Histórico de coletas do catador
    async getHistoricoColetas(catador_id) {
        // Garante que o token está atualizado
        this.token = localStorage.getItem('greentech_token');
        return await this.request(`/materials/historico/coletas?catador_id=${catador_id}`);
    }

    // Upload de imagem
    async uploadImage(file) {
        const formData = new FormData();
        formData.append('imagem', file);

        try {
            const url = `${this.baseURL}/upload`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Upload Error:', error);
            throw error;
        }
    }

    // Logout
    logout() {
        this.token = null;
        localStorage.removeItem('greentech_token');
        localStorage.removeItem('greentech_user');
        window.location.href = '/login/';
    }

    // Verifica se está autenticado
    isAuthenticated() {
        return !!this.token;
    }

    // Obtém usuário atual
    getCurrentUser() {
        const userStr = localStorage.getItem('greentech_user');
        return userStr ? JSON.parse(userStr) : null;
    }
}

// Instância global da API
window.GreenTechAPI = new GreenTechAPI(); 