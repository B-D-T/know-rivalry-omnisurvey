'use strict';

// When this gets called, Danny passes the jQuery object as an argument.
// The $ in the parameter here is just a parameter like any other -- nothing special.
// It becomes jQuery when used anywhere in this space.
var Omnisurvey_LeagueSelection = function($, data, leagueId, surveyId) {

	this.nextButtonHandler;
	this.surveySelectionHandler; // 20201029-0357: This goes to code that's commented out right now. Not sure why.
	this.dataToEmbed = {}; // this object holds the data to embed in the survey

	var self = this;
	const surveySelectionQuestionId = 'QID182';
	const strLeagueImageRootDir = 'https://knowrivalry.com/images/logos/';
	
	// A note on the variable notation:
		// If the variable has a $ before it, it's a jQuery object. 
		// For example, surveySelectionQuestionId = 'QID182' is just a string. The jQuery object equivalent is $surveySelectionQuestion = $('#'+surveySelectionQuestionId)
		// The $('#'+surveySelectionQuestionId) is the same as jQuery('#'+surveySelectionQuestionId) because jQuery was passed to Omnisurvey_LeagueSelection.
		// So $('#'+surveySelectionQuestionId) is the same as writing jQuery("#QID182")

	const $surveySelectionQuestion = $('#'+surveySelectionQuestionId); // Survey question div with all the radio buttons for choosing your desired league
	const $nextButton = $('#SplashMyNextButton'); 	// My custom next button
	const $splashChangeLeagueBtn = $('#SplashChangeLeagueBtn'); // Button to allow the user to pick a different league
	const $SplashWelcomeLeagueLogoDiv = $('#SplashWelcomeLeagueLogoDiv'); // Div with the league logo
	const $storageLeagueId = $("#storageLeagueId"); // Storage for the selected league
	
	// The toggleLeagueSelect function would only be called -- I think -- if the user clicks on SplashChangeLeagueBtn
	function toggleLeagueSelect() {
		$surveySelectionQuestion.slideToggle();

		// The "Select different league" button doesn't show if the surveySelectionQuestion is already showing
		if ($splashChangeLeagueBtn.css('visibility') === 'hidden') {
			$splashChangeLeagueBtn.css('visibility', 'visible');
		} else {
			$splashChangeLeagueBtn.css('visibility', 'hidden');
		}
	}

	// Return user to the Select lgID question
	function fScrollToSelectLgID() {
		$('html, body').animate({
			scrollTop: ($("#SplashTitleText").offset().top)
		},500);
	}
	function fErrorText(paramElementID, paramIsError){
		// I made this more flexible than it needed to be, but I figured it was better to do it this way for the future
		let strErrorText = "";
		if (paramIsError === true) {		// There is an error!
			switch (paramElementID) {		// Which element has the error?
				case "SplashErrorSelectLeague":
					strErrorText += "Please select a league before trying to continue.";
					break;
				default:
					strErrorText += "";
			}
		} else {
			strErrorText = "";
		}
		jQuery("#"+paramElementID).html(strErrorText); // Set the text within the HTML element
	}

	function submitPageData() {
		// TASKS BEFORE ADVANCING IN SURVEY
		// The main thing this function does is to write the values into the embedded data variables within Qualtrics.
		// In some cases we want to write new embedded data, in other cases we don't, thus we need to write it with code rather than within the Qualtrics Survey Flow.		

		// Get the leagueId
		const leagueId = parseInt($storageLeagueId.text());

		// If the lgID is null/empty/NaN/0, check to see if the user has made a selection
		if (!(leagueId > 0)) {
			fErrorText("SplashErrorSelectLeague", true); // Put error text above the league selector question
			fScrollToSelectLgID(); // Scroll user back to the league selector question
			return false;
		}
				
		// WRITE THE EMBEDDED DATA TO QUALTRICS
		// This will write EVERY property within the data table variables (e.g., tbljsLeagues, tbljsSurveys) as an embedded data variable within Qualtrics (whether we end up using it or not).
		// If the embedded data element doesn't exist in the survey flow yet, Qualtrics will create that variable.
		// You won't see it in the Qualtrics survey flow, but it exists [at least, I think that's what's happening].
	
		self.dataToEmbed = {};
		
		// write all properties of tbljsLeagues for selected league to embedded data
		const selectedLeague = data.getLeague(leagueId);
		$.each(selectedLeague, function(key) {
			self.dataToEmbed[key] = selectedLeague[key];
		});

		// write all properties of tbljsSurveys for selected survey to embedded data
		const surveyId = selectedLeague.lgCurrentSurvID;
		const selectedSurvey = data.getSurvey(surveyId);
		$.each(selectedSurvey, function(key) {
			self.dataToEmbed[key] = selectedSurvey[key];
		});

		console.log('Submitting data:', self.dataToEmbed);

		return true;
	}

	// change the league showcased on the page
	function setLeagueInfo(leagueId) { // Danny named this selectLeague(id)
		$storageLeagueId.text(leagueId); // Store the leagueId in a hidden div on the page
		const leagueSlug = data.getLeague(leagueId).lgSlug;
		const leagueImgFilename = strLeagueImageRootDir + 'league_' + leagueSlug + '-md.png';
		$SplashWelcomeLeagueLogoDiv.css('background-image', 'url(' + leagueImgFilename + ')');
	}

	// This is called from the HTML when the user has clicked on a league selection
	this.leagueSelectionHandler = function(selectedLeagueId) {
		console.log("I'm leagueSelectionHandler. I was passed", selectedLeagueId);
		if (!isNaN(selectedLeagueId)) {
			setLeagueInfo(selectedLeagueId);
			toggleLeagueSelect();
		}
	};
	
	// This fires when the user clicks to change the league
	function changeLeagueButtonHandler() {
		toggleLeagueSelect();
	}

	// Runs on page load
	function init() {

		// These will be set by the code
		let league = null, survey = null;

		// Fetches an object with that league's information.
		if (leagueId > 0) {
			// This means a leagueId was passed in the query string (i.e., it's in the embedded data)
			// e.g., {"lgID":7,"lgSport":"Cricket","lgName":"BBL","lgCurrentSurvID":19,"lgSlug":"s_m_t20_bbl","lgFullName":"Big Bash League","lgTheFullName":"the Big Bash League","lgHasProRel":false,"lgBritishSpelling":true,"lgNumOfFaventSublevels":0}
			league = data.getLeague(leagueId);
		}
		console.log("league ==>",league);

		if (surveyId > 0) {
			// This means a survID was passed in the query string (i.e., it's in the embedded data)
			survey = data.getSurvey(surveyId);

			if (survey != null) {
				// get the leagues associated with this survey
				const leagues = data.getLeaguesBySurvey(surveyId);

				if (leagues != null) {
					// TODO: ONLY DISPLAY THESE LEAGUES

				}
			}
		}
		console.log("survey ==>", survey);

		// By default, the survey selection question is hidden
		// If there is a lgID assigned, hide/show the appropriate elements
		// If not, give the user the opportunity to select the league
		if (league != null) {

			// if survey isn't specified or
			// the survey is specified and the league is explicity associated with a surveyId,
			// don't give the user the opportunity to change leagues
			if (survey == null || league.lgCurrentSurvID === survey.survID) {
				// Hide the survey question with all the selector radio boxes
				$surveySelectionQuestion.hide();
				// Put the logo for the league at the top of the survey
				setLeagueInfo(leagueId);
			} else {
				// Allow user to click button to change leagues
				toggleLeagueSelect();
			}
		} else {
			toggleLeagueSelect();
		}
		
		// Customize the style of Qualtrics elements

		// Reduce the distance between elements. Tighten up the page.
		jQuery('.Skin .QuestionOuter').css('padding-bottom', '0vh');
		// Reduce the distance between league buttons
		jQuery('.Skin label.MultipleAnswer, .Skin label.MultipleAnswer.q-focused, .Skin label.SingleAnswer ').css(
			{"padding-top": "5px","padding-bottom": "5px"}
		);

		$splashChangeLeagueBtn.on('click', changeLeagueButtonHandler);

		// RUN CODE ON PAGE SUBMIT
		$nextButton.on('click', function() {
			return submitPageData() && (typeof self.nextButtonHandler === 'function' && self.nextButtonHandler());
		});

		// TODO: NEED TO FIGURE OUT A SOLUTION FOR THIS, FOR NOW JUST UNCOMMENT FOR TESTING
		/*$surveySelectionQuestion.find('li.Selection input[type="radio"]').on('click', function() {
			var selectedLeagueId = '';

			if (typeof self.surveySelectionHandler === 'function') {
				selectedLeagueId = self.surveySelectionHandler();
			} else {
				var selectedValue = $(this).val();
				var selectedLeagueId = parseInt(data.testChoices[''+selectedValue].RecodeValue);
			}

			if (!isNaN(selectedLeagueId)) {
				selectLeague(selectedLeagueId);
				toggleLeagueSelect();
			}
		});*/
	}

	init();	
};