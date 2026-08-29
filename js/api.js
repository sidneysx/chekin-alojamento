/**
 * api.js
 * Comunicação com o Google Apps Script (Code.gs).
 */

async function buscarColaborador(valor) {
  const url = `${API_URL}?action=buscar&valor=${encodeURIComponent(valor)}`;
  const resp = await fetchComErro(url);
  return resp.json();
}

/**
 * Verifica se o colaborador já está alocado em algum alojamento.
 */
async function statusColaborador(matricula, cpf) {
  const url = `${API_URL}?action=statusColaborador&matricula=${encodeURIComponent(matricula)}&cpf=${encodeURIComponent(cpf)}`;
  const resp = await fetchComErro(url);
  return resp.json();
}

/**
 * Lista os alojamentos com vagas disponíveis calculadas em tempo real.
 */
async function listarAlojamentos() {
  const url = `${API_URL}?action=listarAlojamentos`;
  const resp = await fetchComErro(url);
  return resp.json();
}

/**
 * Registra o check-in do colaborador no alojamento escolhido.
 * @param {{nome:string, matricula:string, setor:string, cpf:string, alojamento:string}} dados
 */
async function realizarCheckin(dados) {
  const resp = await fetchComErro(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "checkin", data: dados })
  });
  return resp.json();
}

/**
 * Registra o check-out do colaborador.
 * @param {{matricula:string, cpf:string}} dados
 */
async function realizarCheckout(dados) {
  const resp = await fetchComErro(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "checkout", data: dados })
  });
  return resp.json();
}

// ---------- helper interno ----------
async function fetchComErro(url, options) {
  let resp;
  try {
    resp = await fetch(url, options);
  } catch (e) {
    throw new Error("Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.");
  }
  if (!resp.ok) throw new Error("Erro de conexão com o servidor.");
  return resp;
}