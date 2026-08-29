/**
 * Sistema de Alojamento — Google Apps Script
 * ---------------------------------------------------------
 * Três planilhas:
 *   1) Base de colaboradores   (consulta)
 *   2) Alojamentos             (consulta — nome, endereço, camas totais)
 *   3) Controle de alocação    (consulta + gravação — quem está em qual alojamento)
 *
 * Modelo: o colaborador escolhe um alojamento e fica alocado até fazer
 * check-out manual. A vaga só volta a ficar disponível nesse momento.
 */
 
// ----- IDs das planilhas -----
var ID_PLANILHA_COLABORADORES = '1GNfohLsDLTbdlITNcVSrHOHdmoWkgztdfe5GYCX9sUk';
var ID_PLANILHA_ALOJAMENTOS   = 'COLE_AQUI_O_ID_DA_PLANILHA_DE_ALOJAMENTOS';
var ID_PLANILHA_ALOCACAO      = '1ib69Kqd-riu31i48J-xw47x6mcCtmUNcxgqi1qLXnWA';
 
// Nome da aba dentro de cada planilha — ajuste se for diferente
var ABA_COLABORADORES = 'Página1';
var ABA_ALOJAMENTOS   = 'Página1';
var ABA_ALOCACAO      = 'Página1';
 
// =========================================================
// Roteamento
// =========================================================
function doGet(e) {
  try {
    var action = e.parameter.action;
    if (action === 'buscar')            return buscarColaborador(e.parameter.valor);
    if (action === 'statusColaborador')  return statusColaborador(e.parameter.matricula, e.parameter.cpf);
    if (action === 'listarAlojamentos')  return listarAlojamentos();
    return jsonResponse({ success: false, message: 'Ação inválida.' });
  } catch (err) {
    return jsonResponse({ success: false, message: 'Erro no servidor: ' + err.message });
  }
}
 
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    if (body.action === 'checkin')  return realizarCheckin(body.data);
    if (body.action === 'checkout') return realizarCheckout(body.data);
    return jsonResponse({ success: false, message: 'Ação inválida.' });
  } catch (err) {
    return jsonResponse({ success: false, message: 'Erro no servidor: ' + err.message });
  }
}
 
function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
 
// =========================================================
// Utilitários
// =========================================================
function normalizarCpf(cpf) {
  return String(cpf || '').replace(/\D/g, '');
}
function hojeFormatado() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy');
}
function getAba(id, nomeAba) {
  return SpreadsheetApp.openById(id).getSheetByName(nomeAba);
}
function mapaColunas(linhaCabecalho) {
  var mapa = {};
  linhaCabecalho.forEach(function (nome, i) { mapa[String(nome).trim().toLowerCase()] = i; });
  return mapa;
}
 
// =========================================================
// 1) Buscar colaborador (planilha de base)
// =========================================================
function buscarColaborador(valor) {
  if (!valor) return jsonResponse({ success: false, message: 'Informe a matrícula ou o CPF.' });
  var busca = String(valor).trim();
  var buscaCpf = normalizarCpf(busca);
 
  var aba = getAba(ID_PLANILHA_COLABORADORES, ABA_COLABORADORES);
  var dados = aba.getDataRange().getValues();
  var col = mapaColunas(dados[0]);
 
  for (var i = 1; i < dados.length; i++) {
    var linha = dados[i];
    var matricula = String(linha[col['matricula']]).trim();
    var cpf = normalizarCpf(linha[col['cpf']]);
    if (matricula === busca || (buscaCpf.length === 11 && cpf === buscaCpf)) {
      return jsonResponse({
        success: true,
        data: { nome: linha[col['nome']], matricula: matricula, setor: linha[col['setor']], cpf: linha[col['cpf']] }
      });
    }
  }
  return jsonResponse({ success: false, message: 'Colaborador não encontrado. Verifique sua matrícula ou CPF e tente novamente.' });
}
 
// =========================================================
// 2) Listar alojamentos com vagas calculadas
// =========================================================
function listarAlojamentos() {
  var abaAloj = getAba(ID_PLANILHA_ALOJAMENTOS, ABA_ALOJAMENTOS);
  var dadosAloj = abaAloj.getDataRange().getValues();
  var colAloj = mapaColunas(dadosAloj[0]);
 
  var ocupacao = contarOcupantesPorAlojamento();
 
  var lista = [];
  for (var i = 1; i < dadosAloj.length; i++) {
    var linha = dadosAloj[i];
    var nome = String(linha[colAloj['nome']]).trim();
    if (!nome) continue;
    var camasTotais = Number(linha[colAloj['camas_totais']]) || 0;
    var ocupadas = ocupacao[nome] || 0;
    lista.push({
      nome: nome,
      endereco: linha[colAloj['endereco']],
      camas_totais: camasTotais,
      vagas_disponiveis: Math.max(0, camasTotais - ocupadas)
    });
  }
  return jsonResponse({ success: true, data: lista });
}
 
// conta quantas pessoas com status "ocupando" existem em cada alojamento
function contarOcupantesPorAlojamento() {
  var aba = getAba(ID_PLANILHA_ALOCACAO, ABA_ALOCACAO);
  var dados = aba.getDataRange().getValues();
  var col = mapaColunas(dados[0]);
  var contagem = {};
  for (var i = 1; i < dados.length; i++) {
    var linha = dados[i];
    var status = String(linha[col['status']]).trim().toLowerCase();
    if (status === 'ocupando') {
      var aloj = String(linha[col['alojamento']]).trim();
      contagem[aloj] = (contagem[aloj] || 0) + 1;
    }
  }
  return contagem;
}
 
// =========================================================
// 3) Status de alocação do colaborador
// =========================================================
function buscarAlocacaoAtiva(matricula, cpf) {
  var matriculaBusca = String(matricula || '').trim();
  var cpfBusca = normalizarCpf(cpf);
 
  var aba = getAba(ID_PLANILHA_ALOCACAO, ABA_ALOCACAO);
  var dados = aba.getDataRange().getValues();
  var col = mapaColunas(dados[0]);
 
  for (var i = 1; i < dados.length; i++) {
    var linha = dados[i];
    var linMatricula = String(linha[col['matricula']]).trim();
    var linCpf = normalizarCpf(linha[col['cpf']]);
    var status = String(linha[col['status']]).trim().toLowerCase();
    var mesmoColaborador = (linMatricula === matriculaBusca) || (cpfBusca.length === 11 && linCpf === cpfBusca);
 
    if (mesmoColaborador && status === 'ocupando') {
      return {
        ativo: true,
        linhaPlanilha: i + 1, // linha real na planilha (1-indexado, considerando cabeçalho)
        alojamento: linha[col['alojamento']],
        data_checkin: linha[col['data_checkin']]
      };
    }
  }
  return { ativo: false };
}
 
function statusColaborador(matricula, cpf) {
  var aloc = buscarAlocacaoAtiva(matricula, cpf);
  if (aloc.ativo) {
    return jsonResponse({ success: true, alocado: true, alojamento: aloc.alojamento, data_checkin: aloc.data_checkin });
  }
  return jsonResponse({ success: true, alocado: false });
}
 
// =========================================================
// 4) Realizar check-in (escolher alojamento)
// =========================================================
function realizarCheckin(colaborador) {
  if (!colaborador || !colaborador.matricula || !colaborador.alojamento) {
    return jsonResponse({ success: false, message: 'Dados incompletos para o check-in.' });
  }
 
  var alocacaoAtual = buscarAlocacaoAtiva(colaborador.matricula, colaborador.cpf);
  if (alocacaoAtual.ativo) {
    return jsonResponse({ success: false, message: 'Você já está alocado no alojamento "' + alocacaoAtual.alojamento + '". Faça check-out antes de escolher outro.' });
  }
 
  // revalida vaga disponível no momento do check-in (proteção contra concorrência)
  var alojamentos = JSON.parse(listarAlojamentos().getContent()).data;
  var escolhido = alojamentos.filter(function (a) { return a.nome === colaborador.alojamento; })[0];
  if (!escolhido) {
    return jsonResponse({ success: false, message: 'Alojamento não encontrado.' });
  }
  if (escolhido.vagas_disponiveis <= 0) {
    return jsonResponse({ success: false, message: 'Não há mais vagas disponíveis nesse alojamento no momento.' });
  }
 
  var hoje = hojeFormatado();
  var aba = getAba(ID_PLANILHA_ALOCACAO, ABA_ALOCACAO);
  aba.appendRow([
    colaborador.nome,
    colaborador.matricula,
    colaborador.setor,
    colaborador.cpf,
    colaborador.alojamento,
    hoje,     // data_checkin
    '',       // data_checkout
    'ocupando'
  ]);
 
  return jsonResponse({
    success: true,
    message: 'Check-in realizado com sucesso',
    data: { nome: colaborador.nome, alojamento: colaborador.alojamento, endereco: escolhido.endereco, data_checkin: hoje }
  });
}
 
// =========================================================
// 5) Realizar check-out
// =========================================================
function realizarCheckout(dados) {
  if (!dados || (!dados.matricula && !dados.cpf)) {
    return jsonResponse({ success: false, message: 'Dados incompletos para o check-out.' });
  }
 
  var aloc = buscarAlocacaoAtiva(dados.matricula, dados.cpf);
  if (!aloc.ativo) {
    return jsonResponse({ success: false, message: 'Nenhuma alocação ativa encontrada para este colaborador.' });
  }
 
  var aba = getAba(ID_PLANILHA_ALOCACAO, ABA_ALOCACAO);
  var col = mapaColunas(aba.getDataRange().getValues()[0]);
  var hoje = hojeFormatado();
 
  aba.getRange(aloc.linhaPlanilha, col['data_checkout'] + 1).setValue(hoje);
  aba.getRange(aloc.linhaPlanilha, col['status'] + 1).setValue('saiu');
 
  return jsonResponse({
    success: true,
    message: 'Check-out realizado com sucesso',
    data: { alojamento: aloc.alojamento, data_checkout: hoje }
  });
}