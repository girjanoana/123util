(function($){
    window.addEventListener('load', function(){
        loader.engine.on('theme-ready', function() {
            loader.engine.document.on('calculate', function() {
                UpdateTotal();
            });

            setTimeout(function(){
                let submitButton = $('[data-role=control][data-type=form-action-bar] button[data-role=submit]');
                submitButton.on('click', function (e) {
                    e.preventDefault();
                    try {
                        onSubmitForm();
                    }catch (err) {
                        console.log('err', err);
                        return false;
                    }
                });
            }, 5000);
        });
    });

    let jewelerIdFieldHash = '0000000c',
        jrcField = '0000003a',
        jrcChoiceId = '00000038_1',
        totalSpanRole = 'calculation-total',
        agreementId = '0000003c_0',
        agreementLabelHash = '0000003c',
        sendButton = 'SendButton',
        errorMessageContainerHash = '00000008',

        nameHash = '0000000a',
        cityHash = '0000000d',
        emailHash = '00000011',
        phone1Hash = '00000013',
        phone2Hash = '00000013',
        phone3Hash = '00000013',

        failedOnce = false;

    function onSubmitForm(){
        let jrc = $('div[data-hash="' + jrcField +'"] input').val(),
            jewelerId = $('div[data-hash="' + jewelerIdFieldHash +'"] input').val(),
            jrcChoice = $('input#'+ jrcChoiceId).is(':checked'),
            total = $('span[data-role="' +totalSpanRole + '"]').text();

        console.log('jewelerId', jewelerId);
        //check for jewelerId
        if(jewelerId === '' || isNaN(jewelerId)) {
            return;
        }
        if(+jewelerId < 0) {
            return;
        }

        //validate email
        let email = $('div[data-hash="' +emailHash +'"] input').val();
        if(email === '' || !ValidateEmail(email)) {
            return;
        }

        let emailSuccess = false;

        console.log('start verify email');
        $.ajax({
            url: 'https://jewelersapi.premierdesigns.com/wix/validateEmail/' + jewelerId + '?email=' + email,
            method: 'GET',
            dataType: 'json',
            crossDomain: true,
            async: false
        }).done(function(data, textStatus, jqXHR) {
            var result = data['data'];
            if(result['valid']){
                console.log('email validated');
                HideErrorMessage();
                emailSuccess = true;
            }
            else{
                console.log('email not validated');
                ErrorMessage('Your email does not match what you have on file for primary email address. Please correct it or go to your account on Jeweler Portal to update it.');
                failedOnce = true;
                emailSuccess = false;
                SubmitError();
                e.preventDefault();
            }
        }).fail(function(xhr, status, error) {
            ErrorMessage('Sorry, we had trouble validating your email address. Please try again later.');
            failedOnce = true;
            emailSuccess = false;
            e.preventDefault();
            SubmitError();
        });

        if(!emailSuccess){
            throw 'resetting';
        }

        //check jrc fields
        if(!jrcChoice){
            throw 'resetting';
        }
        if(jrcChoice && (isNaN(jrc) || jrc === '')){
            console.log('invalid values in fields');
            ErrorMessage('Invalid JRC number');
            SubmitError();
            return;
        }

        //check all required fields so that jrc doesnt get charged without the form being submitted
        let firstName = $('div[data-hash="' + nameHash +'"] input[data-index="1"]').val(),
            lastName = $('div[data-hash="' + nameHash +'"] input[data-index="2"]').val();
        if(firstName === '' || lastName === '') {
            return;
        }

        let city = $('div[data-hash="' + cityHash +'"] input').val();
        if(city === '') {
            return;
        }

        let phone1 = $('div[data-hash="' + phone1Hash +'"] input').val(),
            phone2 = $('div[data-hash="' + phone2Hash +'"] input').val(),
            phone3 = $('div[data-hash="' + phone3Hash +'"] input').val();

        if(phone1 === '' || phone2 === '' || phone3 === '' || isNaN(phone1) || isNaN(phone2) || isNaN(phone2)){
            return;
        }
        if(+phone1 < 0 || +phone2 < 0 || +phone3 < 0) {
            return;
        }


        let agreement = $('input#' + agreementId).is(':checked');
        if(!agreement) {
            return;
        }

        console.log("JRC Number: " + jrc + ", Total being charged: " + total);
        //call api
        $.ajax({
            url: 'https://jewelersapi.premierdesigns.com/wix/processJrcPayment',
            method: 'POST',
            dataType: 'json',
            data: {	"amount": total.replace('$',''),
                "jewelerId": jewelerId,
                "jrcNumber": jrc,
                "shortDescription": "Retired Jewelry Sale"
            },
            crossDomain: true,
            async: false
        }).done(function(data, textStatus, jqXHR) {
            let result = data['data'];
            if(result['success']){
                console.log('Success');
                HideErrorMessage();
            }
            else{
                console.log('Failed');
                try{
                    let reasonCode = JSON.parse(result['response'])['reasonCode'];
                    switch(reasonCode){
                        case '121':
                            ErrorMessage('Sorry, we were not able to charge the given JRC as we could not find that account.');
                            break;
                        case '142':
                            ErrorMessage('Sorry, we were not able to charge the given JRC as the account is inactive.');
                            break;
                        case '124':
                            ErrorMessage('Sorry, we were not able to charge the given JRC as the purchase was declined.');
                            break;
                        case '160':
                            ErrorMessage('Sorry, we were not able to charge the given JRC as the purchase was declined.');
                            break;
                        case '195':
                            ErrorMessage('Sorry, we were not able to charge the given JRC as the purchase was declined.');
                            break;
                        default:
                            ErrorMessage('Sorry, we were not able to charge the given JRC. Please try again later.');
                    }
                }
                catch(err){
                    ErrorMessage('Sorry, we were not able to the given JRC. Please try again later.');
                }
                failedOnce = true;
                SubmitError();
                e.preventDefault();
            }
        }).fail(function(xhr, status, error) {
            let err = JSON.parse(xhr.responseText);
            switch(err['data']['code']) {
                case 1:
                    ErrorMessage('Sorry, we could not find anyone with the Jeweler Id ' + jewelerId);
                    break;
                case 2:
                    ErrorMessage('Sorry, the jeweler with id ' + jewelerId + ' does not have a JRC on file. A JRC can be added on Jeweler Portal under account settings.');
                    break;
                case 3:
                    ErrorMessage('Sorry, the given JRC number does not match what jeweler with id ' + jewelerId + ' has on file. A JRC can be added or updated on Jeweler Portal under account settings.');
                    break;
                default:
                    ErrorMessage('Sorry, we had a problem charging that JRC. Please try again later.');
            }
            failedOnce = true;
            e.preventDefault();
            SubmitError();
        });

        throw 'resetting';

    }


    function ErrorMessage(message){
        let errorMessageContainer = $('div[data-hash="'+errorMessageContainerHash+'"]');
        if(errorMessageContainer.find('h3[data-role="error-message"]').length > 0){
            errorMessageContainer.find('h3[data-role="error-message"]').html(message);
        }else {
            errorMessageContainer.append('<h3 style="color:red" data-role="error-message">' + message + '</h3>');
        }
        $('html, body').animate({scrollTop: 0}, 800);
    }

    function HideErrorMessage(){
        let errorMessageContainer = $('div[data-hash="'+errorMessageContainerHash+'"]');
        if(errorMessageContainer.find('h3[data-role="error-message"]').length > 0){
            errorMessageContainer.find('h3[data-role="error-message"]').remove();
        }
    }

    function SubmitError(){
        return false;
    }

    function UpdateTotal(){
        let total = $('span[data-role="' +totalSpanRole + '"]').text(),
            label = $('div[data-hash="' + agreementLabelHash + '"]').find('span[data-role="option-text"]');

        if(label.html().length) {
            label.html(label.html().replace('$TotalToBeCharged$', '<span id="agree-total">' + total + '</span>'));
            $('#agree-total').html(total);
        }
    }

    function ValidateEmail(email) {
        let re = /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/;
        return re.test(String(email).toLowerCase());
    }

})(jQuery);