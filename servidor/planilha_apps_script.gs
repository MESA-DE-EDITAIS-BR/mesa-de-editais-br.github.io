/* OBSOLETO desde 09/11/2026: a Mesa usa o servidor da Central (servidor/central.gs no repositório marca-estrategia-tecnologia). Mantido só como histórico. */
/**
 * MESA DE EDITAIS • Servidor de cadastro e acesso (Google Apps Script)
 *
 * Como ativar (uma vez):
 * 1. Crie a planilha "Mesa de Editais • Participantes" no Google Drive.
 * 2. Extensões → Apps Script → cole este arquivo inteiro → Salvar.
 * 3. Configurações do projeto (engrenagem) → Propriedades do script → adicionar:
 *      CRIADOR_EMAILS = seu e-mail (vários separados por vírgula)
 *      PIMENTA        = um texto longo e aleatório (ex.: 40 letras e números). Nunca compartilhe.
 * 4. Implantar → Nova implantação → Tipo: App da Web
 *      Executar como: Eu  •  Quem pode acessar: Qualquer pessoa
 * 5. Copie o endereço que termina em /exec e coloque em CONFIG.CADASTRO_URL no index.html.
 *
 * Segurança:
 * - Senha nunca é salva: guarda-se sal + hash SHA-256 com 5.000 rodadas e a PIMENTA privada.
 * - Bloqueio após 5 tentativas erradas por 15 minutos (por e-mail).
 * - Sessão por token aleatório, válida por 7 dias, apagada ao sair.
 * - Criador definido só nas Propriedades do script, nunca no código público.
 * - Textos limpos antes de gravar (sem fórmulas: nada começa com = + - @).
 */

var ABA_PART = "Participantes";
var ABA_SESS = "Sessoes";
var COLS = ["email","nome","whatsapp","cidade","estado","perfil","tipo","linguagens","projeto","plano","vencimento","sal","hash","cadastro","ultimoAcesso","acessos","origem","consentimento","observacoes"];

function doPost(e){
  var lock = LockService.getScriptLock();
  try{
    lock.waitLock(10000);
    var d = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    var r;
    if(d.acao === "cadastrar") r = cadastrar_(d);
    else if(d.acao === "entrar") r = entrar_(d);
    else if(d.acao === "sessao") r = sessao_(d);
    else if(d.acao === "sair") r = sair_(d);
    else r = {ok:false, erro:"acao"};
    return json_(r);
  }catch(err){
    return json_({ok:false, erro:"servidor", mensagem:"Falha no servidor. Tente de novo em instantes."});
  }finally{ try{ lock.releaseLock(); }catch(x){} }
}
function doGet(){ return json_({ok:true, servico:"Mesa de Editais"}); }

function cadastrar_(d){
  var email = limpaEmail_(d.email), senha = String(d.senha||"");
  if(!email || senha.length < 8 || !/[A-Za-z]/.test(senha) || !/\d/.test(senha)) return {ok:false, erro:"dados", mensagem:"Confira e-mail e senha (mínimo 8 caracteres, com letras e números)."};
  if(String(d.nome||"").trim().split(/\s+/).length < 2) return {ok:false, erro:"dados", mensagem:"Informe nome completo."};
  var sh = aba_(ABA_PART, COLS);
  if(acharLinha_(sh, email) > 0) return {ok:false, erro:"email_existe"};
  var sal = Utilities.getUuid();
  var plano = ehCriador_(email) ? "criador" : "lista";
  var agora = new Date();
  var linha = {
    email:email, nome:limpa_(d.nome,120), whatsapp:String(d.whatsapp||"").replace(/\D/g,"").slice(0,13),
    cidade:limpa_(d.cidade,80), estado:limpa_(d.estado,2), perfil:limpa_(d.perfil,60), tipo:limpa_(d.tipo,60),
    linguagens:limpa_(d.linguagens,300), projeto:limpa_(d.projeto,400), plano:plano, vencimento:"",
    sal:sal, hash:hash_(senha, sal), cadastro:agora, ultimoAcesso:agora, acessos:1,
    origem:limpa_(d.origem,80), consentimento:limpa_(d.consentimento,80), observacoes:""
  };
  sh.appendRow(COLS.map(function(c){ return linha[c]; }));
  var token = novaSessao_(email);
  return {ok:true, token:token, nome:linha.nome, plano:plano};
}

function entrar_(d){
  var email = limpaEmail_(d.email), senha = String(d.senha||"");
  if(!email || !senha) return {ok:false, erro:"credenciais"};
  var cache = CacheService.getScriptCache(), chave = "tent_" + email;
  var tent = Number(cache.get(chave) || 0);
  if(tent >= 5) return {ok:false, erro:"bloqueado"};
  var sh = aba_(ABA_PART, COLS), n = acharLinha_(sh, email);
  if(n < 1){ cache.put(chave, String(tent+1), 900); Utilities.sleep(400); return {ok:false, erro:"credenciais"}; }
  var row = lerLinha_(sh, n);
  if(hash_(senha, row.sal) !== row.hash){ cache.put(chave, String(tent+1), 900); Utilities.sleep(400); return {ok:false, erro:"credenciais"}; }
  cache.remove(chave);
  var plano = planoAtual_(row);
  if(ehCriador_(email) && row.plano !== "criador") gravar_(sh, n, "plano", "criador");
  gravar_(sh, n, "ultimoAcesso", new Date()); gravar_(sh, n, "acessos", Number(row.acessos||0) + 1);
  return {ok:true, token:novaSessao_(email), nome:row.nome, plano:plano};
}

function sessao_(d){
  var email = emailDaSessao_(String(d.token||""));
  if(!email) return {ok:false, erro:"sessao"};
  var sh = aba_(ABA_PART, COLS), n = acharLinha_(sh, email);
  if(n < 1) return {ok:false, erro:"sessao"};
  var row = lerLinha_(sh, n);
  return {ok:true, nome:row.nome, plano:planoAtual_(row)};
}

function sair_(d){
  var sh = aba_(ABA_SESS, ["token","email","expira"]), dados = sh.getDataRange().getValues();
  for(var i = dados.length - 1; i >= 1; i--) if(dados[i][0] === String(d.token||"")) sh.deleteRow(i+1);
  return {ok:true};
}

/* ---------- Planos ---------- */
function planoAtual_(row){
  if(ehCriador_(row.email)) return "criador";
  var p = String(row.plano||"lista");
  if(p === "ativo" && row.vencimento && new Date(row.vencimento) < new Date()) return "vencido";
  return ["ativo","analise","lista","vencido"].indexOf(p) >= 0 ? p : "lista";
}
function ehCriador_(email){
  var lista = String(PropertiesService.getScriptProperties().getProperty("CRIADOR_EMAILS")||"").toLowerCase().split(",").map(function(s){ return s.trim(); });
  return lista.indexOf(String(email).toLowerCase()) >= 0;
}

/* ---------- Sessões ---------- */
function novaSessao_(email){
  var sh = aba_(ABA_SESS, ["token","email","expira"]);
  var token = Utilities.getUuid() + Utilities.getUuid().replace(/-/g,"");
  sh.appendRow([token, email, new Date(Date.now() + 7*86400000)]);
  return token;
}
function emailDaSessao_(token){
  if(!token || token.length < 40) return "";
  var dados = aba_(ABA_SESS, ["token","email","expira"]).getDataRange().getValues();
  for(var i = 1; i < dados.length; i++) if(dados[i][0] === token && new Date(dados[i][2]) > new Date()) return dados[i][1];
  return "";
}
/* Rodar manualmente ou com acionador diário: apaga sessões vencidas */
function limparSessoes(){
  var sh = aba_(ABA_SESS, ["token","email","expira"]), dados = sh.getDataRange().getValues();
  for(var i = dados.length - 1; i >= 1; i--) if(new Date(dados[i][2]) < new Date()) sh.deleteRow(i+1);
}

/* ---------- Senha ---------- */
function hash_(senha, sal){
  var pimenta = String(PropertiesService.getScriptProperties().getProperty("PIMENTA")||"");
  var h = sal + "|" + senha + "|" + pimenta;
  for(var i = 0; i < 5000; i++){
    h = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, h + sal, Utilities.Charset.UTF_8));
  }
  return h;
}
/* Criador: redefinir a senha de um participante (rodar no editor, trocando os valores) */
function redefinirSenha(){
  var email = "email@exemplo.com", novaSenha = "TrocarAqui123";
  var sh = aba_(ABA_PART, COLS), n = acharLinha_(sh, email);
  if(n < 1) throw new Error("E-mail não encontrado");
  var sal = Utilities.getUuid();
  gravar_(sh, n, "sal", sal); gravar_(sh, n, "hash", hash_(novaSenha, sal));
}

/* ---------- Planilha ---------- */
function aba_(nome, cab){
  var ss = SpreadsheetApp.getActiveSpreadsheet(), sh = ss.getSheetByName(nome);
  if(!sh){ sh = ss.insertSheet(nome); sh.appendRow(cab); sh.setFrozenRows(1); }
  return sh;
}
function acharLinha_(sh, email){
  var col = sh.getRange(1, 1, Math.max(sh.getLastRow(),1), 1).getValues();
  for(var i = 1; i < col.length; i++) if(String(col[i][0]).toLowerCase() === email) return i + 1;
  return -1;
}
function lerLinha_(sh, n){
  var v = sh.getRange(n, 1, 1, COLS.length).getValues()[0], o = {};
  COLS.forEach(function(c, i){ o[c] = v[i]; }); return o;
}
function gravar_(sh, n, col, valor){ sh.getRange(n, COLS.indexOf(col) + 1).setValue(valor); }

/* ---------- Limpeza ---------- */
function limpa_(s, max){
  var t = String(s||"").replace(/[\u0000-\u001F<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, max||200);
  return /^[=+\-@]/.test(t) ? "'" + t : t;
}
function limpaEmail_(s){
  var e = String(s||"").trim().toLowerCase().slice(0,120);
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) ? e : "";
}
function json_(o){ return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
