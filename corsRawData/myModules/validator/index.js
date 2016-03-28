var net = require('net');

//var isValidObject = function(inputObj, standardObj, myFn) {
//	var result = true;
//	// var standardObj = getStandard(StdObjName);
//
//	for ( var element in standardObj) {
//
//		if (inputObj[element]) {
//
//			switch (standardObj[element]) {
//			case 'ipv4':
//				inputObj[element] = net.isIPv4(inputObj[element]);
//				result = result && inputObj[element];
//				break;
//
//			case 'port':
//				if (inputObj[element] <= 65536 && inputObj[element] > 0) {
//					inputObj[element] = true;
//				} else {
//					inputObj[element] = false;
//				}
//				result = result && inputObj[element];
//				break;
//
//			case 'number':
//				inputObj[element] = Number(inputObj[element]);
//				break;
//
//			default:
//				break;
//			}
//
//		} else {
//			result = false;
//		}
//	}
//
//	myFn(result);
//	return inputObj;
//};

var isValidIPv4 = function(input, myFn) {
	try {
		return net.isIPv4(input);
	} catch (e) {
		myFn(e);
		return false;
	}
};

var isValidPort = function(input, myFn) {
	try {
		if (input < 65536 && input > 0) {
			return true;
		} else {
			return false;
		}
	} catch (e) {
		myFn(e);
		return false;
	}
};

var isValidNumber = function(input, myFn) {
	try {
		if ( input.toString().match(/[^0-9]/) ) {
			return false;
		} else {
			return true;
		}
	} catch (e) {
		myFn(e);
		console.log(e);
		return false;
	}
};

module.exports = {
		isValidIPv4 : isValidIPv4,
		isValidPort : isValidPort,
		isValidNumber : isValidNumber
};
