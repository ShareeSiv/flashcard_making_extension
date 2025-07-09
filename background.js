chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id:"create-flashcards",
        title:"Create Anki flashcards (F)",
        contexts: ["selection"]
    })
});

async function resolveTabId(clickedTab) {
  if (clickedTab && clickedTab.id >= 0) return clickedTab.id;

  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tabs.length && tabs[0].id >= 0) return tabs[0].id;

  throw new Error("No valid tab ID found.");
}

function prompt(text) {
    return `
You are an elite Anki flashcard architect.

INPUT  
A passage will arrive wrapped in triple back-ticks.

TASK  
1. **Survey & Extract**  
   - Read once for structure; identify every concept, fact, date, definition, formula, or example in order.  
   - If the text is math/physics heavy, emphasise underlying laws and derivations; otherwise emphasise concrete facts.

2. **Apply the 20 Rules of Formulating Knowledge**  
   - *Rule 4 - Minimum info*: split content so each card tests one atomic idea.  
   - *Rule 5 - Cloze deletion*: prefer cloze when context is helpful; swap Q↔A where active + passive recall both matter.  
   - *Rule 8 - Context cues*: add brief cues (e.g., “bioch:”, units, variable meanings) so the question is unambiguous.  
   - *Rules 12-15 - Graphics & enumerations*: if a point lists ≥ 3 items, create separate cards or use numbered cloze fields.  
   - *Rule 17 - (Safe) redundancy*: create mirrored or inverse cards only when they train a genuinely different recall path.  
   - *Rules 18-19 - Sources & dates*: include a short source note or year in the **answer** when the fact is volatile.  
   - *Rule 20 - Prioritise*: skip trivia that adds no long-term value.

3. **Write Q-A Pairs**  
   - Phrase questions for active recall (e.g., “What enzyme …?”, “When did …?”, “Complete: ___”).  
   - Preserve the order of appearance from the source passage.  
   - Each card must be self-contained—assume no surrounding deck context.

4. **Formatting for Export (JSON Lines)**  
   - Output one valid JSON object per flashcard **on its own line**.  
   - Keys: **"question"** and **"answer"**.  
   - Escape internal quotes properly.  
   - Wrap inline math in \( … \); block math in \[ … \].  
   - Wrap chemistry in \(\ce{…}\).  
   - No extra keys, comments, or whitespace outside the JSON objects.

5. **Output**  
   - Return a single plain-text code block containing **only** those JSON lines—no commentary.
\`\`\`${text}\`\`\``
}

async function googleFlashCard(text,apiKey,model) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const promptText = prompt(text);

        
        const body = {
            contents: [
                { role: "user", parts: [{ text: promptText }] }
            ]
        };

        const resp = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        if (!resp.ok) {
            console.error("Gemini error:", await resp.text());
            return;
        }

        const data = await resp.json();
        const output = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "(no answer)";
        console.log(output);

        return output;
}

async function openAIFlashCard(text,apiKey,model) {

    const endpoint = "https://api.openai.com/v1/chat/completions";
    const promptText = prompt(text);

    const body = {
        model: model, 
        messages: [
            {
                role: "user",
                content: promptText
            }
        ]
    };

    const resp = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}` 
        },
        body: JSON.stringify(body)
    });

  
    if (!resp.ok) {
        console.error("OpenAI API error:", await resp.text());
        return;
    }

    
    const data = await resp.json();
    const output = data.choices?.[0]?.message?.content ?? "(no answer)";
    console.log(output);

    return output;
}

async function createFlashcards(text, tab) {
    try {
    const syncStorage = await chrome.storage.sync.get(["company", "model"]);
    const localStorage = await chrome.storage.local.get("apiKey");
    const { company, model } = syncStorage;
    const { apiKey } = localStorage;
    let output;

    if (!company || !model || !apiKey) {
            console.error("Extension not configured. Please click the extension icon to select a provider, model, and enter an API key.");
            return; 
    }

    if (company === "google") {
        output = await googleFlashCard(text, apiKey, model);
    } else if (company === "openai") {
        output = await openAIFlashCard(text, apiKey, model);
    } else {
        throw new Error(`Unsupported company: ${company}`);
    }

    if (!output) {
        console.error("API call did not return any output. Check your API key and model settings.");
        return;
    }
    
    const tabId = await resolveTabId(tab);
    await chrome.scripting.executeScript({
        target: { tabId },
        files: ["content.js"]
    });

    const response = await chrome.tabs.sendMessage(tabId, { action: "ping" });

        if (response && response.status === "pong") {
            await chrome.tabs.sendMessage(tabId, { flashcards: output });
        } else {
            throw new Error("Content script did not respond correctly.");
        }

    } catch (err) {
        if (err.message.includes("Receiving end does not exist")) {
            console.error("Flashcard Maker Error: Could not connect to the webpage. This is often due to a page's security policy or if it's a special browser page. Try a different page.");
        } else {
            console.error("An unexpected error occurred in createFlashcards:", err);
        }
    }
    
}

chrome.contextMenus.onClicked.addListener(async(info,tab) => {
    if (info.menuItemId === "create-flashcards" && info.selectionText){
        createFlashcards(info.selectionText,tab);
    };
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "createFlashcardsFromSelection") {
        createFlashcards(message.text, sender.tab);
        return true; 
    }
});