var fs = require('fs');
var path = require('path');
var process = require('child_process');

var serveStaticFiles = require('../serveStaticFiles');


var sortByProperty = function (property, reverse) {
    return function (x, y) {
    	if (reverse === true) {
            return ((x[property] === y[property]) ? 0 : ((x[property] > y[property]) ? -1 : 1  ));
    	} else {
            return ((x[property] === y[property]) ? 0 : ((x[property] > y[property]) ? 1 : -1  ));
    	}
    };
};

var lsDataDir = function(dataDir, extension, myFn) {
	fs.readdir(dataDir, function(err, files) {
		if (!err) {
			var dataList = [];
			// only files with extension "extension" will be take into account
			files = files.filter(function(file, i) {
				return file.indexOf(extension) > 0;
			});
			
			if (files.length > 0) {
				files.forEach(function(file, i) {
					// console.log(file, i);
					fs.stat(path.join(dataDir, file), function(err, stats) {
						var dataFile = {
							name : file,
							date : stats.mtime.toUTCString().split(' ').slice(1, 4)
									.join('-'),
							size : (stats.size / 1024).toFixed(2)
						};
						dataList.push(dataFile);
						if (dataList.length == files.length) {
							return myFn(dataList.sort(sortByProperty('name', true)));
						}
					});
				});
			} else {
				return myFn(dataList);
			}
		}
	});
};

var getDataFiles = function(dataDir, requestFiles, myFn) {
	var myCommand = "cd "+ dataDir + " && " + path.join(__dirname,'shGetDataFiles');
	requestFiles.forEach(function(file, i) {
		// execute a shell script which convert all files to (RINEX and then)
		// compressed folder
		myCommand += " " + file.name;
	});
	//console.log(myCommand);
	process.exec(myCommand, function(error, stdout, stderr) {
		if(error){
			console.log(error);
		} else {
			//maybe there was some whitespace characters in stdout
			serveStaticFiles(path.join(dataDir, stdout), true, function(result) {
				return myFn(result, stdout);
			});
		}
	});

};

var convertToRinex = function(dataDir, requestFiles, format, myFn) {
	switch (format) {
	case 'trimble':
		format = ' -tr s '
		break;

	case 'ashtech':
		format = ' -ash s '
		break;

	default:
		break;
	}
	
	var myCommand = path.join(__dirname,'teqc') + format;
	
	requestFiles.forEach(function(file, i) {
		var rinexName = file.substr(0, 4) + file.substr(6, 3) + file.substr(9, 1) + '.' + file.substr(4, 2);
		var command = myCommand + '+nav ' + rinexName + 'n,'+ rinexName + 'g ' + file + ' > ' + rinexName + 'o';
		console.log(command);
		process.exec(command, function(error, stdout, stderr) {
			if(error){
				return myFn(error);
			} else {
				return myFn(null);
			}
		});
	});

};


var getDirTotalSize = function(dataDir, extension, myFn) {

	lsDataDir(dataDir, extension, function(dataFiles) {
		var totalSize = 0;
		if (dataFiles.length > 0) {
			try {
				dataFiles.forEach(function(file, i) {
					totalSize += Number(file.size);
				});
				return myFn(null, totalSize.toFixed(2));
			} catch (err) {
				return myFn(err, null);
			}
		} else {
			return myFn(null, totalSize.toFixed(2));
		}
	});
};

var deleteFiles = function(localDir, files, myFn) {
	var error;
	files.forEach(function(file, i) {
		fs.unlink(path.join(localDir, file), function(err) {
			console.log(path.join(localDir, file));
			if(err) {
				error += err;
			}
			if ((i+1) == files.length) {
				myFn(error);
			}
		});
	});
};


module.exports = {
		lsDataDir  : lsDataDir,
		getDataFiles : getDataFiles,
		getDirTotalSize : getDirTotalSize,
		deleteFiles : deleteFiles,
		convertToRinex : convertToRinex
};