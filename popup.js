document.addEventListener('DOMContentLoaded', () => {
    const MODELS = {
      google: [
        ["gemini-2.5-flash", "Gemini 2.5 Flash"],
        ["gemini-2.5-pro", "Gemini 2.5 Pro"]
      ],
      openai: [
        ["gpt-4-turbo", "GPT-4 Turbo"],
        ["gpt-3.5-turbo", "GPT-3.5 Turbo"]
      ]
    };

    const companyEl = document.getElementById("company");
    const modelEl   = document.getElementById("model");
    const apiEl     = document.getElementById("api");

    // Load saved settings from storage
    chrome.storage.sync.get(["company", "model"], res => {
        // FIX: The logic is reordered for robustness.
        if (res.company) {
            companyEl.value = res.company;
            // First, populate the models for the saved company.
            addModels(res.company); 
            // THEN, set the saved model.
            if (res.model) {
                modelEl.value = res.model;
            }
        }
        // Finally, set the API key field's state.
        toggleApiField();
    });

    chrome.storage.local.get("apiKey", res => {
        if (res.apiKey) {
            apiEl.value = res.apiKey;
        }
    });

    // Event Listeners
    companyEl.addEventListener("change", () => {
        const c = companyEl.value;
        chrome.storage.sync.set({ company: c, model: "" });
        addModels(c);
        modelEl.value = ""; 
        toggleApiField();
    });

    modelEl.addEventListener("change", () => {
        chrome.storage.sync.set({ model: modelEl.value }); 
        toggleApiField();
    });

    apiEl.addEventListener("input", () => {
        chrome.storage.local.set({ apiKey: apiEl.value });
    });

    function addModels(company) {
        modelEl.innerHTML = '<option value="">— Choose model —</option>';

        if (!company || !MODELS[company]) {
            modelEl.disabled = true;
            return;
        }

        MODELS[company].forEach(([val, label]) => {
            modelEl.insertAdjacentHTML("beforeend", `<option value="${val}">${label}</option>`);
        });

        modelEl.disabled = false;
    }

    function toggleApiField() {
        apiEl.disabled = !modelEl.value;
    }
});