var fs = require('fs');
var path = require('path');
var util = require('util');
var mime = require('../mime');

var File = function() {
	
	this.infoProvider = function(filePath, downloadable, myFn) {
		fs.stat(filePath, function(err, stats) {
			if (err) {
				this.exists = false;
				myFn(this);
			} else {
				this.exists = true;
				if(downloadable == true) {
				    fs.readFile(filePath, "binary", function(err, file) {
				        if(err) {        
				        	this.exists = false;
							return myFn(this);
				        }
				        var filename = path.basename(filePath);
				        var mimetype = mime.lookup(filePath);
				        
				        console.log(stats.size);
		        		this.httpHeaderInfo = {
				        		'Content-disposition': 'attachment; filename=' + filename,
				        		'Content-type': mimetype
				        };

		        		this.httpHeaderInfo = {
				        		'Content-disposition': 'attachment; filename=' + filename,
				        		'Content-type': mimetype,
				        		'Content-length' : stats.size
				        };
				        
						this.deliverFile = function() {
							return file;
						};
						myFn(this);

				    });

				} else {
				
					this.httpHeaderInfo = {
						'Content-Type' : mime.lookup(filePath), //setContentType(path.extname(filePath)),
						'Content-Length' : stats.size
					};
					this.deliverFile = function() {
						return fs.createReadStream(filePath);
					};
					myFn(this);
				}

			}
		});
	};

	var setContentType = function(fileType) {
		var contentType;
		switch (fileType) {
		case ".jpg":
		case ".jpeg":
			contentType = "image/jpeg";
			break;

		case ".png":
			contentType = "image/png";
			break;

		case ".js":
			contentType = "application/x-javascript";
			break;

		case ".json":
			contentType = "application/json";
			break;

		case ".html":
		case ".htm":
			contentType = "text/html";
			break;

		case ".ico":
			contentType = "image/x-icon";
			break;

		case ".txt":
			contentType = "text/plain";
			break;

		case ".css":
			contentType = "text/css";
			break;

		case ".zip":
			contentType = "application/zip";
			break;

		default:
			contentType = null;
			break;
		}
		;
		return contentType;
	}
};

module.exports = function(filePath, downloadable, myFn) {
	var myFile = new File();
	myFile.infoProvider(filePath, downloadable, function(result) {
		return myFn(result);
	});

};