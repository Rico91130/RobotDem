// https://spreadsheets.google.com/feeds/cells/1saL1aPCRlGCaJIHo543D8xhyXqojgs2lTaMJ-oVVVKE/1/public/values?alt=json-in-script&callback=doData
// https://developers.google.com/sheets/api/quickstart/js

function loadScript(url, callback) {
    var script = document.createElement("script")
    script.type = "text/javascript";
    if (script.readyState) { // only required for IE <9
        script.onreadystatechange = function () {
            if (script.readyState === "loaded" || script.readyState === "complete") {
                script.onreadystatechange = null;
                callback();
            }
        };
    } else { //Others
        script.onload = function () {
            callback();
        };
    }

    script.src = url;
    document.getElementsByTagName("head")[0].appendChild(script);
}

function toastError(errTitle, errMsg, errDelay) {
    vNotify.error({
        "text": errMsg,
        "title" : errTitle,
        "visibleDuration" : errDelay
    });
}

function init() {
    if (window.scenario == null)
        window.scenario = "generic";
    if (window.sheetId == null)
        window.sheetId = "1saL1aPCRlGCaJIHo543D8xhyXqojgs2lTaMJ-oVVVKE";

    window.maxRows = 200;
    gapi.load('client:auth2', initAPIClient);


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
            _args = this._rawArgs
        
        /* cas 2 : JSON */
        try {
            this.args = JSON.parse(_args);
        } catch(e) {
        }
        
        /* tous les autres cas : chaine de caractère (qu'on met dans un JSON) */
        this.args = {"value" : _args};
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

                case "autocomplete" : 
                    
                    /* Traitement initial comme un textbox */
                    this.getItem().click();
                    if (!this.getItem().disabled) {
                        this.getItem().value = this.args.searchString;
                    }
                    
                    /* Déclenchement de l'autocomplete */
                    this.getItem().dispatchEvent(new Event('input', {bubbles:true}));
                    
                    /* On attent le chargement de la liste de résultat */
                    let _this = this;
                    let interval = setInterval(function () {
                        if (document.querySelectorAll(_this.args.dropdownItemSelector).length > 0) {
                            document.querySelectorAll(_this.args.dropdownItemSelector)[_this.args.dropdownItemIndex].click();
                            _this.done = true;
                            clearInterval(interval);
                        }
                    }, 100);
                    
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


function initScenario(data) {
    /* On vérifie qu'on est bien sur la page de la démarche */
    if (window.location.href.indexOf(data.result.values[0][0]) == -1) {
        toastError("Erreur lors du chargement", "Url de la démarche non reconnue", 5000);
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
            toastError("Erreur lors du chargement", "Version supportée : " + data.result.values[1][0] + "<br/>Version actuelle : non identifiable", 5000);
            return;                
        }

        if (currentVersionViaScript != "" && currentVersionViaScript != data.result.values[1][0]) {
            toastError("Erreur lors du chargement", "Version supportée : " + data.result.values[1][0] + "<br/>Version actuelle : " + currentVersionViaScript, 5000);
            return;                
        } else if (currentVersionViaXiti != "" && currentVersionViaXiti != data.result.values[1][0]) {
            toastError("Erreur lors du chargement", "Version supportée : " + data.result.values[1][0] + "<br/>Version actuelle : " + currentVersionViaXiti, 5000);
            return;                
        }

    }
    


    /* Si tout est OK, on exécute le scénario */
    gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: window.sheetId,
        range: window.scenario + '!A3:L' + (3 + window.maxRows)
    }).then(executeScenario);
}

async function executeScenario(data) {
    var stepId = document.querySelector("p.current .number").textContent

    document.querySelector("#modalLoading").style["display"] = "block";

    if (stepId != "") {

        // On vérifie que ce n'est pas la fin de la démarche, écran de captcha
        if (stepId == "" && document.querySelectorAll("iframe[title='reCAPTCHA']").length > 0)
            stepId = "END";

        // Chargement des objets étapes
        console.log("Chargement des steps de l'étape " + stepId);
        var steps = loadSteps(data).filter(x => x.step == stepId && x.actif == "TRUE")

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
    }

    document.querySelector("#modalLoading").style["display"] = "none";
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
        console.log("Liste des scénarios : https://docs.google.com/spreadsheets/d/" + window.sheetId);
        console.log("Chargement du scénario " + window.scenario + "...");
        gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: window.sheetId,
            range: window.scenario + '!A1:I2'
        }).then(initScenario);
    });
}

loadScript('https://rico91130.github.io/RobotDem/dist/vanilla-notify/vanilla-notify.js', function () {
    var head = document.getElementsByTagName('head')[0];
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = 'https://rico91130.github.io/RobotDem/dist/vanilla-notify/vanilla-notify.css';
    link.media = 'all';
    head.appendChild(link);

    loadScript('https://apis.google.com/js/api.js', init);
});

