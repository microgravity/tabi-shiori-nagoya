'use strict';
const RECORD_KEY='nagoya-trip-records-v2';
const validStops=new Set(trip.flatMap(d=>d.stops.map(s=>d.id+':'+s.id)));
const validLetters=new Set(trip.flatMap(d=>d.stops.flatMap(s=>[...s.kana].map((_,i)=>s.kana+':'+i))));
function validateState(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('記録の形式を確認してください。');
 if(!Number.isInteger(raw.day)||raw.day<0||raw.day>=trip.length)throw Error('日付の記録が正しくありません。');
 if(!Array.isArray(raw.current)||raw.current.length!==trip.length||raw.current.some((n,i)=>!Number.isInteger(n)||n<0||n>=trip[i].stops.length))throw Error('現在地の記録が正しくありません。');
 const list=(xs,valid)=>{if(!Array.isArray(xs)||xs.length>valid.size||xs.some(x=>typeof x!=='string'||!valid.has(x)))throw Error('この旅程にない記録が含まれています。');return [...new Set(xs)];};
 return {day:raw.day,current:[...raw.current],visited:list(raw.visited,validStops),written:list(raw.written,validLetters)};
}
function validateTransfer(raw){
 if(!raw||raw.format!=='nagoya-kana-records'||raw.version!==1||raw.tripId!==TRIP_ID)throw Error('この旅のしおりから書き出したJSONを選んでください。別の旅程・形式のファイルは読み込めません。');
 return validateState(raw.state);
}
function makeTransfer(state){return {format:'nagoya-kana-records',version:1,tripId:TRIP_ID,exportedAt:new Date().toISOString(),itinerary:trip.map(d=>({date:d.date,stay:d.stay,stops:d.stops.map(s=>({id:s.id,name:s.name}))})),state:validateState(state)};}
