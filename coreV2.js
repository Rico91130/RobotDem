function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

// https://spreadsheets.google.com/feeds/cells/1saL1aPCRlGCaJIHo543D8xhyXqojgs2lTaMJ-oVVVKE/1/public/values?alt=json-in-script&callback=doData
// https://developers.google.com/sheets/api/quickstart/js
// https://kamranahmed.info/toast
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

async function EICPE_TableauRubriquesAdd(rubrique) {

    /* On attends que le bouton "ajouter" soit disponible */
    var _t = Date.now();
    var _addButtonDisplayed = false;
    await new Promise(resolve => {
        var interval = setInterval(function () {
            if (Date.now() - _t > 2000) {
                resolve();
                clearInterval(interval);
            }
            if ($("#btn-ajouterRubrique").css("display") == "block") {
                _addButtonDisplayed = true;
                resolve();
                clearInterval(interval);
            }
        }, 100);
    });

    /* Si le bouton pour ajouter une rubrique n'est pas présent au bout d'un certain temps, on sort */
    if (!_addButtonDisplayed)
        return;

    $("#btn-ajouterRubrique").click();

    /* Temporisation */
    await new Promise(resolve => {
        setTimeout(function () {
            resolve();
        }, 1000)
    });

        
    $(".eicpe-table tr.ligneActivite.actif input.inputRubrique").val(rubrique.id).change();

    /* On attends que la popin s'affiche */
    _t = Date.now();
    var _alineaPopinDisplayed = false;
    await new Promise(resolve => {
        var interval = setInterval(function () {
            if (Date.now() - _t > 5000) {
                resolve();
                clearInterval(interval);
            }
            if ($("#modalAlineasEICPE").css("display") == "block") {
                _alineaPopinDisplayed = true;
                resolve();
                clearInterval(interval);
            }
        }, 100);
    });

    /* Si la popin de selection de l'alinéa ne s'est pas affiché au bout d'un certain temps, on sort */
    if (!_alineaPopinDisplayed)
        return;

        console.log("ok");

    /* Temporisation le temps que la pop-in s'affiche */
    await new Promise(resolve => {
        setTimeout(function () {
            resolve();
        }, 200)
    });

    /* On recherche l'alinéa */
    var expression = new RegExp('^' + escapeRegExp(rubrique.alinea + ". "));
    var alineas = $("#modalAlineasEICPE table").find("td").filter(function () {
        return expression.test($.trim($(this).text()));
    });

    /* Si il n'y a pas au moins un alinéa qui matche, on sort */
    if (alineas.length != 1)
        return;

    /*
     * on itere sur les alinéas pour trouver : 
     * - Celui avec le bon régime
     * - Et avec un bouton "selectionné"
     */
    var alinea = alineas.filter(function () {
        return ($($(this).siblings("td")[0]).text() == rubrique.regime && $($(this).siblings("td")[1]).find("button").length == 1)
    });
    if (alinea.length != 1)
        return;

    /* On click sur le bouton de selection */
    $($(alinea).siblings("td")[1]).find("button")[0].click();

    /* On attends que les composants soient tous chargés et affiché (qt total, qt projet, commentaire et bouton de validation de la ligne) */
    _t = Date.now();
    var _editLineLoaded = false;
    await new Promise(resolve => {
        var interval = setInterval(function () {
            if (Date.now() - _t > 5000) {
                resolve();
                clearInterval(interval);
            }
            if ($(".eicpe-table tr.ligneActivite.actif input.inputQuantiteTotale").css("display") != "none" &&
                $(".eicpe-table tr.ligneActivite.actif input.inputQuantite").css("display") != "none" &&
                $(".eicpe-table tr.ligneActivite.actif button.btnValidLine").css("display") != "none" &&
                $(".eicpe-table tr.ligneActivite.actif textarea.inputCommentairePrecisions").css("display") != "none") {
                _editLineLoaded = true;
                resolve();
                clearInterval(interval);
            }
        }, 100);
    });

    /* Si la ligne d'édition de la rubrique n'a pas été ajouté au bout d'un certain temps, on sort */
    if (!_editLineLoaded)
        return;

    $(".eicpe-table tr.ligneActivite.actif input.inputQuantiteTotale").val(rubrique.qtT).change();
    $(".eicpe-table tr.ligneActivite.actif input.inputQuantite").val(rubrique.qtP).change();
    $(".eicpe-table tr.ligneActivite.actif textarea.inputCommentairePrecisions").val(rubrique.commentaire).change();
    $(".eicpe-table tr.ligneActivite.actif button.btnValidLine").click();

}

function toastError(errTitle, errMsg, errDelay) {
    $.toast({
        heading: errTitle,
        text: "<span style='font-size:14px'>" + errMsg + "</span>",
        showHideTransition: 'fade',
        icon: 'error',
        hideAfter: (errDelay == undefined) ? false : errDelay,
        allowToastClose: true,
        position: 'top-right',
    })
}

function init() {
    if (window.scenario == null)
        window.scenario = "generic";
    if (window.sheetId == null)
        window.sheetId = "1saL1aPCRlGCaJIHo543D8xhyXqojgs2lTaMJ-oVVVKE";

    window.maxRows = 200;
    gapi.load('client:auth2', initAPIClient);


    if ($("#modalLoading").length == 0) {
        $('<div id="modalLoading" style="display:none;text-align: center;">' +
            '<img style="text-align:center;margin:auto;display:flex"  alt="" src="data:image/gif;base64,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AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" width="31" height="31"/>' +
            '<span id="modalLoadingMsgGlobal">Patientez, saisie de l\'étape ...<br/> <span style="font-style: italic;" id="modalLoadingMsgCustom"></span><br/><a style="display:none;color:#A07E9C;font-weight:bold" id="modalLoadingMsgNext" href="#" onclick="javascript:bypassStep()">Ca prend du temps...passer au champs suivant</a></span>' +
            '</div>').appendTo('body');
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
        "arguments": 8,
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
    }

    getItem() {
        return $($(this.selector)[this.index]);
    }

    async execute() {
        console.log(this);
        /* On vérifie si il existe bien un item html */
        if (this.getItem().length == 0) {
            toastError("Erreur step #" + this.id, "L'objet DOM (" + this.selector + ")[" + this.index + "] n'a pas été trouvé");
        } else {

            $("#modalLoadingMsgCustom").text("id : " + this.id + " - " + this.display);
            switch (this.type) {
                case "checkbox":
                    if (this.getItem().prop("checked") != (this.arguments == "TRUE")) {
                        this.getItem().click();
                    }
                    this.done = true;
                    break;
                case "textbox":
                    this.getItem().click();
                    if (!this.getItem().prop("disabled")) {
                        if (/^javascript:.*$/g.test(this.arguments)) {
                            var dynamicText = eval('(' + this.arguments.substr(11) + ')');
                            this.getItem().val(dynamicText);
                        } else {
                            this.getItem().val(this.arguments);
                        }
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
                case "asyncUploadV2":
                    /* On affiche le file dialog, que si aucun fichier n'est chargé */
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
                case "EICPE_TableauRubriques":

                    /* On a besoin de caché la modale du spinner ? */
                    $("#modalLoading").css("display", "none");
                    $.modal.close();

                    var rubriques = JSON.parse(this.arguments);
                    for (var i = 0; i < rubriques.length; i++) {
                        await new Promise(resolve => {
                            EICPE_TableauRubriquesAdd(rubriques[i]);
                            resolve();
                        });
                        /* Temporisation le temps que la pop-in s'affiche */
                        await new Promise(resolve => {
                            setTimeout(function () {
                                resolve();
                            }, 1000)
                        });
                    }

                    /* Raffichage de la modale du spinner */
                    $("#modalLoading").css("display", "block");
                    $("#modalLoading").modal({
                        escapeClose: false,
                        clickClose: false,
                        showClose: false
                    });

                    this.done = true;

                    break;
                case "EICPE_TableauEE":
                    /* Récupération des objets DOM */
                    this.tabDOM = this.getItem();
                    var rowsToAdd = (!isNaN(this.arguments) && !isNaN(parseFloat(this.arguments))) ? parseInt(this.arguments) : 1;
                    var _this = this;
                    for (var i = 1; i <= rowsToAdd; i++) {

                        /* Simuler le click sur le bouton "Ajouter une catégorie */
                        await new Promise(resolve => {
                            setTimeout(function () {
                                _this.tabDOM.find("button:last").click();
                                resolve();
                            }, 100)
                        });

                        /* Ajout du régime */
                        await new Promise(resolve => {
                            setTimeout(function () {
                                var RegimesEEDOM = _this.tabDOM.find('tr[class="ligneActive"] .selectRegimeEE');
                                var RegimesEEoptionsDOM = RegimesEEDOM.find("option");
                                var i = Math.floor(Math.random() * (RegimesEEoptionsDOM.length - 1)) + 1;
                                RegimesEEDOM.find(":nth-child(" + (1 + i) + ")").prop('selected', true);
                                RegimesEEDOM.prop('selectedIndex', i);
                                RegimesEEDOM.change();
                                afficherNumeroCategorieEE($(RegimesEEDOM));
                                resolve();
                            }, 100)
                        });


                        /* Ajout de la catégorie */
                        await new Promise(resolve => {
                            setTimeout(function () {
                                var CategoriesEEDOM = _this.tabDOM.find('tr[class="ligneActive"] .selectCategorieEE');
                                var CategoriesEEoptionsDOM = CategoriesEEDOM.find("option");
                                var i = Math.floor(Math.random() * (CategoriesEEoptionsDOM.length - 1)) + 1;
                                CategoriesEEDOM.find(":nth-child(" + (1 + i) + ")").prop('selected', true);
                                CategoriesEEDOM.prop('selectedIndex', i);
                                CategoriesEEDOM.change();
                                afficherMasquerBtnValidationLigneEE();
                                resolve();
                            }, 100)
                        });

                        /* Validation de la ligne */
                        await new Promise(resolve => {
                            setTimeout(function () {
                                _this.tabDOM.find('tr[class="ligneActive"] .btnValidationLigneEE').click();
                                resolve();
                            }, 100)
                        });
                    }
                    this.done = true;
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

    /* On vérifie que les numéros de versions concordent */
    if ((psl.xiti != null && psl.xiti.demarche != null && psl.xiti.demarche.version != null && psl.xiti.demarche.version != data.result.values[1][0]) || data.result.values[1][0] == "*") {
        toastError("Erreur lors du chargement", "Version supportée : " + data.result.values[1][0] + "<br/>Version actuelle : " + psl.xiti.demarche.version, 5000);
        return;
    }

    /* Si tout est OK, on exécute le scénario */
    gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: window.sheetId,
        range: window.scenario + '!A3:J' + (3 + window.maxRows)
    }).then(executeScenario);
}

async function executeScenario(data) {
    var stepId = $("p.current .number").text();

    $("#modalLoading").css("display", "block");
    $("#modalLoading").modal({
        escapeClose: false,
        clickClose: false,
        showClose: false
    });

    if (stepId == "" && window.location.search.indexOf("PSL_TK") != -1) {
        var JSONIndentedString = $("PRE")[0].innerHTML;
        var JSONTD = JSON.parse(JSONIndentedString);
        saveAsTextFile(window.location.hostname.split(".")[0] + "_" + JSONTD.numeroTeledemarche + ".txt", JSONIndentedString);
    } else {

        // On vérifie que ce n'est pas la fin de la démarche, écran de captcha
        if (stepId == "" && $("iframe[title='reCAPTCHA']").length > 0)
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

            $("#modalLoadingMsgNext").css("display", "none");
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
                        $("#modalLoadingMsgNext").css("display", "block");
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

    $("#modalLoading").css("display", "none");
    $.modal.close();
}

function loadSteps(data) {
    var steps = [];
    for (var i = 1; i < data.result.values.length; i++) {
        steps.push(new Step(data.result.values[i]));
    }
    return steps;
}

function saveAsTextFile(filename, text) {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
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

loadScript('https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js', function () {
    loadScript('https://cdnjs.cloudflare.com/ajax/libs/jquery-toast-plugin/1.3.2/jquery.toast.min.js', function () {
        var head = document.getElementsByTagName('head')[0];
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/jquery-toast-plugin/1.3.2/jquery.toast.min.css';
        link.media = 'all';
        head.appendChild(link);

        loadScript('https://cdnjs.cloudflare.com/ajax/libs/jquery-modal/0.9.1/jquery.modal.min.js', function () {
            var head = document.getElementsByTagName('head')[0];
            var link = document.createElement('link');
            link.rel = 'stylesheet';
            link.type = 'text/css';
            link.href = 'https://cdnjs.cloudflare.com/ajax/libs/jquery-modal/0.9.1/jquery.modal.min.css';
            link.media = 'all';
            head.appendChild(link);

            loadScript('https://apis.google.com/js/api.js', init);

        });
    });
});
