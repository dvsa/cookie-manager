# Cookie Manager

Cookie Manager is a Javascript library for dealing with cookie compliance.

It can handle removing cookies the user does not consent to or are not defined in the manifest.
It can also handle the storing of user preferences when it comes to cookies, and displaying a banner when no
preferences have been set.

## Installation

NPM

```bash
npm install @dvsa/cookie-manager
```

## Usage

Include the `cookie-manager.js` script on your web pages:

```html
<script src="./cookie-manager.js"></script>
```

Invoke the Cookie Manager by calling init() with a config:

```javascript
cookieManager.init(configuration_object);
```

### Feature: Cookie Banner

To disable this functionality, set the configuration value of `cookie-banner-id` to `false` or remove the definition.

If you want functionality to display a cookie banner when user preferences have not been set (or expired)
then build your cookie banner markup, and give the wrapping element an ID and match it with the configuration value
`cookie-banner-id`, and a class which makes it hidden and match that to the configuration value
`cookie-banner-visibility-class`; the library will remove the hidden class if it cannot find a user preference cookie
(or if the content of the cookie is invalid).

If the banner includes a `button` element with the type `submit` the library will also bind to the `click` event of the
button and upon user click, mark all optional categories as opt-in. The banner's hidden class will then be restored.

```html
<header id="cookie_banner" class="hidden">
    <h2>Tell us whether you accept cookies</h2>
    <p>We use cookies to collect information about how you use GOV.UK. We use this information to make the website work as well as possible and improve government services.</p>
    <button type="submit" class="btn">Accept all cookies</button>
    <a class="btn" href="set-preferences-page.html">Set cookie preferences</a>
</header>
```

### Feature: User Preferences Saving

To disable this functionality, set the configuration value of `user-preference-configuration-form-id` to `false` or remove the definition.

If you want functionality to setup a user preference cookie, then you need to define a HTML form with an ID and match
that to the configuration value `user-preference-configuration-form-id`. Upon initialisation, the library will look
for the form when the DOM is ready, and bind to the `submit` event. When submitted, the library will collect the
value of all radio buttons with the `checked` state. The name of the radio buttons **must**
reflect the category name for cookies defined in your manifest. The values for the radio buttons must be `on` and `off`.

```html
<form id="cm_user_preference_form">
    <fieldset>
        <legend>Analytics:</legend>
        <input type="radio" name="analytics" value="on" /> On <br/>
        <input type="radio" name="analytics" value="off" checked /> Off <br/>
    </fieldset>

    <fieldset>
        <legend>Feedback:</legend>
        <input type="radio" name="feedback" value="on" /> On <br/>
        <input type="radio" name="feedback" value="off" checked /> Off <br/>
    </fieldset>

    <input type="submit" value="Save Preferences"/>
</form>
```

## Configuration

Configuration is done when calling `init()` on the Cookie Manager object and is used to determine how you want the
Cookie Manager to behave, and defines a manifest of cookies used on your site.

Using this method, it allows developers to use the native configuration in their application and it should be as
simple as serialising the top-level configuration object/array for Cookie Manager to JSON and putting the result into
the init() function (either as a variable or directly):

```javascript
cm.init(
  {
    "delete-undefined-cookies": true,
    "...": "..."
  }
);
```

### Configuration Schema

### 
```json
{
  "delete-undefined-cookies": true,
  "user-preference-cookie-name": "cm-user-preferences",
  "user-preference-cookie-secure": false,
  "user-preference-cookie-expiry-days": 365,
  "user-preference-configuration-form-id": "cookie-manager-form",
  "cookie-banner-id": "cm_cookie_notification",
  "cookie-banner-visibility-class": "hidden",
  "cookie-banner-visible-on-page-with-preference-form": false,
  "cookie-manifest": [
    {
      "category-name": "essential",
      "optional": false,
      "cookies": [
        "essential-cookie",
        "another-essential-cookie",
        "some-imperva-cookie",
        "some-other-imperva-cookie"
      ]
    },
    {
      "category-name": "analytics",
      "optional": true,
      "cookies": [
        "_ga",
        "_gtm"
      ]
    },
    {
      "category-name": "feedback",
      "optional": true,
      "cookies": [
        "_hotjar",
        "_surveything"
      ]
    }
  ]
}
```

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.

## License
[MIT](https://choosealicense.com/licenses/mit/)
