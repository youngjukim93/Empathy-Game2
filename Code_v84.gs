/** 공감 원정대 v83 - 공용 결과 + 공용 한마디 게시판 API */
const RESULT_SHEET = 'RESULTS';
const COMMENT_SHEET = 'COMMENTS';
const ADMIN_PASSWORD = '15447777';

function doGet(e) {
  e=e||{parameter:{}}; const p=e.parameter||{}; const action=String(p.action||'ping');
  let data;
  if(action==='list') data=getAllResultsFromSheet_();
  else if(action==='comments') data=getAllComments_();
  else data={ok:true,message:'공감 원정대 v83 API 정상',comments:true};
  const body=JSON.stringify(data);
  if(p.callback){
    const cb=String(p.callback).replace(/[^a-zA-Z0-9_.$]/g,'');
    return ContentService.createTextOutput(cb+'('+body+');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const p=(e&&e.parameter)||{}; const action=String(p.action||''); let out={ok:false};
  try{
    if(action==='save') out=saveResult_(JSON.parse(p.payload||'{}'));
    else if(action==='delete') out=deleteResult_(p.recordId,p.password);
    else if(action==='commentSave') out=saveComment_(JSON.parse(p.payload||'{}'));
    else out={ok:false,message:'unknown action'};
  }catch(err){out={ok:false,message:String(err&&err.message||err)};}
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function healthCheck(){ ensureSheets_(); return {ok:true,message:'공감 원정대 v83 API 정상',comments:true,time:new Date()}; }
function ensureSheets_(){ getResultSheet_(); getCommentSheet_(); }
function getResultSheet_(){
  const ss=SpreadsheetApp.getActiveSpreadsheet(); let sh=ss.getSheetByName(RESULT_SHEET);
  if(!sh){sh=ss.insertSheet(RESULT_SHEET);sh.appendRow(['recordId','timestamp','status','org','team','emp','name','score','correct','wrong','questionsAnswered','livesRemaining']);sh.setFrozenRows(1);} return sh;
}
function getCommentSheet_(){
  const ss=SpreadsheetApp.getActiveSpreadsheet(); let sh=ss.getSheetByName(COMMENT_SHEET);
  if(!sh){sh=ss.insertSheet(COMMENT_SHEET);sh.appendRow(['commentId','timestamp','mood','org','team','emp','nickname','score','comment']);sh.setFrozenRows(1);} return sh;
}
function saveResult_(r){
  const sh=getResultSheet_(), id=String(r.recordId||Utilities.getUuid());
  sh.appendRow([id,new Date(),String(r.status||'complete'),String(r.org||''),String(r.team||''),String(r.emp||''),String(r.name||''),Number(r.score||0),Number(r.correct||0),Number(r.wrong||0),Number(r.questionsAnswered||0),Number(r.livesRemaining||0)]); return {ok:true,recordId:id};
}
function getAllResultsFromSheet_(){
  const v=getResultSheet_().getDataRange().getValues(); if(v.length<=1)return [];
  return v.slice(1).map(row=>{const status=String(row[2]||'');const d=row[1] instanceof Date?row[1].getTime():new Date(row[1]).getTime();return {recordId:String(row[0]||''),at:d||0,status,org:String(row[3]||''),team:String(row[4]||''),emp:String(row[5]||''),name:String(row[6]||''),score:Number(row[7]||0),correct:Number(row[8]||0),wrong:Number(row[9]||0),questionsAnswered:Number(row[10]||0),livesRemaining:Number(row[11]||0),completed:status==='complete',gameOver:status==='gameover'};});
}
function deleteResult_(id,password){
  if(String(password)!==ADMIN_PASSWORD)throw new Error('관리자 비밀번호가 올바르지 않습니다.'); const sh=getResultSheet_(),v=sh.getDataRange().getValues();
  for(let i=1;i<v.length;i++)if(String(v[i][0])===String(id)){sh.deleteRow(i+1);return {ok:true,recordId:String(id)};} throw new Error('삭제할 기록을 찾지 못했습니다.');
}
function saveComment_(c){
  const text=String(c.text||'').trim(); if(!text)throw new Error('댓글이 비어 있습니다.'); if(text.length>120)throw new Error('댓글은 120자 이내입니다.');
  const sh=getCommentSheet_(), id=String(c.id||Utilities.getUuid());
  const values=sh.getDataRange().getValues();
  for(let i=1;i<values.length;i++){ if(String(values[i][0])===id) return {ok:true,commentId:id,duplicate:true}; }
  sh.appendRow([id,new Date(),String(c.mood||''),String(c.org||''),String(c.team||''),String(c.emp||''),String(c.name||''),Number(c.score||0),text]);
  SpreadsheetApp.flush(); return {ok:true,commentId:id};
}
function getAllComments_(){
  const v=getCommentSheet_().getDataRange().getValues(); if(v.length<=1)return [];
  return v.slice(1).map(row=>{const d=row[1] instanceof Date?row[1].getTime():new Date(row[1]).getTime();return {id:String(row[0]||''),at:d||0,mood:String(row[2]||''),org:String(row[3]||''),team:String(row[4]||''),emp:String(row[5]||''),name:String(row[6]||''),score:Number(row[7]||0),text:String(row[8]||'')};}).sort((a,b)=>b.at-a.at).slice(0,200);
}
