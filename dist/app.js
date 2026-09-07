'use strict';
const $=id=>document.getElementById(id);
let saved={day:0,current:trip.map(()=>0),visited:[],written:[]};
let legacyRetained=false;
try{
 const existing=localStorage.getItem(RECORD_KEY);
 if(existing)saved=validateTransfer(JSON.parse(existing));
 else {const old=JSON.parse(localStorage.getItem('nagoya-trip-v1')||'null');if(old){legacyRetained=true;if(Array.isArray(old.written))saved.written=[...new Set(old.written.filter(x=>validLetters.has(x)))];}}
}catch{}
let day=saved.day,current=saved.current,visited=new Set(saved.visited),written=new Set(saved.written);
let selected=current[day],letter=0,word='',strokes=[],activePointer=null,pendingImport=null;
const key=(d,i)=>trip[d].id+':'+trip[d].stops[i].id;
function getState(){return {day,current:[...current],visited:[...visited],written:[...written]};}
function save(){try{localStorage.setItem(RECORD_KEY,JSON.stringify(makeTransfer(getState())));$('saveStatus').textContent=legacyRetained?'仮旅程の元の記録は別に残し、ひらがなの練習記録を引き継ぎました。新旅程の到着記録は別に保存します。':'記録はこのブラウザに保存されています。';return true;}catch{$('saveStatus').textContent='このブラウザでは記録を保存できません。JSONを書き出して保管してください。';return false;}}
function speak(text){if(!('speechSynthesis'in window)){announce('この たんまつでは おとが でないよ。もじを みてね。');return;}speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='ja-JP';u.rate=.75;u.onerror=()=>announce('おとが でなかったよ。もじを みてね。');speechSynthesis.speak(u);}
function announce(text){$('writeFeedback').textContent=text;if(!$('practice').open){let p=$('speechStatus');if(p)p.textContent=text;}}
function render(){
 $('days').innerHTML=trip.map((d,i)=>`<button class="${day===i?'active':''}" aria-pressed="${day===i}" data-day="${i}"><strong>${d.date}</strong><small>${d.title}</small></button>`).join('');
 $('total').textContent=`ついた！ ${visited.size} / ${trip.reduce((n,d)=>n+d.stops.length,0)}`;
 const stops=trip[day].stops;
 $('route').innerHTML=stops.map((s,i)=>`<button class="stop ${i===selected?'selected':''} ${visited.has(key(day,i))?'done':''}" data-stop="${i}" aria-pressed="${i===selected}"><span><span class="kana">${s.kana}</span><small>${s.name}</small></span><span class="mark">${i===current[day]?'いま':visited.has(key(day,i))?'✓':''}</span></button>${s.ride?`<div class="transport" style="--line:${s.color}"><b>${s.ride}</b></div>`:''}`).join('');
 const s=stops[selected],next=stops[selected+1],done=visited.has(key(day,selected));
 $('detail').innerHTML=`${s.image?'<img class="place-image" src="./nagoya-castle.jpg" alt="青空の下の名古屋城">':''}<div class="detail-body"><span class="tag">${selected===current[day]?'いま ここ':s.kind}</span><h2>${s.kana}</h2><p class="kanji">${s.name}</p><p class="description">${s.description}</p><div class="actions"><button id="listen">なまえを きく ♪</button><button id="write" class="primary">ひらがなを かく</button></div><div class="actions"><button id="arrive" class="arrive">${done?'✓ ついた！ を とりけす':'ついた！'}</button>${selected!==current[day]?'<button id="setCurrent">ここから すすめる</button>':''}</div><p id="speechStatus" role="status"></p></div><div class="next-card"><small>${next?'つぎは':'きょうの ゴール'}</small><p><strong>${next?next.kana:trip[day].stay}</strong></p>${next?`<p>${s.ride}</p><button id="goNext">つぎへ すすむ →</button>`:day<2?'<button id="nextDay">つぎの ひを みる →</button>':''}</div>`;
 $('listen').onclick=()=>speak(s.kana);$('write').onclick=()=>openPractice(s.kana);
 $('arrive').onclick=()=>{const k=key(day,selected);visited.has(k)?visited.delete(k):visited.add(k);save();render();};
 if($('setCurrent'))$('setCurrent').onclick=()=>{current[day]=selected;save();render();};
 if($('goNext'))$('goNext').onclick=()=>{current[day]=selected+1;selected++;save();render();};
 if($('nextDay'))$('nextDay').onclick=()=>chooseDay(day+1);
}
function chooseDay(i){day=i;selected=current[i];save();render();}
 $('days').onclick=e=>{const b=e.target.closest('[data-day]');if(b)chooseDay(Number(b.dataset.day));};
 $('route').onclick=e=>{const b=e.target.closest('[data-stop]');if(b){selected=Number(b.dataset.stop);render();}};
 $('parentButton').onclick=()=>{$('parent').showModal();};$('closeParent').onclick=()=>$('parent').close();
 $('credits').innerHTML='写真：<a href="https://commons.wikimedia.org/wiki/File:Nagoya_Castle(Larger).jpg" target="_blank" rel="noreferrer">Base64 / Arad</a>（表示範囲を調整）、<a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noreferrer">CC BY-SA 3.0</a>。ひらがなのお手本：既存アプリ収録の strokesvg / Klee One。<a href="./glyphs/LICENSE.txt" target="_blank">ライセンス</a>';
 const canvas=$('canvas'),ctx=canvas.getContext('2d');
 function redraw(){ctx.clearRect(0,0,600,600);ctx.strokeStyle='#175854';ctx.fillStyle='#175854';ctx.lineWidth=13;ctx.lineCap='round';ctx.lineJoin='round';for(const stroke of strokes){if(!stroke.length)continue;ctx.beginPath();ctx.moveTo(stroke[0].x,stroke[0].y);if(stroke.length===1){ctx.arc(stroke[0].x,stroke[0].y,6.5,0,Math.PI*2);ctx.fill();}else{for(const p of stroke.slice(1))ctx.lineTo(p.x,p.y);ctx.stroke();}}}
 function openPractice(kana){word=kana;letter=0;$('freeWrite').checked=false;$('practice').showModal();showLetter();}
 function showLetter(){activePointer=null;strokes=[];redraw();$('letters').innerHTML=[...word].map((c,i)=>`<button class="${i===letter?'active':''} ${written.has(word+':'+i)?'written':''}" data-letter="${i}" aria-label="${i+1}もじめ ${c}" aria-pressed="${i===letter}">${c}</button>`).join('');$('glyph').src='./glyphs/'+encodeURIComponent(word[letter])+'.svg';$('glyph').alt=word[letter]+' の おてほん';$('glyph').hidden=$('freeWrite').checked;$('nextLetter').textContent=letter===word.length-1?'もういちど かく':'つぎの もじ';$('writeFeedback').textContent=`${letter+1} / ${word.length} もじ。ゆびで なぞろう。`;}
 $('letters').onclick=e=>{const b=e.target.closest('[data-letter]');if(b){letter=Number(b.dataset.letter);showLetter();speak(word[letter]);}};
 $('freeWrite').onchange=()=>{$('glyph').hidden=$('freeWrite').checked;};
 $('speakWord').onclick=()=>speak(word);
 $('nextLetter').onclick=()=>{if(strokes.some(s=>s.length>1)){written.add(word+':'+letter);save();}const last=letter===word.length-1;letter=last?0:letter+1;showLetter();if(last)$('writeFeedback').textContent='なまえを もういちど かいてみよう！';};
 $('closePractice').onclick=()=>{if(strokes.some(s=>s.length>1)){written.add(word+':'+letter);save();}$('practice').close();if('speechSynthesis'in window)speechSynthesis.cancel();};
 $('undo').onclick=()=>{strokes.pop();redraw();};$('clear').onclick=()=>{strokes=[];redraw();};
 function point(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*600/r.width,y:(e.clientY-r.top)*600/r.height};}
 canvas.addEventListener('pointerdown',e=>{if(activePointer!==null)return;e.preventDefault();activePointer=e.pointerId;canvas.setPointerCapture(e.pointerId);strokes.push([point(e)]);redraw();});
 canvas.addEventListener('pointermove',e=>{if(e.pointerId!==activePointer)return;e.preventDefault();strokes[strokes.length-1].push(point(e));redraw();});
 for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,e=>{if(e.pointerId===activePointer)activePointer=null;});
 canvas.addEventListener('contextmenu',e=>e.preventDefault());
 save();render();

function exportFile(){return new File([JSON.stringify(makeTransfer(getState()),null,2)],'nagoya-trip-records.json',{type:'application/json'});}
function downloadRecords(){const file=exportFile(),url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=file.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);$('transferStatus').textContent='JSONの保存を開始しました。保存先を確認して、別の端末へ渡してください。';}
$('exportRecords').onclick=()=>{try{downloadRecords();}catch{$('transferStatus').textContent='書き出せませんでした。このブラウザでファイルの保存が許可されているか確認してください。';}};
$('shareRecords').onclick=async()=>{try{const file=exportFile();if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:'たびのしおりの記録'});$('transferStatus').textContent='共有先の端末でJSONを読み込んでください。';}else downloadRecords();}catch(e){$('transferStatus').textContent=e.name==='AbortError'?'共有をキャンセルしました。':'共有できませんでした。「JSONを書き出す」をお使いください。';}};
$('importRecords').onclick=()=>{$('importFile').value='';$('importFile').click();};
$('importFile').onchange=async e=>{pendingImport=null;$('importPreview').hidden=true;const file=e.target.files[0];if(!file)return;try{if(file.size>65536)throw Error('ファイルが大きすぎます。このアプリで書き出した64KB以下のJSONを選んでください。');const raw=JSON.parse(await file.text());pendingImport=validateTransfer(raw);$('importSummary').textContent=`読み込む記録：到着 ${pendingImport.visited.length}か所、練習 ${pendingImport.written.length}文字。現在地：${trip[pendingImport.day].date}・${trip[pendingImport.day].stops[pendingImport.current[pendingImport.day]].name}。この端末：到着 ${visited.size}か所、練習 ${written.size}文字。`;$('importPreview').hidden=false;$('transferStatus').textContent='まだ記録は変更していません。読み込み方法を選んでください。';}catch(e){$('transferStatus').textContent=e instanceof SyntaxError?'JSONを読み取れませんでした。記録は変更していません。':e.message;}};
function applyImport(merge){if(!pendingImport)return;const next=validateState({...pendingImport,visited:merge?[...new Set([...visited,...pendingImport.visited])]:pendingImport.visited,written:merge?[...new Set([...written,...pendingImport.written])]:pendingImport.written});try{localStorage.setItem(RECORD_KEY,JSON.stringify(makeTransfer(next)));}catch{$('transferStatus').textContent='保存できなかったため、記録は変更していません。';return;}day=next.day;current=next.current;selected=current[day];visited=new Set(next.visited);written=new Set(next.written);pendingImport=null;$('importPreview').hidden=true;save();render();$('transferStatus').textContent=merge?'記録を足しました。現在地も読み込んだ端末に合わせました。':'読み込んだ記録に置き換えました。';}
$('mergeRecords').onclick=()=>applyImport(true);$('replaceRecords').onclick=()=>applyImport(false);$('cancelImport').onclick=()=>{pendingImport=null;$('importPreview').hidden=true;$('transferStatus').textContent='読み込みをやめました。記録は変更していません。';};
