# HMIS Dictionary
(08/09/2017)

The HMIS Dictionary is made to simplify user access to terminology and details associated with the data model. The application counts 4 panels:
- DataSets
- Search (limited to the aggregated domain as of 1.0.0)
- Programs
- Custom 'Dossiers' (with additional configuration)

NB: HMIS refers to Health Information Management System

## Panels

- **DataSets**: displays the list of sections, data elements and associated category combos
- **Search**: a search tool to access directly data elements (aggregate domain) and indicators
- **Programs**: displays the list of sections, data elements with optionSets, Program indicators, Indicators, Tracked Entity Attributes, Program Rules, Program Rule Variables and Program Resources
- **Dossiers**: displays list of data sets and indicator groups by 'service'
- **Admin**: configuration of the Dossiers panel and 'service' concept

## Configuration

The configuration relies on the following elements that have to be defined through the Maintenance app:
- an *organisationUnitGroupSet* that gather all the elements of the typology of services,
- the typology of services itself, each one is an *organisationUnitGroup* with a unique code: "OUG_HSV_#CODE#", their description are stored in tranlsations (description is only available in translations as of dhis v2.25),
- then *dataSets* and *indicatorGroups* have one attribute, repectively "DS_#CODE1#_#CODE2#..." and "ING_#CODE2#" that permits the direct association with the typology of services (association with multiple services is allowed),
- finally the *dataElements* are associated via the *sections* to the dataSets and the *indicators* are associated directly to the indicatorGroups (*dataElements* outside of *sections* would not appear).
- in *indicators* the descriptions of numerators and denominators cannot be translated (as of dhis v2.25) so the key words "NUM:" and "DENOM:" (both compulsory) are used in *indicators* descriptions (which have a translation).
- an *attribute* for *programs* where the associated resources are referenced by ID in the following format: "(ID1;ID2;...)". This *attribute* has to have its code field set to: "HMIS-Dict_Resources".

Some elements are defined at the **Admin** panel:
- The uid of the *organisationUnitGroupSet*
- The name of the group of user with editing right in the **Dossier** panel and the **Admin** panel too
- *dataSets* and *indicatorGroups* can be blacklisted

Some elements are still hardcoded:
- The search panel will not show *dataElements* or *indicators* that are not associated to a *dataSet* or an *indicatorGroup*
- Only *dataElements* in the aggregated domain are currently taken into account: [app/search/search.services.js#L7](https://github.com/msf-ocba/HMIS_Dictionary/blob/master/app/search/search.services.js#L7), [app/search/search.services.js#L11](https://github.com/msf-ocba/HMIS_Dictionary/blob/master/app/search/search.services.js#L11) and [app/search/search.services.js#L14](https://github.com/msf-ocba/HMIS_Dictionary/blob/master/app/search/search.services.js#L14)
- The app is currently available in English, French, Spanish and Portuguese and uses the content of DHIS2 in these 4 languages (as available per MSF OCBA configuration): [app/app.config.js#L60](https://github.com/msf-ocba/HMIS_Dictionary/blob/master/app/app.config.js#L60), [app/dossiersEditor/dossiersEditor.controllers.js#L44](https://github.com/msf-ocba/HMIS_Dictionary/blob/master/app/dossiersEditor/dossiersEditor.controllers.js#L44) and [languages/](https://github.com/msf-ocba/HMIS_Dictionary/tree/master/languages).

## Setup and Installation

Build the app running:

```console
shell:~$ yarn install # first time only
shell:~$ yarn build
```
This will create a `hmis-dictionary.zip` file that can be manually installed in DHIS2 App Management.

## Development

The above mentioned method of deploying the app is not suited for development. To deploy a local instance of the app use:
```console
shell:~$ HOST=<address> PORT=<port> REACT_APP_DHIS2_BASE_URL=<dhis2_instance_url> REACT_APP_DHIS2_AUTH=<user:passwd> yarn start
```
For example:
```console
shell:~$ HOST=localhost PORT=8082 REACT_APP_DHIS2_BASE_URL=http://localhost:8080 REACT_APP_DHIS2_AUTH='admin:district' yarn start
```

This deploys a [http-server](https://github.com/http-party/http-server) serving the app with a proxy to the DHIS2 instance to serve the DHIS2 API calls.
The `yarn start` command reads the variables present in `.env.local` to start the local server. Use `.env` as a template to create it.

The app package manager has been migrated from `bower` to `yarn` with [bower-away](https://github.com/sheerun/bower-away). The `build-bower-deps.sh` script is used as a postinstall script to make a copy of the necessary files to the `bower_components` folder to avoid uploading unnecessary files with the app build zip file.

## Feedback

hmis@barcelona.msf.org
