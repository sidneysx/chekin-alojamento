/**
 * Busca um colaborador na planilha de base por matrícula ou CPF.
 * @param {string} valor
 * @returns {Promise<{success:boolean, data?:object, message?:string}>}
 */
async function buscarColaborador(valor) {
  const url = `${API_URL}?action=buscar&valor=${encodeURIComponent(valor)}`;
  let resp;
  try {
    resp = await fetch(url);
  } catch (e) {
    throw new Error("Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.");
  }
  if (!resp.ok) throw new Error("Erro de conexão com o servidor.");
  return resp.json();
}

/**
 * Verifica se o colaborador já realizou check-in na data de hoje.
 * @param {string} matricula
 * @param {string} cpf
 * @returns {Promise<{success:boolean, jaFezCheckin?:boolean, message?:string}>}
 */
async function verificarCheckin(matricula, cpf) {
  const url = `${API_URL}?action=verificar&matricula=${encodeURIComponent(matricula)}&cpf=${encodeURIComponent(cpf)}`;
  let resp;
  try {
    resp = await fetch(url);
  } catch (e) {
    throw new Error("Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.");
  }
  if (!resp.ok) throw new Error("Erro de conexão com o servidor.");
  return resp.json();
}

/**
 * Registra o check-in do colaborador na planilha de controle.
 * @param {{nome:string, matricula:string, setor:string, cpf:string}} dadosColaborador
 * @returns {Promise<{success:boolean, message:string, data?:object}>}
 */
async function realizarCheckin(dadosColaborador) {
  let resp;
  try {
    resp = await fetch(API_URL, {
      method: "POST",
      // Content-Type text/plain evita o preflight OPTIONS, que o Apps Script não trata.
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "checkin", data: dadosColaborador })
    });
  } catch (e) {
    throw new Error("Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.");
  }
  if (!resp.ok) throw new Error("Erro de conexão com o servidor.");
  return resp.json();
}