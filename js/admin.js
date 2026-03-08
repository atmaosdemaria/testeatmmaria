/* ========================================
   ATELIÊ MÃOS DE MARIA - admin.js
   Painel Admin com GitHub como banco de dados
   ======================================== */

const ADMIN = {
  senha: 'maosdemaria2024',
  gh_owner: "atmaosdemaria",
  gh_repo:  "testeatmmaria",
  gh_file:  'data/produtos.json',
  get token() { return localStorage.getItem('admin_gh_token') || ''; },
  get apiUrl() { return `https://api.github.com/repos/${this.gh_owner}/${this.gh_repo}/contents/${this.gh_file}`; },
  get rawUrl() { return `https://raw.githubusercontent.com/${this.gh_owner}/${this.gh_repo}/main/${this.gh_file}?t=${Date.now()}`; }
};

let produtos = [];
let ghSha = null;

// ========================================
// PAINEL ADMIN — injetar HTML na página
// ========================================
function injetarPainelAdmin() {
  // botão flutuante para abrir admin
  const btnAdmin = document.createElement('div');
  btnAdmin.id = 'btn-admin-float';
  btnAdmin.innerHTML = '⚙️';
  btnAdmin.title = 'Painel Admin';
  btnAdmin.style.cssText = `
    position:fixed;bottom:100px;right:20px;
    width:46px;height:46px;background:#3D2B1F;color:white;
    border-radius:50%;display:flex;align-items:center;justify-content:center;
    font-size:20px;cursor:pointer;z-index:9000;box-shadow:0 4px 12px rgba(0,0,0,0.3);
    transition:transform 0.2s;
  `;
  btnAdmin.onmouseover = () => btnAdmin.style.transform = 'scale(1.1)';
  btnAdmin.onmouseleave = () => btnAdmin.style.transform = 'scale(1)';
  btnAdmin.onclick = () => document.getElementById('admin-overlay').style.display = 'flex';
  document.body.appendChild(btnAdmin);

  // overlay do painel
  const overlay = document.createElement('div');
  overlay.id = 'admin-overlay';
  overlay.style.cssText = `
    display:none;position:fixed;inset:0;background:rgba(0,0,0,0.6);
    z-index:9999;align-items:center;justify-content:center;padding:16px;
  `;

  overlay.innerHTML = `
    <!-- LOGIN -->
    <div id="admin-login" style="background:white;border-radius:16px;padding:32px;width:100%;max-width:380px;box-shadow:0 20px 60px rgba(0,0,0,0.3)">
      <div style="text-align:center;margin-bottom:24px">
        <div style="font-size:36px">🔑</div>
        <h2 style="font-family:'Georgia',serif;color:#3D2B1F;margin:8px 0 4px">Área Admin</h2>
        <p style="font-size:13px;color:#999">Ateliê Mãos de Maria</p>
      </div>
      <div style="margin-bottom:14px">
        <label style="font-size:12px;font-weight:600;color:#5A5048;text-transform:uppercase;letter-spacing:0.8px;display:block;margin-bottom:6px">Senha</label>
        <input type="password" id="admin-senha-input" placeholder="Digite a senha"
          style="width:100%;padding:11px 14px;border:1.5px solid #EDE8E0;border-radius:10px;font-size:14px;outline:none"
          onkeydown="if(event.key==='Enter')fazerLogin()">
      </div>
      <div id="admin-login-erro" style="display:none;color:#E05C5C;font-size:13px;margin-bottom:10px;text-align:center"></div>
      
      <!-- Token GitHub -->
      <div style="margin-bottom:14px;padding:14px;background:#F8F5F0;border-radius:10px;border:1.5px solid #EDE8E0">
        <label style="font-size:12px;font-weight:600;color:#5A5048;text-transform:uppercase;letter-spacing:0.8px;display:block;margin-bottom:6px">Token GitHub</label>
        <input type="password" id="admin-token-input" placeholder="ghp_... (necessário para salvar)"
          value="${ADMIN.token}"
          style="width:100%;padding:9px 12px;border:1.5px solid #EDE8E0;border-radius:8px;font-size:13px;outline:none;background:white">
        <div style="font-size:11px;color:#9A8F85;margin-top:6px">Salvo só neste navegador. Necessário para adicionar/editar produtos.</div>
      </div>

      <button onclick="fazerLogin()" style="width:100%;padding:13px;background:linear-gradient(135deg,#C9A84C,#E8C97A);border:none;border-radius:10px;font-weight:700;font-size:14px;cursor:pointer;color:#3D2B1F">
        Entrar
      </button>
      <button onclick="fecharAdmin()" style="width:100%;padding:10px;background:none;border:none;color:#999;font-size:13px;cursor:pointer;margin-top:8px">
        Cancelar
      </button>
    </div>

    <!-- PAINEL -->
    <div id="admin-painel" style="display:none;background:white;border-radius:16px;width:100%;max-width:900px;max-height:90vh;overflow:hidden;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,0.3)">
      
      <!-- Header -->
      <div style="background:#3D2B1F;padding:16px 24px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:20px">📿</span>
          <div>
            <div style="color:white;font-weight:700;font-size:15px">Painel Admin</div>
            <div style="color:#C9A84C;font-size:11px">Ateliê Mãos de Maria</div>
          </div>
        </div>
        <div style="display:flex;gap:10px;align-items:center">
          <span id="admin-sync-status" style="font-size:12px;color:#C9A84C"></span>
          <button onclick="fecharAdmin()" style="background:rgba(255,255,255,0.1);border:none;color:white;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:16px">✕</button>
        </div>
      </div>

      <!-- Abas -->
      <div style="display:flex;gap:0;background:#F8F5F0;border-bottom:1px solid #EDE8E0;flex-shrink:0;overflow-x:auto">
        <button class="admin-tab-btn active" onclick="adminTab('produtos',this)" style="padding:14px 20px;border:none;background:white;font-size:13px;font-weight:600;cursor:pointer;color:#3D2B1F;border-bottom:3px solid #C9A84C;white-space:nowrap">📦 Produtos</button>
        <button class="admin-tab-btn" onclick="adminTab('novo',this)" style="padding:14px 20px;border:none;background:transparent;font-size:13px;font-weight:500;cursor:pointer;color:#9A8F85;border-bottom:3px solid transparent;white-space:nowrap">➕ Novo Produto</button>
        <button class="admin-tab-btn" onclick="adminTab('config',this)" style="padding:14px 20px;border:none;background:transparent;font-size:13px;font-weight:500;cursor:pointer;color:#9A8F85;border-bottom:3px solid transparent;white-space:nowrap">⚙️ Config</button>
      </div>

      <!-- Conteúdo -->
      <div style="overflow-y:auto;flex:1;padding:24px">

        <!-- ABA PRODUTOS -->
        <div id="admin-tab-produtos">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px">
            <div style="font-size:14px;color:#9A8F85"><span id="admin-total-produtos">0</span> produtos cadastrados</div>
            <div style="display:flex;gap:8px">
              <button onclick="carregarProdutosAdmin()" style="padding:8px 16px;background:#F8F5F0;border:1.5px solid #EDE8E0;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer">🔄 Atualizar</button>
              <button onclick="adminTab('novo',document.querySelectorAll('.admin-tab-btn')[1])" style="padding:8px 16px;background:linear-gradient(135deg,#C9A84C,#E8C97A);border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;color:#3D2B1F">➕ Novo</button>
            </div>
          </div>
          <div id="admin-lista-produtos"></div>
        </div>

        <!-- ABA NOVO PRODUTO -->
        <div id="admin-tab-novo" style="display:none">
          <h3 style="font-family:'Georgia',serif;color:#3D2B1F;margin-bottom:20px" id="admin-form-title">➕ Novo Produto</h3>
          <input type="hidden" id="prod-edit-id">
          
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
            <div style="grid-column:1/-1">
              <label style="font-size:12px;font-weight:600;color:#5A5048;text-transform:uppercase;letter-spacing:0.8px;display:block;margin-bottom:6px">Nome do Produto *</label>
              <input type="text" id="prod-nome" placeholder="Ex: Terço de Madeira Nossa Senhora"
                style="width:100%;padding:11px 14px;border:1.5px solid #EDE8E0;border-radius:10px;font-size:14px;outline:none">
            </div>
            <div>
              <label style="font-size:12px;font-weight:600;color:#5A5048;text-transform:uppercase;letter-spacing:0.8px;display:block;margin-bottom:6px">Categoria *</label>
              <select id="prod-categoria" style="width:100%;padding:11px 14px;border:1.5px solid #EDE8E0;border-radius:10px;font-size:14px;outline:none;background:white">
                <option value="tercos">Terços</option>
                <option value="rosarios">Rosários</option>
                <option value="pulseiras">Pulseiras</option>
                <option value="carro">Carro</option>
                <option value="imagens">Imagens</option>
              </select>
            </div>
            <div>
              <label style="font-size:12px;font-weight:600;color:#5A5048;text-transform:uppercase;letter-spacing:0.8px;display:block;margin-bottom:6px">Preço (R$) *</label>
              <input type="number" id="prod-preco" placeholder="0.00" step="0.01" min="0"
                style="width:100%;padding:11px 14px;border:1.5px solid #EDE8E0;border-radius:10px;font-size:14px;outline:none">
            </div>
            <div>
              <label style="font-size:12px;font-weight:600;color:#5A5048;text-transform:uppercase;letter-spacing:0.8px;display:block;margin-bottom:6px">Ordem de exibição</label>
              <input type="number" id="prod-ordem" placeholder="1, 2, 3..." min="1"
                style="width:100%;padding:11px 14px;border:1.5px solid #EDE8E0;border-radius:10px;font-size:14px;outline:none">
            </div>
            <div style="grid-column:1/-1">
              <label style="font-size:12px;font-weight:600;color:#5A5048;text-transform:uppercase;letter-spacing:0.8px;display:block;margin-bottom:6px">Link da Imagem (ImgBB ou outro)</label>
              <input type="url" id="prod-imagem" placeholder="https://i.ibb.co/..."
                oninput="previewImgAdmin(this.value)"
                style="width:100%;padding:11px 14px;border:1.5px solid #EDE8E0;border-radius:10px;font-size:14px;outline:none">
              <div style="font-size:11px;color:#9A8F85;margin-top:4px">Cole o link direto do ImgBB. Acesse imgbb.com → faça upload → copie o "Direct link".</div>
            </div>
            <div style="grid-column:1/-1" id="admin-img-preview-box" style="display:none">
              <div style="font-size:12px;font-weight:600;color:#5A5048;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.8px">Preview</div>
              <img id="admin-img-preview" src="" alt="preview"
                style="max-width:160px;max-height:160px;border-radius:10px;object-fit:cover;border:2px solid #EDE8E0;display:none">
            </div>
          </div>

          <div style="display:flex;gap:10px;margin-top:20px">
            <button onclick="salvarProduto()" style="flex:1;padding:13px;background:linear-gradient(135deg,#C9A84C,#E8C97A);border:none;border-radius:10px;font-weight:700;font-size:14px;cursor:pointer;color:#3D2B1F">
              💾 Salvar Produto
            </button>
            <button onclick="limparFormProduto()" style="padding:13px 20px;background:#F8F5F0;border:1.5px solid #EDE8E0;border-radius:10px;font-size:14px;cursor:pointer;color:#5A5048">
              ✕ Limpar
            </button>
          </div>
          <div id="admin-form-msg" style="margin-top:12px;font-size:13px;text-align:center"></div>
        </div>

        <!-- ABA CONFIG -->
        <div id="admin-tab-config" style="display:none">
          <h3 style="font-family:'Georgia',serif;color:#3D2B1F;margin-bottom:20px">⚙️ Configurações</h3>

          <!-- EXPORTAR CATÁLOGO -->
          <div style="background:linear-gradient(135deg,#F5EDD4,#FAF7F2);border-radius:12px;padding:20px;margin-bottom:16px;border:1.5px solid #C9A84C">
            <div style="font-weight:700;color:#3D2B1F;margin-bottom:4px;font-size:15px">📄 Exportar Catálogo</div>
            <div style="font-size:13px;color:#6B4C38;margin-bottom:14px;line-height:1.5">
              Gera um PDF com <strong>todos os produtos</strong>, incluindo foto, nome, categoria e preço. Ideal para enviar por WhatsApp ou imprimir.
            </div>
            <button onclick="exportarPDF()" style="width:100%;padding:13px;background:linear-gradient(135deg,#C9A84C,#E8C97A);border:none;border-radius:10px;font-weight:700;font-size:14px;cursor:pointer;color:#3D2B1F;display:flex;align-items:center;justify-content:center;gap:8px">
              📄 Gerar Catálogo em PDF
            </button>
          </div>
          
          <div style="background:#F8F5F0;border-radius:12px;padding:20px;margin-bottom:16px;border:1.5px solid #EDE8E0">
            <div style="font-weight:600;color:#3D2B1F;margin-bottom:8px">🔑 Token GitHub</div>
            <div style="font-size:13px;color:#9A8F85;margin-bottom:12px">Necessário para salvar produtos. Fica salvo só neste navegador.</div>
            <input type="password" id="config-token" placeholder="ghp_..."
              value="${ADMIN.token}"
              style="width:100%;padding:11px 14px;border:1.5px solid #EDE8E0;border-radius:10px;font-size:14px;outline:none;margin-bottom:10px">
            <button onclick="salvarToken()" style="padding:10px 20px;background:linear-gradient(135deg,#C9A84C,#E8C97A);border:none;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;color:#3D2B1F">
              💾 Salvar Token
            </button>
          </div>

          <div style="background:#F8F5F0;border-radius:12px;padding:20px;border:1.5px solid #EDE8E0">
            <div style="font-weight:600;color:#3D2B1F;margin-bottom:8px">🔒 Trocar Senha do Admin</div>
            <input type="password" id="config-senha-atual" placeholder="Senha atual"
              style="width:100%;padding:11px 14px;border:1.5px solid #EDE8E0;border-radius:10px;font-size:14px;outline:none;margin-bottom:8px">
            <input type="password" id="config-senha-nova" placeholder="Nova senha"
              style="width:100%;padding:11px 14px;border:1.5px solid #EDE8E0;border-radius:10px;font-size:14px;outline:none;margin-bottom:10px">
            <button onclick="trocarSenha()" style="padding:10px 20px;background:#3D2B1F;border:none;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;color:white">
              🔒 Trocar Senha
            </button>
            <div id="config-msg" style="margin-top:10px;font-size:13px"></div>
          </div>
        </div>

      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // fechar clicando fora
  overlay.addEventListener('click', e => { if (e.target === overlay) fecharAdmin(); });
}

// ========================================
// LOGIN
// ========================================
function fazerLogin() {
  const senha = document.getElementById('admin-senha-input').value;
  const senhaCorreta = localStorage.getItem('admin_senha') || ADMIN.senha;
  const token = document.getElementById('admin-token-input').value.trim();

  if (senha !== senhaCorreta) {
    const erro = document.getElementById('admin-login-erro');
    erro.style.display = 'block';
    erro.textContent = 'Senha incorreta!';
    return;
  }

  if (token) localStorage.setItem('admin_gh_token', token);

  document.getElementById('admin-login').style.display = 'none';
  document.getElementById('admin-painel').style.display = 'flex';
  carregarProdutosAdmin();
}

function fecharAdmin() {
  document.getElementById('admin-overlay').style.display = 'none';
  document.getElementById('admin-login').style.display = 'block';
  document.getElementById('admin-painel').style.display = 'none';
  document.getElementById('admin-senha-input').value = '';
}

// ========================================
// ABAS ADMIN
// ========================================
function adminTab(nome, btn) {
  ['produtos', 'novo', 'config'].forEach(t => {
    const el = document.getElementById('admin-tab-' + t);
    if (el) el.style.display = 'none';
  });
  document.querySelectorAll('.admin-tab-btn').forEach(b => {
    b.style.background = 'transparent';
    b.style.color = '#9A8F85';
    b.style.borderBottomColor = 'transparent';
  });
  document.getElementById('admin-tab-' + nome).style.display = 'block';
  btn.style.background = 'white';
  btn.style.color = '#3D2B1F';
  btn.style.borderBottomColor = '#C9A84C';

  if (nome === 'produtos') carregarProdutosAdmin();
}

// ========================================
// CARREGAR PRODUTOS DO GITHUB
// ========================================
async function carregarProdutosAdmin() {
  setSyncStatus('⏳ Carregando...');
  try {
    const res = await fetch(ADMIN.rawUrl);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    produtos = await res.json();
    document.getElementById('admin-total-produtos').textContent = produtos.length;
    renderListaProdutos();
    setSyncStatus('✅ Sincronizado');
  } catch (e) {
    setSyncStatus('❌ Erro ao carregar');
    const local = localStorage.getItem('produtos_cache');
    if (local) { produtos = JSON.parse(local); renderListaProdutos(); }
  }
}

function renderListaProdutos() {
  const lista = document.getElementById('admin-lista-produtos');
  if (!lista) return;
  if (!produtos.length) {
    lista.innerHTML = '<div style="text-align:center;padding:40px;color:#9A8F85">Nenhum produto cadastrado ainda.</div>';
    return;
  }
  lista.innerHTML = produtos.map(p => `
    <div style="display:flex;align-items:center;gap:14px;padding:14px;border:1.5px solid #EDE8E0;border-radius:12px;margin-bottom:10px;background:white">
      <img src="${p.imagem || 'images/semfoto.jpg'}" alt="${p.nome}"
        onerror="this.src='images/semfoto.jpg'"
        style="width:60px;height:60px;object-fit:cover;border-radius:8px;flex-shrink:0;border:1px solid #EDE8E0">
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;color:#3D2B1F;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.nome}</div>
        <div style="font-size:12px;color:#9A8F85;margin-top:2px">${p.categoria} · R$ ${parseFloat(p.preco).toFixed(2).replace('.',',')}</div>
      </div>
      <div style="display:flex;gap:8px;flex-shrink:0">
        <button onclick="editarProduto(${p.id})"
          style="padding:7px 14px;background:#EEF3FA;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;color:#4A6FA5">
          ✏️ Editar
        </button>
        <button onclick="excluirProduto(${p.id})"
          style="padding:7px 14px;background:#FEF0F0;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;color:#E05C5C">
          🗑️
        </button>
      </div>
    </div>`).join('');
}

// ========================================
// SALVAR PRODUTO (novo ou edição)
// ========================================
async function salvarProduto() {
  const nome = document.getElementById('prod-nome').value.trim();
  const categoria = document.getElementById('prod-categoria').value;
  const preco = document.getElementById('prod-preco').value;
  const imagem = document.getElementById('prod-imagem').value.trim();
  const ordem = parseInt(document.getElementById('prod-ordem').value) || produtos.length + 1;
  const editId = document.getElementById('prod-edit-id').value;

  if (!nome || !preco) {
    mostrarMsgForm('⚠️ Nome e preço são obrigatórios!', '#E05C5C');
    return;
  }

  if (!ADMIN.token) {
    mostrarMsgForm('❌ Configure o Token GitHub na aba Config!', '#E05C5C');
    return;
  }

  if (editId) {
    // edição
    const idx = produtos.findIndex(p => p.id == editId);
    if (idx >= 0) {
      produtos[idx] = { ...produtos[idx], nome, categoria, preco: parseFloat(preco), imagem, ordem };
    }
  } else {
    // novo
    const novoId = Math.max(0, ...produtos.map(p => p.id || 0)) + 1;
    produtos.push({ id: novoId, nome, categoria, preco: parseFloat(preco), imagem, ordem });
  }

  // ordena por ordem
  produtos.sort((a, b) => (a.ordem || 999) - (b.ordem || 999));

  mostrarMsgForm('⏳ Salvando no GitHub...', '#C9A84C');
  const ok = await pushProdutos();
  if (ok) {
    mostrarMsgForm(editId ? '✅ Produto atualizado!' : '✅ Produto adicionado!', '#4CAF82');
    limparFormProduto();
    // atualiza a loja sem recarregar página
    if (typeof carregarProdutos === 'function') carregarProdutos();
  }
}

// ========================================
// EDITAR
// ========================================
function editarProduto(id) {
  const p = produtos.find(x => x.id === id);
  if (!p) return;
  document.getElementById('prod-edit-id').value = p.id;
  document.getElementById('prod-nome').value = p.nome;
  document.getElementById('prod-categoria').value = p.categoria;
  document.getElementById('prod-preco').value = p.preco;
  document.getElementById('prod-imagem').value = p.imagem || '';
  document.getElementById('prod-ordem').value = p.ordem || '';
  document.getElementById('admin-form-title').textContent = '✏️ Editar Produto';
  previewImgAdmin(p.imagem || '');
  adminTab('novo', document.querySelectorAll('.admin-tab-btn')[1]);
}

function limparFormProduto() {
  document.getElementById('prod-edit-id').value = '';
  document.getElementById('prod-nome').value = '';
  document.getElementById('prod-preco').value = '';
  document.getElementById('prod-imagem').value = '';
  document.getElementById('prod-ordem').value = '';
  document.getElementById('admin-form-title').textContent = '➕ Novo Produto';
  document.getElementById('admin-img-preview').style.display = 'none';
  document.getElementById('admin-form-msg').textContent = '';
}

function mostrarMsgForm(msg, cor) {
  const el = document.getElementById('admin-form-msg');
  el.textContent = msg;
  el.style.color = cor;
}

// ========================================
// EXCLUIR
// ========================================
async function excluirProduto(id) {
  const p = produtos.find(x => x.id === id);
  if (!confirm(`Excluir "${p?.nome}"?`)) return;
  if (!ADMIN.token) { alert('Configure o Token GitHub primeiro!'); return; }
  produtos = produtos.filter(x => x.id !== id);
  setSyncStatus('⏳ Excluindo...');
  const ok = await pushProdutos();
  if (ok) {
    setSyncStatus('✅ Produto excluído');
    renderListaProdutos();
    document.getElementById('admin-total-produtos').textContent = produtos.length;
    if (typeof carregarProdutos === 'function') carregarProdutos();
  }
}

// ========================================
// PUSH PARA GITHUB
// ========================================
async function pushProdutos() {
  try {
    // busca SHA atual
    if (!ghSha) {
      const check = await fetch(ADMIN.apiUrl, {
        headers: { Authorization: 'token ' + ADMIN.token, Accept: 'application/vnd.github.v3+json' }
      });
      if (check.ok) { const j = await check.json(); ghSha = j.sha; }
    }

    const content = btoa(unescape(encodeURIComponent(JSON.stringify(produtos, null, 2))));
    const body = {
      message: '📦 Produtos atualizados — ' + new Date().toLocaleString('pt-BR'),
      content,
      ...(ghSha ? { sha: ghSha } : {})
    };

    const res = await fetch(ADMIN.apiUrl, {
      method: 'PUT',
      headers: {
        Authorization: 'token ' + ADMIN.token,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'HTTP ' + res.status);
    }

    const result = await res.json();
    ghSha = result.content.sha;
    localStorage.setItem('produtos_cache', JSON.stringify(produtos));
    setSyncStatus('✅ Salvo no GitHub');
    return true;
  } catch (e) {
    setSyncStatus('❌ Erro: ' + e.message);
    mostrarMsgForm('❌ Erro ao salvar: ' + e.message, '#E05C5C');
    return false;
  }
}

// ========================================
// CONFIG
// ========================================
function salvarToken() {
  const t = document.getElementById('config-token').value.trim();
  if (!t) { alert('Digite o token!'); return; }
  localStorage.setItem('admin_gh_token', t);
  ghSha = null; // reseta SHA ao trocar token
  document.getElementById('config-msg').textContent = '✅ Token salvo!';
  document.getElementById('config-msg').style.color = '#4CAF82';
}

function trocarSenha() {
  const atual = document.getElementById('config-senha-atual').value;
  const nova = document.getElementById('config-senha-nova').value;
  const senhaCorreta = localStorage.getItem('admin_senha') || ADMIN.senha;
  const msg = document.getElementById('config-msg');
  if (atual !== senhaCorreta) { msg.textContent = '❌ Senha atual incorreta!'; msg.style.color = '#E05C5C'; return; }
  if (!nova || nova.length < 6) { msg.textContent = '❌ Nova senha muito curta (mín. 6 caracteres)'; msg.style.color = '#E05C5C'; return; }
  localStorage.setItem('admin_senha', nova);
  msg.textContent = '✅ Senha alterada com sucesso!';
  msg.style.color = '#4CAF82';
}

// ========================================
// PREVIEW IMAGEM
// ========================================
function previewImgAdmin(url) {
  const img = document.getElementById('admin-img-preview');
  const box = document.getElementById('admin-img-preview-box');
  if (url && url.startsWith('http')) {
    img.src = url;
    img.style.display = 'block';
    box.style.display = 'block';
    img.onerror = () => { img.style.display = 'none'; };
  } else {
    img.style.display = 'none';
  }
}

// ========================================
// STATUS
// ========================================
function setSyncStatus(msg) {
  const el = document.getElementById('admin-sync-status');
  if (el) el.textContent = msg;
}

// ========================================
// INIT
// ========================================
document.addEventListener('DOMContentLoaded', () => {
  injetarPainelAdmin();
});