const chai = require('chai');
const expect = chai.expect;

const cookieManager = require('../cookie-manager');
const {JSDOM} = require("jsdom");

const clearBody = () => {
    let node = document.body.lastElementChild;
    while(node) {
        document.body.removeChild(node);
        node = document.body.lastElementChild;
    }
};

const createBanner = () => {
    const cookieBanner = document.createElement('div');
    cookieBanner.setAttribute('id', 'cm_cookie_notification');
    cookieBanner.setAttribute('class', 'hidden');

    const acceptAllButton = document.createElement('button');
    acceptAllButton.setAttribute('type', 'submit');
    cookieBanner.appendChild(acceptAllButton);

    const rejectAllButton = document.createElement('button');
    rejectAllButton.setAttribute('id', 'reject-button');
    rejectAllButton.setAttribute('value', 'reject');
    cookieBanner.appendChild(rejectAllButton);

    document.body.appendChild(cookieBanner);
};


describe('Cookie Manager', () => {

    'use strict';

    let cm_config = {};

    const createPreferencesForm = () => {
        const userPreferenceForm = document.createElement('form');
        userPreferenceForm.setAttribute('id', 'cm_user_preference_form');

        const createCategoryRadioButtons = (category) => {
            const categoryRadioButtonOn = document.createElement('input');
            const categoryRadioButtonOff = document.createElement('input');

            categoryRadioButtonOn.setAttribute('name', category);
            categoryRadioButtonOn.setAttribute('id', category + '_on');
            categoryRadioButtonOn.setAttribute('type', 'radio');
            categoryRadioButtonOn.setAttribute('value', 'on');
            categoryRadioButtonOff.setAttribute('name', category);
            categoryRadioButtonOff.setAttribute('id', category + '_off');
            categoryRadioButtonOff.setAttribute('type', 'radio');
            categoryRadioButtonOff.setAttribute('value', 'off');

            return {
                'on': categoryRadioButtonOn,
                'off': categoryRadioButtonOff
            }
        };

        const radioButtonsAnalytics = createCategoryRadioButtons('analytics');
        const radioButtonsFeedback = createCategoryRadioButtons('feedback');

        const submitButton = document.createElement('input');
        submitButton.setAttribute('type', 'submit');

        userPreferenceForm.appendChild(radioButtonsAnalytics['on']);
        userPreferenceForm.appendChild(radioButtonsAnalytics['off']);
        userPreferenceForm.appendChild(radioButtonsFeedback['on']);
        userPreferenceForm.appendChild(radioButtonsFeedback['off']);
        userPreferenceForm.appendChild(submitButton);

        document.body.appendChild(userPreferenceForm);
    };

    const cookieExists = (name) => {
        const cookie_search = name + "=";
        return (document.cookie.indexOf(cookie_search) >= 0);
    };

    const cookieGet = (name) => {
        const cname = name + "=";
        const decodedCookie = decodeURIComponent(document.cookie);
        const ca = decodedCookie.split(';');
        for(var i = 0; i <ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) === ' ') {
                c = c.substring(1);
            }
            if (c.indexOf(cname) === 0) {
                return c.substring(cname.length, c.length);
            }
        }
        return false;
    };

    const cookieAdd = (name, value, days) => {
        let expires = "";
        if (days) {
            const date = new Date();
            date.setTime(date.getTime() + (days*24*60*60*1000));
            expires = "; expires=" + date.toUTCString();
        }
        document.cookie = name + "=" + (value || "")  + expires + "; path=/";
    };

    const createUserPreferenceCookie = (preferences) => {
        cookieAdd('cm_user_preferences', JSON.stringify(preferences), 1);
    };

    const clearCookies = () => {
        const cookies = document.cookie.split(";");

        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i];
            const eqPos = cookie.indexOf("=");
            const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
            document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT";
        }
    };

    const resetConfig = () => {
        cm_config = {
            "delete-undefined-cookies": true,
            "user-preference-cookie-name": "cm_user_preferences",
            "user-preference-cookie-secure": false,
            "user-preference-saved-callback" : false,
            "user-preference-cookie-expiry-days": 365,
            "user-preference-configuration-form-id": "cm_user_preference_form",
            "cookie-banner-id": "cm_cookie_notification",
            "cookie-banner-visibility-class": "hidden",
            "cookie-banner-visible-on-page-with-preference-form": true,
            "cookie-manifest": [
                {
                    "category-name": "essential",
                    "optional": false,
                    "cookies": [
                        "essential-cookie",
                        "essential-cookie-with-suffix",
                        "another-essential-cookie"
                    ]
                },
                {
                    "category-name": "analytics",
                    "optional": true,
                    "cookies": [
                        "analytics-cookie",
                        "analytics-cookie-with-suffix",
                        "another-analytics-cookie"
                    ]
                },
                {
                    "category-name": "feedback",
                    "optional": true,
                    "cookies": [
                        "feedback-cookie",
                        "feedback-cookie-with-suffix",
                        "another-feedback-cookie"
                    ]
                }
            ]
        };
    };

    beforeEach(() => {
        clearBody();
        clearCookies();
        createBanner();
        createPreferencesForm();
    });

    afterEach(() => {
        resetConfig();
    });

    describe('User has no cookie preferences set', () => {

        it ('User preference cookie is not defined', () => {
            cookieManager.init(cm_config);
            expect(cookieExists('cm_user_preferences')).false;
        });

        describe('Cookie Banner', () => {

            it('Exists in the DOM', () => {
                const cookie_banner_element = document.querySelector('div#cm_cookie_notification');
                expect(cookie_banner_element, 'Cookie Banner container does not exist').to.exist;
                expect(cookie_banner_element.querySelector('button[type="submit"]'), 'Cookie Banner Accept All button does not exist').to.exist;
            });

            describe('Cookie Banner is configured', () => {

                it('Is Visible', () => {
                    cookieManager.init(cm_config);
                    const cookie_banner_element = document.querySelector('div#cm_cookie_notification');
                    expect(cookie_banner_element.classList.contains('hidden'), 'Expected Cookie Banner to be visible').eql(false);
                });

                describe('Clicking Accept All button will set preference and hide Cookie Banner', () => {

                    beforeEach(() => {
                        cookieManager.init(cm_config);

                        const cookie_banner_accept_all_button = document.querySelector('div#cm_cookie_notification button[type="submit"]');
                        cookie_banner_accept_all_button.click();
                    });

                    it('Clicking Accept All creates User Preference Cookie', () => {
                        expect(cookieExists('cm_user_preferences')).true;
                    });

                    it('Clicking Accept All hides the Cookie Banner', () => {
                        const cookie_banner_element = document.querySelector('div#cm_cookie_notification');
                        expect(cookie_banner_element.classList.contains('hidden'), 'Expected Cookie Banner to be visible').eql(true);
                    });

                });

                describe('Clicking Reject All button will set preference and hide Cookie Banner', () => {

                    beforeEach(() => {
                        cookieManager.init(cm_config);

                        const cookie_banner_reject_all_button = document.querySelector('div#cm_cookie_notification button[id="reject-button"]');
                        cookie_banner_reject_all_button.click();
                    });

                    it('Clicking Reject All creates User Preference Cookie', () => {
                        expect(cookieExists('cm_user_preferences')).true;
                    });

                    it('Clicking Reject All hides the Cookie Banner', () => {
                        const cookie_banner_element = document.querySelector('div#cm_cookie_notification');
                        expect(cookie_banner_element.classList.contains('hidden'), 'Expected Cookie Banner to be visible').eql(true);
                    });

                });


                describe('Cookie Banner is configured to NOT be displayed on same page as form', () => {

                    beforeEach(() => {
                        cm_config['cookie-banner-visible-on-page-with-preference-form'] = false;
                    });

                    it('Is NOT Visible', () => {
                        cookieManager.init((cm_config));
                        const cookie_banner_element = document.querySelector('div#cm_cookie_notification');
                        expect(cookie_banner_element.classList.contains('hidden'), 'Expected Cookie Banner to be visible').eql(true);
                    });
                });
            });

            describe('Cookie Banner is NOT configured', () => {

                beforeEach(() => {
                    cm_config['cookie-banner-id'] = false;
                    cookieManager.init(cm_config);
                });

                it ('Is Ignored', () => {
                    cookieManager.init((cm_config));
                    const cookie_banner_element = document.querySelector('div#cm_cookie_notification');
                    expect(cookie_banner_element.classList.contains('hidden'), 'Expected Cookie Banner to be NOT visible').eql(true);
                });
            });
        });

        describe('All optional cookies are removed', () => {

            beforeEach(() => {
                cookieAdd('essential-cookie', '', 1);
                cookieAdd('essential-cookie-with-suffix', '', 1);
                cookieAdd('another-essential-cookie', '', 1);
                cookieAdd('analytics-cookie', '', 1);
                cookieAdd('analytics-cookie-with-suffix', '', 1);
                cookieAdd('another-analytics-cookie', '', 1);
                cookieAdd('feedback-cookie-with-suffix', '', 1);
                cookieAdd('feedback-cookie', '', 1);
                cookieAdd('another-feedback-cookie', '', 1);
                cookieManager.init(cm_config);
            });

            it('Essential cookies only remain', () => {
                expect(cookieExists('essential-cookie')).true;
                expect(cookieExists('essential-cookie-with-suffix')).true;
                expect(cookieExists('another-essential-cookie')).true;
                expect(cookieExists('analytics-cookie')).false;
                expect(cookieExists('analytics-cookie-with-suffix')).false;
                expect(cookieExists('another-analytics-cookie')).false;
                expect(cookieExists('feedback-cookie')).false;
                expect(cookieExists('feedback-cookie-with-suffix')).false;
                expect(cookieExists('another-feedback-cookie')).false;
            });
        });
    });

    describe('User has cookie preferences set', () => {

        beforeEach(() => {
            createUserPreferenceCookie({
                'analytics': 'on',
                'feedback': 'off'
            });
        });

        describe('Cookie Banner', () => {

            it('Exists in the DOM', () => {
                const cookie_banner_element = document.querySelector('div#cm_cookie_notification');
                expect(cookie_banner_element, 'Cookie Banner container does not exist').to.exist;
                expect(cookie_banner_element.querySelector('button[type="submit"]'), 'Cookie Banner Accept All button does not exist').to.exist;
            });

            describe('Cookie Banner is configured', () => {

                it('Is Not Visible', () => {
                    cookieManager.init(cm_config);
                    const cookie_banner_element = document.querySelector('div#cm_cookie_notification');
                    expect(cookie_banner_element.classList.contains('hidden'), 'Expected Cookie Banner to be NOT visible').eql(true);
                });

            });

            describe('Cookie Banner is NOT configured', () => {

                beforeEach(() => {
                    cm_config['cookie-banner-id'] = false;
                    cookieManager.init(cm_config);
                });

                it ('Is Ignored', () => {
                    cookieManager.init((cm_config));
                    const cookie_banner_element = document.querySelector('div#cm_cookie_notification');
                    expect(cookie_banner_element.classList.contains('hidden'), 'Expected Cookie Banner to be NOT visible').eql(true);
                });
            });
        });

        describe('Any non-optional cookies are not removed', () => {

            beforeEach(() => {
                cookieAdd('essential-cookie', '', 1);
                cookieAdd('essential-cookie-with-suffix', '', 1);
                cookieAdd('another-essential-cookie', '', 1);
                cookieManager.init(cm_config);
            });

            it ('Non-Optional cookies remain', () => {
                expect(cookieExists('essential-cookie')).true;
                expect(cookieExists('essential-cookie-with-suffix')).true;
                expect(cookieExists('another-essential-cookie')).true;
            });

        });

        describe('Only cookies in categories with consent are not removed', () => {

            beforeEach(() => {
                cookieAdd('analytics-cookie', '', 1);
                cookieAdd('analytics-cookie-with-suffix', '', 1);
                cookieAdd('another-analytics-cookie', '', 1);
                cookieAdd('feedback-cookie-with-suffix', '', 1);
                cookieAdd('feedback-cookie', '', 1);
                cookieAdd('another-feedback-cookie', '', 1);
                cookieManager.init(cm_config);
            });

            it ('Only analytics cookies remain', () => {
                expect(cookieExists('analytics-cookie')).true;
                expect(cookieExists('analytics-cookie-with-suffix')).true;
                expect(cookieExists('another-analytics-cookie')).true;
                expect(cookieExists('feedback-cookie')).false;
                expect(cookieExists('feedback-cookie-with-suffix')).false;
                expect(cookieExists('another-feedback-cookie')).false;
            });

            describe('Even when consent uses string booleans instead of on/off', () => {

                beforeEach(() => {
                    createUserPreferenceCookie({
                        'analytics': 'true',
                        'feedback': 'false'
                    });
                });

                it ('Only analytics cookies remain', () => {
                    expect(cookieExists('analytics-cookie')).true;
                    expect(cookieExists('analytics-cookie-with-suffix')).true;
                    expect(cookieExists('another-analytics-cookie')).true;
                    expect(cookieExists('feedback-cookie')).false;
                    expect(cookieExists('feedback-cookie-with-suffix')).false;
                    expect(cookieExists('another-feedback-cookie')).false;
                });

            });
        });

        describe('Cookies beginning with prefix defined in manifest are removed', () => {
            beforeEach(() => {
                cookieAdd('feedback-cookie', '', 1);
                cookieAdd('feedback-cookie-with-suffix', '', 1);
                cookieAdd('feedback-cookie-with-more-suffix', '', 1);
                cookieAdd('feedback-cookie-with-even-more-suffix', '', 1);
                cookieManager.init(cm_config);
            });

            it ('Cookies are removed', () => {
                expect(cookieExists('feedback-cookie')).false;
                expect(cookieExists('feedback-cookie-with-suffix')).false;
                expect(cookieExists('feedback-cookie-with-more-suffix')).false;
                expect(cookieExists('feedback-cookie-with-even-more-suffix')).false;
            });
        });

        describe('Cookie Manager never removes own user preference cookie', () => {

            it ('User preference cookie remains', () => {
                cookieManager.init(cm_config);
                expect(cookieExists('cm_user_preferences')).true;
            });
        });

    });

    describe('User Preference Form', () => {

        beforeEach(() => {
            cookieManager.init(cm_config);
        });

        it('Exists in the DOM', () => {
            const user_preference_form = document.querySelector('form#cm_user_preference_form');
            expect(user_preference_form, 'User preference form does not exist').to.exist;
        });

        describe('User preferences are saved on form submit', () => {

            it('Submit button exists in DOM', () => {
                const user_preference_form = document.querySelector('form#cm_user_preference_form');
                const submit_button = user_preference_form.querySelector('input[type="submit"]');
                expect(submit_button, 'Submit button does not exist on user preference form').to.exist;
            });

            it('Form submit generates user preference cookie', () => {
                const user_preference_form = document.querySelector('form#cm_user_preference_form');
                const submit_button = user_preference_form.querySelector('input[type="submit"]');

                expect(cookieExists('cm_user_preferences')).false;

                document.getElementById('analytics_off').checked = true;
                document.getElementById('feedback_on').checked = true;

                submit_button.click();

                expect(cookieExists('cm_user_preferences')).true;

                const user_preferences = JSON.parse(cookieGet('cm_user_preferences'));

                console.log(cookieGet('cm_user_preferences'));
                console.log(document.body.innerHTML);

                expect(user_preferences['analytics'], 'Expected user preferences for analytics to be off').eql('off');
                expect(user_preferences['feedback'], 'Expected user preferences for feedback to be off').eql('on');
            });
        });

        describe('Form defaults to saved preferences if available', () => {

            beforeEach(() => {
                createUserPreferenceCookie({
                    "analytics": "on",
                    "feedback": "off"
                });

                cm_config['set-checkboxes-in-preference-form'] = true;

                cookieManager.init(cm_config);
            });

            it('Form categories default state reflects current user preferences', () => {

                expect(document.getElementById('analytics_on').checked).eql(true);
                expect(document.getElementById('analytics_off').checked).eql(false);
                expect(document.getElementById('feedback_on').checked).eql(false);
                expect(document.getElementById('feedback_off').checked).eql(true);

            });
        });

    });

    describe('Removal of undefined cookies', () => {

        describe('Undefined cookies are removed', () => {

            beforeEach(() => {
                cm_config['delete-undefined-cookies'] = true;

                // Add Cookies
                cookieAdd('undefined-cookie-a', '', 1);
                cookieAdd('undefined-cookie-b', '', 1);

                cookieManager.init((cm_config));
            });

            it('Cookies no longer exist', () => {
                expect(cookieExists('undefined-cookie-a')).false;
                expect(cookieExists('undefined-cookie-b')).false;
            });
        });

        describe('Undefined cookies are not removed', () => {

            beforeEach(() => {
                cm_config['delete-undefined-cookies'] = false;

                // Add Cookies
                cookieAdd('undefined-cookie-a', '', 1);
                cookieAdd('undefined-cookie-b', '', 1);

                cookieManager.init((cm_config));
            });

            it('Cookies still exist', () => {
                expect(cookieExists('undefined-cookie-a')).true;
                expect(cookieExists('undefined-cookie-b')).true;
            });
        });
    });
});

describe('banner visibility when multiple messages', () => {
    beforeEach(() => {
        clearBody();
        let createBannerMultipleMessages = () => {
            const cookieBanner = document.createElement('div');
            cookieBanner.setAttribute('id', 'cm_cookie_notification_messages');
           
    
            const acceptAllButton = document.createElement('button');
            acceptAllButton.setAttribute('type', 'submit');
            cookieBanner.appendChild(acceptAllButton);
            acceptAllButton.setAttribute('class', 'hidden');
            
            const rejectAllButton = document.createElement('button');
            rejectAllButton.setAttribute('id', 'reject-button');
            rejectAllButton.setAttribute('value', 'reject');
            rejectAllButton.setAttribute('class', 'hidden');
            cookieBanner.appendChild(rejectAllButton);

            const rejectMsg = document.createElement('div');
            rejectMsg.classList.add('govuk-cookie-banner__message')
            cookieBanner.appendChild(rejectMsg);
            const acceptMsg = document.createElement('div');
            acceptMsg.classList.add('govuk-cookie-banner__message')
            cookieBanner.appendChild(acceptMsg);

            document.body.appendChild(cookieBanner);
        };

        let cm_config = {};
        createBannerMultipleMessages();
        cookieManager.init((cm_config));
    });

    it( 'should be hidden if not multiple messages', () => {
        createBanner();
        const cookie_banner_element = document.querySelector('div#cm_cookie_notification');
        expect(cookie_banner_element.classList.contains('hidden'), 'Expected Cookie Banner to be visible').eql(true);

    })
});
