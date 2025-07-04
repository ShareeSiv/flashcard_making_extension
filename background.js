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
    return `You are a world-class Anki flashcard creator that helps students create flashcards that help them remember facts, concepts, and ideas from text. You will be given a text in the triple backticks.
1. Identify key high-level concepts and ideas presented, including relevant equations. If the text is math or physics-heavy, focus on concepts. If the text isn't heavy on concepts, focus on facts.
2. Then use your own knowledge of the concept, ideas, or facts to flesh out any additional details (eg, relevant facts, dates, and equations) to ensure the flashcards are self-contained.
3. Make question-answer cards based on the text.
4. Keep the questions and answers roughly in the same order as they appear in the text itself.

Output Format,
- Do not have the first row being "Question" and "Answer".
- The file will be imported into Anki. You should include each flashcard on a new line and use the pipe separator | to separate the question and answer. You should return a .txt file for me to download.
- When writing math, wrap any math with the \( ... \) tags [eg, \( a^2+b^2=c^2 \) ] . By default this is inline math. For block math, use \[ ... \]. Decide when formatting each card.
- When writing chemistry equations, use the format \( \ce{C6H12O6 + 6O2 -&gt; 6H2O + 6CO2} \) where the \ce is required for MathJax chemistry.
- Put everything in a code block.
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

        // 2. If we get the "pong", we know the content script is ready.
        if (response && response.status === "pong") {
            // 3. Now, send the actual flashcard data. This will succeed.
            await chrome.tabs.sendMessage(tabId, { flashcards: output });
        } else {
            // This case is unlikely but good to have.
            throw new Error("Content script did not respond correctly.");
        }

    } catch (err) {
        // This will catch errors from the handshake or any other part of the process.
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