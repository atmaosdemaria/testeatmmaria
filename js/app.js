/* ========================================
   ATELIÊ MÃOS DE MARIA - app.js
   Carrega produtos do GitHub automaticamente
   ======================================== */

const CONFIG = {
  whatsapp: "5519998949401",
  gh_owner: "atmaosdemaria",
  gh_repo:  "testeatmmaria",
  gh_file:  "data/produtos.json"
};

// ── URL pública raw do GitHub (sem precisar de token para ler) ──
function rawUrl() {
  return `https://raw.githubusercontent.com/${CONFIG.gh_owner}/${CONFIG.gh_repo}/main/${CONFIG.gh_file}?t=${Date.now()}`;
}

let todosProdutos = [];
let carrinho = [];

// ========================================
// INICIALIZAÇÃO
// ========================================
document.addEventListener('DOMContentLoaded', function () {
  injetarCarrinho();
  inicializarMenu();
  inicializarModal();
  inicializarScroll();
  inicializarVideo();
  carregarProdutos();
  renderizarDepoimentos();
});

// ========================================
// CARREGAR PRODUTOS DO GITHUB
// ========================================
async function carregarProdutos() {
  const grid = document.getElementById('produtos-grid');
  if (!grid) return;

  grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:#999">
    <div style="font-size:32px;margin-bottom:10px">📿</div>
    <p>Carregando produtos...</p>
  </div>`;

  try {
    const res = await fetch(rawUrl());
    if (!res.ok) throw new Error('Erro ao buscar produtos');
    todosProdutos = await res.json();
    inicializarFiltros();
    renderizarProdutos('todos');
  } catch (e) {
    console.error(e);
    // fallback para localStorage se GitHub falhar
    const local = localStorage.getItem('produtos_cache');
    if (local) {
      todosProdutos = JSON.parse(local);
      inicializarFiltros();
      renderizarProdutos('todos');
    } else {
      grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:#999">
        <p>Não foi possível carregar os produtos. Tente recarregar a página.</p>
      </div>`;
    }
  }

  // salva cache local
  if (todosProdutos.length) {
    localStorage.setItem('produtos_cache', JSON.stringify(todosProdutos));
  }
}

// ========================================
// RENDERIZAR PRODUTOS
// ========================================
function renderizarProdutos(filtro) {
  const grid = document.getElementById('produtos-grid');
  if (!grid) return;

  const lista = filtro === 'todos'
    ? todosProdutos
    : todosProdutos.filter(p => p.categoria.toLowerCase() === filtro.toLowerCase());

  if (!lista.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:#999">
      <p>Nenhum produto nesta categoria ainda.</p>
    </div>`;
    return;
  }

  grid.innerHTML = lista.map(produto => {
    const imgSrc = produto.imagem || 'images/semfoto.jpg';
    const preco = parseFloat(produto.preco) || 0;
    return `
      <div class="produto-card" data-categoria="${produto.categoria}">
        <div class="produto-imagem">
          <img src="${imgSrc}" alt="${produto.nome}" loading="lazy"
            onerror="this.src='images/semfoto.jpg'">
          <div class="produto-overlay">
            <button class="btn-zoom" onclick="abrirModal(${produto.id})">
              <i class="fas fa-search-plus"></i> Ver Detalhes
            </button>
          </div>
        </div>
        <div class="produto-info">
          <span class="produto-categoria">${formatarCategoria(produto.categoria)}</span>
          <h3>${produto.nome}</h3>
          <p class="produto-preco">R$ ${formatarPreco(preco)}</p>
          <button class="btn-carrinho" onclick='adicionarCarrinho(${JSON.stringify(produto)})'>
            🛒 Adicionar ao Carrinho
          </button>
          <button class="btn-whatsapp" onclick="comprarWhatsApp('${produto.nome}', ${preco})">
            <i class="fab fa-whatsapp"></i> Comprar
          </button>
        </div>
      </div>`;
  }).join('');
}

// ========================================
// FILTROS
// ========================================
function inicializarFiltros() {
  const botoes = document.querySelectorAll('.filtro-btn');
  botoes.forEach(botao => {
    botao.addEventListener('click', function () {
      botoes.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      renderizarProdutos(this.dataset.filtro);
    });
  });
}

// ========================================
// FORMATAR
// ========================================
function formatarCategoria(cat) {
  const map = { tercos:'Terços', rosarios:'Rosários', pulseiras:'Pulseiras', carro:'Carro', imagens:'Imagens' };
  return map[cat?.toLowerCase()] || cat;
}

function formatarPreco(preco) {
  return parseFloat(preco).toFixed(2).replace('.', ',');
}

// ========================================
// MODAL
// ========================================
function inicializarModal() {
  const modal = document.getElementById('modal');
  const closeBtn = document.querySelector('.modal-close');
  if (closeBtn) closeBtn.addEventListener('click', fecharModal);
  if (modal) modal.addEventListener('click', e => { if (e.target === modal) fecharModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') fecharModal(); });
}

function abrirModal(id) {
  const modal = document.getElementById('modal');
  const produto = todosProdutos.find(p => p.id === id);
  if (!produto || !modal) return;
  document.getElementById('modal-img').src = produto.imagem || 'images/semfoto.jpg';
  document.getElementById('modal-img').alt = produto.nome;
  document.getElementById('modal-titulo').textContent = produto.nome;
  document.getElementById('modal-preco').textContent = `R$ ${formatarPreco(produto.preco)}`;
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function fecharModal() {
  const modal = document.getElementById('modal');
  if (modal) { modal.classList.remove('active'); document.body.style.overflow = ''; }
}

// ========================================
// CARRINHO — GAVETA LATERAL
// ========================================

function injetarCarrinho() {
  // Remove carrinho antigo se existir no HTML
  const velho = document.getElementById('carrinho');
  if (velho) velho.remove();

  const html = `
    <!-- Overlay escuro -->
    <div id="carrinho-overlay" onclick="fecharCarrinho()"
      style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:8000;transition:opacity 0.3s"></div>

    <!-- Gaveta -->
    <div id="carrinho-gaveta" style="
      position:fixed;top:0;right:0;height:100%;width:380px;max-width:95vw;
      background:white;z-index:8001;
      transform:translateX(100%);transition:transform 0.35s cubic-bezier(.4,0,.2,1);
      display:flex;flex-direction:column;box-shadow:-4px 0 30px rgba(0,0,0,0.15)">

      <!-- Header gaveta -->
      <div style="background:#3D2B1F;padding:20px 24px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:22px">🛒</span>
          <div>
            <div style="color:white;font-weight:700;font-size:16px">Meu Carrinho</div>
            <div style="color:#C9A84C;font-size:12px" id="gaveta-subtitulo">0 itens</div>
          </div>
        </div>
        <button onclick="fecharCarrinho()" style="background:rgba(255,255,255,0.15);border:none;color:white;width:34px;height:34px;border-radius:50%;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center">✕</button>
      </div>

      <!-- Itens -->
      <div id="gaveta-itens" style="flex:1;overflow-y:auto;padding:16px"></div>

      <!-- Footer com total e botões -->
      <div id="gaveta-footer" style="padding:16px 20px;border-top:2px solid #F5EDD4;flex-shrink:0;background:white"></div>
    </div>

    <!-- Botão flutuante do carrinho -->
    <button onclick="abrirCarrinho()" id="btn-carrinho-float" style="
      position:fixed;bottom:160px;right:20px;
      background:linear-gradient(135deg,#C9A84C,#E8C97A);
      border:none;border-radius:50px;
      padding:12px 18px;
      font-size:14px;font-weight:700;color:#3D2B1F;
      cursor:pointer;z-index:7000;
      box-shadow:0 4px 16px rgba(201,168,76,0.45);
      display:flex;align-items:center;gap:8px;
      transition:transform 0.2s,box-shadow 0.2s">
      🛒 <span id="contador-carrinho">0</span>
    </button>
  `;

  document.body.insertAdjacentHTML('beforeend', html);

  // hover no botão flutuante
  const btnFloat = document.getElementById('btn-carrinho-float');
  btnFloat.onmouseover = () => { btnFloat.style.transform = 'scale(1.05)'; btnFloat.style.boxShadow = '0 6px 20px rgba(201,168,76,0.6)'; };
  btnFloat.onmouseleave = () => { btnFloat.style.transform = 'scale(1)'; btnFloat.style.boxShadow = '0 4px 16px rgba(201,168,76,0.45)'; };
}

function abrirCarrinho() {
  document.getElementById('carrinho-overlay').style.display = 'block';
  document.getElementById('carrinho-gaveta').style.transform = 'translateX(0)';
  document.body.style.overflow = 'hidden';
  renderizarCarrinho();
}

function fecharCarrinho() {
  document.getElementById('carrinho-overlay').style.display = 'none';
  document.getElementById('carrinho-gaveta').style.transform = 'translateX(100%)';
  document.body.style.overflow = '';
}

function adicionarCarrinho(produto) {
  const existente = carrinho.find(i => i.id === produto.id);
  if (existente) {
    existente.qty = (existente.qty || 1) + 1;
  } else {
    carrinho.push({ ...produto, qty: 1 });
  }
  atualizarContadorCarrinho();
  abrirCarrinho();

  // feedback visual no botão
  const btns = document.querySelectorAll(`[onclick*="adicionarCarrinho"]`);
  btns.forEach(btn => {
    if (btn.closest('.produto-card') && btn.closest('.produto-card').querySelector('h3')?.textContent === produto.nome) {
      const orig = btn.innerHTML;
      btn.innerHTML = '✓ Adicionado!';
      btn.style.background = '#4CAF82';
      btn.style.color = 'white';
      setTimeout(() => { btn.innerHTML = orig; btn.style.background = ''; btn.style.color = ''; }, 1800);
    }
  });
}

function removerCarrinho(id) {
  carrinho = carrinho.filter(i => i.id !== id);
  atualizarContadorCarrinho();
  renderizarCarrinho();
}

function alterarQty(id, delta) {
  const item = carrinho.find(i => i.id === id);
  if (!item) return;
  item.qty = Math.max(1, (item.qty || 1) + delta);
  atualizarContadorCarrinho();
  renderizarCarrinho();
}

function atualizarContadorCarrinho() {
  const total = carrinho.reduce((s, i) => s + (i.qty || 1), 0);
  document.querySelectorAll('#contador-carrinho').forEach(el => el.textContent = total);
  const sub = document.getElementById('gaveta-subtitulo');
  if (sub) sub.textContent = total + (total === 1 ? ' item' : ' itens');

  // pulsa o botão ao adicionar
  const btn = document.getElementById('btn-carrinho-float');
  if (btn) {
    btn.style.transform = 'scale(1.2)';
    setTimeout(() => btn.style.transform = 'scale(1)', 300);
  }
}

function renderizarCarrinho() {
  const container = document.getElementById('gaveta-itens');
  const footer = document.getElementById('gaveta-footer');
  if (!container) return;

  if (!carrinho.length) {
    container.innerHTML = `
      <div style="text-align:center;padding:48px 20px;color:#9A8F85">
        <div style="font-size:48px;margin-bottom:12px">🛒</div>
        <div style="font-size:16px;font-weight:600;color:#3D2B1F;margin-bottom:6px">Carrinho vazio</div>
        <p style="font-size:13px">Adicione produtos para começar seu pedido</p>
        <button onclick="fecharCarrinho()" style="margin-top:16px;padding:10px 24px;background:#F5EDD4;border:none;border-radius:20px;font-size:13px;font-weight:600;cursor:pointer;color:#3D2B1F">
          Ver produtos
        </button>
      </div>`;
    if (footer) footer.innerHTML = '';
    return;
  }

  let total = 0;
  container.innerHTML = carrinho.map(item => {
    const preco = parseFloat(item.preco);
    const sub = preco * (item.qty || 1);
    total += sub;
    return `
      <div style="display:flex;gap:12px;padding:14px 0;border-bottom:1px solid #F5EDD4;align-items:flex-start">
        <img src="${item.imagem || 'images/semfoto.jpg'}"
          onerror="this.src='images/semfoto.jpg'"
          style="width:64px;height:64px;object-fit:cover;border-radius:10px;flex-shrink:0;border:1px solid #EDE8E0">
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:700;color:#3D2B1F;line-height:1.3;margin-bottom:4px">${item.nome}</div>
          <div style="font-size:12px;color:#9A8F85;margin-bottom:8px">R$ ${formatarPreco(preco)} cada</div>
          <div style="display:flex;align-items:center;gap:8px">
            <div style="display:flex;align-items:center;background:#F8F5F0;border-radius:20px;border:1px solid #EDE8E0">
              <button onclick="alterarQty(${item.id},-1)" style="width:28px;height:28px;background:none;border:none;cursor:pointer;font-size:16px;color:#3D2B1F;display:flex;align-items:center;justify-content:center">−</button>
              <span style="width:24px;text-align:center;font-size:13px;font-weight:700">${item.qty}</span>
              <button onclick="alterarQty(${item.id},1)" style="width:28px;height:28px;background:none;border:none;cursor:pointer;font-size:16px;color:#3D2B1F;display:flex;align-items:center;justify-content:center">+</button>
            </div>
            <span style="font-size:14px;font-weight:700;color:#3D2B1F">R$ ${formatarPreco(sub)}</span>
          </div>
        </div>
        <button onclick="removerCarrinho(${item.id})" style="background:none;border:none;cursor:pointer;color:#D4CBC0;font-size:18px;padding:4px;flex-shrink:0" title="Remover">✕</button>
      </div>`;
  }).join('');

  if (footer) {
    footer.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <span style="font-size:14px;color:#9A8F85">Total do pedido</span>
        <span style="font-size:22px;font-weight:800;color:#3D2B1F;font-family:'Georgia',serif">R$ ${formatarPreco(total)}</span>
      </div>
      <button onclick="enviarWhatsApp()" style="
        width:100%;padding:15px;
        background:linear-gradient(135deg,#25D366,#1DAE56);
        border:none;border-radius:12px;
        font-size:15px;font-weight:700;color:white;cursor:pointer;
        display:flex;align-items:center;justify-content:center;gap:10px;
        box-shadow:0 4px 14px rgba(37,211,102,0.4)">
        <i class="fab fa-whatsapp" style="font-size:20px"></i> Finalizar pelo WhatsApp
      </button>
      <button onclick="limparCarrinho()" style="width:100%;padding:10px;background:none;border:none;color:#9A8F85;font-size:12px;cursor:pointer;margin-top:8px">
        🗑️ Limpar carrinho
      </button>`;
  }
}

function limparCarrinho() {
  if (!confirm('Limpar o carrinho?')) return;
  carrinho = [];
  atualizarContadorCarrinho();
  renderizarCarrinho();
}

function enviarWhatsApp() {
  if (!carrinho.length) { alert('Carrinho vazio!'); return; }

  let linhas = ['Olá! Gostaria de fazer o seguinte pedido:', ''];
  let total = 0;

  carrinho.forEach(p => {
    const qty = p.qty || 1;
    const sub = parseFloat(p.preco) * qty;
    total += sub;
    linhas.push(`• ${p.nome}`);
    linhas.push(`  Qtd: ${qty}x  |  R$ ${formatarPreco(sub)}`);
    linhas.push('');
  });

  linhas.push(`*Total do pedido: R$ ${formatarPreco(total)}*`);
  linhas.push('');
  linhas.push('_Aguardo confirmação. Obrigada! 🙏_');

  const msg = encodeURIComponent(linhas.join('\n'));
  window.open(`https://wa.me/${CONFIG.whatsapp}?text=${msg}`, '_blank');
}

function comprarWhatsApp(nome, preco) {
  const texto = `Olá! Tenho interesse neste produto:\n\n*${nome}*\nPreço: R$ ${formatarPreco(preco)}\n\nPoderia me dar mais informações? 🙏`;
  window.open(`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(texto)}`, '_blank');
}

// ========================================
// DEPOIMENTOS
// ========================================
function renderizarDepoimentos() {
  const grid = document.getElementById('depoimentos-grid');
  if (!grid) return;
  const deps = [
    { id: 1, imagem: 'images/depoimento-01.jpg' },
    { id: 2, imagem: 'images/depoimento-02.jpg' },
    { id: 3, imagem: 'images/depoimento-03.jpg' }
  ];
  grid.innerHTML = deps.map(d => `
    <div class="depoimento-card">
      <img src="${d.imagem}" alt="Depoimento" loading="lazy" onerror="this.parentElement.style.display='none'">
    </div>`).join('');
}

// ========================================
// VÍDEO
// ========================================
function inicializarVideo() {}

function playVideo() {
  const video = document.getElementById('video-produtos');
  if (video) {
    video.play();
    const overlay = document.querySelector('.video-overlay');
    if (overlay) overlay.style.display = 'none';
  }
}

// ========================================
// MENU MOBILE
// ========================================
function inicializarMenu() {
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.nav-menu');
  if (toggle) {
    toggle.addEventListener('click', function () {
      this.classList.toggle('active');
      nav.classList.toggle('active');
    });
  }
  document.querySelectorAll('.nav-menu a').forEach(link => {
    link.addEventListener('click', () => {
      toggle?.classList.remove('active');
      nav?.classList.remove('active');
    });
  });
}

// ========================================
// SCROLL SUAVE
// ========================================
function inicializarScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', function (e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth' }); }
    });
  });
}

// ========================================
// EXPORTAR PDF CATÁLOGO COM IMAGENS
// ========================================
async function exportarPDF() {
  if (!todosProdutos.length) {
    alert('Nenhum produto carregado ainda. Aguarde e tente novamente.');
    return;
  }

  // Converte imagem URL para base64 para incluir no PDF
  async function imgToBase64(url) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      return new Promise(resolve => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch { return null; }
  }

  // Monta HTML do catálogo com imagens
  const linhas = await Promise.all(todosProdutos.map(async (p, i) => {
    const imgSrc = p.imagem ? await imgToBase64(p.imagem) : null;
    const imgTag = imgSrc
      ? `<img src="${imgSrc}" style="width:110px;height:110px;object-fit:cover;border-radius:8px;border:1px solid #ddd">`
      : `<div style="width:110px;height:110px;background:#f5f0eb;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:28px">📿</div>`;

    return `
      <div style="display:flex;gap:16px;align-items:center;padding:14px 0;border-bottom:1px solid #EDE8E0;break-inside:avoid">
        ${imgTag}
        <div>
          <div style="font-size:15px;font-weight:700;color:#3D2B1F;margin-bottom:4px">${p.nome}</div>
          <div style="font-size:12px;color:#9A8F85;margin-bottom:6px;text-transform:capitalize">${formatarCategoria(p.categoria)}</div>
          <div style="font-size:18px;font-weight:800;color:#C9A84C">R$ ${formatarPreco(p.preco)}</div>
        </div>
      </div>`;
  }));

  const dataHoje = new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Catálogo — Ateliê Mãos de Maria</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: Arial, sans-serif; padding: 32px; color: #3D2B1F; background: white; }

        .header {
          text-align: center;
          border-bottom: 3px solid #C9A84C;
          padding-bottom: 20px;
          margin-bottom: 24px;
        }
        .header h1 {
          font-size: 28px;
          color: #3D2B1F;
          margin-bottom: 4px;
        }
        .header p { font-size: 13px; color: #9A8F85; }
        .header .gold { color: #C9A84C; }

        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0 32px;
        }

        .footer {
          margin-top: 32px;
          border-top: 2px solid #EDE8E0;
          padding-top: 16px;
          text-align: center;
          font-size: 12px;
          color: #9A8F85;
        }

        .total-badge {
          display: inline-block;
          background: #F5EDD4;
          color: #3D2B1F;
          border-radius: 20px;
          padding: 4px 14px;
          font-size: 12px;
          font-weight: 700;
          margin-top: 6px;
        }

        @media print {
          body { padding: 20px; }
          @page { margin: 1cm; }
        }
      </style>
    </head>
    <body>

      <div class="header">
        <h1>📿 Ateliê <span class="gold">Mãos de Maria</span></h1>
        <p>Terços artesanais feitos com amor e fé · Mococa, SP</p>
        <p>📱 (19) 99894-9401 · atmaosdemaria@gmail.com</p>
        <div class="total-badge">${todosProdutos.length} produtos · Atualizado em ${dataHoje}</div>
      </div>

      <div class="grid">
        ${linhas.join('')}
      </div>

      <div class="footer">
        <p>Para encomendar, entre em contato pelo WhatsApp: <strong>(19) 99894-9401</strong></p>
        <p style="margin-top:4px">© ${new Date().getFullYear()} Ateliê Mãos de Maria — Todos os direitos reservados</p>
      </div>

    </body>
    </html>`;

  const janela = window.open('', '_blank');
  janela.document.write(html);
  janela.document.close();
  setTimeout(() => janela.print(), 800);
}


// Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}