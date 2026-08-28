/**
 * Sistema de Check-in de Alojamento — Google Apps Script
 * ---------------------------------------------------------
 * Conecta o site (GitHub Pages) às duas planilhas do Google Sheets:
 *   1) Base de colaboradores  (consulta)
 *   2) Controle de check-in   (consulta + gravação)
 *
 * Cole este código em Extensões > Apps Script de qualquer uma das
 * planilhas (ou num projeto separado) e publique como Web App.
 */

// ----- IDs das planilhas (já preenchidos a partir dos links enviados) -----
var ID_PLANILHA_COLABORADORES = '1GNfohLsDLTbdlITNcVSrHOHdmoWkgztdfe5GYCX9sUk';
var ID_PLANILHA_CHECKIN       = '1ib69Kqd-riu31i48J-xw47x6mcCtmUNcxgqi1qLXnWA';

// Nome da aba dentro de cada planilha — ajuste se o nome for diferente
var ABA_COLABORADORES = 'Página1';
var ABA_CHECKIN        = 'Página1';

// =========================================================
// Roteamento
// =========================================================
function doGet(e) {
  try {
    var action = e.parameter.action;
    if (action === 'buscar')    return buscarColaborador(e.parameter.valor);
    if (action === 'verificar') return verificarCheckin(e.parameter.matricula, e.parameter.cpf);
    return jsonResponse({ success: false, message: 'Ação inválida.' });
  } catch (err) {
    return jsonResponse({ success: false, message: 'Erro no servidor: ' + err.message });
  }
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    if (body.action === 'checkin') return realizarCheckin(body.data);
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

function getAbaColaboradores() {
  return SpreadsheetApp.openById(ID_PLANILHA_COLABORADORES).getSheetByName(ABA_COLABORADORES);
}
function getAbaCheckin() {
  return SpreadsheetApp.openById(ID_PLANILHA_CHECKIN).getSheetByName(ABA_CHECKIN);
}

// mapeia os nomes das colunas do cabeçalho para seus índices
function mapaColunas(linhaCabecalho) {
  var mapa = {};
  linhaCabecalho.forEach(function (nome, i) {
    mapa[String(nome).trim().toLowerCase()] = i;
  });
  return mapa;
}

// =========================================================
// 1) Buscar colaborador (planilha 1)
// =========================================================
function buscarColaborador(valor) {
  if (!valor) return jsonResponse({ success: false, message: 'Informe a matrícula ou o CPF.' });

  var busca = String(valor).trim();
  var buscaCpf = normalizarCpf(busca);

  var aba = getAbaColaboradores();
  var dados = aba.getDataRange().getValues();
  var col = mapaColunas(dados[0]);

  for (var i = 1; i < dados.length; i++) {
    var linha = dados[i];
    var matricula = String(linha[col['matricula']]).trim();
    var cpf = normalizarCpf(linha[col['cpf']]);

    if (matricula === busca || (buscaCpf.length === 11 && cpf === buscaCpf)) {
      return jsonResponse({
        success: true,
        data: {
          nome: linha[col['nome']],
          matricula: matricula,
          setor: linha[col['setor']],
          cpf: linha[col['cpf']]
        }
      });
    }
  }

  return jsonResponse({
    success: false,
    message: 'Colaborador não encontrado. Verifique sua matrícula ou CPF e tente novamente.'
  });
}

// =========================================================
// 2) Verificar se já existe check-in hoje (planilha 2)
// =========================================================
function verificarCheckin(matricula, cpf) {
  var hoje = hojeFormatado();
  var matriculaBusca = String(matricula || '').trim();
  var cpfBusca = normalizarCpf(cpf);

  var aba = getAbaCheckin();
  var dados = aba.getDataRange().getValues();
  var col = mapaColunas(dados[0]);

  for (var i = 1; i < dados.length; i++) {
    var linha = dados[i];
    var linMatricula = String(linha[col['matricula']]).trim();
    var linCpf = normalizarCpf(linha[col['cpf']]);
    var linData = String(linha[col['data_alojamento']]).trim();

    var mesmoColaborador = (linMatricula === matriculaBusca) || (cpfBusca.length === 11 && linCpf === cpfBusca);
    if (mesmoColaborador && linData === hoje) {
      return jsonResponse({ success: true, jaFezCheckin: true, message: 'Você já realizou seu check-in hoje.' });
    }
  }

  return jsonResponse({ success: true, jaFezCheckin: false });
}

// =========================================================
// 3) Registrar check-in (planilha 2)
// =========================================================
function realizarCheckin(colaborador) {
  if (!colaborador || !colaborador.matricula) {
    return jsonResponse({ success: false, message: 'Dados do colaborador incompletos.' });
  }

  // revalida duplicidade no backend, mesmo que o frontend já tenha checado
  var verificacaoRaw = verificarCheckin(colaborador.matricula, colaborador.cpf);
  var verificacao = JSON.parse(verificacaoRaw.getContent());
  if (verificacao.jaFezCheckin) {
    return jsonResponse({ success: false, message: 'Você já realizou seu check-in hoje.' });
  }

  var hoje = hojeFormatado();
  var aba = getAbaCheckin();

  aba.appendRow([
    colaborador.nome,
    colaborador.matricula,
    colaborador.setor,
    colaborador.cpf,
    hoje
  ]);

  return jsonResponse({
    success: true,
    message: 'Check-in realizado com sucesso',
    data: {
      nome: colaborador.nome,
      matricula: colaborador.matricula,
      setor: colaborador.setor,
      cpf: colaborador.cpf,
      data_alojamento: hoje
    }
  });
}