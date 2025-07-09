# AutoAnki – Flashcard Maker Extension

AutoAnki is a minimal Chrome extension that generates Anki flashcards from highlighted text on any webpage. It uses either Google’s Gemini or OpenAI’s models to turn the selected text into question–answer pairs and sends those cards to Anki via the AnkiConnect API. Instead of manually writing questions and answers, you can highlight interesting text, let a LLM suggest flashcards, and send them directly to Anki. Saves time on making flashcards so more time can be spent understanding.

## Features     
- Context-menu shortcut – Highlight text and choose “Create Anki flashcards (F)” to send the selection to the AI model.
  
- Keyboard shortcut – Press f with text selected to launch flashcard creation.
  
- In-page flashcard review – A sidebar panel displays the generated cards so you can flip them, edit if needed, and add them to your chosen Anki deck.

## Installation

1. Clone or download this repository
2. If repo cloned open chrome://extensions in Chrome and enable Developer mode and click Load unpacked and select this project folder.

## Configuration
1. Open  Anki with the AnkiConnect add-on enabled. It listens on http://localhost:8765/.
2. On Anki go to Tools>Add-ons (Ctrl+Shift+A) click on AnkiConnect and go on Config. Change "localhost:8765" to "*" on webCorsOriginList.
   
## Usage

1. Navigate to any webpage and select the text you wish to turn into flashcards.
2. Either right-click and click “Create Anki flashcards (F)” or simply press f.
3. After the AI model responds, a sidebar appears showing each generated flashcard.
4. Choose an Anki deck from the drop-down at the bottom.
5. Click the + button on each card to add it to Anki. The card briefly shows a check mark (✓) if it was added successfully.

## To add in future
- [ ] Add local PDF support.
- [ ] Ability to use locally ran models (e.g. via Ollama).
- [ ] Other provider/models.  






