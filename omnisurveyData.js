
// When this gets called, Danny passes the jQuery object as an argument.
// The $ in the parameter here is just a parameter like any other -- nothing special.
// It becomes jQuery when used anywhere in this space.
var Omnisurvey_Data = function ($) {
    var self = this;
    // These are the objects from data outputted by Access (RivDB_BuildSurvey)
    // I don't know/remember why LeagueHierarchy is an array and the other two are objects - might be an error, although there's prob a reason
    let LeagueHierarchy = [], tbljsLeagues = {}, tbljsSurveys = {};

    // Putting this.<whatever> allows us to expose the <whatever> to code elsewhere, like in LeagueSelection.js
    this.Surveys = {};
    this.Leagues = {};

    this.dataLoaded = false;

    // I added this just to define the paths up front and switch between local an GitHub
    const pathJSON = {
        "LeagueHierarchy": 'https://auxiliarydev.github.io/know-rivalry-omnisurvey/data/leagueHierarchy.json',
        "Leagues": 'https://auxiliarydev.github.io/know-rivalry-omnisurvey/data/leagues.json', // tbljsLeagues
        "Surveys": 'https://auxiliarydev.github.io/know-rivalry-omnisurvey/data/surveys.json', // tbljsSurveys
        // "LeagueHierarchy": 'data/leagueHierarchy.json',
        // "Leagues": 'data/leagues.json',
        // "Surveys": 'data/surveys.json'
    };

    // This is called from the end of init()
    // It creates a map from the JSON input
    function mapLeagues() {
        return Object.keys(tbljsLeagues).map(function (key) {
            return tbljsLeagues[key];
        });
    }
    function mapSurveys() {
        return Object.keys(tbljsSurveys).map(function (key) {
            return tbljsSurveys[key];
        });
    }

    // Returns an object with the data for just one league
    // e.g., (as of 20201028) if passed leagueId=7, it returns {"lgID":7,"lgSport":"Cricket","lgName":"BBL","lgCurrentSurvID":19,"lgSlug":"s_m_t20_bbl","lgFullName":"Big Bash League","lgTheFullName":"the Big Bash League","lgHasProRel":false,"lgBritishSpelling":true,"lgNumOfFaventSublevels":0}
    this.getLeague = function (leagueId) {
        const leagues = self.Leagues.filter(function (league) {
            return league.lgID === leagueId;
        });

        // If the filter returns more than one league, just return the first one (MLB)
        if (leagues.length > 0) {
            return leagues[0];
        }

        return null;
    };

    // This uses the surveyId to pull all the leagues that are using that version of the survey
    this.getLeaguesBySurvey = function (surveyId) {
        const leagues = self.Leagues.filter(function (league) {
            return league.lgCurrentSurvID === surveyId;
        });

        if (leagues.length > 0) {
            return leagues;
        }

        return null;
    };

    // Returns an object with the data for just one survey
    // e.g., (as of 20201028) if pass surveyId=2, it returns {"survID":2,"survLaunchDate":0,"survInfConsTLDR":"InformedConsent_Sport_TLDR","survInfConsFullText":"InformedConsent_Sport_FullText","BLOCKIntro":false,"BLOCKInformedConsent":false,"BLOCKFavEnt":false,"BLOCKFavEntIden":false,"BLOCKRivalEnt":false}
    this.getSurvey = function (surveyId) {

        const surveys = self.Surveys.filter(function (survey) {
            return survey.survID === surveyId;
        });

        if (surveys.length > 0) {
            return surveys[0];
        }

        return null;
    };

    // This is passed a leagueId
    this.getGroupById = function (groupId) {
        // Filter the League Hierarchy JSON to find the children of this Id
        // !!!!!!!!!!!!!!!!!!!!!!!!!!!!
        // HIGH PRIORITY FIX
        // This filters for all the IDs, so filtering on 10 pulls NBA and Auburn. I need to fix the IDs to use all the real ones from the database.
        // !!!!!!!!!!!!!!!!!!!!!!!!!!!!
        const group = self.filterGroups(LeagueHierarchy, 'id', groupId);

        if (group.length > 0) {
            return group[0];
        }
        return null;
    };

    this.getEntsByGroup = function (groupId, sort) {
        let groups = getLowestLevelGroups(self.getGroupById(groupId).groups);

        if (groups === null || groups.length <= 0) {
            return null;
        }

        if (typeof sort !== 'undefined' && sort !== '') {
            if (sort === 'name') {
                groups.sort(sortName);
            }
        }

        return groups;
    };

    function sortName(a, b) {
        if (a.name < b.name) { return -1; }
        if (a.name > b.name) { return 1; }
        return 0;
    }

    function getLowestLevelGroups(groups, acc) {
        // initialize acc if needed
        acc = typeof acc !== 'undefined' ? acc : [];

        return groups.reduce(function (acc, group) {
            return group.groups ? getLowestLevelGroups(group.groups, acc) : acc.concat(group);
        }, acc);
    };


    // recursive function to filter League Hierarchy
    this.filterGroups = function (groups, key, value, results) {
        // initialize results if needed
        results = typeof results !== 'undefined' ? results : [];

        if (Array.isArray(groups)) {
            // groups is an array, iterate and filter
            groups.forEach(function (childGroup) {
                results = self.filterGroups(childGroup, key, value, results);
            });
        } else {
            // groups is an object, see if it's what we're looking for
            if (groups[key] == value) {
                results.push(groups); // found a match
            }

            // filter child groups if there are any
            if (groups.groups) {
                results = self.filterGroups(groups.groups, key, value, results);
            }
        }

        return results;
    };


    // ############# Added for ent Rival Selection #######################

    this.getGroupAndSiblings = function(groupId) {
        const parentGroup = getParentGroup(groupId, LeagueHierarchy);
    
        if (parentGroup.length > 0) {
          // remove the group with the id we are looking for so we only return siblings
          return parentGroup[0].groups;
        }
    
        return parentGroup;
      }

      function getParentGroup(groupId, groups, acc) {
        // initialize acc if needed
        acc = typeof acc !== 'undefined' ? acc : [];
    
        return groups.reduce(function(acc, group) {
          var match = group.groups && group.groups.some(function(g) {
            return g.id === groupId && g.groups;
          });
    
          return match ? acc.concat(group) : (group.groups? getParentGroup(groupId, group.groups, acc) : acc);
        }, acc);
      }
    


    function init() {
        // dataLoaded starts as true. It only becomes false is there's a failure on one of the fetches 
        let dataLoaded = true;

        // This creates the event that is initiated below and then dispatched at the end of the init function
        let loadedEvent = document.createEvent('Event');

        loadedEvent.initEvent('OmnisurveyReady', true, true);

        let aryJSONLoaded = []; // this is just to help with testing. This variable (and its inclusions below) can be deleted if you want.
        const fnErrorLoadingJSON = (jsonDataName, textStatus) => { dataLoaded = false; console.log("Error loading " + jsonDataName + " JSON data: " + textStatus) };
        $.when(
            $.getJSON(pathJSON.LeagueHierarchy)
                .done(function (data) {
                    // Store the cascading object of the entire hierarchy,
                    // starting with root, then sport (id:2, name:"Gridiron football"), and ending with a ent (e.g., id:165, name:"Chicago Bears")
                    LeagueHierarchy = data; aryJSONLoaded.push("League Hierarchy");
                }).fail(function (jqXHR, textStatus, errorThrown) { fnErrorLoadingJSON("league hierarchy", textStatus); }),

            $.getJSON(pathJSON.Leagues)
                .done(function (data) {
                    // Store the leagues object. {lgID:7, lgSport:"Cricket", lgName:"BBL", etc.}
                    tbljsLeagues = data; aryJSONLoaded.push("Leagues");
                    self.Leagues = mapLeagues();
                }).fail(function (jqXHR, textStatus, errorThrown) { fnErrorLoadingJSON("league", textStatus); }),

            $.getJSON(pathJSON.Surveys)
                .done(function (data) {
                    // Store the Surveys object {survID:1, BLOCKFavEnt:true}
                    tbljsSurveys = data; aryJSONLoaded.push("Survey JSON loaded");
                    self.Surveys = mapSurveys();
                }).fail(function (jqXHR, textStatus, errorThrown) { fnErrorLoadingJSON("survey", textStatus); })
        )
            .then(function () {

                self.dataLoaded = dataLoaded;

                // At each step while loading the JSONs, if it failed, there was a line to assign dataLoaded=false
                if (dataLoaded) {
                    console.log("JSON loaded: ", aryJSONLoaded.join(", "));

                    // This kicks the code back to the script in LeagueSelection.html immediately. 
                    document.dispatchEvent(loadedEvent);
                } else {
                    console.log('The dataLoaded variable was false, which means there was an error loading the data.');
                }
            });

    }

    init();

};