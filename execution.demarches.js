function _execute() {
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
