"use strict";

const cookieManager = (function () {

    // Prevents JavaScript errors when running on browsers without console/log.
    if(typeof console === "undefined") {
        console = {
            log: function() {},
            info: function() {},
            debug: function() {},
            warn: function() {},
            error: function() {}
        };
    }

    const defaultOptions = {
        "delete-undefined-cookies": true,
        "user-preference-cookie-name": "cm-user-preferences",
        "user-preference-cookie-secure": false,
        "user-preference-cookie-expiry-days": 365,
        "user-preference-configuration-form-id": false,
        "user-preference-saved-callback": false,
        "cookie-banner-id": false,
        "cookie-banner-visibility-class": "hidden",
        "cookie-banner-visible-on-page-with-preference-form": true,
        "cookie-manifest": []
    };

    const init = function (custom_options) {
        let options = defaultOptions;

        for (const item in custom_options) {
            options[item] = custom_options[item];
        }

        console.debug(options);

        manageCookies(options);
        findAndBindPreferencesForm(options);
        findAndBindCookieBanner(options);
    };

    const manageCookies = function(config) {

        const cm_cookie = config['user-preference-cookie-name'];
        const cm_user_preferences = getUserPreferences(cm_cookie);

        if (!cm_user_preferences) {
            console.info(
                'User preference cookie is not set or valid. ' +
                'This cookie defines user preferences. ' +
                'Assuming non-consent, and deleting all non-essential cookies if config allows.'
            );
        }

        const current_cookies = decodeURIComponent(document.cookie).split(';');

        // If there are no cookies set
        if (current_cookies.length === 1 && current_cookies[0].match(/^ *$/)) {
            return;
        }

        for (var i = 0; i < current_cookies.length; i++) {

            const cookie_name = current_cookies[i].split(/=(.*)/)[0].trim();

            // Skip, if cookie is user preferences cookie
            if (cookie_name === cm_cookie) {
                continue;
            }

            const cookie_category = getCookieCategoryFromManifest(cookie_name, config);

            if (cookie_category === false) {
                if (config['delete-undefined-cookies']) {
                    console.info(`Cookie "${cookie_name}" is not in the manifest and "delete-undefined-cookies" is enabled; deleting.`);
                    deleteCookie(cookie_name);
                } else {
                    console.info(`Cookie "${cookie_name}" is not in the manifest and "delete-undefined-cookies" is disabled; skipping.`);
                }
                continue;
            }

            if (cookie_category['optional'] === false) {
                console.debug(`Cookie "${cookie_name}" is marked as non-optional; skipping.`);
                continue;
            }

            if (!cm_user_preferences || cm_user_preferences.hasOwnProperty(cookie_category['category-name']) === false) {
                console.info(`Cookie "${cookie_name}" is listed  Cannot find category "${cookie_category['category_name']}" in user preference cookie "${cm_cookie}"; assuming non-consent; deleting.`);
                deleteCookie(cookie_name);
                continue;
            }

            if (cm_user_preferences[cookie_category['category-name']] === 'off' || cm_user_preferences[cookie_category['category-name']] === 'false') {
                console.info(`Cookie "${cookie_name}" is listed under category "${cookie_category['category-name']}"; user preferences opts out of this category; deleting.`);
                deleteCookie(cookie_name);
                continue;
            }

            console.info(`Cookie "${cookie_name}" is listed under category "${cookie_category['category-name']}"; user preferences opts in-to this category; cleared for use.`);
        }

        console.debug(`Finishing processing all cookies.`);
    };

    const getUserPreferences = function(cm_cookie) {

        const cookie = getCookie(cm_cookie);

        if (!cookie) {
            return false;
        }

        try {
            return JSON.parse(cookie);
        } catch (e) {
            console.error(`Unable to parse user preference cookie "${cm_cookie}" as JSON.`, e);
            return false;
        }
    };

    const getCookieCategoryFromManifest = function(cookie_name, configuration) {

        const cookie_manifest = configuration['cookie-manifest'];

        for (var i = 0; i < cookie_manifest.length; i++) {
            const category_cookies = cookie_manifest[i]['cookies'];
            for (var x = 0; x < category_cookies.length; x++) {
                const cookie_prefix = category_cookies[x];
                if (cookie_name.startsWith(cookie_prefix)) {
                    console.debug(`Cookie "${cookie_name}" found in manifest.`);
                    return cookie_manifest[i];
                }
            }
        }
        console.debug(`Cookie "${cookie_name}" NOT found in manifest.`);
        return false;
    };

    const getCookie = function(cookie_name) {
        const name = cookie_name + "=";
        const decoded_cookie = decodeURIComponent(document.cookie);
        const cookie_array = decoded_cookie.split(';');

        for(var i = 0; i < cookie_array.length; i++) {
            let cookie_part = cookie_array[i];
            while (cookie_part.charAt(0) === ' ') {
                cookie_part = cookie_part.substring(1);
            }
            if (cookie_part.indexOf(name) === 0) {
                return cookie_part.substring(name.length, cookie_part.length);
            }
        }
        return false;
    };

    const deleteCookie = function(cookie_name) {
        document.cookie = cookie_name + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/;';
        document.cookie = cookie_name + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT;domain='+window.location.hostname +';path=/;';
        document.cookie = cookie_name + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT;domain=.'+window.location.hostname +';path=/;';

        let firstDot = window.location.hostname.indexOf('.');
        let upperDomain = window.location.hostname.substring(firstDot);
        document.cookie = cookie_name + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT;domain='+upperDomain;
        console.debug(window.location.hostname);
        console.debug(upperDomain);

        console.debug(`Deleted cookie "${cookie_name}"`);
    };

    const setCookie = function(configuration, cookie_value) {

        const cookie_name = configuration['user-preference-cookie-name'];

        let cookie_secure = configOptionIsTrue(configuration, 'user-preference-cookie-secure');

        let cookie_expiry_days = 365;
        if (configOptionIsNumeric(configuration, 'user-preference-cookie-expiry-days')) {
            cookie_expiry_days = configuration['user-preference-cookie-expiry-days'];
        }

        const date = new Date();
        date.setTime(date.getTime() + (cookie_expiry_days * 24 * 60 * 60 * 1000));
        const expires = "expires="+date.toUTCString();
        let cookie_raw = cookie_name + "=" + encodeURIComponent(cookie_value) + ";" + expires + ";path=/";
        if (cookie_secure) {
            cookie_raw += ";secure";
        }
        document.cookie = cookie_raw;
    };

    const findAndBindPreferencesForm = function(configuration) {

        if (!configOptionIsString(configuration, 'user-preference-configuration-form-id')
        ) {
            console.debug("Skipping binding to user cookie preference form.");
            return;
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                findAndBindPreferencesForm(configuration);
            });
            console.debug("DOM is not ready; adding event to bind to form when ready.");
            return;
        }

        const theForm = getForm(configuration);
        if (theForm !== null) {
            theForm.addEventListener('submit', function(e) {
                savePreferencesFromForm(e, configuration);
                manageCookies(configuration);
                checkShouldCookieBannerBeVisible(configuration);
            });
            console.debug(`Found and bound to cookie preference form with ID "${configuration['user-preference-configuration-form-id']}".`);
        }
        setPreferencesInForm(configuration);
    };

    const getForm = function (configuration) {
        return document.getElementById(configuration["user-preference-configuration-form-id"]);
    }

    const setPreferencesInForm = function (configuration) {
        if (configOptionIsFalse(configuration, 'set-checkboxes-in-preference-form')) {
            console.log("Skipping set preferences in form");
            return;
        }

        const theForm = getForm(configuration);
        const userPreferences = getUserPreferences(configuration['user-preference-cookie-name']);

        for (const category in userPreferences)
        {
            let checkBoxes = theForm.querySelectorAll('input[name="'+category+'"]');
            for (let n = 0; n < checkBoxes.length; n++){
                if (userPreferences.hasOwnProperty(category)) {
                    checkBoxes[n].checked = checkBoxes[n].value === userPreferences[category];
                }
            }
        }
    }

    const savePreferencesFromForm = function (event, configuration) {
        event.preventDefault();

        console.debug('Saving user cookie preferences from Form...');

        const theForm = document.getElementById(configuration["user-preference-configuration-form-id"]);
        const radioInputs = theForm.querySelectorAll('input[type="radio"]:checked');

        const categories = {};

        for (var i = 0; i < radioInputs.length; i++) {
            const node = radioInputs.item(i);
            const attr_name = node.getAttribute('name');
            const attr_value = node.getAttribute('value');
            console.log(`Processing Radio: ${attr_name} = ${attr_value})}`, i);
            categories[node.getAttribute('name')] = node.getAttribute('value');
        }

        savePreferences(configuration, categories);

        if (configuration['user-preference-saved-callback'] !== false && typeof configuration['user-preference-saved-callback'] === 'function') {
            configuration['user-preference-saved-callback']();
        }

    };

    const savePreferencesFromCookieBannerAcceptAll = function (event, configuration) {
        event.preventDefault();

        console.debug('Saving user cookie preferences from Cookie Banner (accept all)...');

        const categories = {};

        for (var i = 0; i < configuration['cookie-manifest'].length; i++) {
            const category = configuration['cookie-manifest'][i];
            if (category['optional']) {
                categories[category['category-name']] = 'on';
            }
        }

        savePreferences(configuration, categories);
    };

    const savePreferences = function(configuration, user_cookie_preferences) {
        setCookie(configuration, JSON.stringify(user_cookie_preferences));
        console.debug('Saved user cookie preferences to cookie', getCookie(configuration['user-preference-cookie-name']));
    };

    const findAndBindCookieBanner = function (configuration) {
        if (!configOptionIsString(configuration, 'cookie-banner-id')
            && !configOptionIsString(configuration, 'cookie-banner-visibility-class')
        ) {
            console.debug('Skipping binding to cookie banner as both cookie-banner-id and cookie-banner-visibility-class are not defined');
            return;
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                findAndBindCookieBanner(configuration);
            });
            console.debug('DOM is not ready; adding event to bind to cookie banner when ready.');
            return;
        }

        const theBanner = document.getElementById(configuration['cookie-banner-id']);
        const acceptAllButton = document.querySelector('button[type="submit"]');
        if (theBanner !== null && acceptAllButton !== null) {
            acceptAllButton.addEventListener('click', function(e) {
                savePreferencesFromCookieBannerAcceptAll(e, configuration);
                manageCookies(configuration);
                checkShouldCookieBannerBeVisible(configuration);
            });
            console.debug(`Found and bound to cookie banner with ID "${configuration['cookie-banner-id']}".`);
            checkShouldCookieBannerBeVisible(configuration);
        }
    };

    const checkShouldCookieBannerBeVisible = function(configuration) {

        const theBanner = document.getElementById(configuration['cookie-banner-id']);
        const bannerVisibilityClass = configuration['cookie-banner-visibility-class'];
        if (theBanner === null && bannerVisibilityClass === null) {
            console.error('Cannot work with cookie banner unless cookie-banner-id and cookie-banner-visibility-class are configured.');
            return;
        }

        const user_preference_form = document.getElementById(configuration['user-preference-configuration-form-id']);
        const visible_on_preference_page = configuration['cookie-banner-visible-on-page-with-preference-form'];

        if (user_preference_form !== null && visible_on_preference_page === false) {
            return;
        }

        const cm_cookie = configuration['user-preference-cookie-name'];
        if (getUserPreferences(cm_cookie)) {
            // User has preferences set, no need to show cookie banner.
            if (!theBanner.classList.contains(bannerVisibilityClass)) {
                theBanner.classList.add(bannerVisibilityClass);
                console.debug('Cookie banner was set to visible.')
            }
        } else {
            theBanner.classList.remove(bannerVisibilityClass);
            console.debug('Cookie banner was set to visible.')
        }


    };

    const scriptError = function (message) {
        throw new Error(`CookieManager script cannot continue.\n\n${message}`);
    };

    const isValidDays = function(days) {
        return (days ^ 0) === days;
    };

    const configOptionIsTrue = function (configuration, optionName) {
        return configuration.hasOwnProperty(optionName) && configuration[optionName] === true;
    };

    const configOptionIsFalse = function (configuration, optionName) {
        if (configuration.hasOwnProperty(optionName)) {
            return configuration[optionName] === false;
        }
        return true;
    };

    const configOptionIsNumeric = function (configuration, optionName) {
        return configuration.hasOwnProperty(optionName)
            && !isNaN(configuration[optionName]);
    };

    const configOptionIsString = function (configuration, optionName) {
        return configuration.hasOwnProperty(optionName)
            && typeof configuration[optionName] === 'string'
            && configuration[optionName].trim() !== '';
    };

    return {
        init: init
    }

})();

module.exports = cookieManager;
