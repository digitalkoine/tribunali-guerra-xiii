const $=(s)=>document.querySelector(s);
const $$=(s)=>Array.from(document.querySelectorAll(s));

let network=null;

function showTab(id){
  $$(".tab").forEach(b=>b.classList.toggle("active", b.dataset.tab===id));
  $$(".tabpane").forEach(p=>p.style.display=(p.id===id)?"block":"none");

  // If ontology tab becomes visible, re-fit graph to avoid "corner squish"
  if((id==="ontology") && network){
    setTimeout(()=>{
      try{ network.fit({animation:true}); }catch(e){}
    }, 200);
  }
  if(id==="casegraph" && caseNetwork){
    setTimeout(()=>{ try{ caseNetwork.fit({animation:true}); }catch(e){} }, 200);
  }
}

function fmt(v){return (v===null||v===undefined||v==="")?"—":String(v);}

let CASES=[], filtered=[], page=1;
const pageSize=50;
let facetCrime="", facetPerson="";
let leafletMap=null, leafletMarker=null;

function countsBy(key, rows){
  const m=new Map();
  for(const r of rows){
    const k=(r[key] && String(r[key]).trim())?String(r[key]).trim():"—";
    m.set(k,(m.get(k)||0)+1);
  }
  return Array.from(m.entries()).sort((a,b)=>b[1]-a[1]);
}

function renderChips(containerSel, entries, activeValue, onClick){
  const el=$(containerSel); el.innerHTML="";
  for(const [label,count] of entries.slice(0,18)){
    const b=document.createElement("button");
    b.className="chip"+(label===activeValue?" active":"");
    b.innerHTML=`${label}<small>${count}</small>`;
    b.addEventListener("click",()=>onClick(label===activeValue?"":label));
    el.appendChild(b);
  }
}

function applyFilters(){
  const qPerson=($("#qPerson").value||"").trim().toLowerCase();
  const qCrime=($("#qCrime").value||"").trim().toLowerCase();
  const outcome=$("#outcome").value;
  const year=$("#year").value;

  filtered=CASES.filter(r=>{
    if(facetCrime && r.crimeCategory!==facetCrime) return false;
    if(facetPerson){
      const full=`${r.familyName||""} ${r.givenName||""}`.trim();
      if(full!==facetPerson) return false;
    }
    if(outcome && r.outcome!==outcome) return false;
    if(year && (r.dateSentence||"").slice(0,4)!==year) return false;

    if(qPerson){
      const hay=`${r.familyName||""} ${r.givenName||""}`.toLowerCase();
      if(!hay.includes(qPerson)) return false;
    }
    if(qCrime){
      const hay=[r.crimeCategory,r.outcome,r.rank,r.executionNote]
        .map(x=>String(x||"").toLowerCase()).join(" | ");
      if(!hay.includes(qCrime)) return false;
    }
    return true;
  });

  page=1;
  renderTable();
  renderKPIs();
  renderFacets();
}

function renderKPIs(){
  $("#kpiTotal").textContent=CASES.length.toLocaleString();
  $("#kpiFiltered").textContent=filtered.length.toLocaleString();
  const dates=filtered.map(r=>r.dateSentence).filter(Boolean).sort();
  $("#kpiRange").textContent=dates.length?(dates[0]+" → "+dates[dates.length-1]):"—";

  const top=(key)=>{
    const m=new Map();
    filtered.forEach(r=>{
      const k=r[key]||"—";
      m.set(k,(m.get(k)||0)+1);
    });
    let best=["—",0];
    for(const [k,v] of m.entries()) if(v>best[1]) best=[k,v];
    return best[0];
  };
  $("#kpiTopCrime").textContent=top("crimeCategory");
  $("#kpiTopOutcome").textContent=top("outcome");
}

function renderFacets(){
  const qPerson=($("#qPerson").value||"").trim().toLowerCase();
  const qCrime=($("#qCrime").value||"").trim().toLowerCase();
  const outcome=$("#outcome").value;
  const year=$("#year").value;

  const baseNoCrime=CASES.filter(r=>{
    if(facetPerson){
      const full=`${r.familyName||""} ${r.givenName||""}`.trim();
      if(full!==facetPerson) return false;
    }
    if(outcome && r.outcome!==outcome) return false;
    if(year && (r.dateSentence||"").slice(0,4)!==year) return false;
    if(qPerson && !(`${r.familyName||""} ${r.givenName||""}`.toLowerCase().includes(qPerson))) return false;
    if(qCrime){
      const hay=[r.crimeCategory,r.outcome,r.rank,r.executionNote].map(x=>String(x||"").toLowerCase()).join(" | ");
      if(!hay.includes(qCrime)) return false;
    }
    return true;
  });

  renderChips("#crimeChips", countsBy("crimeCategory", baseNoCrime), facetCrime, (v)=>{facetCrime=v; applyFilters();});

  const baseNoPerson=CASES.filter(r=>{
    if(facetCrime && r.crimeCategory!==facetCrime) return false;
    if(outcome && r.outcome!==outcome) return false;
    if(year && (r.dateSentence||"").slice(0,4)!==year) return false;
    if(qPerson && !(`${r.familyName||""} ${r.givenName||""}`.toLowerCase().includes(qPerson))) return false;
    if(qCrime){
      const hay=[r.crimeCategory,r.outcome,r.rank,r.executionNote].map(x=>String(x||"").toLowerCase()).join(" | ");
      if(!hay.includes(qCrime)) return false;
    }
    return true;
  });

  const persons=baseNoPerson.map(r=>`${r.familyName||""} ${r.givenName||""}`.trim()).filter(s=>s && s!=="—");
  const m=new Map(); for(const p of persons) m.set(p,(m.get(p)||0)+1);
  const personCounts=Array.from(m.entries()).sort((a,b)=>b[1]-a[1]);
  renderChips("#personChips", personCounts, facetPerson, (v)=>{facetPerson=v; applyFilters();});
}

function renderTable(){
  const start=(page-1)*pageSize;
  const rows=filtered.slice(start,start+pageSize);
  const tbody=$("#tbody"); tbody.innerHTML="";
  for(const r of rows){
    const tr=document.createElement("tr");
    tr.innerHTML=`
      <td><span class="badge">${fmt(r.id)}</span></td>
      <td>${fmt(r.dateSentence)}</td>
      <td>${fmt(r.crimeCategory)}</td>
      <td>${fmt(r.outcome)}</td>
      <td>${fmt(r.rank)}</td>
      <td>${fmt(r.familyName)} ${fmt(r.givenName)}</td>
      <td>${fmt(r.gender)}${r.ageYears!==undefined?(" · "+fmt(r.ageYears)):""}</td>
      <td>${fmt(r.profession)}</td>
      <td>${fmt(r.birthPlace)}${r.birthProvince?(" ("+fmt(r.birthProvince)+")"):""}</td>
      <td>${fmt(r.trialPlace)}</td>
    `;
    tr.addEventListener("click",()=>openRecord(r));
    tbody.appendChild(tr);
  }
  const totalPages=Math.max(1,Math.ceil(filtered.length/pageSize));
  $("#pageInfo").textContent=`Page ${page} / ${totalPages}`;
  $("#countInfo").textContent=`${filtered.length.toLocaleString()} records`;
  $("#prev").disabled=page<=1;
  $("#next").disabled=page>=totalPages;
}

async function loadData(){
  CASES = window.CASES_DATA || [];
  if(!CASES.length){
    const res=await fetch("data/cases.json");
    CASES=await res.json();
  }
  const uniq=(key)=>Array.from(new Set(CASES.map(r=>r[key]).filter(Boolean))).sort();
  const years=Array.from(new Set(CASES.map(r=>(r.dateSentence||"").slice(0,4)).filter(Boolean))).sort();
  const fill=(sel,arr)=>{
    const el=$(sel);
    el.innerHTML=`<option value="">All</option>` + arr.map(v=>`<option>${v}</option>`).join("");
  };
  fill("#outcome", uniq("outcome"));
  fill("#year", years);

  filtered=CASES.slice();
  renderFacets();
  applyFilters();
}

async function loadOntologyGraph(){
  const data = window.ONTOLOGY_GRAPH || (await (await fetch("data/ontology_graph.json")).json());
  const container=document.getElementById("graph");

  const nodes=new vis.DataSet(data.nodes.map(n=>({
    id:n.id,
    label:n.label,
    group:n.group,
    x:n.x, y:n.y, fixed:n.fixed || false,
    shape:(n.id && String(n.id).startsWith("prop:")) ? "box" : (n.group==="Datatype" ? "box" : "ellipse")
  })));

  const edges=new vis.DataSet(data.edges.map(e=>({
    from:e.from,
    to:e.to,
    arrows:"to",
    title:e.title || e.label || "",
    label:"",
    smooth:{type:"cubicBezier"}
  })));

  const options={
    physics:{
      enabled:false
    },
    interaction:{
      hover:true,
      navigationButtons:true,
      zoomView:true,
      dragView:true
    },
    layout:{improvedLayout:true},
    nodes:{
      borderWidth:1,
      font:{color:"#f3f6ff", size:14, face:"system-ui"}
    },
    edges:{
      color:{color:"rgba(255,255,255,.32)"},
      width:1.1
    },
    groups:{
      Class:{color:{border:"rgba(255,255,255,.55)",background:"rgba(122,162,255,.22)"}},
      ExternalClass:{color:{border:"rgba(255,255,255,.55)",background:"rgba(180,140,255,.18)"}},
      Datatype:{color:{border:"rgba(255,255,255,.50)",background:"rgba(255,255,255,.08)"}},
    }
  };

  network = new vis.Network(container,{nodes,edges},options);

  // Center + comfortable zoom.
  setTimeout(()=>{
    try{
      network.fit({animation:true});
      network.moveTo({scale:0.95, animation:true});
    }catch(e){}
  }, 200);
}

function openRecord(r){
  $("#modalTitle").textContent = `Record ${fmt(r.id)} — ${fmt(r.familyName)} ${fmt(r.givenName)}`;
  $("#recordKV").innerHTML = `
    <div>Date</div><div>${fmt(r.dateSentence)}</div>
    <div>Crime</div><div>${fmt(r.crimeCategory)}</div>
    <div>Outcome</div><div>${fmt(r.outcome)}</div>
    <div>Rank</div><div>${fmt(r.rank)}</div>
    <div>Gender · age</div><div>${fmt(r.gender)}${r.ageYears!==undefined?(" · "+fmt(r.ageYears)):""}</div>
    <div>Profession</div><div>${fmt(r.profession)}</div>
    <div>Origin</div><div>${fmt(r.birthPlace)}${r.birthProvince?(" ("+fmt(r.birthProvince)+")"):""}${r.birthCountry?(" · "+fmt(r.birthCountry)):""}</div>
    <div>Trial place</div><div>${fmt(r.trialPlace)}</div>
    <div>Execution note</div><div>${fmt(r.executionNote)}</div>
    <div>Confiscation</div><div>${(r.confiscationFraction===0) ? "Yes (share n/a)" : (r.confiscationFraction ? r.confiscationFraction : "—")}</div>
  `;

  $("#modalOverlay").style.display="flex";

  const lat=r.birthLat, lng=r.birthLng;
  if(lat!==null && lat!==undefined && lng!==null && lng!==undefined){
    $("#mapNote").textContent="Birthplace (origin)";
    if(!leafletMap){
      leafletMap=L.map("birthMap",{zoomControl:true});
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {maxZoom:18, attribution:"© OpenStreetMap"}).addTo(leafletMap);
    }
    leafletMap.setView([lat,lng],7);
    if(leafletMarker) leafletMarker.remove();
    leafletMarker=L.marker([lat,lng]).addTo(leafletMap).bindPopup(`${fmt(r.birthPlace)}`).openPopup();
    setTimeout(()=>leafletMap.invalidateSize(),200);
  } else {
    $("#mapNote").textContent="No coordinates available for birthplace in this record.";
    if(leafletMap){ setTimeout(()=>leafletMap.invalidateSize(),200); }
  }
}

function closeModal(){ $("#modalOverlay").style.display="none"; }


/* ---------- Case search (for instance graph) ---------- */
function _norm(s){ return String(s||"").toLowerCase(); }

function searchCaseCandidates(query, limit=25){
  const q = _norm(query).trim();
  const rows = window.CASES_DATA || [];
  if(!q) return [];

  // Score matches across multiple fields
  const scored = [];
  for(const r of rows){
    const fields = {
      id: String(r.id||""),
      person: `${r.familyName||""} ${r.givenName||""}`.trim(),
      crime: r.crimeCategory||"",
      outcome: r.outcome||"",
      rank: r.rank||"",
      date: r.dateSentence||"",
      birth: r.birthPlace||"",
      trial: r.trialPlace||"",
      prof: r.profession||"",
      note: r.executionNote||"",
    };

    let score = 0;

    // ID strong matches
    if(_norm(fields.id) === q) score += 100;
    else if(_norm(fields.id).startsWith(q)) score += 70;
    else if(_norm(fields.id).includes(q)) score += 35;

    // Text fields
    const bucket = [
      ["person", 28],
      ["crime", 24],
      ["outcome", 18],
      ["date", 18],
      ["birth", 14],
      ["trial", 14],
      ["rank", 10],
      ["prof", 8],
      ["note", 6],
    ];

    for(const [k,w] of bucket){
      const v = _norm(fields[k]);
      if(!v) continue;
      if(v === q) score += w + 20;
      else if(v.startsWith(q)) score += w + 10;
      else if(v.includes(q)) score += w;
    }

    if(score>0){
      scored.push({score, r});
    }
  }

  scored.sort((a,b)=>b.score-a.score);
  return scored.slice(0,limit).map(x=>x.r);
}

function renderCaseSearchResults(query){
  const out = document.getElementById("caseSearchResults");
  const count = document.getElementById("caseSearchCount");
  const q = (query||"").trim();
  if(!q){
    out.innerHTML = "<span class='small'>Scrivi una parola chiave (nome, luogo, crimine, data…) e premi Search.</span>";
    count.textContent = "";
    return;
  }

  const hits = searchCaseCandidates(q, 30);
  count.textContent = hits.length ? `${hits.length} risultati (max 30 mostrati)` : "0 risultati";

  if(!hits.length){
    out.innerHTML = "<span class='small'>Nessun risultato.</span>";
    return;
  }

  const mk = (r)=>{
    const person = `${r.familyName||""} ${r.givenName||""}`.trim() || "—";
    const line1 = `<b>${r.id}</b> · ${fmt(r.dateSentence)} · ${fmt(r.crimeCategory)} · ${fmt(r.outcome)}`;
    const line2 = `${person} · ${fmt(r.birthPlace)} → ${fmt(r.trialPlace)}`;
    return `<button class="chip" data-caseid="${r.id}" style="text-align:left; white-space:normal; border-radius:14px">
              <div>${line1}</div>
              <div style="color:var(--muted); font-size:12px; margin-top:2px">${line2}</div>
            </button>`;
  };

  out.innerHTML = `<div class="chips">${hits.map(mk).join("")}</div>`;

  out.querySelectorAll("button[data-caseid]").forEach(b=>{
    b.addEventListener("click", ()=>{
      const id = b.getAttribute("data-caseid");
      const input = document.getElementById("caseIdInput");
      input.value = id;
      showTab("casegraph");
      renderCaseGraphById(id);
    });
  });
}

/* ---------- Case (instance) graph ---------- */
let caseNetwork = null;

function buildCaseInstanceGraph(rec){
  const nodes = [];
  const edges = [];
  const addNode = (id,label,group)=>nodes.push({id,label,group});
  const addEdge = (a,b,title)=>edges.push({from:a,to:b,arrows:"to",title});

  const cid = `case:${rec.id}`;
  addNode(cid, `Case ${fmt(rec.id)}`, "Case");

  // Person node
  const personLabel = `${fmt(rec.familyName)} ${fmt(rec.givenName)}`.trim();
  const pid = `person:${rec.id}`;
  addNode(pid, personLabel && personLabel!=="— —" ? `Person: ${personLabel}` : "Person", "Person");
  addEdge(cid, pid, "hasPerson");

  // Key literal attributes as nodes
  const lit = (key, label) => {
    const v = rec[key];
    if(v===null || v===undefined || v==="" ) return;
    const nid = `${key}:${rec.id}`;
    addNode(nid, `${label}: ${fmt(v)}`, "Literal");
    addEdge(cid, nid, label);
  };

  lit("dateSentence","dateSentence");
  lit("crimeCategory","crimeCategory");
  lit("outcome","outcome");
  lit("rank","rank");
  lit("executionNote","executionNote");
  if(rec.confiscationFraction===0){
    addNode(`conf:${rec.id}`, "confiscation: yes (share n/a)", "Literal");
    addEdge(cid, `conf:${rec.id}`, "confiscation");
  } else {
    lit("confiscationFraction","confiscationFraction");
  }

  // Person attributes
  const plit = (key,label)=>{
    const v = rec[key];
    if(v===null || v===undefined || v==="" ) return;
    const nid = `p_${key}:${rec.id}`;
    addNode(nid, `${label}: ${fmt(v)}`, "Literal");
    addEdge(pid, nid, label);
  };
  plit("gender","gender");
  if(rec.ageYears!==undefined && rec.ageYears!==null && rec.ageYears!=="") plit("ageYears","ageYears");
  plit("profession","profession");

  // Place nodes: birth and trial
  const placeNode = (prefix, placeName, latKey, lngKey, extra=null)=>{
    if(!placeName) return null;
    const id = `${prefix}:${rec.id}`;
    const parts = [placeName];
    if(extra) parts.push(extra);
    const lat = rec[latKey], lng = rec[lngKey];
    if(lat!==null && lat!==undefined && lng!==null && lng!==undefined){
      parts.push(`(${Number(lat).toFixed(3)}, ${Number(lng).toFixed(3)})`);
    }
    addNode(id, `${prefix}: ${parts.join(" · ")}`, "Place");
    return id;
  };

  const bExtra = [rec.birthProvince, rec.birthCountry].filter(Boolean).join(", ");
  const birth = placeNode("birthPlace", rec.birthPlace, "birthLat", "birthLng", bExtra || null);
  if(birth) addEdge(pid, birth, "birthPlace");

  const trial = placeNode("trialPlace", rec.trialPlace, "trialLat", "trialLng", null);
  if(trial) addEdge(cid, trial, "trialPlace");

  return {nodes, edges};
}

function renderCaseGraphById(caseId){
  const hint = document.getElementById("caseGraphHint");
  const idNorm = String(caseId||"").trim();
  if(!idNorm){ hint.textContent="Inserisci un Case ID."; return; }

  const rec = (window.CASES_DATA||[]).find(r=>String(r.id)===idNorm);
  if(!rec){ hint.textContent="Case ID non trovato nel dataset caricato."; return; }
  hint.textContent = `OK: Case ${idNorm}`;

  const graph = buildCaseInstanceGraph(rec);
  const container = document.getElementById("caseGraph");

  const nodes = new vis.DataSet(graph.nodes.map(n=>({
    id:n.id,label:n.label,group:n.group,
    shape: (n.group==="Literal") ? "box" : "ellipse"
  })));
  const edges = new vis.DataSet(graph.edges);

  const options = {
    physics:{stabilization:true},
    interaction:{hover:true,navigationButtons:true},
    nodes:{font:{color:"#f3f6ff", size:14}, borderWidth:1},
    edges:{color:{color:"rgba(255,255,255,.35)"}, smooth:true}
  };

  caseNetwork = new vis.Network(container, {nodes, edges}, options);
  setTimeout(()=>{ try{ caseNetwork.fit({animation:true}); }catch(e){} }, 250);
}


window.addEventListener("load", async ()=>{
  $$(".tab").forEach(b=>b.addEventListener("click", ()=>showTab(b.dataset.tab)));

  // Default tab: data (Ricerca)
  showTab("data");
$("#reset").addEventListener("click", ()=>{
    $("#qPerson").value=""; $("#qCrime").value=""; $("#outcome").value=""; $("#year").value="";
    facetCrime=""; facetPerson=""; applyFilters();
  });
  ["#qPerson","#qCrime","#outcome","#year"].forEach(sel=> $(sel).addEventListener("input", applyFilters));
  $("#prev").addEventListener("click", ()=>{ if(page>1){ page--; renderTable(); }});
  $("#next").addEventListener("click", ()=>{ const totalPages=Math.ceil(filtered.length/pageSize); if(page<totalPages){ page++; renderTable(); }});

  $("#modalClose").addEventListener("click", closeModal);
  $("#modalOverlay").addEventListener("click", (e)=>{ if(e.target.id==="modalOverlay") closeModal(); });
  const openGraphBtn = document.getElementById("openGraphBtn");
  if(openGraphBtn){
    openGraphBtn.addEventListener("click", ()=>{
      const id = openGraphBtn.getAttribute("data-current-id");
      if(id){
        closeModal();
        document.getElementById("caseIdInput").value = id;
        showTab("casegraph");
        renderCaseGraphById(id);
      }
    });
  }

  await loadData();
  await loadOntologyGraph();

  // Case graph controls
  const searchInput = document.getElementById('caseSearchInput');
  const searchBtn = document.getElementById('caseSearchBtn');
  if(searchBtn){
    searchBtn.addEventListener('click', ()=>renderCaseSearchResults(searchInput.value));
  }
  if(searchInput){
    searchInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); renderCaseSearchResults(searchInput.value); } });
    // initial hint
    renderCaseSearchResults('');
  }

  const idInput = document.getElementById("caseIdInput");
  document.getElementById("caseIdRender").addEventListener("click", ()=>{
    renderCaseGraphById(idInput.value);
  });
  document.getElementById("caseIdPickRandom").addEventListener("click", ()=>{
    const arr = window.CASES_DATA || [];
    if(!arr.length) return;
    const r = arr[Math.floor(Math.random()*arr.length)];
    idInput.value = r.id;
    renderCaseGraphById(r.id);
  });

});
