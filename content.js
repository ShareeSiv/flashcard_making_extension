/* ---------- helper: split the model output into front/back ----------- */
function parseFlashcards(raw) {
  // very naïve: take the FIRST card   Q | A
  const firstLine = raw.split(/\r?\n/).find(l => l.includes("|")) || "";
  const [front = "", back = ""] = firstLine.split("|", 2);
  return { front: front.trim(), back: back.trim() };
}

/* ---------- AnkiConnect integration --------------------------------- */
async function sendToAnki(front, back) {
  const ankiConnectUrl = 'http://localhost:8765';
  
  try {
    // First, check if AnkiConnect is available
    const response = await fetch(ankiConnectUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'version',
        version: 6
      })
    });
    
    if (!response.ok) {
      throw new Error('AnkiConnect not available');
    }
    
    // Add the note to Anki
    const addNoteResponse = await fetch(ankiConnectUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'addNote',
        version: 6,
        params: {
          note: {
            deckName: 'Default',
            modelName: 'Basic',
            fields: {
              Front: front,
              Back: back
            },
            tags: ['web-generated']
          }
        }
      })
    });
    
    const result = await addNoteResponse.json();
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    return { success: true, noteId: result.result };
    
  } catch (error) {
    console.error('AnkiConnect error:', error);
    return { success: false, error: error.message };
  }
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
    background: "#2a2a2a",
    border: "1px solid #404040",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
    zIndex: 2147483647,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    color: "#ffffff",
    overflow: "hidden"
  });
  
  /* header */
  const header = document.createElement("div");
  header.textContent = "Flashcard generator";
  Object.assign(header.style, {
    padding: "16px 20px",
    background: "#1f1f1f",
    borderBottom: "1px solid #404040",
    fontSize: "14px",
    fontWeight: "500",
    textAlign: "center"
  });
  wrap.appendChild(header);
  
  /* content area */
  const content = document.createElement("div");
  Object.assign(content.style, {
    padding: "20px"
  });
  
  /* front section */
  const frontSection = document.createElement("div");
  Object.assign(frontSection.style, {
    marginBottom: "20px"
  });
  
  const frontLabel = document.createElement("div");
  frontLabel.textContent = "Front";
  Object.assign(frontLabel.style, {
    fontSize: "12px",
    color: "#888888",
    marginBottom: "8px",
    textTransform: "uppercase",
    letterSpacing: "0.5px"
  });
  
  const frontTextarea = document.createElement("textarea");
  frontTextarea.value = data.front;
  Object.assign(frontTextarea.style, {
    width: "100%",
    height: "80px",
    background: "#1a1a1a",
    border: "1px solid #404040",
    borderRadius: "4px",
    padding: "12px",
    color: "#ffffff",
    fontSize: "13px",
    fontFamily: "inherit",
    resize: "vertical",
    outline: "none",
    boxSizing: "border-box"
  });
  
  // Focus styles
  frontTextarea.addEventListener('focus', () => {
    frontTextarea.style.borderColor = "#0066cc";
  });
  frontTextarea.addEventListener('blur', () => {
    frontTextarea.style.borderColor = "#404040";
  });
  
  frontSection.appendChild(frontLabel);
  frontSection.appendChild(frontTextarea);
  
  /* back section */
  const backSection = document.createElement("div");
  Object.assign(backSection.style, {
    marginBottom: "20px"
  });
  
  const backLabel = document.createElement("div");
  backLabel.textContent = "Back";
  Object.assign(backLabel.style, {
    fontSize: "12px",
    color: "#888888",
    marginBottom: "8px",
    textTransform: "uppercase",
    letterSpacing: "0.5px"
  });
  
  const backTextarea = document.createElement("textarea");
  backTextarea.value = data.back;
  Object.assign(backTextarea.style, {
    width: "100%",
    height: "80px",
    background: "#1a1a1a",
    border: "1px solid #404040",
    borderRadius: "4px",
    padding: "12px",
    color: "#ffffff",
    fontSize: "13px",
    fontFamily: "inherit",
    resize: "vertical",
    outline: "none",
    boxSizing: "border-box"
  });
  
  // Focus styles
  backTextarea.addEventListener('focus', () => {
    backTextarea.style.borderColor = "#0066cc";
  });
  backTextarea.addEventListener('blur', () => {
    backTextarea.style.borderColor = "#404040";
  });
  
  backSection.appendChild(backLabel);
  backSection.appendChild(backTextarea);
  
  /* buttons container */
  const buttonsContainer = document.createElement("div");
  Object.assign(buttonsContainer.style, {
    display: "flex",
    gap: "12px"
  });
  
  /* regenerate button */
  const regenerateBtn = document.createElement("button");
  regenerateBtn.textContent = "Regenerate";
  Object.assign(regenerateBtn.style, {
    flex: "1",
    padding: "10px 16px",
    background: "#333333",
    border: "1px solid #555555",
    borderRadius: "4px",
    color: "#ffffff",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.2s ease"
  });
  
  regenerateBtn.addEventListener('mouseenter', () => {
    regenerateBtn.style.background = "#404040";
  });
  regenerateBtn.addEventListener('mouseleave', () => {
    regenerateBtn.style.background = "#333333";
  });
  
  regenerateBtn.onclick = () => {
    // Trigger regeneration - you might want to send a message back to background script
    console.log("Regenerate clicked");
  };
  
  /* send to anki button */
  const ankiBtn = document.createElement("button");
  ankiBtn.textContent = "Send to Anki";
  Object.assign(ankiBtn.style, {
    flex: "1",
    padding: "10px 16px",
    background: "#0066cc",
    border: "1px solid #0066cc",
    borderRadius: "4px",
    color: "#ffffff",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.2s ease"
  });
  
  ankiBtn.addEventListener('mouseenter', () => {
    ankiBtn.style.background = "#0052a3";
  });
  ankiBtn.addEventListener('mouseleave', () => {
    ankiBtn.style.background = "#0066cc";
  });
  
  ankiBtn.onclick = async () => {
    const front = frontTextarea.value.trim();
    const back = backTextarea.value.trim();
    
    if (!front || !back) {
      alert("Please fill in both front and back fields");
      return;
    }
    
    // Disable button and show loading state
    ankiBtn.disabled = true;
    ankiBtn.textContent = "Sending...";
    ankiBtn.style.opacity = "0.7";
    
    try {
      const result = await sendToAnki(front, back);
      
      if (result.success) {
        ankiBtn.textContent = "✓ Sent!";
        ankiBtn.style.background = "#00aa00";
        
        // Reset after 2 seconds
        setTimeout(() => {
          ankiBtn.disabled = false;
          ankiBtn.textContent = "Send to Anki";
          ankiBtn.style.background = "#0066cc";
          ankiBtn.style.opacity = "1";
        }, 2000);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      ankiBtn.textContent = "Error";
      ankiBtn.style.background = "#cc0000";
      alert(`Failed to send to Anki: ${error.message}\n\nMake sure Anki is running and AnkiConnect is installed.`);
      
      // Reset after 2 seconds
      setTimeout(() => {
        ankiBtn.disabled = false;
        ankiBtn.textContent = "Send to Anki";
        ankiBtn.style.background = "#0066cc";
        ankiBtn.style.opacity = "1";
      }, 2000);
    }
  };
  
  buttonsContainer.appendChild(regenerateBtn);
  buttonsContainer.appendChild(ankiBtn);
  
  /* assemble everything */
  content.appendChild(frontSection);
  content.appendChild(backSection);
  content.appendChild(buttonsContainer);
  wrap.appendChild(content);
  
  /* add close button */
  const closeBtn = document.createElement("button");
  closeBtn.innerHTML = "×";
  Object.assign(closeBtn.style, {
    position: "absolute",
    top: "8px",
    right: "8px",
    width: "24px",
    height: "24px",
    background: "transparent",
    border: "none",
    color: "#888888",
    fontSize: "18px",
    cursor: "pointer",
    borderRadius: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  });
  
  closeBtn.addEventListener('mouseenter', () => {
    closeBtn.style.background = "#404040";
    closeBtn.style.color = "#ffffff";
  });
  closeBtn.addEventListener('mouseleave', () => {
    closeBtn.style.background = "transparent";
    closeBtn.style.color = "#888888";
  });
  
  closeBtn.onclick = () => {
    wrap.remove();
  };
  
  wrap.appendChild(closeBtn);
  
  document.body.appendChild(wrap);
});
