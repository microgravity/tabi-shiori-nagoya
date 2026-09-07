'use strict';
const destinationPhotos={
 'nagoya-castle':{
  src:'./nagoya-castle.jpg',alt:'青空の下の名古屋城',name:'名古屋城',
  author:'Base64 / Arad',source:'https://commons.wikimedia.org/wiki/File:Nagoya_Castle(Larger).jpg',
  license:'CC BY-SA 3.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/3.0/'
 },
 'inuyama-castle':{
  src:'./inuyama.jpg',alt:'石垣の上に建つ犬山城の天守',name:'犬山城',
  author:'百楽兎',source:'https://commons.wikimedia.org/wiki/File:Inuyama_Castle.jpg',
  license:'CC BY-SA 3.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/3.0/'
 },
 'museum':{
  src:'./scmaglev.jpg',alt:'リニア・鉄道館に並ぶ新幹線と機関車',name:'リニア・鉄道館',
  author:'Morio',source:'https://commons.wikimedia.org/wiki/File:SCMaglev_and_Railway_Park_Great_Rollingstock_Hall.jpg',
  license:'CC BY-SA 3.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/3.0/'
 },
 'legoland':{
  src:'./legoland.jpg',alt:'色とりどりのブロックに囲まれたレゴランド・ジャパンの入口',name:'レゴランド・ジャパン',
  author:'Bariston',source:'https://commons.wikimedia.org/wiki/File:Legoland_japan.jpg',
  license:'CC BY-SA 4.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/'
 }
};
function showDestinationPhoto(stop){
 const photo=destinationPhotos[stop.id];if(!photo)return;
 const img=document.createElement('img');img.className='place-image';img.src=photo.src;img.alt=photo.alt;img.width=960;img.height=540;img.decoding='async';document.getElementById('detail').prepend(img);
}
function showPhotoCredits(){
 const target=document.getElementById('credits');target.textContent='写真（表示範囲を調整）：';
 for(const photo of Object.values(destinationPhotos)){
  const span=document.createElement('span'),a=document.createElement('a'),license=document.createElement('a');
  a.href=photo.source;a.textContent=photo.name+' — '+photo.author;a.target='_blank';a.rel='noopener noreferrer';
  license.href=photo.licenseUrl;license.textContent=photo.license;license.target='_blank';license.rel='noopener noreferrer';
  span.append(a,document.createTextNode(' / '),license);span.className='photo-credit';target.append(span);
 }
 const kana=document.createElement('span'),a=document.createElement('a');kana.className='photo-credit';a.href='./glyphs/LICENSE.txt';a.target='_blank';a.textContent='ライセンス';kana.append(document.createTextNode('ひらがなのお手本：strokesvg / Klee One。'),a);target.append(kana);
}
