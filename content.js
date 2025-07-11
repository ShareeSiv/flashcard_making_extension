async function fetchDeckNames() {
    try {
        const r = await fetch("http://localhost:8765", {
            method: "POST",
            body: JSON.stringify({ action: "deckNames", version: 6 })
        });
        if (!r.ok) throw new Error("AnkiConnect request failed");
        const j = await r.json();
        if (j.error) throw new Error(j.error);
        return j.result || [];
    } catch (e) {
        console.log("Flashcard Generator: Could not fetch Anki decks.", e);
        return null; 
    }
}

async function addNoteToDeck(deck, front, back) {
    const payload = {
        action: "addNote",
        version: 6,
        params: {
            note: {
                deckName: deck,
                modelName: "Basic",
                fields: { Front: front, Back: back },
                options: { allowDuplicate: false },
                tags: ["flashcard-generator"]
            }
        }
    };
    return fetch("http://localhost:8765", {
        method: "POST",
        body: JSON.stringify(payload)
    }).then(r => r.json());
}

function parseFlashcards(raw) {
    const cleanedRaw = raw.replace(/```(txt|text)?\n?/g, "").replace(/```\n?$/g, "");
    return cleanedRaw
        .split(/\r?\n/)
        .filter(l => l.trim() && l.includes('{'))
        .map(l => {
            try {
                const parsed = JSON.parse(l.trim());
                return { 
                    front: (parsed.question || "").trim(), 
                    back: (parsed.answer || "").trim() 
                };
            } catch (e) {
                return { front: "", back: "" };
            }
        })
        .filter(card => card.front && card.back);
}


// UI 
function createGeneratorUI(flashcardData) {
    const oldContainer = document.getElementById('flashcard-generator-container');
    if (oldContainer) {
        oldContainer.remove();
    }
    const oldStyle = document.getElementById('flashcard-generator-style');
    if (oldStyle) {
        oldStyle.remove();
    }

    
    const style = document.createElement('style');
    style.id = 'flashcard-generator-style';
    style.rel = 'stylesheet';
    style.href= chrome.runtime.getURL('flashcard-generator.css');
    document.head.appendChild(style);

    // Flashcard HTML
    const container = document.createElement('div');
    container.id = 'flashcard-generator-container';
    container.innerHTML = `
        <div class="fcg-header">
            <h2 class="fcg-title">AutoAnki</h2>
            <button id="fcg-close-btn" title="Close">×</button>
        </div>
        <div id="fcg-list"></div>
        <div id="fcg-deck-selector-container">
            <label for="fcg-deck-selector">DECK SELECTION</label>
            <div class="fcg-select-wrapper">
                <select id="fcg-deck-selector">
                    <option>Loading decks...</option>
                </select>
            </div>
        </div>
    `;
    document.body.appendChild(container);

    // Populate Flashcards
    const listElement = container.querySelector('#fcg-list');
    const flashcards = parseFlashcards(flashcardData);

    if (flashcards.length === 0) {
        listElement.innerHTML = `<p style="text-align: center; color: #888;">No flashcards were generated. Try highlighting a different piece of text.</p>`;
    } else {
        flashcards.forEach(card => {
            const item = document.createElement('div');
            item.className = 'fcg-item';

            // Clean up each HTML file
            const frontHTML = card.front.replace(/</g, "<").replace(/>/g, ">");
            const backHTML = card.back.replace(/</g, "<").replace(/>/g, ">");

            let isShowingBack = false;

            // flashcardsHTML
            item.innerHTML = `
                <div class="fcg-card fcg-card-front">
                    <p class="fcg-card-text">${frontHTML}</p>
                    <button class="fcg-add-btn" title="Add to Anki">+</button>
                </div>
            `;
            listElement.appendChild(item);

            const cardElement = item.querySelector('.fcg-card');
            const textElement = item.querySelector('.fcg-card-text'); 

            cardElement.addEventListener('click', (e) => {
                if (e.target.classList.contains('fcg-add-btn')) {
                    return;
                }

                if(isShowingBack){
                    textElement.innerHTML = frontHTML;
                    isShowingBack = false;
                } else {
                    textElement.innerHTML = backHTML;
                    isShowingBack = true;
                }
            });

            const addButton = item.querySelector('.fcg-add-btn');
            addButton.addEventListener('click', async () => {
                const selectedDeck = container.querySelector('#fcg-deck-selector').value;
                if (!selectedDeck || selectedDeck === "AnkiConnect Error") {
                    alert("Please select a valid Anki deck first.");
                    return;
                }
                
                addButton.textContent = '...'; 
                const result = await addNoteToDeck(selectedDeck, card.front, card.back);

                function sleep(ms) {
                    return new Promise(resolve => setTimeout(resolve, ms));
                }

                if (result && result.result) {
                    addButton.textContent = '✓';
                    addButton.classList.add('added');
                    await sleep(500);
                    item.remove();
                } else {
                    addButton.textContent = '!';
                    addButton.classList.add('error');
                    addButton.title = `Error: ${result.error || 'Unknown error'}`;
                    console.log("Anki Add Note Error:", result.error);
                }
            });
        });
    }

    // Fills Deck Selector
    const deckSelector = container.querySelector('#fcg-deck-selector');
    fetchDeckNames().then(deckNames => {
        if (deckNames) {
            deckSelector.innerHTML = ''; // Clears "Loading..."
            deckNames.forEach(name => {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = name;
                deckSelector.appendChild(option);
            });
        } else {
            deckSelector.innerHTML = '<option>AnkiConnect Error</option>';
            alert("Could not connect to Anki. Please ensure Anki is running and the AnkiConnect add-on is installed.");
        }
    });

    // Event listener for closing the entire thing
    container.querySelector('#fcg-close-btn').addEventListener('click', () => {
        container.remove();
        style.remove();
    });
}

document.addEventListener('keydown', function(event) {
    if (event.key === 'f' || event.key === 'F') {
        const selectedText = window.getSelection().toString().trim();
        if (selectedText) {
            event.preventDefault();
            chrome.runtime.sendMessage({
                action: "createFlashcardsFromSelection",
                text: selectedText
            });
        }
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'ping') {
        console.log("Received ping from background script.");
        sendResponse({ status: 'pong' });
        return true; 
    }

    if (request.flashcards) {
        console.log("Received flashcards from background script.");
        createGeneratorUI(request.flashcards);
    }
});

