'use strict';

/**
 * Client session management module.
 *
 * @module
 */

// public interface
module.exports = {
	init: init,
	newSession: newSession,
	getSessionCount: getSessionCount,
};


var Session = require('comm/Session');
var metrics = require('metrics');

var sessions = {};


function init() {
	sessions = {};
	metrics.setupGaugeInterval('session.count', getSessionCount);
}


function newSession(socket) {
	var id = genSessionId();
	var session = new Session(id, socket);
	sessions[id] = session;
	session.on('close', onSessionClose);
	return session;
}


function genSessionId() {
	return (+new Date()).toString(36);
}


function onSessionClose(session) {
	log.info('unlink %s', session);
	delete sessions[session.id];
}


/**
 * Gets the number of currently active client sessions (active meaning
 * connected, not necessarily logged in).
 *
 * @returns {number} the active session count
 */
function getSessionCount() {
	if (!sessions) return 0;
	return Object.keys(sessions).length;
}
