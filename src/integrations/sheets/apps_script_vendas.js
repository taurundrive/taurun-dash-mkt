/**
 * CÓDIGO GOOGLE APPS SCRIPT PARA A PLANILHA DE VENDAS (Versão Multi-Aba Inteligente)
 *
 * COMO ATUALIZAR NA PLANILHA:
 * 1. Abra a planilha do Google Sheets.
 * 2. Vá no menu topo: Extensões > Apps Script.
 * 3. Substitua todo o código por este abaixo e clique no ícone de Salvar 💾.
 * 4. Clique em Implantar (botão azul) > Gerenciar implantações.
 * 5. Clique no ícone de lápis (editar) na implantação existente.
 * 6. Em "Versão", mude para "Nova versão" e clique em Implantar.
 */

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var allSheets = ss.getSheets();
    
    // Tenta encontrar a aba certa: primeiro por nome ("Vendedores", "Resumo", "Vendas", "Metas"),
    // ou procurando qual aba tem o cabeçalho "Vendedor" ou "REALIZADO" na Linha 1.
    var targetSheet = null;
    var abasNomes = [];

    for (var s = 0; s < allSheets.length; s++) {
      var sh = allSheets[s];
      var nomeAba = sh.getName();
      abasNomes.push(nomeAba);

      // Se o usuário passou ?aba=Nome na URL, usa essa
      if (e && e.parameter && e.parameter.aba && nomeAba.toLowerCase() === String(e.parameter.aba).toLowerCase()) {
        targetSheet = sh;
        break;
      }

      // Verifica se a célula A1 ou B1 ou C1 tem "Vendedor" ou "REALIZADO" ou "META"
      if (sh.getLastRow() >= 2) {
        var headerRow = sh.getRange(1, 1, 1, Math.min(10, sh.getLastColumn())).getValues()[0];
        var headerStr = headerRow.join(" ").toUpperCase();
        if (headerStr.indexOf("VENDEDOR") !== -1 && (headerStr.indexOf("REALIZADO") !== -1 || headerStr.indexOf("META") !== -1)) {
          targetSheet = sh;
          break;
        }
      }
    }

    // Se não encontrou pelo cabeçalho, procura por abas com nomes típicos
    if (!targetSheet) {
      for (var s = 0; s < allSheets.length; s++) {
        var sh = allSheets[s];
        var nomeAba = sh.getName().toUpperCase();
        if (nomeAba.indexOf("VENDEDOR") !== -1 || nomeAba.indexOf("RESUMO") !== -1 || nomeAba.indexOf("METAS") !== -1) {
          targetSheet = sh;
          break;
        }
      }
    }

    // Se ainda assim não encontrou, cai de volta para a aba ativa / primeira aba
    if (!targetSheet) {
      targetSheet = ss.getActiveSheet();
    }

    var lastRow = targetSheet.getLastRow();
    if (lastRow < 2) {
      return retornarJson({
        sucesso: true,
        mesIso: obterMesAtualIso(),
        totalVendas: 0,
        vendedores: [],
        abaUsada: targetSheet.getName(),
        abasDisponiveis: abasNomes,
        atualizadoEm: new Date().toISOString()
      });
    }

    // Identifica qual coluna é o REALIZADO lendo a primeira linha (cabeçalho)
    var headers = targetSheet.getRange(1, 1, 1, Math.min(15, targetSheet.getLastColumn())).getValues()[0];
    var colNomeIdx = 0;      // Padrão A
    var colMetaIdx = 1;      // Padrão B
    var colRealizadoIdx = 2; // Padrão C
    var colTaxaIdx = 3;      // Padrão D

    for (var c = 0; c < headers.length; c++) {
      var h = String(headers[c] || "").toUpperCase().trim();
      if (h === "VENDEDOR" || h === "NOME") colNomeIdx = c;
      else if (h === "META") colMetaIdx = c;
      else if (h === "REALIZADO" || h.indexOf("REALIZADO") !== -1 || h === "VENDAS") colRealizadoIdx = c;
      else if (h.indexOf("TAXA") !== -1 || h.indexOf("CONVERS") !== -1) colTaxaIdx = c;
    }

    var maxCol = Math.max(colNomeIdx, colMetaIdx, colRealizadoIdx, colTaxaIdx) + 1;
    var data = targetSheet.getRange(2, 1, lastRow - 1, maxCol).getValues();

    var totalRealizado = 0;
    var vendedores = [];

    for (var i = 0; i < data.length; i++) {
      var linha = data[i];
      var nome = linha[colNomeIdx];
      var metaRaw = linha[colMetaIdx];
      var realizadoRaw = linha[colRealizadoIdx];
      var taxaRaw = linha[colTaxaIdx];

      // Ignora linhas sem nome e sem realizado
      if (!nome && !realizadoRaw) continue;
      
      var nomeStr = String(nome || "").trim();
      if (nomeStr.toUpperCase() === "TOTAL" || nomeStr.toUpperCase() === "GERAL") {
        continue;
      }

      // Se a linha parecer ser um item de O.S. (ex: "#1827" sem vendedor real) mas não tem coluna Vendedor explícita, verifica
      var meta = converterNumero(metaRaw);
      var realizado = converterNumero(realizadoRaw);
      var taxa = converterTaxa(taxaRaw);

      // Se for uma tabela com "Douglas, Roberto, Fernando", soma
      totalRealizado += realizado;

      vendedores.push({
        nome: nomeStr,
        meta: meta,
        realizado: realizado,
        taxaConversao: taxa
      });
    }

    var resultado = {
      sucesso: true,
      mesIso: obterMesAtualIso(),
      totalVendas: Math.round(totalRealizado * 100) / 100,
      vendedores: vendedores,
      abaUsada: targetSheet.getName(),
      abasDisponiveis: abasNomes,
      atualizadoEm: new Date().toISOString()
    };

    return retornarJson(resultado);

  } catch (erro) {
    return retornarJson({
      sucesso: false,
      erro: erro.toString(),
      totalVendas: 0,
      vendedores: []
    });
  }
}

function converterNumero(valor) {
  if (typeof valor === "number") return valor;
  if (!valor) return 0;
  var str = String(valor).replace(/R\$\s*/g, "").replace(/\./g, "").replace(/,/g, ".").trim();
  var num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

function converterTaxa(valor) {
  if (typeof valor === "number") return valor;
  if (!valor || valor === "") return null;
  var str = String(valor).replace(/%/g, "").replace(/,/g, ".").trim();
  var num = parseFloat(str);
  return isNaN(num) ? null : (num / 100);
}

function obterMesAtualIso() {
  var hoje = new Date();
  var ano = hoje.getFullYear();
  var mes = String(hoje.getMonth() + 1).padStart(2, "0");
  return ano + "-" + mes + "-01";
}

function retornarJson(objeto) {
  return ContentService.createTextOutput(JSON.stringify(objeto))
    .setMimeType(ContentService.MimeType.JSON);
}
