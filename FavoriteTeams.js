'use strict';

var Omnisurvey_FavoriteEnts = function ($, data, leagueId) {

	const self = this;

	// Eventually, these are what will be passed to the Qualtrics embedded data
	this.favoriteEntSelectedHandler;
	this.FavoriteEntId = -1;
	this.FavoriteEntName = "";

	let selectedLeague = null;
	let $leagueFilter = $('#leagueFilter');
	let $favEntBtns = null;
	let $ents = $('#ents');
	let $selectedEntLogo = $('#selected-ent-logo');
	let $selectedEntContainer = $('#selected-ent');

	const $entsContainer = $('#ents-container');
	const $nextButton = $('#NextButton');

	const strEntLogoRootDir = 'https://knowrivalry.com/images/teamlogos/'; // This is the folder that holds the logos (SVGs) for each ent

	// groups = the league object that has conf/div hierarchy
	function createGroupOptions(groups, $select, level) {
		// initialize level if needed
		level = typeof level !== 'undefined' ? level : 0;

		$.each(groups, function (index, childGroup) {
			// stop at team level, skip groups that shouldn't be displayed
			if (!childGroup.groups) { // || !childGroup.grpShowSurvSelRival) {
				return;
			}

			// Each subsequent child level is indented slightly more
			let spacer = '';
			const intIndent = 4;
			for (var i = 0; i < level * intIndent; i++) {
				spacer += '&nbsp;';
			}

			const disabled = false; //childGroup.groups && childGroup.groups[0] && childGroup.groups[0].groups,
			const selected = childGroup.id == leagueId;

			const strOptionGroup = [
				'<option',
				(disabled ? ' disabled="disabled"' : ''),
				' value="' + childGroup.id + '"',
				(selected ? ' selected' : ''),
				'>' + spacer + childGroup.name,
				'</option>'].join('');
			const $optGroup = $(strOptionGroup).appendTo($select);

			// Iterate on itself. Use the level argument to avoid infinite looping
			if (childGroup.groups) {
				createGroupOptions(childGroup.groups, $select, level + 1);
			}
		});
	}

	function selectEnt(entId, entName) {
		self.FavoriteEntId = entId; // This is the value that we'll eventually write to Qualtrics embedded data
		self.FavoriteEntName = entName;

		if (entId > 0) {
			const ent = data.getGroupById(entId);
			const imgPath = strEntLogoRootDir + 'logo_team'+ent.id+'.svg';

			// set the logo and the ent name
			$selectedEntLogo.css('background-image', 'url(' + imgPath + ')');
			$selectedEntContainer.find('#selected-ent-name').html(self.FavoriteEntName);

			// enable next button
			$nextButton.removeAttr('disabled');

			$selectedEntContainer.show();
			$entsContainer.hide();

		} else {
			$nextButton.attr('disabled', 'disabled');


			// hide/show containers
			$selectedEntContainer.hide();
			$entsContainer.show();
		}

		if (typeof self.favoriteEntSelectedHandler === 'function') {
			self.favoriteEntSelectedHandler();
		}
	}


	function showAllFavEntButtons(blnShowAll) {
		if (blnShowAll == true) {
			$favEntBtns.show();
		} else {
			$favEntBtns.hide();
		}
	}
	function createFavEntButtons() {
		const ents = data.getEntsByGroup(leagueId, 'name');

		// Populate the ent selection logos and ent names
		ents.forEach(function (ent) {
			const strEntImgFilename = strEntLogoRootDir + 'logo_team' + ent.id + '.svg';
			$ents.append('<div style="background-image: url(' + strEntImgFilename + ')" id="btnEntID' + ent.id + '" class="ClassFavEnt" data-id="' + ent.id + '">' + ent.name + '</div>');
		});

		$favEntBtns = $('.ClassFavEnt');
		$favEntBtns.on('click', favEntClicked);
	}

	function favEntClicked() {
		var $this = $(this);

		selectEnt($this.data('id'), $this.text());
	}


	// This is used as an argument in a function. I think 'this' refers to the caller,
	// and .val is the text of that element.
	function filterChanged() {
		const groupId = $(this).val();
		filterEnts(groupId);
	}

	function filterEnts(groupId) {
		if (groupId === undefined || groupId === '') {
			// show all
			showAllFavEntButtons(true);
		} else {
			// hide all
			showAllFavEntButtons(false);

			// show filtered ents
			const ents = data.getEntsByGroup(groupId);
			$.each(ents, function (index, ent) {
				//if (ent.divisionLevels[filterLevel-1] == filterValue) {
				$favEntBtns.filter('[data-id=' + ent.id + ']').show();
				//}
			});
		}
	}

	function resetAll() {
		selectEnt(-1, "");
	}
	

	function init() {
		// get an object of the league data
		selectedLeague = data.getGroupById(leagueId);

		if (selectedLeague === null) {
			// TODO: INVALID DATA, NOW WHAT?
			return;
		}

		createGroupOptions([selectedLeague], $leagueFilter);
		$leagueFilter.on('change', filterChanged);


		// Create FavEnt buttons
		createFavEntButtons();

		resetAll();

		$('.faventResetAllFilters').on('click', function (e) {
			e.preventDefault();
			resetAll();
		});
	}

	init();
};
