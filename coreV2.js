// https://spreadsheets.google.com/feeds/cells/1saL1aPCRlGCaJIHo543D8xhyXqojgs2lTaMJ-oVVVKE/1/public/values?alt=json-in-script&callback=doData
// https://developers.google.com/sheets/api/quickstart/js

function toast(type, errTitle, errMsg, errDelay) {
    vNotify[type]({
        "text": errMsg,
        "title": errTitle,
        "visibleDuration": errDelay
    });
}

function toastError(...args) {
    toast.apply(null, ["error"].concat(args));
}


/* Fonction de chargement principale */
async function initializeRessources() {

    if (document.querySelectorAll("link[href*='vanilla']").length == 0) {
        var head = document.getElementsByTagName('head')[0];
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = 'https://rico91130.github.io/RobotDem/dist/vanilla-notify/vanilla-notify.css';
        link.media = 'all';
        head.appendChild(link);
    }

    /* récupération de la liste des spreadsheet */
    if (window.discover == null) {
        var response = await fetch('https://rico91130.github.io/RobotDem/discover.json?' + (new Date()).getTime());
        window.discover = await response.json();
    }

    /* Initialisation de l'IHM */
    if (document.querySelector("#modalLoading") == null) {
        container = document.createElement("div");
        container.style = "z-index:200;display:none; text-align: center;background-color:rgba(0,0,0,0.1);top:0;left:0;position:fixed;width:100%;height:100%";
        container.id = "modalLoading";
        container.innerHTML = `
            <div style="position:relative;margin: 0 auto;top:30%;width:700px;background-color:white;box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.5); border-radius: 5px;">
                <img style="text-align:center;margin:auto;display:flex"  alt="" src="https://rico91130.github.io/RobotDem/ressources/spinner.gif" width="31" height="31"/>
                <span id="modalLoadingMsgGlobal">Patientez, saisie de l\'étape ...<br/>
                    <span style="font-style: italic;" id="modalLoadingMsgCustom"></span>
                    <br/>
                    <a style="display:none;color:#A07E9C;font-weight:bold" id="modalLoadingMsgNext" href="#" onclick="javascript:bypassStep()">Ca prend du temps...passer au champs suivant</a>
                </span>
            </div>`;
        document.body.appendChild(container);
    }
    if (document.querySelector("#modalSetup") == null) {
        container = document.createElement("div");
        container.style = "z-index:200;display:none;background-color:rgba(0,0,0,0.1);top:0;left:0;position:fixed;width:100%;height:100%";
        container.id = "modalSetup";
        container.innerHTML = `
            <div style="position:relative;padding:10px;margin: 0 auto;top:30%;width:1000px;background-color:white;box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.5); border-radius: 5px;">
                <fieldset>
                    <h4 style="display:inline">Choix du scénario</h4>&nbsp;<a href="#" onclick="robotDemSaveConfig()">[Sauvegarder]</a><br/>
                    <div style="padding:4px;background-color: #ffdbdb;border: 1px solid #908c8c;border-radius: 5px; display:none" id="robotDemWarningMsg"></div>
                    <input name="robotDemLoadingType" type="radio" id="robotDemGeneric"value="robotDemGeneric" />
                        <label for="robotDemGeneric">Utiliser le référentiel général ou un google spreadsheet personnalisé</label>
                    <br/>
                    <input name="robotDemLoadingType" type="radio" id="robotDemForceCustom"value="robotDemForceCustom" />
                        <label for="robotDemForceCustom">Forcer l'utilisation d'un scénario excel (copier/coller) :</label>
                        <textarea id="robotDemXLSData" style="white-space: nowrap;overflow:scroll;width:90%; margin:auto;display:block;height:200px;font-family:courier, courier new, serif;"></textarea>
                </fieldset>
                <br/>
                <fieldset>
                    <h4 style="display:inline">Outils</h4><br/>
                    <a href="#" onclick="robotDemGetFields()">[Extraire les champs du formulaire]</a><br/>
                </fieldset>
            </div>`;
        document.body.appendChild(container);

        [...document.querySelectorAll("input[type='radio'][name='robotDemLoadingType']")].forEach(radio => {
            radio.addEventListener('change', () => {
                document.querySelector("#robotDemXLSData").disabled = (document.querySelector("#robotDemGeneric").checked);
            })
        });
    }

    /* Chargement des API google si besoin ... */
    if (!window.gapiLoaded) {
        window.gapiLoaded = true;
        window.maxRows = 200;
        gapi.load('client:auth2', initAPIClient);
    } else {
        /* ... Autrement on peut y aller ! */
        loadScenario();
    }
}

function robotDemGetFields() {

    var excludesId = [
        "delaiExpiration",
        "urlReprise",
        "demarche-release",
        "robotDemGeneric",
        "robotDemForceCustom",
        "robotDemXLSData"
    ];

    var i = 0;
    var etape = getContext().etape;
    
    var clipboard = [];
    clipboard.push(["#", "etape", "actif", "exclusif", "type", "selecteur", "index", "delay", "arguments", "Rappel de la question / display"].join("\t"));
    
    [...document.querySelectorAll("textarea, select, input[id]:not([type='hidden'])")].filter(e => !excludesId.includes(e.id)).forEach(input => {
        clipboard.push(robotDemGetField(++i, etape, input))
    });

    navigator.clipboard.writeText(clipboard.join("\r\n"));
    toast("success", "Extraire les champs de formulaire", "Les données ont été mises dans le presse papier");
}

function robotDemGetField(i, etape, domObj) {

    var actif = "TRUE";
    var exclusif = "";
    var argument = "";
    var type = domObj.type;

    /* Cas des boutons radio */
    if (domObj.type == "radio") {
        exclusif  = domObj.name;
        actif = domObj.checked ? "TRUE" : "FALSE";
    }

    /* Cas des champs textes */
    if (domObj.type == "text" || domObj.type == "textarea") {
        argument = domObj.value;
        type = "textbox";
    }

    /* Cas des checkbox */
    if (domObj.type == "checkbox") {
        argument = domObj.checked ? "TRUE" : "FALSE";
    }

    return [
        ++i,
        etape,
        actif,
        exclusif,
        domObj.type,
        "#"  + domObj.id,
        "0",
        "0",
        argument,
        [...domObj.parentElement.querySelectorAll("span")].map(
            x => x.innerText.trim()).join("")
    ].join("\t");
}

var _bypassStep = false;
function bypassStep() {
    _bypassStep = true;
}

class Step {
    static columnsMapping = {
        "id": 0,
        "step": 1,
        "actif": 2,
        "exclusif": 3,
        "type": 4,
        "selector": 5,
        "index": 6,
        "delay": 7,
        "_rawArgs": 8,
        "display": 9
    };

    constructor(dataArr) {
        this.done = false;

        for (var i in Step.columnsMapping) {
            if (Step.columnsMapping[i] < dataArr.length) {
                Object.defineProperty(this, i, {
                    value: dataArr[Step.columnsMapping[i]]
                });
            }
        }

        /*
         * traitement spécifique pour les arguments
         */
        var _args = null;

        /* cas 1 : code javascript */
        if (/^javascript:.*$/g.test(this._rawArgs))
            _args = eval('(' + this._rawArgs.substr(11) + ')');
        else
            _args = this._rawArgs;

        /* cas 2 : JSON */
        if (/^{.+}$/g.test(_args)) {
            try {
                this.args = JSON.parse(_args);
            } catch (e) {
                this.args = { "value": _args };
            }
        }
        /* tous les autres cas : chaine de caractère (qu'on met dans un JSON) */
        else {
            this.args = { "value": _args };
        }
    }

    getItem() {
        var index = (this.index) ? this.index : 0;
        return document.querySelectorAll(this.selector)[index];
    }

    async execute() {
        console.log(this);
        /* On vérifie si il existe bien un item html */
        if (this.getItem() == null) {
            toastError("Erreur step #" + this.id, "L'objet DOM (" + this.selector + ")[" + this.index + "] n'a pas été trouvé");
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
                        this.getItem().value = this.args.searchString;
                    }

                    /* Déclenchement de l'autocomplete */
                    this.getItem().dispatchEvent(new Event('input', { bubbles: true }));

                    /* On attent le chargement de la liste de résultat */
                    let _this = this;
                    let interval = setInterval(function () {
                        if (document.querySelectorAll(_this.args.dropdownItemSelector).length > 0) {
                            document.querySelectorAll(_this.args.dropdownItemSelector)[_this.args.dropdownItemIndex].click();
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
}

async function executeScenario(data) {

    var context = getContext();

    if (context.etape == null) {
        toastError("Erreur lors du chargement", "Etape de la démarche non reconnue", 5000);
        return;
    };

    document.querySelector("#modalLoading").style["display"] = "block";

    // Chargement des objets étapes
    console.log("Chargement des steps de l'étape " + context.etape);
    var steps = loadSteps(data).filter(x => x.step == context.etape && x.actif == "TRUE")

    // Récupération des groupes d'exclusivité 
    var groupesExclusive = steps.filter(x => x.exclusif.length > 0).map(x => x.exclusif).filter((value, index, self) => self.indexOf(value) === index)
    // Pour chaque groupe, on vérifie qu'il n'existe qu'une seule règle d'active
    var groupeExclusiveError = false;
    groupesExclusive.forEach(g => {
        if (steps.filter(s => s.exclusif == g).length > 1) {
            groupeExclusiveError = true;

            toastError("Erreur d'exclusivité", "Plus d'une règle est active concernant le groupe d'exclusivité '" + g + "'");
        }
    });

    if (groupeExclusiveError)
        return;

    for (var i = 0; i < steps.length; i++) {

        document.querySelector("#modalLoadingMsgNext").style["display"] = "none";
        _bypassStep = false;

        await new Promise(resolve => {
            console.log("Execution du pas " + (i + 1) + " sur " + steps.length);
            steps[i].execute();
            resolve();
        });

        /* On attends le statut d'acquittement du step (le délai d'acquittement cours après exécution uniquement : ne tiens pas compte du temps d'exécution) */

        var timeoutStart = Date.now();
        var timeoutBypassProposed = false;
        await new Promise(resolve => {
            var interval = setInterval(function () {
                if (Date.now() - timeoutStart > 5000 && !timeoutBypassProposed) {
                    timeoutBypassProposed = true;
                    document.querySelector("#modalLoadingMsgNext").style["display"] = "block";
                }
                if (steps[i].done || _bypassStep) {
                    _bypassStep = false;
                    resolve();
                    clearInterval(interval);
                }
            }, 100);
        });

        /* Délai d'attente potentiel */
        if (steps[i].delay > 0 && i < steps.length - 1) {
            await new Promise(resolve => {
                console.log("Attente de " + steps[i].delay + "ms avant exécution du pas suivant (pas n°" + (i + 2) + ")...");
                setTimeout(function () {
                    resolve();
                }, steps[i].delay);
            });
        }
    }

    document.querySelector("#modalLoading").style["display"] = "none";
    toast("success", "Fin d'exécution", "L'exécution est terminée");
}

function hideSetupPopIn() {
    document.querySelector("#modalSetup").style["display"] = "none";
}

function showSetupPopIn(customMessage) {
    window.RobotDemDisplaySetup = false;

    /* Mise à jour de l'état des composants */
    if (sessionStorage.getItem("RobotDem.executeFromXLS") == "1") {
        document.querySelector("#robotDemForceCustom").checked = true;
        document.querySelector("#robotDemXLSData").disabled = false;
    } else {
        document.querySelector("#robotDemGeneric").checked = true;
        document.querySelector("#robotDemXLSData").disabled = true;
    }

    if (customMessage != null) {
        document.querySelector("#robotDemWarningMsg").innerHTML = customMessage;
        document.querySelector("#robotDemWarningMsg").style["display"] = "block";
    } else {
        document.querySelector("#robotDemWarningMsg").style["display"] = "none";
    }

    document.querySelector("#modalSetup").style["display"] = "block";
    document.querySelector("#robotDemXLSData").value = sessionStorage.getItem("RobotDem.scenarioDataRaw");
}

function loadScenario() {

    /* Si window.RobotDemDisplaySetup == true, on affiche la configuration */
    if (window.RobotDemDisplaySetup) {
        showSetupPopIn();

    /* Si on constate qu'on est en scénario personnalisé mais que les urls ne matchent pas */
    } else if ( sessionStorage.getItem("RobotDem.executeFromXLS") == "1" &&
                sessionStorage.getItem("RobotDem.scenarioOrigin") != document.location.href.split("?")[0]){
        var customMessage = null;

        showSetupPopIn(`Attention,
                   le scénario personnalisé que vous allez exécuter à été défini pour l'url <b>${sessionStorage.getItem("RobotDem.scenarioOrigin")}</b><br/>
                   Vous allez l'utiliser pour l'url <b>${document.location.href.split("?")[0]}</b>.<br/>
                   Merci de confirmer en sauvegardant à nouveau le scénario personnalisé.`);

    /* Exécution d'un scénario */
    } else {
        if (sessionStorage.getItem("RobotDem.executeFromXLS") == "1" &&
            sessionStorage.getItem("RobotDem.scenarioData") != null) {
            loadScenarioFromSessionData();
        } else {

            /*
             * Dans le cas où on ne charge pas un scénario custom et qu'il n'existe pas encore de
             * scenario / sheetid à utilisé, on va parcourir la liste des scénarios génériques
             */
            if (sessionStorage.getItem("RobotDem.executeFromXLS") != "1") {

                if (window.scenario == null || window.sheetId == null) {
                    var context = getContext();
                    var demarche = window.discover.demarches.filter(_demarche => _demarche.hasOwnProperty(context.codeDemarche)).map(x => x[context.codeDemarche]);

                    if (demarche.length == 0) {
                        toastError("Erreur lors du chargement (discover)", "Démarche non référencée", 5000);
                        return;
                    }

                    demarche = demarche[0];

                    if (!Array.isArray(demarche)) {
                        demarche = [demarche];
                    }

                    var rules = demarche;
                    var selectedRule = null;
                    var i = 0;
                    while (selectedRule == null && i < rules.length) {
                        rule = rules[i++];
                        if (rule.conditions == null) {
                            selectedRule = rule;
                        }
                        else {
                            var conditionsOK = false;
                            try {
                                var conditionsOK = eval('(' + rule.conditions + ')');
                            } catch (e) {
                                console.log(e);
                            }
                            if (conditionsOK)
                                selectedRule = rule;
                        }
                    }

                    if (selectedRule) {
                        window.sheetId = selectedRule.sheet;
                        window.scenario = selectedRule.tab;
                    } else {
                        toastError("Erreur lors du chargement (discover)", "Aucun des scénarios disponibles pour cette démarche n'est utilisable", 5000);
                        return;
                    }
                }

                gapi.client.sheets.spreadsheets.values.get({
                    spreadsheetId: window.sheetId,
                    range: window.scenario + '!A1:I2'
                }).then(loadScenarioFromGAPI);

            }
        }
    }
}

function robotDemSaveConfig() {

    hideSetupPopIn();
    sessionStorage.setItem("RobotDem.executeFromXLS", document.querySelector("input[type='radio'][name='robotDemLoadingType']:checked").value == "robotDemForceCustom" ? "1" : "0");

    if (sessionStorage.getItem("RobotDem.executeFromXLS") == "1") {
        var rawData = document.querySelector("#robotDemXLSData").value;
        var data = {
            "result": {
                "values": rawData.split("\n").map(x => x.trim().split("\t"))
            }
        };
        sessionStorage.setItem("RobotDem.scenarioDataRaw", rawData);
        sessionStorage.setItem("RobotDem.scenarioData", JSON.stringify(data));
        sessionStorage.setItem("RobotDem.scenarioOrigin", document.location.href.split("?")[0]);

        window.scenario = null;
        window.sheetId = null;       
    }
}

/* Transforme un tableau XLS en tableau au format GAPI */
function loadScenarioFromSessionData() {
    data = JSON.parse(sessionStorage.getItem("RobotDem.scenarioData"));
    executeScenario(data);
}

function loadScenarioFromGAPI(data) {
    /* On vérifie qu'on est bien sur la page de la démarche */
    if (window.location.href.indexOf(data.result.values[0][0]) == -1) {
        toastError("Erreur lors du chargement (gapi)", "L'url du scénario ne correspond pas à la démarche en cours", 5000);
        return;
    }

    /* On vérifie que les numéros de versions concordent :
     * - On vérifie l'utilisation du wildcard
     * - via la version des scripts
     * - autrement via le tag xiti
     */
    if (data.result.values[1][0] != "*") {

        var currentVersionViaScript = [...document.querySelectorAll("script")].find(e => e.src.includes('psl.fonctions.js?version=')).src.split("=")[1];
        var currentVersionViaXiti = (psl.xiti != null && psl.xiti.demarche != null && psl.xiti.demarche.version != null) ? psl.xiti.demarche.version : "";

        if (currentVersionViaScript == "" && currentVersionViaXiti == "") {
            toastError("Erreur lors du chargement (gapi)", "Version supportée : " + data.result.values[1][0] + "<br/>Version actuelle : non identifiable", 5000);
            return;
        }

        if (currentVersionViaScript != "" && currentVersionViaScript != data.result.values[1][0]) {
            toastError("Erreur lors du chargement (gapi)", "Version supportée : " + data.result.values[1][0] + "<br/>Version actuelle : " + currentVersionViaScript, 5000);
            return;
        } else if (currentVersionViaXiti != "" && currentVersionViaXiti != data.result.values[1][0]) {
            toastError("Erreur lors du chargement (gapi)", "Version supportée : " + data.result.values[1][0] + "<br/>Version actuelle : " + currentVersionViaXiti, 5000);
            return;
        }

    }

    /* Si tout est OK, on exécute le scénario */
    gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: window.sheetId,
        range: window.scenario + '!A3:L' + (3 + window.maxRows)
    }).then(executeScenario);
}

function loadSteps(data) {
    var steps = [];
    for (var i = 1; i < data.result.values.length; i++) {
        steps.push(new Step(data.result.values[i]));
    }
    return steps;
}

function initAPIClient() {
    gapi.client.init({
        apiKey: "AIzaSyD2vZV0NT3CC76Za06ZPiVFvd6QQZtk2x4",
        clientId: "951128686118-gii98rbc5s6kmsrgbkq6l0jjjf26a7kd.apps.googleusercontent.com",
        discoveryDocs: ["https://sheets.googleapis.com/$discovery/rest?version=v4"],
        scope: "https://www.googleapis.com/auth/spreadsheets.readonly"
    }).then(function () {
        loadScenario();
    });
}

function loadScripts() {
    var urls = Array.prototype.slice.call(arguments);
    var loaded = 0;

    return new Promise(function (resolve, reject) {
        function onScriptLoad() {
            loaded++;

            if (loaded === urls.length) {
                resolve();
            }
        }

        for (var i = 0; i < urls.length; i++) {
            var script = document.createElement('script');
            script.src = urls[i] + "?" + (new Date()).getTime();
            script.async = true;
            script.onload = onScriptLoad;
            script.onerror = reject;
            document.head.appendChild(script);
        }
    });
}


function getContext() {

    var stepId = document.querySelector("p.current .number");
    if (stepId != null) {
        stepId = stepId.textContent;
    };

    return {
        "etape": stepId,
        "connected": document.querySelector("a[title=\"Accès à l'espace personnel\"]") != null,
        "titreDemarche": document.querySelector("h1[class=\"title-section\"]").textContent,
        "codeDemarche": window.location.href.split("/").slice(4, 5)[0]
    }
}

/* On ne charge qu'une fois les scripts */
if (!window.robotDemScriptsLoaded) {
    loadScripts('https://rico91130.github.io/RobotDem/dist/vanilla-notify/vanilla-notify.js',
        'https://apis.google.com/js/api.js').then(initializeRessources);
    window.robotDemScriptsLoaded = true;
} else {
    loadScenario();
}
