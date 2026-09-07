'use strict';
const mapPlaces={
 '品川駅':'品川駅 東京都港区',
 '名古屋駅':'名古屋駅 愛知県名古屋市',
 '地下鉄 名古屋駅':'地下鉄 名古屋駅 愛知県名古屋市',
 'あおなみ線 名古屋駅':'あおなみ線 名古屋駅 愛知県名古屋市',
 '名鉄名古屋駅':'名鉄名古屋駅 愛知県名古屋市',
 '金城ふ頭駅':'金城ふ頭駅 愛知県名古屋市',
 'リニア・鉄道館':'リニア・鉄道館 愛知県名古屋市港区金城ふ頭3丁目2-2',
 'JR岐阜駅':'JR岐阜駅 岐阜県岐阜市',
 '岐阜公園・岐阜城 バス停':'岐阜公園・岐阜城 バス停 岐阜県岐阜市',
 '金華山ロープウェー 山麓駅':'金華山ロープウェー 山麓駅 岐阜県岐阜市',
 '金華山ロープウェー 山頂駅':'金華山ロープウェー 山頂駅 岐阜県岐阜市',
 '栄駅':'栄駅 愛知県名古屋市',
 '名古屋城駅':'名古屋城駅 愛知県名古屋市',
 '名古屋城':'名古屋城 愛知県名古屋市中区本丸1-1',
 '犬山駅':'犬山駅 愛知県犬山市',
 '犬山城':'犬山城 愛知県犬山市犬山北古券65-2',
 'レゴランド・ジャパン':'レゴランド・ジャパン 愛知県名古屋市港区金城ふ頭2丁目2-1'
};
function mapPlace(stop){return stop.mapQuery||mapPlaces[stop.name.replace(/（.*?）/g,'')]||null;}
function mapStep(dayIndex,stopIndex){
 const a=trip[dayIndex].stops[stopIndex],b=trip[dayIndex].stops[stopIndex+1];
 if(!a||!b)return null;
 const origin=mapPlace(a),destination=mapPlace(b);if(!origin||!destination)return null;
 const ropeway=a.ride.startsWith('ロープウェー');
 const walking=a.ride.startsWith('あるいて');
 const params=new URLSearchParams(ropeway?{api:'1',query:destination}:{api:'1',origin,destination,travelmode:walking?'walking':'transit'});
 return {url:'https://www.google.com/maps/'+(ropeway?'search/':'dir/')+'?'+params.toString(),label:a.kana+' → '+b.kana,mode:ropeway?'ロープウェー：つく えきの ばしょ':walking?'あるく':'でんしゃ・バス',ropeway};
}
function renderDayMaps(dayIndex){
 const list=document.getElementById('mapLinks');list.replaceChildren();
 document.getElementById('mapDay').textContent=trip[dayIndex].date+'の みちのり';
 trip[dayIndex].stops.forEach((s,i)=>{const link=mapStep(dayIndex,i);if(!link)return;const li=document.createElement('li'),a=document.createElement('a'),small=document.createElement('small');a.href=link.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=link.label+' ↗';a.setAttribute('aria-label',link.label+'。Google マップを ひらく');small.textContent=link.mode;li.append(a,small);list.append(li);});
}
