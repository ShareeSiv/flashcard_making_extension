const MODELS = {
      google: [
        ["gemini-2.5-flash", "Gemini 2.5-Flash"],
        ["gemini-2.5-pro"  , "Gemini 2.5-Pro"  ]
      ],
      openai: [
        ["gpt-4.1", "GPT-4.1"],
        ["gpt-o3" , "GPT o3" ]
      ]
    };

const companyEl = document.getElementById("company");
const modelEl   = document.getElementById("model");
const apiEl     = document.getElementById("api");


chrome.storage.sync.get(["company", "model"], res => {
    if (res.company) {
        companyEl.value = res.company;
        addModels(res.company); 
    }
    if (res.model) {
        modelEl.value = res.model;
    }
    toggleApiField();
});

chrome.storage.local.get("apiKey", res => {
    if (res.apiKey) {
        apiEl.value = res.apiKey;
    }
});


companyEl.addEventListener("change", () => {
    const c = companyEl.value;
    chrome.storage.sync.set({ company: c, model: "" });
    addModels(c);
    modelEl.value = ""; 
    toggleApiField();   // Disable the API key field
});

modelEl.addEventListener("change", () => {
    chrome.storage.sync.set({ model: modelEl.value }); 
    toggleApiField(); // Enable the API key field
});

apiEl.addEventListener("input", () => {
    chrome.storage.local.set({ apiKey: apiEl.value });
});


function addModels(company) {
    modelEl.innerHTML = '<option value="">— Choose model —</option>';

    if (!company) {
        modelEl.disabled = true;
        return;
    }

    MODELS[company].forEach(([val, label]) => {
        modelEl.insertAdjacentHTML("beforeend", `<option value="${val}">${label}</option>`);
    });

    modelEl.disabled = false;
}

//Enables the API key field only if a model has been selected.
function toggleApiField() {
    apiEl.disabled = !modelEl.value;
}