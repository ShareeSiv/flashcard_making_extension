chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id:"create-flashcards",
        title:"Create Anki flashcards",
        contexts: ["selection"]
    })
});

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
\`\`\`${text}\`\`\``;
}

async function resolveTabId(clickedTab) {
  if (clickedTab && clickedTab.id >= 0) return clickedTab.id;

  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tabs.length && tabs[0].id >= 0) return tabs[0].id;

  throw new Error("No valid tab ID found.");
}

async function googleFlashCard(text,apiKey,model) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const prompt = prompt(text);
        
        const body = {
            contents: [
                { role: "user", parts: [{ text: prompt }] }
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

async function openAIFlashCard() {
    // TODO: Write this function
}

chrome.contextMenus.onClicked.addListener(async(info,tab) => {
    if (info.menuItemId === "create-flashcards" && info.selectionText){

        const text = info.selectionText;
        const syncData = await chrome.storage.sync.get(["company", "model"]);
        const localData = await chrome.storage.local.get("apiKey");
        const { company, model } = syncData;
        const { apiKey } = localData;

        if (company === "google") {
            output = await googleFlashCard(text, apiKey, model);
        } else if (company === "openAI") {
            output = await openAIFlashCard(text, apiKey, model);
        } else {
            throw new Error(`Unsupported company: ${company}`);
        }
        

        try {
            const tabId = await resolveTabId(tab);
            await chrome.scripting.executeScript({
                target: { tabId },
                files: ["content.js"]
            });
            chrome.tabs.sendMessage(tabId, { flashcards: output });

            } catch (err) {
                console.error("Failed to send message to tab:", err);
            }

    };
});