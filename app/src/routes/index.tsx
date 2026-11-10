import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useRef, useState, type ReactNode, type PointerEvent } from 'react';
import { ScrollScrub } from '@/components/scroll-scrub/scroll-scrub';
import { scrollScrubScenes, scrollScrubTheme } from '@/scroll-scrub-scenes';

export const Route = createFileRoute('/')({component: PinkStore});
type Product = {id:string; name:string; category:string; price:number; shade:string; image:string; description:string; sizes:string[]};
const products: Product[] = [
 {id:'satin',name:'Blush Hour Blouse',category:'Clothing',price:48,shade:'Blush',image:'/assets/blouse.webp',description:'Soft pink satin, a relaxed shape, and a little main-character energy. A wardrobe concept for our future collection.',sizes:['XS','S','M','L','XL']},
 {id:'bag',name:'The Rose Mini',category:'Accessories',price:64,shade:'Rose',image:'/assets/bag.webp',description:'A structured little pink bag with room for the essentials. A future collection concept, styled in rose.',sizes:['One size']},
 {id:'beauty',name:'Pink Ritual Bottle',category:'Beauty',price:22,shade:'Rose',image:'/assets/beauty.webp',description:'A beautiful pink refillable vessel for your vanity. This is a sample product concept; no cosmetic formula is offered.',sizes:['One size']},
 {id:'home',name:'Slow Morning Set',category:'Home',price:38,shade:'Blush',image:'/assets/home.webp',description:'A sculptural mug and vase pairing for a softer kind of morning. A pink living concept for the future collection.',sizes:['One size']},
];
const categories=['All','Clothing','Accessories','Beauty','Home'];
const money=(n:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
type BagItem={id:string; size:string; qty:number};
function Icon({name}:{name:string}) { return <img className="pink-icon" src={'/assets/icon-'+name+'.png'} alt="" aria-hidden="true"/>; }
function Modal({title,close,children,drawer=false}:{title:string;close:()=>void;children:ReactNode;drawer?:boolean}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const el=ref.current;if(!el)return;const prior=document.activeElement as HTMLElement|null;el.showModal();const overflow=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{el.close();document.body.style.overflow=overflow;prior?.focus();};},[]);
 return <dialog ref={ref} className={drawer?'pink-dialog bag-dialog':'pink-dialog'} aria-label={title} onCancel={e=>{e.preventDefault();close();}} onClick={e=>{if(e.target===e.currentTarget)close();}}><div className="dialog-inner"><div className="dialog-heading"><h2>{title}</h2><button className="close-dialog" onClick={close} aria-label="Close dialog">×</button></div>{children}</div></dialog>;
}
function PinkStore(){
 const [category,setCategory]=useState('All'),[shade,setShade]=useState('All shades'),[query,setQuery]=useState('');
 const [favorites,setFavorites]=useState<string[]>([]),[favoritesOnly,setFavoritesOnly]=useState(false),[bag,setBag]=useState<BagItem[]>([]),[ready,setReady]=useState(false);
 const [selected,setSelected]=useState<Product|null>(null),[size,setSize]=useState(''),[bagOpen,setBagOpen]=useState(false),[info,setInfo]=useState<string|null>(null),[notice,setNotice]=useState(''),[entering,setEntering]=useState(false),[animate,setAnimate]=useState(false);
 const [journeyPhase,setJourneyPhase]=useState<'loading'|'playing'|'paused'|'arrived'|'error'>('loading');
 const journeyDialog=useRef<HTMLDialogElement>(null),journeyVideo=useRef<HTMLVideoElement>(null),previousOverflow=useRef('');
 const heroRef=useRef<HTMLElement>(null),flightRef=useRef<HTMLDivElement>(null),frameRef=useRef(0),noticeTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>{
  const m=window.matchMedia('(prefers-reduced-motion: reduce)');const change=()=>setAnimate(!m.matches);change();m.addEventListener('change',change);
  try {const b=JSON.parse(localStorage.getItem('univers-bag')||'[]');if(Array.isArray(b))setBag(b.filter(x=>products.some(p=>p.id===x.id&&p.sizes.includes(x.size))&&Number.isInteger(x.qty)&&x.qty>0&&x.qty<=20));const f=JSON.parse(localStorage.getItem('univers-favorites')||'[]');if(Array.isArray(f))setFavorites(f.filter(x=>products.some(p=>p.id===x)));}catch{}
  setReady(true);return()=>{m.removeEventListener('change',change);cancelAnimationFrame(frameRef.current);if(noticeTimer.current)clearTimeout(noticeTimer.current);};
 },[]);
 useEffect(()=>{if(ready){try{localStorage.setItem('univers-bag',JSON.stringify(bag));localStorage.setItem('univers-favorites',JSON.stringify(favorites));}catch{}}},[bag,favorites,ready]);
 function announce(text:string){setNotice(text);if(noticeTimer.current)clearTimeout(noticeTimer.current);noticeTimer.current=setTimeout(()=>setNotice(''),3000);}
 function shop(cat='All'){cancelAnimationFrame(frameRef.current);setEntering(false);setCategory(cat);setFavoritesOnly(false);document.getElementById('shop')?.scrollIntoView({behavior:animate?'smooth':'auto'});}
 function playJourney(){
  const video=journeyVideo.current;
  if(!video)return;
  setJourneyPhase('loading');
  video.muted=true;
  if(!video.getAttribute('src')){
   video.src=window.matchMedia('(max-width: 860px)').matches?'/assets/world/scene-01-mobile.mp4':'/assets/world/scene-01.mp4';
   video.load();
  }
  void video.play().catch(()=>{if(journeyDialog.current?.open)setJourneyPhase('error');});
 }
 function enter(){
  const dialog=journeyDialog.current;
  if(!dialog||dialog.open)return;
  cancelAnimationFrame(frameRef.current);
  previousOverflow.current=document.body.style.overflow;
  document.body.style.overflow='hidden';
  setEntering(true);
  dialog.showModal();
  // Play directly inside the click gesture. Scrolling never controls this playback.
  playJourney();
 }
 function closeJourney(){
  journeyVideo.current?.pause();
  journeyDialog.current?.close();
 }
 function releaseJourney(){
  const video=journeyVideo.current;
  if(video){video.pause();video.removeAttribute('src');video.load();}
  document.body.style.overflow=previousOverflow.current;
  setEntering(false);
  setJourneyPhase('loading');
 }
 function enterBoutique(){
  closeJourney();
  setCategory('All');
  setFavoritesOnly(false);
  // This happens only after the shopper chooses the boutique or explicitly skips.
  document.getElementById('collections')?.scrollIntoView({behavior:'auto'});
 }
 function replayJourney(){
  const video=journeyVideo.current;
  if(video)video.currentTime=0;
  playJourney();
 }
 function toggleJourney(){
  const video=journeyVideo.current;
  if(!video)return;
  if(video.paused)playJourney();else{video.pause();setJourneyPhase('paused');}
 }
 function tilt(e:PointerEvent<HTMLElement>){if(!animate)return;const r=e.currentTarget.getBoundingClientRect();e.currentTarget.style.setProperty('--mx',((e.clientX-r.left)/r.width-.5)*10+'px');e.currentTarget.style.setProperty('--my',((e.clientY-r.top)/r.height-.5)*8+'px');}
 function toggleFavorite(id:string){setFavorites(v=>v.includes(id)?v.filter(x=>x!==id):[...v,id]);}
 function open(p:Product){setSelected(p);setSize(p.sizes[0]);}
 function add(p:Product){setBag(v=>{const found=v.find(x=>x.id===p.id&&x.size===size);return found?v.map(x=>x===found?{...x,qty:Math.min(x.qty+1,20)}:x):[...v,{id:p.id,size,qty:1}];});announce(p.name+' added to your bag');setSelected(null);setBagOpen(true);}
 const shown=products.filter(p=>(category==='All'||category===p.category)&&(shade==='All shades'||p.shade===shade)&&(!favoritesOnly||favorites.includes(p.id))&&(p.name+' '+p.category).toLowerCase().includes(query.toLowerCase()));
 const count=bag.reduce((n,x)=>n+x.qty,0),total=bag.reduce((n,x)=>n+(products.find(p=>p.id===x.id)?.price||0)*x.qty,0);
 return <div className="pink-site">
  <a className="skip-link" href="#shop">Skip to shopping</a>
  <header className="site-header"><a href="#world" className="wordmark" onClick={()=>cancelAnimationFrame(frameRef.current)}><img src="/assets/logo.png" alt=""/>universe<span>in pink</span><i>®</i></a><nav aria-label="Main navigation"><button onClick={()=>shop()}>The pink edit</button><a href="#collections" onClick={()=>cancelAnimationFrame(frameRef.current)}>Collections</a><button onClick={()=>setInfo('Our world')}>Our world</button></nav><div className="nav-actions"><button className="favorite-nav" onClick={()=>{setFavoritesOnly(true);setCategory('All');setQuery('');setShade('All shades');document.getElementById('shop')?.scrollIntoView({behavior:animate?'smooth':'auto'});}} aria-label={'View favorites, '+favorites.length+' saved'}><Icon name="heart"/><span>{favorites.length}</span></button><button className="bag-toggle" onClick={()=>setBagOpen(true)} aria-label={'Open bag, '+count+' items'}><Icon name="bag"/><span>Bag ({count})</span></button></div></header>
  <main>
   <section id="world" className={'planet-entrance'+(entering?' is-entering':'')} ref={heroRef} onPointerMove={tilt} onPointerLeave={e=>{e.currentTarget.style.setProperty('--mx','0px');e.currentTarget.style.setProperty('--my','0px');}}>
    <div className="planet-cinema" aria-hidden="true"><img src="/assets/world/scene-01-poster.png" alt="" fetchPriority="high"/>{animate&&<video autoPlay muted loop playsInline preload="metadata" poster="/assets/world/scene-01-poster.png"><source src="/assets/world/orbit.mp4" type="video/mp4"/></video>}</div>
    <div className="hero-shade"/>
    <div className="hero-copy"><p className="hero-label">A world of pink. A world of you.</p><h1>Life looks<br/>better in pink.</h1><p>Everything you love.<br/>In the color you love.</p></div>
    <button className="planet-hit" onClick={enter} disabled={entering} aria-label="Click the pink planet to enter the store"><span className="orbit-mark"/><span className="enter-label">{entering?'You’re on your way':'Enter our world'}<b aria-hidden="true">↗</b></span></button>
    <button className="skip-intro" onClick={()=>shop()}>Skip intro <span aria-hidden="true">→</span></button>
    <div className="hero-bottom"><span>Clothing. Beauty. Objects. Obsession.</span><span>Only pink. Always you.</span></div>
   </section>
   <div className="flight" ref={flightRef} ><ScrollScrub scenes={scrollScrubScenes} theme={scrollScrubTheme}/><button className="flight-skip" onClick={()=>shop()}>Go shopping ↗</button></div>
   <section id="collections" className="collection-section"><div className="section-heading"><p>YOUR PINK ERA STARTS HERE</p><h2>Find your kind of pink.</h2></div><div className="collection-gallery">{products.map((p,i)=><button className={'collection-tile collection-'+i} key={p.id} onClick={()=>shop(p.category)}><div className="collection-image"><img src={p.image} alt={'Explore pink '+p.category.toLowerCase()} loading="lazy"/><span className="collection-reveal" aria-hidden="true">Explore ↗</span></div><div className="collection-caption"><Icon name={['dress','handbag','beauty','home'][i]}/><h3>{p.category}</h3><span aria-hidden="true">↗</span></div></button>)}</div></section>
   <div className="pink-ribbon" aria-hidden="true"><span>pink is a whole mood</span><span>✳</span><span>pink is a whole mood</span><span>✳</span><span>pink is a whole mood</span></div>
   <section id="shop" className="shop-section"><div className="catalog-heading"><h2>{favoritesOnly?'Your pink favorites.':'The pink edit.'}</h2><p>Concept collection. Sample products and prices.</p></div><div className="catalog-tools"><div className="category-tabs" role="group" aria-label="Filter by collection">{categories.map(c=><button key={c} className={category===c?'selected':''} aria-pressed={category===c} onClick={()=>setCategory(c)}>{c}</button>)}</div><div className="search-tools"><label className="search-label"><span className="sr-only">Search the collection</span><input value={query} onChange={e=>setQuery(e.target.value)} type="search" placeholder="Find your pink..."/></label><label><span className="sr-only">Filter by shade</span><select value={shade} onChange={e=>setShade(e.target.value)}><option>All shades</option><option>Blush</option><option>Rose</option></select></label></div></div>{favoritesOnly&&<button className="clear-favorites" onClick={()=>setFavoritesOnly(false)}>Show all products ↗</button>}<p className="result-count" aria-live="polite">{shown.length} {shown.length===1?'piece':'pieces'} of pink</p>
   <div className="product-grid">{shown.map(p=><article className="product" key={p.id}><div className="product-media"><button className="product-open" onClick={()=>open(p)} aria-label={'View '+p.name}><img src={p.image} alt={p.name+' in '+p.shade.toLowerCase()+' pink'} loading="lazy"/><span className="quick-view">Take a closer look ↗</span></button><button className={'heart-toggle'+(favorites.includes(p.id)?' saved':'')} onClick={()=>toggleFavorite(p.id)} aria-label={(favorites.includes(p.id)?'Unsave ':'Save ')+p.name} aria-pressed={favorites.includes(p.id)}><Icon name="heart"/></button></div><div className="product-caption"><button onClick={()=>open(p)}>{p.name}</button><span>{money(p.price)}</span></div><p>{p.shade} pink · {p.category}</p></article>)}</div>
   {!shown.length&&<div className="empty-state"><Icon name="heart"/><h3>{favoritesOnly?'Your favorites live here.':'No pink found. Yet.'}</h3><p>{favoritesOnly?'Tap a heart on a piece you love to save it.':'Try another search, shade, or collection.'}</p><button onClick={()=>{setQuery('');setShade('All shades');setCategory('All');setFavoritesOnly(false);}}>Explore the edit ↗</button></div>}
   </section>
   <section className="living-section"><div className="living-photo"><img src="/assets/living.webp" alt="Sculptural pink sofa, ceramic vase, and soft pink architecture" loading="lazy"/></div><div className="living-copy"><span aria-hidden="true" className="living-star">✳</span><h2>Not just a color.<br/>Your little universe.</h2><p>From what you wear to where you unwind. A place for every shade of you.</p><button onClick={()=>shop('Home')}>Make yourself at home <span aria-hidden="true">↗</span></button></div></section>
  </main>
  <footer><div className="footer-top"><p>Everything pink.<br/>Anything but ordinary.</p><div><button onClick={()=>setInfo('Our world')}>Our world</button><button onClick={()=>setInfo('Store preview')}>Store preview</button><button onClick={()=>setInfo('Privacy')}>Privacy</button><button onClick={()=>{cancelAnimationFrame(frameRef.current);document.getElementById('world')?.scrollIntoView({behavior:animate?'smooth':'auto'});}}>Replay the world ↺</button></div></div><div className="footer-wordmark">universe in pink<span>✳</span></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Universe in Pink</span><span>Concept storefront. Checkout is not open.</span></div></footer>
  <dialog ref={journeyDialog} className="entrance-film" aria-label="Journey through the pink world" onCancel={closeJourney} onClose={releaseJourney}>
   <video ref={journeyVideo} className="entrance-film-video" muted playsInline preload="none" poster="/assets/world/scene-01-poster.png" aria-label="A cinematic flight toward the pink planet, through rose clouds, to the boutique" onPlaying={()=>setJourneyPhase('playing')} onWaiting={()=>setJourneyPhase(p=>p==='arrived'?'arrived':'loading')} onEnded={()=>setJourneyPhase('arrived')} onError={()=>{if(journeyDialog.current?.open)setJourneyPhase('error');}}/>
   <div className="entrance-film-top"><span>universe in pink</span><button onClick={enterBoutique}>Skip film ↗</button><button className="entrance-film-close" onClick={closeJourney} aria-label="Close cinematic journey">×</button></div>
   {(journeyPhase==='loading'||journeyPhase==='error')&&<div className="entrance-film-status" role="status"><p>{journeyPhase==='loading'?'Your pink world is opening.':'Ready for your pink escape?'}</p><button onClick={playJourney}>{journeyPhase==='loading'?'Play journey':'Try playback again'} <span aria-hidden="true">▷</span></button>{journeyPhase==='error'&&<p className="entrance-film-help">The film could not start. Try again, or use Skip film to enter the boutique.</p>}</div>}
   {(journeyPhase==='playing'||journeyPhase==='paused')&&<button className="entrance-film-pause" onClick={toggleJourney}>{journeyPhase==='paused'?'Resume journey ▷':'Pause journey Ⅱ'}</button>}
   {journeyPhase==='arrived'&&<div className="boutique-arrival"><p>You’re here.</p><h2>Welcome to<br/>your pink world.</h2><button className="boutique-door" onClick={enterBoutique}>Enter boutique <span aria-hidden="true">↗</span></button><button className="journey-replay" onClick={replayJourney}>Take the journey again ↺</button></div>}
  </dialog>
  <div className={'toast'+(notice?' visible':'')} role="status">{notice}</div>
  {selected&&<Modal title={selected.name} close={()=>setSelected(null)}><div className="product-detail"><img src={selected.image} alt={selected.name}/><div><p className="detail-category">{selected.category} · {selected.shade} pink</p><p className="detail-price">{money(selected.price)}</p><p>{selected.description}</p><fieldset><legend>{selected.sizes.length>1?'Choose your size':'Size'}</legend><div className="size-options">{selected.sizes.map(s=><button key={s} aria-pressed={size===s} className={size===s?'chosen':''} onClick={()=>setSize(s)}>{s}</button>)}</div></fieldset><button className="add-to-bag" onClick={()=>add(selected)}>Add to bag <span>+</span></button><p className="sample-note">Sample product. No payment will be taken.</p></div></div></Modal>}
  {bagOpen&&<Modal title={'Your pink bag ('+count+')'} close={()=>setBagOpen(false)} drawer>{bag.length?<><div className="bag-items">{bag.map(item=>{const p=products.find(p=>p.id===item.id)!;return <article className="bag-item" key={item.id+item.size}><img src={p.image} alt={p.name}/><div><h3>{p.name}</h3><p>{item.size} · {money(p.price)}</p><div className="quantity"><button aria-label={'Decrease '+p.name+' quantity'} onClick={()=>setBag(v=>v.map(x=>x===item?{...x,qty:x.qty-1}:x).filter(x=>x.qty>0))}>−</button><span>{item.qty}</span><button aria-label={'Increase '+p.name+' quantity'} disabled={item.qty>=20} onClick={()=>setBag(v=>v.map(x=>x===item?{...x,qty:Math.min(20,x.qty+1)}:x))}>+</button><button className="remove-item" onClick={()=>setBag(v=>v.filter(x=>x!==item))}>Remove</button></div></div></article>;})}</div><div className="bag-summary"><p><span>Sample subtotal</span><b>{money(total)}</b></p><p className="sample-note">This is a concept collection. Products, inventory, shipping, and checkout will be connected before launch.</p><button className="continue-shopping" onClick={()=>{setBagOpen(false);shop();}}>Keep exploring ↗</button></div></>:<div className="empty-state"><Icon name="bag"/><h3>A little room for pink.</h3><p>Your bag is waiting for something you love.</p><button onClick={()=>{setBagOpen(false);shop();}}>Explore the edit ↗</button></div>}</Modal>}
  {info&&<Modal title={info} close={()=>setInfo(null)}><div className="info-content">{info==='Our world'?<><img src="/assets/logo.png" alt="Pink planet emblem"/><p>Universe in Pink is a world built around one joyful idea: everything you love, in pink.</p><p>Clothing, beauty, accessories, and home objects, all imagined through a pink lens.</p></>:info==='Privacy'?<><p>Your shopping bag and favorites are stored in this browser. This concept store does not collect payment details or submit orders.</p><button className="reset-data" onClick={()=>{setBag([]);setFavorites([]);announce('Your saved bag and favorites have been cleared.');}}>Clear saved shopping data</button></>:<><p>You’re exploring the design concept for Universe in Pink. The catalog, images, and prices are samples.</p><p>Real products, inventory, payments, shipping, and return terms need to be connected before this store opens for orders.</p></>}</div></Modal>}
 </div>;
}
