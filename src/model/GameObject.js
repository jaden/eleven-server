'use strict';

module.exports = GameObject;


var config = require('config');
var utils = require('utils');


GameObject.prototype.TSID_INITIAL = 'G';
GameObject.prototype.__isGO = true;

/**
 * Generic constructor for both instantiating an existing game object
 * (from JSON data), and creating a new object.
 *
 * @param {object} [data] initialization values (properties are
 *        shallow-copied into the game object)
 * @constructor
 */
function GameObject(data) {
	if (!data) data = {};
	// initialize TSID/class ID (use deprecated properties if necessary, and
	// keep them as non-enumerable so they are available, but not persisted)
	this.tsid = data.tsid || data.id || utils.makeTsid(this.TSID_INITIAL,
		config.getGsid());
	utils.addNonEnumerable(this, 'id', this.tsid);  // deprecated
	if (data.class_tsid || data.class_id) {
		this.class_tsid = data.class_tsid || data.class_id;
		utils.addNonEnumerable(this, 'class_id', this.class_tsid);  // deprecated
	}
	// copy supplied data
	// TODO: remove 'dynamic' partition in fixture data, and get rid of special handling here
	var key;
	for (key in data.dynamic) {
		if (!(key in this)) {
			this[key] = data.dynamic[key];
		}
	}
	for (key in data) {
		if (key !== 'dynamic' && !(key in this)) {
			this[key] = data[key];
		}
	}
	if (!this.ts) {
		this.ts = new Date().getTime();
	}
}


/**
 * Creates a processed shallow copy of this game object's data,
 * prepared for serialization.
 *
 * The returned data only contains non-function-type direct ("own")
 * properties whose name does not start with a "!". Complex
 * `object`-type properties (specifically, references to other game
 * objects) are not handled separately here, i.e. the caller may need
 * to replace those with appropriate reference structures before actual
 * serialization (see {@link module:data/objrefProxy~refify|
 * objrefProxy.refify}).
 *
 * @returns {object} shallow copy of the game object, prepared for
 *          serialization
 */
GameObject.prototype.serialize = function() {
	var ret = {};
	var keys = Object.keys(this);  // Object.keys only includes own properties
	for (var i = 0; i < keys.length; i++) {
		var k = keys[i];
		if (k[0] !== '!') {
			var val = this[k];
			if (typeof(val) !== 'function') {
				ret[k] = val;
			}
		}
	}
	return ret;
};


/**
 * @returns {string}
 */
GameObject.prototype.toString = function() {
	return '[' + this.constructor.name + '#' + this.tsid + ']';
};
