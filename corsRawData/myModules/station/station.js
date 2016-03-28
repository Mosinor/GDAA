// This module is developed to operate as a data terminal.
// The main purpose is to do following task:
//						- capability of receive data via various types of link
//						- capability of redundancy for input links, so it should be able to
//						  use one link as data provider and switch to other links in case of outage
//						- it should be able to provide data in various types simultaneously 

var net = require('net');
var EventEmitter = require('events').EventEmitter;

// The object Station with following properties and methods
/* Station = {
 * name: 
 * code:
 * enabled:
 * providerEvent:
 * consumerEvent:
 * links:
 * addTcpClient:
 * addTcpServer:
 * activeLink:
 * deactiveLink:
 * removeLink:
 * isLinkAvailable:
 * }

*/

var Station = function(stationName, stationCode) {
	var thisObject = this;

	var checkSocketList = {dataProvider: [] , dataConsumer: []};
	var checkServerList = {dataProvider: [] , dataConsumer: []};
	
	this.name = stationName;
	this.code = stationCode;
	this.enabled = false;
	
	this.providerEvent = new EventEmitter();
	this.consumerEvent = new EventEmitter();
	// the "links" is an array of object elements, the objects are contain all of properties of a link 
	this.links = [];

	// the variable "isDataProvided" is created to inform data consumers for existence of new data
	// when providerEvent generates a new event of type "dataIsReady" or "dataTimeout"  the value of
	// this variable changes...
	var isDataProvided = false;
	this.providerEvent.on('dataIsReady', function() {
		isDataProvided = true;
	});
	this.providerEvent.on('dataTimeout', function() {
		isDataProvided = false;
	});
	
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//								FUNCTIONS FOR CREATING/REMOVING LINKS
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
	
	// this function create a TCP client link and add it as a new element to the end of links array 
	this.addTcpClient = function(priority, cb) {
		var client = new net.Socket();
		this.links.push({type: 'tcpClient', priority: priority, body: client, connections: [], options: {}, activated: false});
		if (cb) {
			var index = this.links.length - 1;
			return cb(index);
		} else {
			return;
		}
	};
	
	// this function create a tcp server link and add it as a new element to the end of links array 
	this.addTcpServer = function(priority, cb) {
		var server = new net.createServer();
		this.links.push({type: 'tcpServer', priority: priority, body: server, connections: [], options: {}, activated: false});
		if (cb) {
			var index = this.links.length - 1;
			return cb(index);
		} else {
			return;
		}
	};

	this.removeLink = function(link, cb) {
		var index = thisObject.links.indexOf(link);
		this.deactiveLink(link, function(err) {
			if (err) {
				if (cb) return cb(err);
			} else {
				thisObject.links.splice(index, 1);
				if (cb) return cb();
			}
		});
	};
	
	
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//					FUNCTIONS FOR ACTIVE/DEACTIVE/REMOVE/AVAILABILITY OF LINKS
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

	// this function activate a link based on its properties and type, actually a link is a raw socket
	// and before starting this socket, its configuration should be set. 
	this.activeLink = function(link, options, cb) {
		if (thisObject.enabled === false) return cb('The station is disabled');
		var myShouter;
		if (link.priority < 0) {
			myShouter = this.consumerEvent;
		} else {
			myShouter = this.providerEvent;
		}
		switch (link.type) {
		case 'tcpClient':
			link.options = options;
			link.activated = true;
		
			link.body.connect(options.port, options.host);
			
			link.body.on('connect', function() {
				myShouter.emit('connected', link.body);
			});
			link.body.on('data', function(data) {
				myShouter.emit('dataIsReady', data);
//				console.log(data.toString());
			});
			link.body.on('error', function(error) {
				console.log(error);
			});
			
			
			addToSocketCheckList(link);

			break;

		case 'tcpServer':
			link.options = options;
			link.activated = true;
			link.body.listen(options.port);
			
			link.body.on('listening', function() {
				//console.log(link.body);
			});
			link.body.on('connection', function(sock) {
				//console.log(link.body);

				myShouter.emit('newConnection', sock);
				sock.on('data', function(data) {
					myShouter.emit('dataIsReady', data);
				});
				link.connections.push(sock);
			});
			link.body.on('error', function(error) {
				//console.log(link.body);
				console.log(error);
			});
			
			addToServerCheckList(link);

			break;

		default:
			break;
		}
	};
	
	this.deactiveLink = function(link, cb) {

		switch (link.type) {
		case 'tcpClient':
			link.body.end();
			link.body.destroy();
			link.body.on('close', function(had_error) {
				link.activated = false;
				removeFromSocketCheckList(link);
				if (had_error === true) {
					if (cb) return cb('had_error');
				} else {
					if (cb) return cb();
				}
			});
			break;

		case 'tcpServer':
			link.body.close();
			link.connections.forEach(function(sock, i) {
				sock.end();
				sock.destroy();
			});
			link.body.unref();
			link.body.on('close', function(err) {
				link.activated = false;
				removeFromServerCheckList(link);
				console.log('removeFromServerCheckList(link)');
				if (cb) return cb(err);
			});
			
			link.body.on('error', function(err) {
				console.log('new error');
			});
			
			break;

		default:
			break;
		}
	};
	
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//			FUNCTIONS FOR DEALING WITH SOCKETS & SERVER LIST FOR CHECKING REASONES
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

	this.isLinkAvailable = function(options, cb) {
		var test = new net.Socket();

		test.connect(options);
		test.on('connect', function() {
			test.end();
			test.destroy();
			if (cb) return cb();

		});
		
//		test.on('close', function() {
//			console.log('successfully closed!');
//		});
//		
		test.on('error', function(error) {
			if (cb) return cb(error);
		});
	};
	
	
	
	var addToSocketCheckList = function(link) {
		if(link.priority > 0) {
			checkSocketList.dataProvider.push(link);
		} else if (link.priority < 0){
			checkSocketList.dataConsumer.push(link);
		}
	};
	
	var removeFromSocketCheckList = function(link) {
		var i;
		if(link.priority > 0) {
			i = checkSocketList.dataProvider.indexOf(link);
			checkSocketList.dataProvider.splice(i, 1);
		} else if (link.priority < 0){
			i = checkSocketList.dataConsumer.indexOf(link);
			checkSocketList.dataConsumer.splice(i, 1);
		}
	};

	var addToServerCheckList = function(link) {
		if(link.priority > 0) {
			checkServerList.dataProvider.push(link);
		} else if (link.priority < 0){
			checkServerList.dataConsumer.push(link);
		}
	};
	
	var removeFromServerCheckList = function(link) {
		var i;
		if(link.priority > 0) {
			i = checkServerList.dataProvider.indexOf(link);
			checkServerList.dataProvider.splice(i, 1);
		} else if (link.priority < 0){
			i = checkServerList.dataConsumer.indexOf(link);
			checkServerList.dataConsumer.splice(i, 1);
		}
	};

	var linkProblem = function(link) {
		if (link.priority > 0){
			thisObject.providerEvent.emit('linkProblem', link);
		} else {
			thisObject.consumerEvent.emit('linkProblem', link);
		}
	};

	var linkHealty = function(link) {
		if (link.priority > 0){
			thisObject.providerEvent.emit('linkHealty', link);
		} else {
			thisObject.consumerEvent.emit('linkHealty', link);
		}
	};

	
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//									FUNCTIONS FOR CHECKING SOCKETS
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

	
	var checkSocketInterval = setInterval(function() {

		checkSocketList.dataProvider.forEach(function(link, i) {
			var temp = link.body.bytesRead;
			setTimeout(function() {
				if (link.body.bytesRead === temp) {
					providerEvent.emit('dataTimeout');
					//isDataProvided = false;
				}
				if (link.body._connecting === false
						&& link.body.bytesRead === temp
						&& link.activated === true) {

					linkProblem(link);
				} else {
					linkHealthy(link);
				}
			}, 5000);

		});

		checkSocketList.dataConsumer.forEach(function(link, i) {
			var temp = link.body._bytesDispatched;
			setTimeout(function() {
				if (link.body._connecting === false
						&& link.body._bytesDispatched === temp
						&& link.activated === true
						&& isDataProvided === true) {

					linkProblem(link);
				} else {
					linkHealthy(link);
				}
			}, 5000);

		});

		checkServerList.dataProvider.forEach(function(link, i) {
			if (!link.body._handle) {
				linkProblem(link);
			} else {
				linkHealthy(link);
			}
		});

		checkServerList.dataConsumer.forEach(function(link, i) {
			if (!link.body._handle) {
				linkProblem(link);
			} else {
				linkHealthy(link);
			}
		});

		
	}, 10000);
	
};


module.exports = function(stationName, stationCode, cb) {
	var myStation = new Station(stationName, stationCode);
	if (cb) {
		cb();
	}
	return myStation;
};





