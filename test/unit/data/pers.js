var rewire = require('rewire');
var pers = rewire('data/pers');
var GameObject = require('model/GameObject');
var gsjsBridgeMock = require('../../mock/gsjsBridge');
var pbeMock = require('../../mock/pbe');
var rpcMock = require('../../mock/rpc');
var rcMock = require('../../mock/requestContext');


suite('pers', function() {

	setup(function() {
		pers.__set__('gsjsBridge', gsjsBridgeMock);
		pers.__set__('rpc', rpcMock);
		pers.__set__('reqContext', rcMock);
		pers.init(pbeMock);
		rcMock.reset();
		rpcMock.setLocal(true);
	});
	
	teardown(function() {
		pers.__set__('gsjsBridge', require('model/gsjsBridge'));
		pers.__set__('rpc', require('data/rpc'));
		pers.__set__('reqContext', require('data/requestContext'));
		pers.init(undefined);  // disable mock back-end
		rcMock.reset();
		rpcMock.setLocal(true);
	});
	

	suite('load', function() {
		
		var load = pers.__get__('load');
		
		test('loads local objects and proxifies them', function() {
			var o = {tsid: 'ITEST', some: 'data'};
			pbeMock.write(o);
			var lo = load(o.tsid);
			assert.strictEqual(lo.tsid, 'ITEST');
			var cache = pers.__get__('cache');
			assert.property(cache, o.tsid);
			assert.strictEqual(cache[o.tsid].some, 'data');
			assert.isTrue(cache[o.tsid].__isPP);
		});
		
		test('calls onLoad event', function() {
			var onLoadCalled = false;
			var o = {
				tsid: 'ITEM',
				onLoad: function onLoad() {
					onLoadCalled = true;
				},
			};
			pbeMock.write(o);
			load(o.tsid);
			assert.isTrue(onLoadCalled);
		});
		
		test('does not choke on objref cycles', function() {
			var a = {
				tsid: 'IA',
				ref: {objref: true, tsid: 'IB'},
			};
			var b = {
				tsid: 'IB',
				ref: {objref: true, tsid: 'IA'},
			};
			pbeMock.write(a);
			pbeMock.write(b);
			var la = load(a.tsid);
			var cache = pers.__get__('cache');
			assert.property(cache, a.tsid);
			assert.isTrue(la.ref.__isORP);
			assert.strictEqual(la.ref.tsid, 'IB');
		});
		
		test('does not choke on unavailable objrefs', function() {
			var o = {tsid: 'IO', ref: {objref: true, tsid: 'IUNAVAILABLE'}};
			pbeMock.write(o);
			var lo = load(o.tsid);
			assert.isTrue(lo.ref.__isORP);
		});
		
		test('handles remote objects properly', function() {
			rpcMock.setLocal(false);
			var o = {tsid: 'ITEST', some: 'data'};
			pbeMock.write(o);
			var lo = load(o.tsid);
			assert.isTrue(lo.__isRP, 'is wrapped in RPC proxy');
			assert.isUndefined(lo.__isPP, 'is not wrapped in persistence proxy');
			assert.isDefined(rcMock.objCacheGet('ITEST'), 'in request cache');
			assert.notProperty(pers.__get__('cache'), 'ITEST', 'not in live object cache');
		});
	});


	suite('get', function() {
		
		test('getting an already loaded object reads it from cache', function() {
			var onLoadCalls = 0;
			pbeMock.write({
				tsid: 'I1',
				onLoad: function onLoad() {
					onLoadCalls++;
				},
			});
			pers.get('I1');
			assert.strictEqual(pbeMock.getCounts().read, 1);
			assert.strictEqual(onLoadCalls, 1);
			pers.get('I1');
			assert.strictEqual(pbeMock.getCounts().read, 1);
			assert.strictEqual(onLoadCalls, 1);
		});
		
		test('if an object is already in the request cache, get it from there', function() {
			rcMock.objCachePut({tsid: 'IA'});
			assert.strictEqual(pers.get('IA').tsid, 'IA');
			assert.strictEqual(pbeMock.getCounts().read, 0);
		});
	});
	
	
	suite('add', function() {

		test('adds objects to the live object cache, proxifies them and flags them as dirty', function() {
			var o = {
				tsid: 'I123',
				something: 'dumb',
			};
			var p = pers.add(o);
			var cache = pers.__get__('cache');
			assert.property(cache, o.tsid);
			assert.strictEqual(cache[o.tsid].something, 'dumb');
			assert.isTrue(p.__isPP);
			assert.isTrue(cache[o.tsid].__isPP);
			assert.deepEqual(rcMock.getDirtyList(), ['I123']);
		});
	});
	
	
	suite('processDirtyList', function() {
	
		test('does the job', function() {
			var dlist = {
				I1: new GameObject({tsid: 'I1'}),
				I2: new GameObject({tsid: 'I2', deleted: true}),
				P1: new GameObject({tsid: 'P1', deleted: false}),
			};
			pers.processDirtyList(dlist);
			assert.strictEqual(pbeMock.getCounts().write, 2);
			assert.strictEqual(pbeMock.getCounts().del, 1);
		});
	});
});