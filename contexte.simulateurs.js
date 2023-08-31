function _ContextualizedGetField(i, etape, domObj) {
    
    var actif = "TRUE";
    var exclusif = "";
    var argument = "";
    var type = domObj.type;

    /* Cas des radio */
    if (domObj.type == "radio") {
        exclusif = domObj.name;
        actif = domObj.checked ? "TRUE" : "FALSE";
    }

    /* Cas des champs textes */
    if ((domObj.type == "text" && !domObj.classList.contains("autocomplete")) || domObj.type == "textarea") {

        argument = domObj.value;

        /* Si présence de retour à la ligne, tab ou guillemet, on rajoute des double quotes */
        if (domObj.value.indexOf("\n") != -1 || domObj.value.indexOf("\t") != -1 || domObj.value.indexOf('"') != -1)
            argument = '"' + argument.replaceAll('"', '""') + '"';

        type = "textbox";
    }

    if (domObj.type == "number") {
        argument = domObj.value;
        type = "number";
    }
    
    /* Cas des checkbox */
    if (domObj.type == "checkbox") {
        argument = domObj.checked ? "TRUE" : "FALSE";
    }

    /* Cas des select-one */
    if (domObj.type == "select-one") {
        console.log(domObj.id);
        argument = domObj.querySelectorAll("option")[domObj.selectedIndex].text;
        type = "select";
    }

    /* combobox */
    if (domObj.tagName == "DIV" && domObj.getAttribute("role") == "combobox" && domObj.classList.contains("input-group")) {
        type = "combobox";
        argument = domObj.querySelector("span.listbox-edit").innerText;
    }

    return [
        i,
        etape,
        actif,
        exclusif,
        type,
        "#" + domObj.id,
        "0",
        "100",
        argument,
        [...domObj.parentElement.querySelectorAll("span")].map(
            x => x.innerText.trim()).join("")
    ].join("\t");
}

function _ContextualizedGetFields() {
    var clipboard = [];
    
    var excludesId = [
        "header-search-input",
        "robotDemGeneric",
        "robotDemForceCustom",
        "robotDemXLSData"

    ];

    var i = 0;
    var etape = getEnvironmentVariables().etape;

    clipboard.push(["#", "etape", "actif", "exclusif", "type", "selecteur", "index", "delay", "arguments", "Rappel de la question / display"].join("\t"));

    [...document.querySelectorAll("textarea, select, input[id]:not([type='hidden']), div[class='input-group'][role='combobox']")].filter(e => !excludesId.includes(e.id)).forEach(input => {
        if (input.id != null && input.offsetHeight > 0) // On enregistre pas les champs sans id ou masqué (offsetHeight == 0)
            clipboard.push(robotDemGetField(++i, etape, input))
    });

    return clipboard;
}
    

function _ContextualizedGetEnvironmentVariables() {
    var stepId = document.querySelector(".step-description.legend");
    if (stepId != null) {
        var _stepId = /ÉTAPE ([0-9]+)/ig.exec(stepId.textContent);
        if (Array.isArray(_stepId) && _stepId.length > 1)
            stepId = /ÉTAPE ([0-9]+)/ig.exec(stepId.textContent)[1];
        else
            stepId = "*";
    } else {
        stepId = "*";
    }

    return {
        "etape": stepId,
        "connected": document.querySelector("a[title=\"Accès à l'espace personnel\"]") != null,
        "titreDemarche": document.querySelector(".article h1").textContent,
        "sections": [...document.querySelectorAll("fieldset.fieldset-container>legend")].filter(i => i.offsetHeight > 0).map(i => i.textContent.trim()),
        "URLFragment": (document.location.href.indexOf("#") == -1) ? "" : document.location.href.split("#")[1],
        "codeDemarche": window.location.href.split("/").slice(5, 6)[0].split("#")[0]
    }
}

function _ContextualizedExecute() {
    console.log(this);
    /* On vérifie si il existe bien un item html */
    if (this.getItem() == null) {
        toastError("Erreur step #" + this.id, "L'objet DOM (" + this.selector + ")[" + this.index + "] n'a pas été trouvé, passage au step suivant.");
        this.done = true;
    } else {

        document.querySelector("#modalLoadingMsgCustom").innerHTML = "id : " + this.id + " - " + this.display;

        switch (this.type) {
            case "checkbox":
                if (this.getItem().checked != (this.args.value == "TRUE")) {
                    this.getItem().click();
                }
                this.done = true;
                break;
            case "number":
                this.getItem().click();
                if (!this.getItem().disabled) {
                    this.getItem().value = this.args.value;
                }
                this.done = true;
                break;
            case "textbox":
                this.getItem().click();
                if (!this.getItem().disabled) {
                    this.getItem().value = this.args.value;
                }
                this.done = true;
                break;
            case "radio":
                this.getItem().click();
                this.done = true;
                break;
            case "button":
                this.getItem().click();
                this.done = true;
                break;
            case "select":
                /* Récupération de la value par le text */
                var options = [...this.getItem().querySelectorAll("option")].filter(option => option.text == this.args.value).map(option => option.value);
                if (options.length == 1) {
                    this.getItem().value = options[0];
                    this.getItem().dispatchEvent(new Event('change', { bubbles: true }));
                }
                this.done = true;
                break;
            case "combobox" : 
                this.getItem().querySelector("a").dispatchEvent(new MouseEvent('mousedown', { view : window, bubbles: true }));
                [...this.getItem().parentElement.querySelectorAll("ul li")].filter(li => li.innerText == this.args.value)[0].dispatchEvent(new MouseEvent('click', { view : window, bubbles: true }));
                this.done = true;
                break;
        }
    }
}
