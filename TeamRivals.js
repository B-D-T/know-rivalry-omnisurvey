'use strict';

var Omnisurvey_EntRivals = function ($, data, groupingId, entId) {


// WAS: Other than isValidRivalsSelection, all of these were const instead of let
    // const questionId = 'QID246';
    let $question = $('#rivSelTblWrapper');
    let $rivalryPointsInputs = $question.find('.ChoiceRow input[type="text"]');
    let $rivalryPointsTotal = $('.CSTotal input');
    let $rivalryPointsError = $('<div class="rivalry-points-error"></div>').appendTo($question);
    let entDropdownSelector = 'select:not(.grouping-select)';


    // Populate ents in second dropdown when user changes the grouping
    function changeGrouping($select) {
        // get the selected group id
        let groupId = parseInt($select.val());
        let entDropdown = $select.next('select');
        populateEnts(entDropdown, groupId);
    }

    // Fill the ents within the dropdown
    function populateEnts($select, groupId) {
        // get the ents in the grouping
        const ents = data.getEntsByGroup(groupId, 'termKRQualtrics');

        let options = '<option value=""></option>';
        ents.forEach(function (ent) {
            if (ent.entID != entId) {
                options += '<option value="' + ent.entID + '">' + ent.termKRQualtrics + '</option>';
            }
        });

        $select.html(options) // set options
            .change(); // trigger change
    }

    function selectEnt($select) {
        const $rivalryPointsInput = $select.closest('.ChoiceRow').next().find('input');
    
        if ($select.val() === '') {
          $rivalryPointsInput.attr({disabled: 'disabled', min: '0'}).val(0);
        } else {
          $rivalryPointsInput.removeAttr('disabled').attr({min: '1'}).val(1);
        }
    
        // trigger change
        $rivalryPointsInput.change();
    }

    function validate() {
        let isValidRivalsSelection = false;
        
        isValidRivalsSelection = check100Points();
        nextBtn(isValidRivalsSelection);

        function nextBtn(enableBtn){
            if (window.Qualtrics && Qualtrics.SurveyEngine) {
                const PageBtns = Qualtrics.SurveyEngine.Page.pageButtons;
                if (enableBtn){
                    PageBtns.enableNextButton(); 
                } else {
                    PageBtns.disableNextButton();
                }
            }
            return enableBtn;
        }

        function setErrorMsg(errorText, textAction = 'show', otherParams={}){
            // Fetch any current text in the error box
            let strErrorMsg = $rivalryPointsError.html() || '',
                prefix='<br>';

            // Append the error message to any others already in the error box
            if (textAction == 'show'){ 
                prefix = (strErrorMsg.length == 0) ? '' : prefix
                if ( otherParams.rivalPointSum != 0 && !strErrorMsg.includes(errorText) ){
                    strErrorMsg += prefix + errorText;
                    $rivalryPointsError.html(strErrorMsg);
                }
            }

            // Remove the error message if it exists within the error box
            if (textAction == 'hide'){
                // If there's more than just this message in the box, remove the line return AND the message
                prefix = (errorText.length == strErrorMsg.length) ? '' : prefix
                // If this error isn't first, there will be a prefix. But it could be anywhere, so use regex
                strErrorMsg = strErrorMsg.replace( new RegExp( "("+prefix+")?"+errorText, "g" ), "" );
                strErrorMsg = strErrorMsg.replace( new RegExp(prefix), ""); // Removes the <br> that might be left at the front
                // Set the text within the DIV
                $rivalryPointsError.html(strErrorMsg);
            }
        }

        // RIVALRY POINT TOTAL
        function check100Points(){
            const strErrorMsg = "Rivalry points must total 100";
            let rivalPointSum = 0;

            // Add all the points in rivalry points inputs fields
            $rivalryPointsInputs.each(function () {
                rivalPointSum += Number($(this).val());
            });

            // Update the total cell at the bottom
            $rivalryPointsTotal.val(rivalPointSum);

            if (rivalPointSum == 100) {
                $rivalryPointsTotal.addClass('valid-point-total');
                setErrorMsg(strErrorMsg, 'hide'); // hide error message
                return true;
            } else {
                $rivalryPointsTotal.removeClass('valid-point-total');
                setErrorMsg(strErrorMsg, 'show',{rivalPointSum}); // show error message
                return false;
            }
        }
    }


    // groups = the grouping object that has conf/div hierarchy
    function createGroupOptions(groups, $select, level) {
        // initialize level if needed
        level = typeof level !== 'undefined' ? level : 0;

        $.each(groups, function (index, childGroup) {
            // stop at ent level, skip groups that shouldn't be displayed
            if (!childGroup.groups) { // || !childGroup.grpShowSurvSelRival) {
                return;
            }

            const disabled = false; //childGroup.groups && childGroup.groups[0] && childGroup.groups[0].groups,
            const selected = childGroup.entID == groupingId;


            // Each subsequent child level is indented slightly more
            let spacer = '';
            const intIndent = 4;
            for (var i = 0; i < level * intIndent; i++) {
                spacer += '&nbsp;';
            }

// WAS: I switched both of these to let
            let strOptionGroup = [
                '<option',
                (disabled ? ' disabled="disabled"' : ''),
                ' value="' + childGroup.entID + '"',
                (selected ? ' selected' : ''),
                '>' + spacer + childGroup.termKRQualtrics,
                '</option>'].join('');
            let $optGroup = $(strOptionGroup).appendTo($select);

            // Iterate on itself. Use the level argument to avoid infinite looping
            if (childGroup.groups) {
                createGroupOptions(childGroup.groups, $select, level + 1);
            }
        });
    }



    function init() {
        let groups = null;

        if (groupingId > 0) {
            // get the grouping grouping
            groups = data.getGroupAndSiblings(groupingId);//data.getCompetitiveGroupingByEntId(entId);
            console.log(groups);
        } else {
            // TODO: INVALID DATA, DO SOMETHING
            return;
        }

        // populate ents on grouping change
        $question.on('change', 'select.grouping-select', function () {
            changeGrouping($(this));
         });

        // determine if there are sibling groupings to choose rivals from
        if (groups != null) {
            let $select = $('<select class="grouping-select"></select>').prependTo($question.find('select').parent());
            createGroupOptions(groups, $select);
            $select.change(); // trigger change
        } else {
            $question.find(entDropdownSelector).each(function () {
                populateEnts($(this), groupingId);
            });
        }

        // change the rivalry points inputs to range
        const $range = $('<input type="range" min="0" max="100" disabled="disabled" class="points-range" />');
        $range.on('input change', function () {
            const $this = $(this);
            $this.next('input').val($this.val());
            validate();
        });

        $rivalryPointsInputs
            .attr({ type: 'number', min: 0, max: 100, disabled: 'disabled' })
            .before($range)
            .on('input change', function () {
                let $this = $(this);
                $this.prev('input').val($this.val());
                validate();
            });

        // best way to determine ent selection dropdown currently
        $question.on('change', entDropdownSelector, function() {
            selectEnt($(this));
        });

    }

    init();
};
