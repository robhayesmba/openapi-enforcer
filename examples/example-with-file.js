'use strict'

const Enforcer = require('../')

// JSON and YAML files accepted
Enforcer('/Users/robhayes/go/src/git.cglcloud.com/API-Platform/apiplatform-policy-api/oapi_spec.yml', { fullResult: true })
    .then(function ({ error, warning }) {
        if (!error) {
            console.log('No errors with your document')
            if (warning) console.warn(warning)
        } else {
            console.error(error)
        }
    })