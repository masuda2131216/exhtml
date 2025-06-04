/* =============================================================
   Mail‑Builder  ── Pure‑JavaScript版
   -------------------------------------------------------------
   React / Next.js を排した 1 枚の script.js に全ロジックを集約。
   index.html / builder.html など <script src="script.js"> で読み込み。
   =============================================================*/

(() => {
  /* -----------------------------------------------------------
     1. 定数・ユーティリティ
  ----------------------------------------------------------- */
  const $ = (sel, scope = document) => scope.querySelector(sel);
  const $$ = (sel, scope = document) => Array.from(scope.querySelectorAll(sel));
  const make = (html) => {
    const t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstChild;
  };
  const uid = () => `id-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  /* toast ---------------------------------------------------- */
  const toast = (msg, variant = "ok", ms = 3000) => {
    const el = make(`<div class="toast ${variant}">${msg}</div>`);
    Object.assign(el.style, {
      position: "fixed",
      top: "1rem",
      right: "1rem",
      zIndex: 10000,
      background: variant === "err" ? "#f87171" : "#4ade80",
      color: "#fff",
      padding: "8px 14px",
      borderRadius: "6px",
      fontSize: "13px",
      boxShadow: "0 2px 6px rgba(0,0,0,.2)",
      opacity: 0,
      transition: "opacity .2s"
    });
    document.body.append(el);
    requestAnimationFrame(()=>{el.style.opacity = 1;});
    setTimeout(()=>{
      el.style.opacity = 0; setTimeout(()=>el.remove(),200);
    },ms);
  };

  /* -----------------------------------------------------------
     2. グローバル状態
  ----------------------------------------------------------- */
  const state = {
    slots: [],                // 画面に置かれたスロット
    selectedId: null,         // 現在選択中の slot.id
    draggedId: null,          // 並べ替え用
    favorites: JSON.parse(localStorage.getItem("mb_favs")||"[]")
  };

  /* -----------------------------------------------------------
     3. スロットテンプレート
  ----------------------------------------------------------- */
  const slotTpl = {
    text: () => ({
      id: uid(),
      type: "text",
      content: "<p>テキストを入力</p>",
      bg: "#ffffff",
      color: "#000000",
      padX: 16,
      padY: 12,
      align: "left"
    }),
    image: () => ({
      id: uid(),
      type: "image",
      src: "",
      link: "",
      width: 600,
      height: 400,
      bg: "#ffffff",
      padX: 0,
      padY: 8,
      align: "center"
    }),
    cta: () => ({
      id: uid(),
      type: "cta",
      text: "詳しくはこちら",
      url: "#",
      bg: "#4b5ff6",
      color: "#ffffff",
      padY: 16,
      align: "center"
    })
  };
  const slotTypes = Object.keys(slotTpl);

  /* -----------------------------------------------------------
     4. DOM 参照
  ----------------------------------------------------------- */
  const area = $("#builderArea");
  const palette = $("#slotList");
  const setting = $("#slotSetting");

  /* -----------------------------------------------------------
     5. Palette / DnD
  ----------------------------------------------------------- */
  slotTypes.forEach(t=>{
    const btn = make(`<div class="slot-item" draggable="true">${t}</div>`);
    btn.dataset.type = t;
    btn.addEventListener("dragstart", e=>{
      e.dataTransfer.setData("type", t);
    });
    palette.append(btn);
  });

  area.addEventListener("dragover", e=>{
    e.preventDefault(); e.dataTransfer.dropEffect = "copy";
  });
  area.addEventListener("drop", e=>{
    e.preventDefault();
    const t = e.dataTransfer.getData("type");
    if(!t || !slotTpl[t]) return;
    const s = slotTpl[t]();
    state.slots.push(s);
    render();
  });

  /* -----------------------------------------------------------
     6. render() : slots 配列から DOM を生成
  ----------------------------------------------------------- */
  function render(){
    area.innerHTML = "";
    if(state.slots.length===0){
      area.append(make(`<div class="placeholder">ここにドラッグ＆ドロップ</div>`));
      updateSetting();
      return;
    }
    state.slots.forEach(slot=>{
      const wrap = make(`<div class="slot-wrap" draggable="true"></div>`);
      wrap.dataset.sid = slot.id;
      wrap.style.border = slot.id===state.selectedId?"2px solid #3b82f6":"1px dashed #cbd5e1";
      wrap.style.padding = `${slot.padY}px ${slot.padX}px`;
      wrap.style.background = slot.bg;
      wrap.style.textAlign = slot.align;
      wrap.style.cursor = "pointer";

      // inner
      let inner;
      if(slot.type==="text"){
        inner = make(`<div class="slot-text">${slot.content}</div>`);
        inner.style.color = slot.color;
      } else if(slot.type==="image"){
        inner = make(`<img src="${slot.src||"https://placehold.co/600x400?text=img"}" style="max-width:100%;height:auto">`);
      } else if(slot.type==="cta"){
        inner = make(`<a href="${slot.url}" class="slot-btn">${slot.text}</a>`);
        Object.assign(inner.style,{display:"inline-block",background:slot.bg,color:slot.color,padding:"10px 20px",borderRadius:"4px",textDecoration:"none"});
      }
      wrap.append(inner);

      // controls (duplicate / delete)
      const ctrl = make(`<div class="slot-ctrl"></div>`);
      ctrl.innerHTML = `<span class="dup">✚</span><span class="del">×</span>`;
      ctrl.querySelector('.dup').style.marginRight = '6px';
      ctrl.style.position="absolute";
      ctrl.style.top="-10px";
      ctrl.style.right="0";
      ctrl.style.fontSize="11px";
      ctrl.style.display="none";
      wrap.append(ctrl);
      wrap.style.position="relative";
      wrap.addEventListener("mouseenter",()=>ctrl.style.display="block");
      wrap.addEventListener("mouseleave",()=>ctrl.style.display="none");

      ctrl.querySelector('.dup').addEventListener("click",e=>{ // duplicate
        e.stopPropagation();
        const copy = JSON.parse(JSON.stringify(slot));
        copy.id = uid();
        state.slots.splice(state.slots.indexOf(slot)+1,0,copy);
        render();
      });
      ctrl.querySelector('.del').addEventListener("click",e=>{ // delete
        e.stopPropagation();
        state.slots = state.slots.filter(s=>s.id!==slot.id);
        if(state.selectedId===slot.id) state.selectedId=null;
        render();
      });

      // select / edit
      wrap.addEventListener("click",()=>{
        state.selectedId = slot.id===state.selectedId?null:slot.id;
        render();
        updateSetting();
      });

      // reorder drag
      wrap.addEventListener("dragstart", e=>{
        state.draggedId = slot.id;
        e.dataTransfer.setData("reorder","1");
      });
      wrap.addEventListener("dragover", e=>{
        if(!state.draggedId) return; e.preventDefault();
      });
      wrap.addEventListener("drop", e=>{
        e.preventDefault();
        if(!state.draggedId) return;
        const from = state.slots.findIndex(s=>s.id===state.draggedId);
        const to = state.slots.findIndex(s=>s.id===slot.id);
        const [mv] = state.slots.splice(from,1);
        state.slots.splice(to,0,mv);
        state.draggedId = null;
        render();
      });

      area.append(wrap);
    });
  }

  /* -----------------------------------------------------------
     7. Setting パネル
  ----------------------------------------------------------- */
  function updateSetting(){
    setting.innerHTML = "";
    const slot = state.slots.find(s=>s.id===state.selectedId);
    if(!slot){ setting.style.display="none"; return; }
    setting.style.display="block";

    // ヘッダー
    setting.append(make(`<h3 class="st-h">設定 (${slot.type})</h3>`));

    // align
    const alignSel = make(`<div class="st-row"><label>配置<select></select></label></div>`);
    ["left","center","right"].forEach(v=>{
      const opt = make(`<option value="${v}">${v}</option>`);
      if(slot.align===v) opt.selected = true;
      alignSel.querySelector("select").append(opt);
    });
    alignSel.querySelector("select").addEventListener("change",e=>{slot.align = e.target.value;render();});
    setting.append(alignSel);

    // color/bg
    if(slot.type!=="image"){
      const clr = make(`<div class="st-row"><label>文字色 <input type="color" value="${slot.color}"></label></div>`);
      clr.querySelector("input").addEventListener("input",e=>{slot.color=e.target.value;render();});
      setting.append(clr);
    }
    const bgc = make(`<div class="st-row"><label>背景色 <input type="color" value="${slot.bg}"></label></div>`);
    bgc.querySelector("input").addEventListener("input",e=>{slot.bg=e.target.value;render();});
    setting.append(bgc);

    // padding
    const pad = make(`<div class="st-row"><label>Padding Y <input type="range" min="0" max="60" value="${slot.padY}"> <span>${slot.padY}</span>px</label></div>`);
    const rng = pad.querySelector("input");
    const sp = pad.querySelector("span");
    rng.addEventListener("input", e=>{slot.padY=parseInt(e.target.value); sp.textContent=slot.padY; render();});
    setting.append(pad);

    // text specific edit
    if(slot.type==="text"){
      const ta = make(`<textarea class="st-ta" rows="6">${slot.content.replace(/<br\s\/>/g,"\n")}</textarea>`);
      ta.addEventListener("input",()=>{slot.content = ta.value.replace(/\n/g,"<br />"); render();});
      setting.append(ta);
    }

    // image specific
    if(slot.type==="image"){
      const up = make(`<button class="st-btn">画像アップロード</button>`);
      up.addEventListener("click",()=>{
        const inp = document.createElement("input");
        inp.type="file"; inp.accept="image/*";
        inp.onchange = e=>{
          const file = e.target.files[0];
          if(!file) return;
          const url = URL.createObjectURL(file);
          slot.src = url; render(); toast("画像を追加しました");
        };
        inp.click();
      });
      setting.append(up);
    }

    // cta specific
    if(slot.type==="cta"){
      const te = make(`<div class="st-row"><label>テキスト <input type="text" value="${slot.text}"></label></div>`);
      te.querySelector("input").addEventListener("input",e=>{slot.text=e.target.value;render();});
      setting.append(te);
      const url = make(`<div class="st-row"><label>URL <input type="text" value="${slot.url}"></label></div>`);
      url.querySelector("input").addEventListener("input",e=>{slot.url=e.target.value;});
      setting.append(url);
    }
  }

  /* -----------------------------------------------------------
     8. 各種ボタン
  ----------------------------------------------------------- */
  $("#exportBtn").addEventListener("click",()=>{
    const html = state.slots.map(s=>{
      if(s.type==="text") return `<div style="padding:${s.padY}px ${s.padX}px;text-align:${s.align};color:${s.color};background:${s.bg}">${s.content}</div>`;
      if(s.type==="image") return `<div style="padding:${s.padY}px ${s.padX}px;text-align:${s.align};background:${s.bg}"><img src="${s.src}" style="max-width:100%"></div>`;
      if(s.type==="cta") return `<div style="padding:${s.padY}px;text-align:${s.align};background:${s.bg}"><a href="${s.url}" style="display:inline-block;background:${s.bg};color:${s.color};padding:10px 18px;border-radius:4px;text-decoration:none">${s.text}</a></div>`;
    }).join("");
    const blob = new Blob([`<!doctype html><html><body>${html}</body></html>`],{type:"text/html"});
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "email_template.html";
    link.click();
    URL.revokeObjectURL(link.href);
  });

  $("#previewBtn").addEventListener("click",()=>{
    const w = window.open("","_blank","width=800,height=600");
    const html = state.slots.map(s=>{
      if(s.type==="text") return `<div style="padding:${s.padY}px ${s.padX}px;text-align:${s.align};color:${s.color};background:${s.bg}">${s.content}</div>`;
      if(s.type==="image") return `<div style="padding:${s.padY}px ${s.padX}px;text-align:${s.align};background:${s.bg}"><img src="${s.src}" style="max-width:100%"></div>`;
      if(s.type==="cta") return `<div style="padding:${s.padY}px;text-align:${s.align};background:${s.bg}"><a href="${s.url}" style="display:inline-block;background:${s.bg};color:${s.color};padding:10px 18px;border-radius:4px;text-decoration:none">${s.text}</a></div>`;
    }).join("");
    w.document.write(`<!doctype html><html><body style="margin:0">${html}</body></html>`);
  });

  /* -----------------------------------------------------------
     9. 起動
  ----------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded",()=>{
    render();
  });
})();
