'use strict';
const place=(kana,name,kind,description,ride='',color='#258aa5')=>({kana,name,kind,description,ride,color});
const nagoya=()=>place('なごや','名古屋駅','えき','なごやに ついたよ。つぎに のる でんしゃを みつけよう。');
const port=()=>place('きんじょうふとう','金城ふ頭駅','えき','あおなみせんの さいごの えきだよ。ここで おりよう。');
const trip=[{title:'おしろ',stops:[
place('しながわ','品川駅','しゅっぱつ','しんかんせんに のって、なごやへ いこう！','しんかんせん → なごや','#287bb5'),
{...nagoya(),ride:'ひがしやません・ふじがおか ゆき → さかえ',color:'#c29a17'},
place('さかえ','栄駅','のりかえ','ここで のりかえ！ むらさきいろの めいじょうせんを さがそう。','めいじょうせん・みぎまわり → なごやじょう','#8164a5'),
place('なごやじょう','名古屋城駅','えき','7ばん でぐちから そとへ でよう。','あるいて おしろへ・やく5ふん','#6d8a71'),
{...place('なごやじょう','名古屋城','おしろ','きんいろの しゃちほこを さがそう。いしがきも よく みてみよう。','あるいて なごやじょうえきへ','#6d8a71'),image:true},
place('なごやじょう','名古屋城駅','えき','きょう みつけたものを おはなししよう。','めいじょうせん・ひだりまわり → さかえ','#8164a5'),
place('さかえ','栄駅','のりかえ','きいろの ひがしやませんへ のりかえよう。','ひがしやません・たかばた ゆき → なごや','#c29a17'),
place('なごや','名古屋駅','おかえり','きょうの みちのりは ここまで。おうちのひとと ホテルへ いこう。')
]},{title:'れごらんど',stops:[
{...nagoya(),ride:'あおなみせん → きんじょうふとう'},
{...port(),ride:'あるいて れごらんどへ・やく10ふん',color:'#6d8a71'},
place('れごらんど','レゴランド・ジャパン','あそぶ','ブロックで できた まちを みつけよう！','あるいて きんじょうふとうえきへ','#6d8a71'),
{...port(),description:'たのしかったね。あおなみせんで もどろう。',ride:'あおなみせん → なごや'},
place('なごや','名古屋駅','おかえり','きょうの みちのりは ここまで。おうちのひとと ホテルへ いこう。')
]},{title:'てつどうかん',stops:[
{...nagoya(),ride:'あおなみせん → きんじょうふとう'},
{...port(),ride:'あるいて てつどうかんへ・やく2ふん',color:'#6d8a71'},
place('りにあてつどうかん','リニア・鉄道館','はくぶつかん','いろいろな しんかんせんを みくらべよう。すきな でんしゃは どれかな。','あるいて きんじょうふとうえきへ','#6d8a71'),
{...port(),description:'あおなみせんで なごやえきへ もどろう。',ride:'あおなみせん → なごや'},
{...nagoya(),description:'こんどは しんかんせんに のりかえるよ。',ride:'しんかんせん → しながわ',color:'#287bb5'},
place('しながわ','品川駅','ゴール','おかえりなさい！ たびで みつけたものを おはなししよう。')
]}];
const $=id=>document.getElementById(id);
let saved={};try{saved=JSON.parse(localStorage.getItem('nagoya-trip-v1')||'{}')||{};}catch{}
let day=Number.isInteger(saved.day)&&saved.day>=0&&saved.day<trip.length?saved.day:0;
let visited=new Set(Array.isArray(saved.visited)?saved.visited.filter(x=>typeof x==='string'):[]);
let written=new Set(Array.isArray(saved.written)?saved.written.filter(x=>typeof x==='string'):[]);
let current=Array.isArray(saved.current)?trip.map((d,i)=>Number.isInteger(saved.current[i])?Math.max(0,Math.min(d.stops.length-1,saved.current[i])):0):[0,0,0];
let selected=current[day],letter=0,word='',strokes=[],activePointer=null;
const key=(d,i)=>`${d}:${i}`;
function save(){try{localStorage.setItem('nagoya-trip-v1',JSON.stringify({day,current,visited:[...visited],written:[...written]}));$('saveStatus').textContent='記録はこのブラウザに保存されています。';}catch{$('saveStatus').textContent='このブラウザでは記録を保存できません。画面を閉じると記録が消える場合があります。';}}
function speak(text){if(!('speechSynthesis'in window)){announce('この たんまつでは おとが でないよ。もじを みてね。');return;}speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='ja-JP';u.rate=.75;u.onerror=()=>announce('おとが でなかったよ。もじを みてね。');speechSynthesis.speak(u);}
function announce(text){$('writeFeedback').textContent=text;if(!$('practice').open){let p=$('speechStatus');if(p)p.textContent=text;}}
function render(){
 $('days').innerHTML=trip.map((d,i)=>`<button class="${day===i?'active':''}" aria-pressed="${day===i}" data-day="${i}"><strong>${i+1}にちめ</strong><small>${d.title}</small></button>`).join('');
 $('total').textContent=`ついた！ ${visited.size} / ${trip.reduce((n,d)=>n+d.stops.length,0)}`;
 const stops=trip[day].stops;
 $('route').innerHTML=stops.map((s,i)=>`<button class="stop ${i===selected?'selected':''} ${visited.has(key(day,i))?'done':''}" data-stop="${i}" aria-pressed="${i===selected}"><span><span class="kana">${s.kana}</span><small>${s.name}</small></span><span class="mark">${i===current[day]?'いま':visited.has(key(day,i))?'✓':''}</span></button>${s.ride?`<div class="transport" style="--line:${s.color}"><b>${s.ride}</b></div>`:''}`).join('');
 const s=stops[selected],next=stops[selected+1],done=visited.has(key(day,selected));
 $('detail').innerHTML=`${s.image?'<img class="place-image" src="./nagoya-castle.jpg" alt="青空の下の名古屋城">':''}<div class="detail-body"><span class="tag">${selected===current[day]?'いま ここ':s.kind}</span><h2>${s.kana}</h2><p class="kanji">${s.name}</p><p class="description">${s.description}</p><div class="actions"><button id="listen">なまえを きく ♪</button><button id="write" class="primary">ひらがなを かく</button></div><div class="actions"><button id="arrive" class="arrive">${done?'✓ ついた！ を とりけす':'ついた！'}</button>${selected!==current[day]?'<button id="setCurrent">ここから すすめる</button>':''}</div><p id="speechStatus" role="status"></p></div><div class="next-card"><small>${next?'つぎは':'きょうの ゴール'}</small><p><strong>${next?next.kana:'ぜんぶ たどれたね！'}</strong></p>${next?`<p>${s.ride}</p><button id="goNext">つぎへ すすむ →</button>`:day<2?'<button id="nextDay">つぎの ひを みる →</button>':''}</div>`;
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
 $('closePractice').onclick=()=>{$('practice').close();if('speechSynthesis'in window)speechSynthesis.cancel();};
 $('undo').onclick=()=>{strokes.pop();redraw();};$('clear').onclick=()=>{strokes=[];redraw();};
 function point(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*600/r.width,y:(e.clientY-r.top)*600/r.height};}
 canvas.addEventListener('pointerdown',e=>{if(activePointer!==null)return;e.preventDefault();activePointer=e.pointerId;canvas.setPointerCapture(e.pointerId);strokes.push([point(e)]);redraw();});
 canvas.addEventListener('pointermove',e=>{if(e.pointerId!==activePointer)return;e.preventDefault();strokes[strokes.length-1].push(point(e));redraw();});
 for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,e=>{if(e.pointerId===activePointer)activePointer=null;});
 canvas.addEventListener('contextmenu',e=>e.preventDefault());
 save();render();
