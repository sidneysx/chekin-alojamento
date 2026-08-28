(function () {
  "use strict";

  // ---------- referências DOM ----------
  const form = document.getElementById("searchForm");
  const inputBusca = document.getElementById("inputBusca");
  const btnBuscar = document.getElementById("btnBuscar");

  const stateLoading = document.getElementById("stateLoading");
  const stateError = document.getElementById("stateError");
  const errorMsg = document.getElementById("errorMsg");
  const btnErrorRetry = document.getElementById("btnErrorRetry");

  const employeeCard = document.getElementById("employeeCard");
  const btnCheckin = document.getElementById("btnCheckin");

  const stateSuccess = document.getElementById("stateSuccess");
  const stateAlready = document.getElementById("stateAlready");
  const btnNovoSuccess = document.getElementById("btnNovoSuccess");
  const btnNovoWarn = document.getElementById("btnNovoWarn");

  let colaboradorAtual = null; // guarda os dados encontrados até o check-in

  // ---------- helpers ----------
  function normalizarCpf(v) {
    return String(v || "").replace(/\D/g, "");
  }

  function ehProvavelCpf(v) {
    return normalizarCpf(v).length === 11;
  }

  function esconderTodosEstados() {
    [stateLoading, stateError, employeeCard, stateSuccess, stateAlready].forEach(
      (el) => (el.hidden = true)
    );
    form.hidden = false;
  }

  function mostrar(el) {
    esconderTodosEstados();
    el.hidden = false;
    // o formulário de busca some enquanto qualquer estado/card é exibido
    if (el !== form) form.hidden = true;
  }

  function setBotaoCarregando(btn, carregando) {
    btn.disabled = carregando;
    btn.classList.toggle("is-loading", carregando);
  }

  function horaAtual() {
    return new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }

  // ---------- busca do colaborador ----------
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();

    const valorBruto = inputBusca.value.trim();
    if (!valorBruto) {
      inputBusca.focus();
      return;
    }

    // se parecer CPF (11 dígitos), normaliza; caso contrário assume matrícula
    const valorBusca = ehProvavelCpf(valorBruto) ? normalizarCpf(valorBruto) : valorBruto;

    setBotaoCarregando(btnBuscar, true);
    mostrar(stateLoading);

    try {
      const resp = await buscarColaborador(valorBusca);

      if (resp.success && resp.data) {
        colaboradorAtual = resp.data;
        preencherCard(resp.data);
        mostrar(employeeCard);
      } else {
        mostrarErro(resp.message || "Colaborador não encontrado. Verifique sua matrícula ou CPF e tente novamente.");
      }
    } catch (e) {
      mostrarErro(e.message || "Erro ao consultar o colaborador.");
    } finally {
      setBotaoCarregando(btnBuscar, false);
    }
  });

  function preencherCard(d) {
    document.getElementById("empNome").textContent = d.nome || "—";
    document.getElementById("empMatricula").textContent = d.matricula || "—";
    document.getElementById("empSetor").textContent = d.setor || "—";
    document.getElementById("empCpf").textContent = d.cpf || "—";
  }

  function mostrarErro(msg) {
    errorMsg.textContent = msg;
    mostrar(stateError);
  }

  btnErrorRetry.addEventListener("click", () => {
    esconderTodosEstados();
    inputBusca.focus();
  });

  // ---------- realizar check-in ----------
  btnCheckin.addEventListener("click", async () => {
    if (!colaboradorAtual) return;

    setBotaoCarregando(btnCheckin, true);

    try {
      // 1) verifica duplicidade no dia atual
      const verificacao = await verificarCheckin(colaboradorAtual.matricula, colaboradorAtual.cpf);

      if (!verificacao.success) {
        mostrarErro(verificacao.message || "Não foi possível verificar o check-in.");
        return;
      }

      if (verificacao.jaFezCheckin) {
        mostrar(stateAlready);
        return;
      }

      // 2) registra o check-in
      const registro = await realizarCheckin(colaboradorAtual);

      if (registro.success) {
        const d = registro.data || colaboradorAtual;
        document.getElementById("okNome").textContent = d.nome || "—";
        document.getElementById("okMatricula").textContent = d.matricula || "—";
        document.getElementById("okData").textContent = d.data_alojamento || "—";
        document.getElementById("okHora").textContent = horaAtual();
        mostrar(stateSuccess);
      } else if (registro.message && registro.message.toLowerCase().includes("já realizou")) {
        mostrar(stateAlready);
      } else {
        mostrarErro(registro.message || "Não foi possível registrar o check-in.");
      }
    } catch (e) {
      mostrarErro(e.message || "Erro ao registrar o check-in.");
    } finally {
      setBotaoCarregando(btnCheckin, false);
    }
  });

  // ---------- reiniciar fluxo ----------
  function reiniciar() {
    colaboradorAtual = null;
    inputBusca.value = "";
    esconderTodosEstados();
    inputBusca.focus();
  }
  btnNovoSuccess.addEventListener("click", reiniciar);
  btnNovoWarn.addEventListener("click", reiniciar);
})();