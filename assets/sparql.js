let engine = null;

async function initEngine(){
  try{
    const mod = await import("https://unpkg.com/@comunica/query-sparql@3.1.0?module");
    engine = new mod.QueryEngine();
    document.getElementById("sparqlStatus").textContent = "SPARQL engine loaded (Comunica).";
  } catch (e){
    document.getElementById("sparqlStatus").textContent = "SPARQL engine could not be loaded (offline or CDN blocked).";
    console.error(e);
  }
}

function toCSV(rows){
  if(!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const esc = (s)=>('"'+String(s??"").replaceAll('"','""')+'"');
  const lines = [cols.map(esc).join(",")];
  for(const r of rows){
    lines.push(cols.map(c=>esc(r[c])).join(","));
  }
  return lines.join("\n");
}

async function runQuery(){
  const status = document.getElementById("sparqlStatus");
  const q = document.getElementById("sparqlQuery").value.trim();
  if(!engine){
    status.textContent = "SPARQL engine not available.";
    return;
  }
  status.textContent = "Running query…";

  try{
    // Prefer querying the hosted TTL file (works on GitHub Pages)
    // Fallback to embedded TTL string for local/offline usage where possible.
    const url = new URL("front_justice_cases.ttl", window.location.href).toString();
    const sources = [{ type: "file", value: url }];
    // In browser, Comunica usually accepts URL strings directly as sources, but this explicit form is safer.
    // If URL source fails, try embedded ttl string (requires Comunica string source support).
    let bindingsStream;
    try{
      bindingsStream = await engine.queryBindings(q, { sources });
    } catch (e1){
      // Fallback attempt with embedded TTL (may not work in all builds)
      if(window.CASES_TTL){
        bindingsStream = await engine.queryBindings(q, { sources: [{ type: "string", value: window.CASES_TTL, mediaType: "text/turtle" }] });
      } else {
        throw e1;
      }
    }

    const rows = [];
    const vars = bindingsStream.variables.map(v=>v.value);
    for await (const b of bindingsStream){
      const row = {};
      for(const v of vars){
        const term = b.get(v);
        row[v] = term ? term.value : "";
      }
      rows.push(row);
      if(rows.length >= 5000) break; // safety
    }

    // Render
    const out = document.getElementById("sparqlOut");
    if(!rows.length){
      out.innerHTML = "<div class='small'>No results.</div>";
    } else {
      const cols = Object.keys(rows[0]);
      const head = "<tr>" + cols.map(c=>`<th>${c}</th>`).join("") + "</tr>";
      const body = rows.slice(0,200).map(r=>"<tr>"+cols.map(c=>`<td>${(r[c]??"")}</td>`).join("")+"</tr>").join("");
      out.innerHTML = `<div class="small">Showing ${Math.min(200, rows.length)} of ${rows.length} rows.</div>
        <div class="tablewrap" style="margin-top:10px"><table><thead>${head}</thead><tbody>${body}</tbody></table></div>`;
    }

    // Attach CSV download
    const csv = toCSV(rows);
    const blob = new Blob([csv], {type:"text/csv;charset=utf-8"});
    const a = document.getElementById("sparqlDownload");
    a.href = URL.createObjectURL(blob);
    a.download = "sparql_results.csv";
    a.style.display = rows.length ? "inline-block" : "none";

    status.textContent = "Done.";
  } catch (e){
    console.error(e);
    status.textContent = "Error: " + (e?.message || String(e));
  }
}

window.addEventListener("load", async ()=>{
  await initEngine();
  document.getElementById("runSparql").addEventListener("click", runQuery);
});
