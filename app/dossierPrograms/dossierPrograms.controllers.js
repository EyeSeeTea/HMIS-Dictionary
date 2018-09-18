/*------------------------------------------------------------------------------------
    List of contributors: https://github.com/MSFOCBA
    Please refer to the LICENSE.md and LICENSES-DEP.md for complete licenses.
------------------------------------------------------------------------------------*/

dossierProgramsModule.controller('dossierProgramsMainController', ['$scope', '$translate', '$anchorScroll', '$sce', 'dossiersProgramsFactory', 'dossiersProgramsLinkTestFactory', 'dossiersProgramStageSectionsFactory', 'dossiersProgramIndicatorsFactory', 'dossiersProgramExpressionFactory', 'dossiersProgramRulesFactory','dossiersProgramRuleVariablesFactory','dossiersProgramIndicatorsFactory',
function($scope, $translate, $anchorScroll, $sce, dossiersProgramsFactory, dossiersProgramsLinkTestFactory, dossiersProgramStageSectionsFactory, dossiersProgramIndicatorsFactory, dossiersProgramExpressionFactory,dossiersProgramRulesFactory, dossiersProgramRuleVariablesFactory,dossiersProgramIndicatorsFactory) {
    $('#dossiersPrograms').tab('show');

    /*
     * 	@alias appModule.controller~addtoTOC
     * 	@type {Function}
     * 	@description Add an element (section or indicator group) to the Dossier Table Of Content (TOC)
     *	@todo Move to dossier controller
     */
    addtoTOC = function(toc, items, parent, type) {
        var index = toc.entries.push({
            'parent': parent,
            'children': items
        });
    };

    /*
     * 	@alias appModule.controller~scrollTo
     * 	@type {Function}
     * 	@description Scroll to an element when clicking on the Dossier Table Of Content (TOC)
     *	@todo Move to dossier controller
     *	@todo Take header into accounts
     */
    $scope.scrollTo = function(id) {
        $anchorScroll.yOffset = 66;
        $anchorScroll(id);
    };

    $scope.trustAsHtml = function(string) {
        return $sce.trustAsHtml(string);
    };

    //service = program
    //indicatorGroups = indicators
    //Datasets = dataElements
    startLoadingState(false);
    /*$scope.programs = dossiersProgramsFactory.get(function() {
        endLoadingState(false);
    }); */
    console.log($scope.programs);
    
    if(sessionStorage.getItem('programName') !== null)
    {
        $scope.programName = sessionStorage.getItem('programName');
        console.log($scope.programName);
        sessionStorage.clear();
         
        $scope.programs = dossiersProgramsLinkTestFactory.get({displayName: $scope.programName},function() {
            endLoadingState(false);
        });
    }
    else
    {
        $scope.programs = dossiersProgramsFactory.get(function() {
            endLoadingState(false);
        });
    }
    
    console.log($scope.programs);

    //Clear the TOC
    $scope.$watch('selectedProgram', function() {
        ping();
        $scope.toc = {
            entries: []
        };
    });
    
    
    //$scope.nameOfProgram = 'BU01';
    
}]);

dossierProgramsModule.controller('dossiersProgramSectionController', ['$scope', '$q', '$translate', 'dossiersProgramStageSectionsFactory', 'Ping',
function($scope, $q, $translate, dossiersProgramStageSectionsFactory, Ping) {

    $scope.$watch('selectedProgram', function() {
        ping();
        if ($scope.selectedProgram) {
            startLoadingState(false);
            //Query sections and data elements
            var stageSectionPromises = $scope.selectedProgram.programStages.map(function (stage) {
                return dossiersProgramStageSectionsFactory.get({programStageId: stage.id}).$promise;
            });

            $q.all(stageSectionPromises).then(function (stages) {
                $scope.stages = stages.map(function (stage, index) {
                    var toc = {
                        displayName: "Stage: " + stage.displayName + (stage.repeatable ? " (Repeatable)" : ""),
                        id: stage.id,
                        index: index
                    };
                    if(stage.programStageSections.length == 0) 
                        return createStageWithoutSections(stage, toc);
                    else 
                        return createStageWithSections(stage, toc);
                });
                endLoadingState(true);
            });
        }
    });

    function createStageWithoutSections (stage, toc) {
        // Line to make it compatible with view
        stage.programStageSections = [{
            displayName: "Data Elements",
            dataElements: stage.programStageDataElements.map(function(stageDataElement) {
                return stageDataElement.dataElement;
            })
        }];
        /** 
        for (i = 0; i < resultStage.programStageSections[0].dataElements.length; ++i) {
            resultStage.programStageSections[0].dataElements[i] = resultStage.programStageSections[0].dataElements[i].dataElement;
        }
        */
        addtoTOC($scope.toc, null, toc, "programs");
        return stage;
    }

    function createStageWithSections (stage, toc) {
        addtoTOC($scope.toc, stage.programStageSections, toc, "programs");
        return stage;
    }

}]);



/** 
dossierProgramsModule.controller('dossiersProgramIndicatorController', ['$scope', 'dossiersProgramExpressionFactory', 'dossiersProgramFilterFactory', 'dossiersProgramIndicatorsFactory', function($scope, dossiersProgramExpressionFactory, dossiersProgramFilterFactory, dossiersProgramIndicatorsFactory) {

    $scope.indicators4TOC = {
        displayName: "Program indicators",
        id: "IndicatorGroupsContainer",
        index: 97
        };

    //gets the "readable" expressions for each indicator expression
    recursiveAssignExpression = function(i) {
        if (i >= $scope.indicators.programIndicators.length) return;
        dossiersProgramExpressionFactory.save({}, $scope.indicators.programIndicators[i].expression,
                         function (data) {
                            $scope.indicators.programIndicators[i].expression = data.description;
                            recursiveAssignExpression(i+1);
                        });

    }

    //gets the "readable" expressions for each indicator expression and filter
    recursiveAssignFilter = function(i) {
        if (i >= $scope.indicators.programIndicators.length) return;
        if (typeof($scope.indicators.programIndicators[i].filter) === 'undefined') {
            recursiveAssignFilter(i+1);
            return;
        }
        dossiersProgramFilterFactory.save({}, $scope.indicators.programIndicators[i].filter,
                         function (data) {
                            $scope.indicators.programIndicators[i].filter = data.description;
                            recursiveAssignFilter(i+1);
                        });

    }

    $scope.$watch('selectedProgram', function() {
        ping();
        if ($scope.selectedProgram) {
            startLoadingState(false);
            //get indicators, add to TOC
            $scope.indicators = dossiersProgramIndicatorsFactory.get({
                programId: $scope.selectedProgram.id
            }, function() {
                if ($scope.indicators.programIndicators.length > 0) {
                    addtoTOC($scope.toc,null,$scope.indicators4TOC,"Indicators");
                    recursiveAssignExpression(0);
                    recursiveAssignFilter(0);
                }
                endLoadingState(true);
            });
        }
    });

}]);
*/

dossierProgramsModule.controller('dossierProgramGlobalIndicatorController', ['$scope', '$translate', 'programGlobalIndicators', 'programIndicatorExpression' , 'Ping', function($scope, $translate, programGlobalIndicators, programIndicatorExpression, Ping) {
    
    $scope.indicators4TOC = {
        displayName: "Indicators",
        id: "indicatorContainer",
        index: 98
    };

    /*
     *  @name recursiveAssignNumerator
     *  @description Gets the "readable" expressions for each indicator numerator
     *  @scope dossierProgramGlobalIndicatorController
     */
    recursiveAssignNumerator = function(i) {
        if (i >= $scope.indicators.length) return;
        programIndicatorExpression.get({
                expression: $scope.indicators[i].numerator,
            }, function (data) {
                $scope.indicators[i].numerator = data.description;
                recursiveAssignNumerator(i+1);
            },true);

    }

    /*
     *  @name recursiveAssignNumerator
     *  @description Gets the "readable" expressions for each indicator denominator
     *  @scope dossierProgramGlobalIndicatorController
     */
    recursiveAssignDenominator = function(i) {
        if (i >= $scope.indicators.length) return;
        programIndicatorExpression.get({
                expression: $scope.indicators[i].denominator,
            }, function (data) {
                $scope.indicators[i].denominator = data.description;
                recursiveAssignDenominator(i+1);
            },true);
    }

    /*
     *  @name none
     *  @description Gets the indicator information, translates it and shows it
     *  @dependencies programGlobalIndicators, programIndicatorExpression
     *  @scope dossierProgramGlobalIndicatorController
     */
    $scope.$watch('selectedProgram', function() {
        ping();
        if ($scope.selectedProgram) {
            startLoadingState(false);
            $scope.indicators = [];
            //Query indicator information
            
            $scope.allIndicators = programGlobalIndicators.get(function () {   
                endLoadingState(true);
                $scope.allIndicators.indicators.forEach(function(indicator) {
                    const regex = /D{(\w+)\.?\w+?}/g;
                    const num = indicator.numerator;
                    const den = indicator.denominator;
                    let m;
                    //console.log($scope.selectedProgram.id);
                    while ((m = regex.exec(num)) !== null) {
                        // This is necessary to avoid infinite loops with zero-width matches
                        if (m.index === regex.lastIndex) {
                            regex.lastIndex++;
                        }
                        //console.log(m[1]);
                        if (m[1] == $scope.selectedProgram.id) {
                            if ($scope.indicators.indexOf(indicator) == -1) $scope.indicators.push(indicator);
                            return;
                        }
                    }

                    while ((m = regex.exec(den)) !== null) {
                        // This is necessary to avoid infinite loops with zero-width matches
                        if (m.index === regex.lastIndex) {
                            regex.lastIndex++;
                        }
                        if (m[1] == $scope.selectedProgram.id) {
                            if ($scope.indicators.indexOf(indicator) == -1) $scope.indicators.push(indicator);
                            return;
                        }
                    }
                }, this);
                if ($scope.indicators.length > 0) {
                    addtoTOC($scope.toc, null, $scope.indicators4TOC, "Indicators");
                    recursiveAssignNumerator(0);
                    recursiveAssignDenominator(0);
                }
            });
        }
    });
}]);

dossierProgramsModule.controller('dossiersProgramAnalysisController', ['$scope', '$q', 'dossiersProgramEventReportFactory', 'dossiersProgramEventChartFactory', 
        function($scope, $q, dossiersProgramEventReportFactory, dossiersProgramEventChartFactory) {

    $scope.eventReports4TOC = {   
        displayName: "Public Event Reports",
        id: "EventReportsContainer",
        index: 99
    };

    $scope.eventCharts4TOC = {   
        displayName: "Public Event Charts",
        id: "EventChartsContainer",
        index: 100
    };

    getEventReportUrl = function(eventReportId) {
        return dhisroot + '/dhis-web-event-reports/index.html?id=' + eventReportId;
    }

    getEventChartUrl = function(eventChartId) {
        return dhisroot + '/dhis-web-event-visualizer/index.html?id=' + eventChartId;
    }

    $scope.$watch('selectedProgram', function() {
        ping();
        if ($scope.selectedProgram) {
            startLoadingState(false);
            var analysisElementPromises = [
                dossiersProgramEventReportFactory.get({programId: $scope.selectedProgram.id}).$promise,
                dossiersProgramEventChartFactory.get({programId: $scope.selectedProgram.id}).$promise
            ]

            $q.all(analysisElementPromises).then(function(data) {
                $scope.eventReports = data[0].eventReports.map(function(eventReport){
                    eventReport.url = getEventReportUrl(eventReport.id);
                    return eventReport;
                });
                $scope.eventCharts = data[1].eventCharts.map(function(eventChart){
                    eventChart.url = getEventChartUrl(eventChart.id);
                    return eventChart;
                });

                if($scope.eventReports.length > 0) { addtoTOC($scope.toc, null, $scope.eventReports4TOC, "Event Reports") }
                if($scope.eventCharts.length > 0) { addtoTOC($scope.toc, null, $scope.eventCharts4TOC, "Event Charts") }
            });
        }
    });
}]);

dossierProgramsModule.controller('dossierProgramRulesController',['$scope','$q','dossiersProgramRulesFactory','dossiersProgramRuleVariablesFactory',function($scope,$q,dossiersProgramRulesFactory,dossiersProgramRuleVariablesFactory){
        

        $scope.programRules4TOC =
        {   
        displayName: "Program Rules",
        id: "programRulesAll",
        index: 101
        }; 
        
        //creation d'une fonction récuperer les données des conditions des programRules
        getProgramRuleCondtion = function(programRuleCondition)
        {
            var i = 0;
			var tab = [];
			var rule = "";
            
            while(i < programRuleCondition.length)
			{
				if(programRuleCondition.charAt(i) == "{")
				{
					var y = i;
					
					while(programRuleCondition.charAt(y) != "}") 
					{
						y++;
					}
					
					//formation du mot
					rule = programRuleCondition.substr(i+1,y-i-1);
					
					var ok = true;
					
					//On va comparer la nouvelle valeur avec les valeur deja dans le tableau
					if(tab.length === 0) // Si le tableau n'a pas valeur, ajout automatique
					{
						 ok=true;
					}
					else
					{
						//boucle qui parcours les valeurs du tableau pour savoir si la rule n'est pas en double
						for(var j=0; j<= tab.length; j++)
						{
							if(tab[j]==rule)
							{
								 ok = false;
							}
						}
					}
					
					if(ok===true)
					{
						tab.push(rule);
					}
					
				}
				i++;
			}
            return tab; //retourne un tableau avec toutes les variables.
        };
        
        getDataElement = function(tabVariable,variableName,variableDataElement)
        {
            var tabDataElement = []; 
        
            // Prendre le cas ou il y a plusieurs variable dans le tableau Array
            for(var i=0; i < tabVariable.length; i++) // Index de la position de la variable dans programRules
            {
                var y = 0;  //Index de la position de la variable dans programRuleVariables 
                while(tabVariable[i]!=variableName[y])
                {
                    y++; 
                    if(y > variableName.length)
                    {
                        break;
                    }
                }
                tabDataElement.push(variableDataElement[y]);
            }
            return tabDataElement;
        };
        
        getOptions = function(tabVariable,variableName,variableOptions,variableOptionSetValue)
        {
            var tabOptions = [];
			var tabPosition = [];
            // Prendre le cas ou il y a plusieurs variable dans le tableau Array
            for(var i=0; i < tabVariable.length; i++) // Index de la position de la variable dans programRules
            {
                var y = 0;  //Index de la position de la variable dans programRuleVariables 
                while(tabVariable[i]!=variableName[ y])
                {
                    y++; 
                    if(y > variableName.length)
                    {
                        break;
                    }
                }
                tabOptions.push(variableOptions[y]);
                tabPosition.push(y);
            }
            
            for(var z=0; z<tabPosition.length; z++)
            {
                if(variableOptionSetValue[tabPosition[z]] === true)
                {
                    var tabOptionsRegroup = [];
                    for(i = 0; i<tabOptions.length; i++)
                    {
                        if(tabOptions[i] !== undefined)
                        {
                            for(y=0;y<tabOptions[i].length; y++)
                            {
                                tabOptionsRegroup.push(tabOptions[i][y]);
                            }
                        }
                    }
                }
            }
            return tabOptionsRegroup;
        };
        
        //var programRulesVariablesPromises = [];
        $scope.$watch('selectedProgram', function()
        {
            ping();
            if($scope.selectedProgram)
            {
                startLoadingState(false);
                var programRulesPromises = [
                    dossiersProgramRulesFactory.get({programId: $scope.selectedProgram.id}).$promise,
                    dossiersProgramRuleVariablesFactory.get({programId: $scope.selectedProgram.id}).$promise
                ];
                
                $q.all(programRulesPromises).then(function(data) // Le data est très important
                {
                    // From 1st promise : GET THE DATA TO CREATE A NEW TABLE 
                    $scope.programRulesName = data[0].programRules.map(function(programRule) //data[0]
                    {
                        return programRule.name;                    
                    });
                
                    $scope.programRulesDescription = data[0].programRules.map(function(programRule) //data[0]
                    {
                        return programRule.description;
                    });
                    
                    $scope.programRulesPriority = data[0].programRules.map(function(programRule) //data[0]
                    {
                        return programRule.priority;
                    });
                    
                    $scope.programRulesVariable = data[0].programRules.map(function(programRule) //data[0]
                    {
                        programRule.variable = getProgramRuleCondtion(programRule.condition);
                        return programRule.variable;
                    });
                    //**** End 1st promise
                    
                    // From 2nd promise : GET THE DATA 
                    $scope.programRuleVariableName = data[1].programRuleVariables.map(function(programRuleVariable)
                    {
                        return programRuleVariable.name;
                    });
                    
					$scope.programRuleVariablesDataElement = data[1].programRuleVariables.map(function(programRuleVariableMap)
					{
					  return programRuleVariableMap.dataElement;
					});
                    
                    // End 2nd promise
                    
                    //Map DataElement                    
                    $scope.programRuleVariablesValueTypes = $scope.programRuleVariablesDataElement.map(function(programRuleVariablesValueType)
                    {
                        if(programRuleVariablesValueType !== undefined)
                        {
                            return programRuleVariablesValueType.valueType;
                        }
                        else
                        {
                            return 'No value Type';
                        }
                    });
                    
                    $scope.programRuleVariablesOptionSetValues = $scope.programRuleVariablesDataElement.map(function(programRuleVariablesOptionSetValue)
                    {
						if(programRuleVariablesOptionSetValue !== undefined)
                        {
                            return programRuleVariablesOptionSetValue.optionSetValue;
                        }
                    });                    
                    
                   $scope.programRuleVariablesOptions = $scope.programRuleVariablesDataElement.map(function(programRuleVariablesOption)
                    {
                        if(programRuleVariablesOption !== undefined)
                        {
                            if(programRuleVariablesOption.optionSetValue === true)
                            {
                                return programRuleVariablesOption.optionSet.options;
                            }
                        }
                    });
                    // End Map DataElement
                    
                    $scope.programRulesAll = tabFin();
                    
                    function tabFin()
					{
					  var tab = [];
					  for(var i=0;i<$scope.programRulesName.length;i++)
					  {
						tab.push({
						  'name': $scope.programRulesName[i],
						  'description': $scope.programRulesDescription[i],
						  'priority': $scope.programRulesPriority[i],
						  'variable': $scope.programRulesVariable[i],
                          'dataElementValueType': getDataElement($scope.programRulesVariable[i],$scope.programRuleVariableName,$scope.programRuleVariablesValueTypes),
                          'options': getOptions($scope.programRulesVariable[i],$scope.programRuleVariableName,$scope.programRuleVariablesOptions,$scope.programRuleVariablesOptionSetValues)
						});
					  }
					  return tab;
					}
                    
                    if($scope.programRulesAll.length > 0)
                    {
                        addtoTOC($scope.toc, null, $scope.programRules4TOC, "Program Rules");
                    }
                    
                });
            }   
        }); 
}]);

dossierProgramsModule.controller('dossiersProgramIndicatorsController',['$scope','$q','dossiersProgramIndicatorsFactory',function($scope,$q,dossiersProgramIndicatorsFactory)
{
    $scope.programIndicators4TOC =
    {
        displayName: "Program Indicator",
        id: "programIndicators",
        index: 102
    };
    
    $scope.$watch('selectedProgram',function()
    {
        ping();
        if($scope.selectedProgram)
        {
            startLoadingState(false);
            var programIndicatorsPromise =
            [
                dossiersProgramIndicatorsFactory.get({programId: $scope.selectedProgram.id}).$promise
            ];
            
            $q.all(programIndicatorsPromise).then(function(data)
            {
                $scope.programIndicators = data[0].programIndicators.map(function(programIndicator)
                {
                    return programIndicator;
                });
                
                if($scope.programIndicators.length > 0)
                {
                    addtoTOC($scope.toc, null, $scope.programIndicators4TOC, "Program Indicators");
                }
            });
        }
    });
}]);