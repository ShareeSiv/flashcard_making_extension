/* ---------- helper: split the model output into front/back ----------- */
function parseFlashcards(raw) {
  // very naïve: take the FIRST card   Q | A
  const firstLine = raw.split(/\r?\n/).find(l => l.includes("|")) || "";
  const [front = "", back = ""] = firstLine.split("|", 2);
  return { front: front.trim(), back: back.trim() };
}

/* ---------- listen for the data ------------------------------------- */
chrome.runtime.onMessage.addListener(msg => {
  if (!msg.flashcards) return;

  const data = parseFlashcards(msg.flashcards);

  /* remove old popup (if user invoked twice) */
  document.getElementById("anki-flash-ui")?.remove();

  /* popup container --------------------------------------------------- */
  const wrap = Object.assign(document.createElement("div"), {
    id: "anki-flash-ui"
  });
  Object.assign(wrap.style, {
    position: "fixed",
    top: "100px",
    right: "20px",
    width: "320px",
    padding: "12px",
    background: "#fafafa",
    border: "1px solid #ccc",
    boxShadow: "0 0 6px rgba(0,0,0,.2)",
    zIndex: 2147483647,
    fontFamily: "sans-serif"
  });

  /* textarea – front */
  const q = document.createElement("textarea");
  q.value = data.front;
  q.style.width  = "100%";
  q.style.height = "60px";
  wrap.append("Front:", q);

  /* textarea – back */
  const a = document.createElement("textarea");
  a.value = data.back;
  a.style.width  = "100%";
  a.style.height = "60px";
  wrap.append("\nBack:", a);

  /* download button */
  const btn = Object.assign(document.createElement("button"), {
    textContent: "Download .txt",
    style: "margin-top:8px"
  });
  btn.onclick = () => {
    const blob = new Blob([msg.flashcards], { type: "text/plain" });
    const url  = URL.createObjectURL(blob);
    const aTag = document.createElement("a");
    aTag.href = url;
    aTag.download = "flashcards.txt";
    aTag.click();
    URL.revokeObjectURL(url);
  };
  wrap.append(btn);

  document.body.appendChild(wrap);
});
