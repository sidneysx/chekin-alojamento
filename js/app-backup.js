/**
 * app.js
 * Fluxo: buscar colaborador -> ver se já está alocado
 *   - se já alocado: mostra alojamento atual + botão de check-out
 *   - se não: mostra lista de alojamentos com vagas para escolher e fazer check-in
 */
(function () {
  "use strict";

  // ---------- referências DOM ----------
  const form = document.getElementById("searchForm");
  const inputBusca = document.getElementById("inputBusca");
  const btnBuscar = document.getElementById("btnBuscar");

  const stateLoading = document.getElementById("stateLoading");
  const loadingText = document.getElementById("loadingText");
  const stateError = document.getElementById("stateError");
  const errorMsg = document.getElementById("errorMsg");
  const btnErrorRetry = document.getElementById("btnErrorRetry");

  const cardAllocated = document.getElementById("cardAllocated");
  const btnCheckout = document.getElementById("btnCheckout");

  const cardChoose = document.getElementById("cardChoose");
  const lodgingList = document.getElementById("lodgingList");
  const btnConfirmCheckin = document.getElementById("btnConfirmCheckin");

  const stateSuccessCheckin = document.getElementById("stateSuccessCheckin");
  const stateSuccessCheckout = document.getElementById("stateSuccessCheckout");
  const btnNovoAfterCheckin = document.getElementById("btnNovoAfterCheckin");
  const btnNovoAfterCheckout = document.getElementById("btnNovoAfterCheckout");

  const ALL_STATES = [stateLoading, stateError, cardAllocated, cardChoose, stateSuccessCheckin, stateSuccessCheckout];

  let colaboradorAtual = null;   // {nome, matricula, setor, cpf}
  let alojamentoEscolhido = null;

  // ---------- helpers ----------
  function normalizarCpf(v) { return String(v || "").replace(/\D/g, ""); }
  function ehProvavelCpf(v) { return normalizarCpf(v).length === 11; }

  function esconderTudo() {
    ALL_STATES.forEach((el) => (el.hidden = true));
    form.hidden = false;
  }
  function mostrar(el) {
    esconderTudo();
    el.hidden = false;
    form.hidden = true;
  }
  function setBotaoCarregando(btn, carregando) {
    btn.disabled = carregando;
    btn.classList.toggle("is-loading", carregando);
  }
  function mostrarErro(msg) {
    errorMsg.textContent = msg;
    mostrar(stateError);
  }

  // ---------- 1) busca do colaborador ----------
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const valorBruto = inputBusca.value.trim();
    if (!valorBruto) { inputBusca.focus(); return; }
    const valorBusca = ehProvavelCpf(valorBruto) ? normalizarCpf(valorBruto) : valorBruto;

    setBotaoCarregando(btnBuscar, true);
    loadingText.textContent = "Consultando dados...";
    mostrar(stateLoading);

    try {
      const resp = await buscarColaborador(valorBusca);
      if (!resp.success || !resp.data) {
        mostrarErro(resp.message || "Colaborador não encontrado. Verifique sua matrícula ou CPF e tente novamente.");
        return;
      }
      colaboradorAtual = resp.data;
      await verificarStatusEProsseguir();
    } catch (e) {
      mostrarErro(e.message || "Erro ao consultar o colaborador.");
    } finally {
      setBotaoCarregando(btnBuscar, false);
    }
  });

  // ---------- 2) verifica se já está alocado ----------
  async function verificarStatusEProsseguir() {
    loadingText.textContent = "Verificando alocação...";
    mostrar(stateLoading);
    try {
      const status = await statusColaborador(colaboradorAtual.matricula, colaboradorAtual.cpf);
      if (!status.success) {
        mostrarErro(status.message || "Não foi possível verificar seu status.");
        return;
      }
      if (status.alocado) {
        preencherCardAlocado(status);
        mostrar(cardAllocated);
      } else {
        await carregarAlojamentosEProsseguir();
      }
    } catch (e) {
      mostrarErro(e.message || "Erro ao verificar status.");
    }
  }

  function preencherCardAlocado(status) {
    document.getElementById("alocNome").textContent = colaboradorAtual.nome || "—";
    document.getElementById("alocAlojamento").textContent = status.alojamento || "—";
    document.getElementById("alocData").textContent = status.data_checkin || "—";
  }

  // ---------- 3) lista alojamentos para escolher ----------
  async function carregarAlojamentosEProsseguir() {
    loadingText.textContent = "Carregando alojamentos...";
    mostrar(stateLoading);
    try {
      const resp = await listarAlojamentos();
      if (!resp.success) {
        mostrarErro(resp.message || "Não foi possível carregar os alojamentos.");
        return;
      }
      document.getElementById("chooseNome").textContent = colaboradorAtual.nome || "—";
      document.getElementById("chooseMatricula").textContent = colaboradorAtual.matricula || "—";
      renderizarAlojamentos(resp.data || []);
      mostrar(cardChoose);
    } catch (e) {
      mostrarErro(e.message || "Erro ao carregar alojamentos.");
    }
  }

  function renderizarAlojamentos(lista) {
    alojamentoEscolhido = null;
    btnConfirmCheckin.disabled = true;
    lodgingList.innerHTML = "";

    if (lista.length === 0) {
      lodgingList.innerHTML = '<div class="lodging-empty">Nenhum alojamento cadastrado.</div>';
      return;
    }

    lista.forEach((aloj) => {
      const cheio = aloj.vagas_disponiveis <= 0;
      const opt = document.createElement("div");
      opt.className = "lodging-option" + (cheio ? " disabled" : "");
      opt.innerHTML = `
        <div class="lodging-radio"></div>
        <div class="lodging-info">
          <div class="lodging-name">${escapeHtml(aloj.nome)}</div>
          <div class="lodging-address">${escapeHtml(aloj.endereco || "")}</div>
        </div>
        <div class="lodging-beds ${cheio ? "full" : "available"}">
          ${cheio ? "Lotado" : aloj.vagas_disponiveis + " vaga" + (aloj.vagas_disponiveis === 1 ? "" : "s")}
        </div>
      `;
      if (!cheio) {
        opt.addEventListener("click", () => selecionarAlojamento(opt, aloj));
      }
      lodgingList.appendChild(opt);
    });
  }

  function selecionarAlojamento(el, aloj) {
    document.querySelectorAll(".lodging-option").forEach((o) => o.classList.remove("selected"));
    el.classList.add("selected");
    alojamentoEscolhido = aloj;
    btnConfirmCheckin.disabled = false;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // ---------- 4) confirmar check-in ----------
  btnConfirmCheckin.addEventListener("click", async () => {
    if (!colaboradorAtual || !alojamentoEscolhido) return;
    setBotaoCarregando(btnConfirmCheckin, true);
    try {
      const dados = { ...colaboradorAtual, alojamento: alojamentoEscolhido.nome };
      const resp = await realizarCheckin(dados);
      if (resp.success) {
        const d = resp.data || {};
        document.getElementById("okAlojamento").textContent = d.alojamento || alojamentoEscolhido.nome;
        document.getElementById("okEndereco").textContent = d.endereco || alojamentoEscolhido.endereco || "—";
        document.getElementById("okData").textContent = d.data_checkin || "—";
        mostrar(stateSuccessCheckin);
      } else {
        mostrarErro(resp.message || "Não foi possível registrar o check-in.");
      }
    } catch (e) {
      mostrarErro(e.message || "Erro ao registrar o check-in.");
    } finally {
      setBotaoCarregando(btnConfirmCheckin, false);
    }
  });

  // ---------- 5) confirmar check-out ----------
  btnCheckout.addEventListener("click", async () => {
    if (!colaboradorAtual) return;
    setBotaoCarregando(btnCheckout, true);
    try {
      const resp = await realizarCheckout({ matricula: colaboradorAtual.matricula, cpf: colaboradorAtual.cpf });
      if (resp.success) {
        const d = resp.data || {};
        document.getElementById("okCheckoutAlojamento").textContent = d.alojamento || "—";
        document.getElementById("okCheckoutData").textContent = d.data_checkout || "—";
        mostrar(stateSuccessCheckout);
      } else {
        mostrarErro(resp.message || "Não foi possível registrar o check-out.");
      }
    } catch (e) {
      mostrarErro(e.message || "Erro ao registrar o check-out.");
    } finally {
      setBotaoCarregando(btnCheckout, false);
    }
  });

  // ---------- reiniciar fluxo ----------
  function reiniciar() {
    colaboradorAtual = null;
    alojamentoEscolhido = null;
    inputBusca.value = "";
    esconderTudo();
    inputBusca.focus();
  }
  btnNovoAfterCheckin.addEventListener("click", reiniciar);
  btnNovoAfterCheckout.addEventListener("click", reiniciar);
  btnErrorRetry.addEventListener("click", () => { esconderTudo(); inputBusca.focus(); });
})();