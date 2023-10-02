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

    /* Cas des search (TODO : A améliorer) */
    if (domObj.type == "search" || (domObj.type == "text" && domObj.classList.contains("autocomplete"))) {
        type = "autocomplete";
        argument = '{"searchString":"' + domObj.value.replace("'", "\\\'") + '", "dropdownItemIndex" : 0}';
    }

    /* Cas des upload */
    if (domObj.type == "file") {
        if (domObj.classList.contains('resumable-browse')) {
            type = "asyncUploadTMA";
        }
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
        "delaiExpiration",
        "urlReprise",
        "demarche-release",
        "robotDemGeneric",
        "robotDemForceCustom",
        "robotDemXLSData"
    ];

    var i = 0;
    var etape = getEnvironmentVariables().etape;

    clipboard.push(["#", "etape", "actif", "exclusif", "type", "selecteur", "index", "delay", "arguments", "Rappel de la question / display"].join("\t"));

    [...document.querySelectorAll("textarea, select, input[id]:not([type='hidden'])")].filter(e => !excludesId.includes(e.id)).forEach(input => {
        if (input.id != null && input.offsetHeight > 0) // On enregistre pas les champs sans id ou masqué (offsetHeight == 0)
            clipboard.push(robotDemGetField(++i, etape, input))
    });

    return clipboard;
}


function _ContextualizedGetEnvironmentVariables() {
    var stepId = document.querySelector("p.current .number");
    if (stepId != null) {
        stepId = stepId.textContent;
    };

    return {
        "etape": stepId,
        "connected": document.querySelector("a[title=\"Accès à l'espace personnel\"]") != null,
        "titreDemarche": document.querySelector("h1[class=\"title-section\"]").textContent,
        "sections": [...document.querySelectorAll("h2")].filter(h2 => h2.offsetHeight > 0).map(h2 => h2.innerText),
        "URLFragment": (document.location.href.indexOf("#") == -1) ? "" : document.location.href.split("#")[1],
        "codeDemarche": window.location.href.split("/").slice(4, 5)[0]
    }
}

function _ContextualizedExecute() {

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
            case "autocomplete":

                /* Traitement initial comme un textbox */
                this.getItem().click();
                if (!this.getItem().disabled) {

                    /* Dans le cas où c'est un objet JSON en argument */
                    if (this.args.searchString != null)
                        this.getItem().value = this.args.searchString;
                    /* Autrement si c'est une chaine de caractère */
                    else if (this.args.value != null)
                        this.getItem().value = this.args.value;
                }

                /* Déclenchement de l'autocomplete */
                this.getItem().dispatchEvent(new Event('input', { bubbles: true }));

                /* On attend le chargement de la liste de résultat */
                let _this = this;
                var autocompleteContainer = null;
                var catchAutocompleteContainerULFunction = (e) => {
                    /* Cas UL/LI */
                    if (e.relatedNode.nodeName == "UL" && e.srcElement.nodeName == "LI") {
                        autocompleteContainer = e.relatedNode;
                        /* Cas DIV/DIV */
                    } else if (e.relatedNode.nodeName == "DIV" && e.srcElement.nodeName == "DIV" && e.srcElement.classList.contains("a11y-suggestion")) {
                        autocompleteContainer = e.relatedNode;
                    }
                }
                document.body.addEventListener("DOMNodeInserted", catchAutocompleteContainerULFunction);

                let interval = setInterval(function () {
                    if (autocompleteContainer != null && autocompleteContainer.style["display"] != "none" && autocompleteContainer.children.length >= _this.args.dropdownItemIndex) {
                        autocompleteContainer.children[_this.args.dropdownItemIndex].click();
                        document.body.removeEventListener("DOMNodeInserted", catchAutocompleteContainerULFunction);
                        _this.done = true;
                        clearInterval(interval);
                    }
                }, 200);

                break;

            case "asyncUploadTMA":
                console.log("00");
                if (this.args.value != null) {
                    console.log("01");
                    var fileUrl = this.args.value;
                    var fileName = null;
                    var regExpFileName = /[^/\\&\?]+\.\w{3,4}(?=([\?&].*$|$))/g;
                    var regExpFileNameExec = regExpFileName.exec(fileUrl);
                    if (Array.isArray(regExpFileNameExec)) {
                        console.log("02");
                        fileName = regExpFileNameExec[0];
                        var fileExtension = fileName.split(".").slice(-1); 
                        const request = new XMLHttpRequest();
                        request.open("GET", fileUrl, false);
                        request.send(null);
                        if (request.status === 200) {
                            console.log("03");
                            const dataBuffer = request.response;
                            if (dataBuffer) {
                                console.log("04");
                               // console.log(arrayBuffer);
                                //const byteArray = new Uint8Array(arrayBuffer);
                                //console.log(byteArray);
                                var myFile = new File([dataBuffer], fileName, {
                                    type: MIMETYPES[fileExtension]
                                });
                                var dataTransfer = new DataTransfer();
                                dataTransfer.items.add(myFile);
                                this.getItem().files = dataTransfer.files;
                                this.getItem().dispatchEvent(new Event('change', { view: window, bubbles: true }));
                            }
                        }
                    }
                    this.done = true;
                } else {
                    if (this.getItem().closest(".pslUploadZoneSaisie").style["display"] != "none") {

                        let _this = this;

                        $(window).focus();
                        $(window).on("focus", function () {
                            _this.windowFocus = true;
                        });
                        this.getItem().click();

                        let interval = setInterval(function () {
                            if (_this.windowFocus || _this.getItem().closest(".pslUploadZoneSaisie").style["display"] == "none") {
                                _this.done = true;
                                clearInterval(interval);
                            }
                        }, 100);

                    } else {
                        this.done = true;
                    }
                }
                break;


            case "asyncUploadV2":

                if (this.getItem().attr("class") == undefined || this.getItem().attr("class").indexOf("thHide") == -1) {

                    let _this = this;

                    $(window).focus();
                    $(window).on("focus", function () {
                        console.log("focus");
                        _this.windowFocus = true;
                    });
                    this.getItem().find('button.btn-upload').click();

                    let interval = setInterval(function () {
                        if (_this.windowFocus || (_this.getItem().attr("class") != undefined && _this.getItem().attr("class").indexOf("thHide") != -1)) {
                            _this.done = true;
                            clearInterval(interval);
                        }
                    }, 100);

                } else {
                    this.done = true;
                }
                break;

        }
    }
}

const MIMETYPES = {
    "pdf" : "text/pdf"
};
