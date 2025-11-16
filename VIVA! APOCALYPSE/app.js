
const DB = {
  getMessages(){
    return JSON.parse(localStorage.getItem('hearth_msgs')||'[]')
  },
  saveMessages(msgs){ localStorage.setItem('hearth_msgs', JSON.stringify(msgs)) },
  getPeers(){ return JSON.parse(localStorage.getItem('hearth_peers')||JSON.stringify(["Device-A","Device-B","Device-C"]))},
  savePeers(peers){ localStorage.setItem('hearth_peers', JSON.stringify(peers)) }
}


const feedList = document.getElementById('feedList')
const peersList = document.getElementById('peersList')
const sendBtn = document.getElementById('sendBtn')
const storeBtn = document.getElementById('storeBtn')
const syncBtn = document.getElementById('syncBtn')
const alertBtn = document.getElementById('alertBtn')
const networkStatus = document.getElementById('network-status')


let deviceIdInput = document.getElementById('deviceId')
let toIdInput = document.getElementById('toId')
let messageText = document.getElementById('messageText')


function init(){
  renderPeers()
  renderFeed()
  updateNetworkStatus()
  setupHandlers()
  registerServiceWorker()
  requestNotificationPermission()
}


function renderFeed(){
  const msgs = DB.getMessages().slice().reverse()
  feedList.innerHTML = ''
  if(!msgs.length) feedList.innerHTML = '<div class="msg">No messages yet — you are offline-first.</div>'
  msgs.forEach(m=>{
    const el = document.createElement('div'); el.className='msg'
    el.innerHTML = `<div class="meta">${m.time} • From: ${m.from} • To: ${m.to} ${m.alert?'<strong style="color:#ffb3b3">• ALERT</strong>':''}</div><div>${escapeHtml(m.text)}</div>`
    feedList.appendChild(el)
  })
}

function renderPeers(){
  const peers = DB.getPeers()
  peersList.innerHTML = ''
  peers.forEach(p=>{
    const el=document.createElement('div'); el.className='peer'; el.textContent=p
    peersList.appendChild(el)
  })
}


function setupHandlers(){
  sendBtn.addEventListener('click', ()=>{
    const from = deviceIdInput.value||'Device-A'
    const to = toIdInput.value||'all'
    const text = messageText.value.trim()
    if(!text){alert('Add a message'); return}
    sendMessage({from,to,text,alert:false})
    messageText.value=''
  })

  storeBtn.addEventListener('click', ()=>{
    const drafts = JSON.parse(localStorage.getItem('hearth_drafts')||'[]')
    drafts.push({time:new Date().toLocaleString(),text:messageText.value||''})
    localStorage.setItem('hearth_drafts', JSON.stringify(drafts))
    alert('Draft saved locally')
  })

  syncBtn.addEventListener('click', manualSync)
  alertBtn.addEventListener('click', ()=>triggerAlert({from:deviceIdInput.value||'Device-A'}))

  window.addEventListener('online', updateNetworkStatus)
  window.addEventListener('offline', updateNetworkStatus)
}


function sendMessage(msg){
  const msgs = DB.getMessages()
  const entry = Object.assign({id:Date.now()+Math.random().toString(16).slice(2),time:new Date().toLocaleString()}, msg)
  msgs.push(entry)
  DB.saveMessages(msgs)
  renderFeed()
 
  if(navigator.onLine){
    simulatePeerPropagation(entry)
    tryNotify(`Message sent from ${entry.from}`,'Message propagated to peers')
  } else {
    tryNotify('Saved offline','Message will propagate when synced')
  }
}

function simulatePeerPropagation(entry){
  const peers = DB.getPeers()
  const copy = Object.assign({},entry)
  copy.propagated = true
  
  const net = JSON.parse(localStorage.getItem('hearth_net')||'[]')
  net.push(copy)
  localStorage.setItem('hearth_net', JSON.stringify(net))
}


function manualSync(){
  const net = JSON.parse(localStorage.getItem('hearth_net')||'[]')
  const msgs = DB.getMessages()
  let added=0
  net.forEach(n=>{
    if(!msgs.find(m=>m.id===n.id)) { msgs.push(n); added++ }
  })
  DB.saveMessages(msgs)
  
  localStorage.setItem('hearth_net', JSON.stringify([]))
  renderFeed()
  tryNotify('Sync complete', `${added} messages merged`)
}


function triggerAlert(opts){
  const msg = {from:opts.from||'Device-A',to:'all',text:'!!! EMERGENCY ALERT !!!',alert:true}
  sendMessage(msg)
 
  document.body.animate([{boxShadow:'0 0 0px rgba(255,0,0,0)'} , {boxShadow:'0 0 30px rgba(255,0,0,0.4)'}],{duration:500,iterations:3})
  tryNotify('EMERGENCY', `${msg.from} sent an emergency alert`)  
}


function updateNetworkStatus(){
  if(navigator.onLine){
    networkStatus.textContent='Online'
    networkStatus.style.background='#064e3b'
  } else {
    networkStatus.textContent='Offline'
    networkStatus.style.background='#6b7280'
  }
}

function tryNotify(title, body){
  if(Notification && Notification.permission==='granted'){
    new Notification(title, {body,icon:'icons/icon-192.png'})
  }
}

function requestNotificationPermission(){
  if('Notification' in window){
    if(Notification.permission==='default') Notification.requestPermission()
  }
}

function escapeHtml(s){ return (s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"})[c]) }

function registerServiceWorker(){
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('/service-worker.js').then(reg=>{
      console.log('SW registered', reg.scope)
    }).catch(err=>console.warn('SW reg failed',err))
  }
}


init()


window._Hearth = {DB,manualSync}
