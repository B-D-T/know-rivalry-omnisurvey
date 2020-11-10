'use strict';

var Omnisurvey_EntRivals = function ($, data, groupingId, entId) {


    // const questionId = 'QID246';
    const strEntDropdownSelector = 'select.ent-select';
    const strRivalPointsBoxSelector = 'input.riv-points-box';

    let $question = $('#rivSelTblWrapper');
    let $rivalPointsInputs = $question.find(strRivalPointsBoxSelector);
    let $rivalryPointsError = $('#rivalPointsErrorBox');
    let $rivalryPointsTotal = $('.pts-allocated');
    let $rivalPointsRemaining = $(".pts-remaining");

    // Returns the containers for the current or next rival row when passed a jQuery object.
    // E.g., if a user changes the Rival01 dropdown, pass that here and it will return the Rival01 container, from which you can use .find() to pull any of its elements
    const $curRivContainer = ($select) => $select.closest('.rival-container');
    const $nextRivContainer = ($select) => $curRivContainer($select).next('.rival-container');

    const survIsInTestMode = $('#SurveyInTestMode').attr('id')===undefined;


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
        // $select is the rival dropdown element that was selected by the user (e.g., cboRival01)

        // Select the rivalry points inputs for this rival row (the box and the slider)
        const $rivalPointsInput = $curRivContainer($select).find('input');
        const $nextRival = $nextRivContainer($select);

        // Check if the entity dropdown is blank, then enable & disable accordingly.
        if ($select.val() === '' || $select.val()==0) {
            // Disable the rivalry points input box and set the value to 0 for this row and the next row
            const $nextRivalPointsInput = $nextRival.find(strRivalPointsBoxSelector);
            $.each([$rivalPointsInput, $nextRivalPointsInput],function(idx,elem){
                elem.attr({disabled: 'disabled', min: '0'}).val(0);
                $curRivContainer(elem).find('.ent-select.is-enabled').removeClass('is-enabled');
            });
            $nextRival.find('.grouping-select, .ent-select').attr({disabled:'disabled'});
        } else {
            // Enable this rival's input box
            $rivalPointsInput.removeAttr('disabled');
            // Emphasize available dropdown boxes
            $curRivContainer($select).find('.ent-select').addClass('is-enabled');
            $nextRivContainer($select).find('.ent-select').addClass('is-enabled');
            // If the points box as a value in it, leave the value. Otherwise, set the box to =1
            if (!$rivalPointsInput.val()){$rivalPointsInput.attr({min: '1'}).val(1)}; 
            // Enable the following rival selection boxes (if that rival row exists)
            $nextRival.find('.grouping-select, .ent-select').removeAttr('disabled');
        }
    
        // trigger change
        $rivalPointsInput.change();
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

            // Start with a clean slate
            $rivalryPointsTotal.removeClass(['valid-point-total', 'rivalry-points-error']); 
            $rivalPointsRemaining.removeClass(['valid-point-total', 'rivalry-points-error']); 

            // Add all the points in rivalry points inputs fields
            $rivalPointsInputs.each(function () {
                rivalPointSum += Number($(this).val());
            });

            // Update the total points assigned div
            $rivalryPointsTotal.text('Assigned: ' + rivalPointSum);

            const intRivalPointsRemaining = 100-rivalPointSum;


            if (rivalPointSum == 100) {

                // Set the error message info
                $rivalryPointsTotal.addClass('valid-point-total');
                setErrorMsg(strErrorMsg, 'hide'); // hide error message

                // Update the points remaining div
                $rivalPointsRemaining.addClass('valid-point-total');
                $rivalPointsRemaining.text('All points allocated');
    
                return true;

            } else {
                // Set the error message info
                setErrorMsg(strErrorMsg, 'show',{rivalPointSum}); // show error message

                // Update the points remaining div
                const displayPts = Math.abs(intRivalPointsRemaining);
                if (rivalPointSum > 100){
                    $rivalPointsRemaining.text('Over: ' + displayPts);     
                    $rivalryPointsTotal.addClass('rivalry-points-error');  
                    $rivalPointsRemaining.addClass('rivalry-points-error');
                } else {
                    $rivalPointsRemaining.text('Available: ' + displayPts);
                    // The remaining points are 1-100, which is okay. Don't show an error, and don't so success.
                    $rivalryPointsTotal.removeClass(['valid-point-total', 'rivalry-points-error']);
                    $rivalPointsRemaining.removeClass(['valid-point-total', 'rivalry-points-error']);
                }
                

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
            const intIndent = 2;
            for (var i = 0; i < level * intIndent; i++) {
                spacer += '&nbsp;';
            }

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

    function shuffleElements($selector) {
        let array = $selector.children();
        for (let iCount = array.length - 1; iCount > 0; iCount--) {
            const jCount = Math.floor(Math.random() * (iCount + 1));
            [array[iCount], array[jCount]] = [array[jCount], array[iCount]];
        };
        let strToReturn='';
        $.each(array, (idx,$elem) => strToReturn += $elem.outerHTML );
        return strToReturn;
    }


    function init() {
        if (survIsInTestMode){console.log("EntityRivals.js running in test mode.")};
        let groups = null;

        // Randomize the order of examples in the instructions. Try not to influence how many rivals to list.
        let $sampleRivalPointDistributions = $('#rivPointSampleDistributions');
        $sampleRivalPointDistributions.html(shuffleElements($sampleRivalPointDistributions));

        if (groupingId > 0) {
            // get the grouping grouping
            groups = data.getGroupAndSiblings(groupingId);//data.getCompetitiveGroupingByEntId(entId);
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
            let $select = $('.grouping-select');
            createGroupOptions(groups, $select);
            $select.change(); // trigger change
        } else {
            $question.find(strEntDropdownSelector).each(function () {
                populateEnts($(this), groupingId);
            });
        }

        // Have the points box number change when the user moves the slider
        const $range = $('.riv-points-slider');
        $range.on('input change', function () {
            let $this = $(this);
            // Select the correct points box for this rival by taking the current id (e.g., Rival02PointsSlider) and returning Rival02Points
            const pointsBox = $this.attr('id').replace('PointsSlider', 'Points');
            // Set the points box to be the number of rivalry points
            $('#' + pointsBox).val($this.val());
            validate();
        });

        // Have the slider change if the user enters a number in the points box
        $rivalPointsInputs.on('input change', function () {
                let $this = $(this);
                const pointsSlider = $this.attr('id').replace('Points', 'PointsSlider');
                $('#' + pointsSlider).val($this.val());
                validate();
            });

        // Whenever the Qualtrics question changes,
        // find all the SELECT elements (dropdowns) that that have 'ent-select' as a class.
        $question.on('change', strEntDropdownSelector, function() {
            selectEnt($(this));
        });

    }

    // The first thing to do is create the rest of the HTML.
    // After that, I can run the init() like normal.
    init();
};
