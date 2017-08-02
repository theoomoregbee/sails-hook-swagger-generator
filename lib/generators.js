/**
 * Created by theophy on 02/08/2017.
 *
 * this is used to generate our tags from our sails
 */

var _ = require("lodash");
var parsers = require("./parsers");

/**
 * this is used to parse models to tags just the globalId is picked to gather our
 * tags
 * @param models
 * @returns {Array}
 * @private
 */
function _generateModels(models) {
    var tags = [];

    _.forEach(models, function (model) {

        // Do tagging for  all models. Ignoring associative tables
        if (model.globalId) {
            tags.push({name: model.globalId});
        }
    });

    return tags;
}

/**
 * this generates our definitions from our models and returns the equivalent swagger specification
 * @param models
 * @returns {{}}
 * @private
 */
function _generateDefintions(models) {
    var defintions = {};

    _.forEach(models, function (model) {
        // Do tagging for  all models. Ignoring associative tables
        if (model.globalId) {
            defintions[model.identity] = parsers.attributes(model.attributes);
        }
    });


    return defintions;
}


module.exports = {
    tags: _generateModels,
    definitions: _generateDefintions
};

