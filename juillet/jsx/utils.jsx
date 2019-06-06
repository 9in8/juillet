var util = {}

/*******************************************************************************
 * Util Functions
 ******************************************************************************/

/**
 * Round a number with decimal precision
 * 
 * @param {float} number Number to round
 * @param {int} precision Decimal precision
 * @returns {float} The rounded value
 */
util.round = function(number, precision) {
    var factor = Math.pow(10, precision);
    var tempNumber = number * factor;
    var roundedTempNumber = Math.round(tempNumber);
    return roundedTempNumber / factor;
}

/**
 * Generate a unique random ID
 * 
 * To assure that the ID is unique in the script execution, 
 * we need to cache all values generated.
 * 
 * @returns {string} The new ID
 */
var _uid_cache = [];
function _generateUID() {
    var firstPart = (Math.random() * 46656) | 0;
    var secondPart = (Math.random() * 46656) | 0;

    firstPart = ("000" + firstPart.toString(36)).slice(-3);
    secondPart = ("000" + secondPart.toString(36)).slice(-3);

    var uid = firstPart + secondPart;

    // The Array.indexOf() doesn't works here!
    // So, we can walk thru the entire cache
    for (var i = 0; i < _uid_cache.length; i++) {
        if (_uid_cache[i] == uid) {
            uuid = _generateUID()
            break;
        }
    }

    _uid_cache.push(uid);
    return uid;    
}
util.generateUID = _generateUID

/*******************************************************************************
 * File and Folder Functions
 ******************************************************************************/

 util.fs = {}

/**
 * Create a folder (and its parents, if need)
 * 
 * @param {*} folder The full path
 */
function _createFolder(folder) {  
    if (folder.parent !== null && !folder.parent.exists) {  
        _createFolder(folder.parent);  
    }
    if (!folder.exists) {
        folder.create();
    }  
}
util.fs.createFolder = _createFolder

/**
 * Copy a file to a target folder, and change its location with a 
 * variable to replace with a URI, when reference it.
 * 
 * @param {Folder} targetFolder The folder where the file will be stored
 * @param {File} sourceFile The full file path to be copied
 * @param {Folder} maskFolder The path portion to be replaced with a mask
 * @param {boolean} dropSource Drop the source file, if true
 * @returns {string} The masked file reference
 */
util.fs.copyFileAndAssetIt = function(targetFolder, sourceFile, maskFolder, dropSource) {
    var source = new File(sourceFile);
    var targetFileName = targetFolder.fsName + '/' + source.displayName.toLowerCase().replace(/[^0-9a-z-.]/gi, '_');
    var target = new File(targetFileName);
    if (!target.exists) source.copy(target);
    if (dropSource) source.remove(); 
    return targetFileName.replace(maskFolder.parent.parent.fsName, '{hostname}').replace(/\\+/gi, '/');
}

/*******************************************************************************
 * Indesign Functions
 ******************************************************************************/

util.idml = {}

/**
 * Save something as image, based on the target file extension.
 * 
 * If the argument 'obj' is defined, only it will be exported,
 * otherwise, the entire page will be saved.
 * 
 * @param {Document} idml The document reference
 * @param {string} targetFile The full path of the target file
 * @param {int} page Then page index
 * @param {PageItem} obj And object to be exported
 */
util.idml.saveAs = function(idml, targetFile, page, obj) {
    var extension = targetFile.toLowerCase().split('.').pop();
    const format = {
        'png': ExportFormat.PNG_FORMAT,
        'jpg': ExportFormat.JPG,
        'jpeg': ExportFormat.JPG,
        'pdf': ExportFormat.PDF_TYPE,
    }[extension];

    if (format == ExportFormat.JPG) {
        app.jpegExportPreferences.jpegColorSpace = JpegColorSpaceEnum.RGB;
        app.jpegExportPreferences.useDocumentBleeds = false;
        app.jpegExportPreferences.jpegQuality = JPEGOptionsQuality.HIGH;
        app.jpegExportPreferences.exportingSpread = false;
        app.jpegExportPreferences.jpegExportRange = ExportRangeOrAllPages.EXPORT_RANGE;
        app.jpegExportPreferences.pageString = idml.pages.item(page).name;
    } else if (format == ExportFormat.PNG_FORMAT) {
        app.pngExportPreferences.pngColorSpace = PNGColorSpaceEnum.RGB;
        app.pngExportPreferences.useDocumentBleeds = false;
        app.pngExportPreferences.pngQuality = PNGQualityEnum.HIGH;
        app.pngExportPreferences.exportingSpread = false;
        app.pngExportPreferences.pngExportRange = ExportRangeOrAllPages.EXPORT_RANGE;
        app.pngExportPreferences.pageString = idml.pages.item(page).name;
        app.pngExportPreferences.transparentBackground = true;
    }

    if (obj) {
        obj.exportFile(format, File(targetFile), false);
    } else {
        idml.exportFile(format, File(targetFile), false);
    }
}

/*******************************************************************************
 * Elements Functions
 ******************************************************************************/

util.element = {}

/**
 * Return a geometric object based on the element bounds
 * 
 * @param {Object} element 
 * @returns {Object} Containing X, Y position and width, height
 */
util.element.getGeometry = function (element) {
    var bounds = 'bounds' in element ? element.bounds : element.geometricBounds;
    var precision = 3;
    var geometry = {
        x: util.round(bounds[1], precision),
        y: util.round(bounds[0], precision),
        width: util.round(bounds[3] - bounds[1], precision),
        height: util.round(bounds[2] - bounds[0], precision),
    }
    if ('rotationAngle' in element) {
        geometry['angle'] = element.rotationAngle;
    }
    return geometry;
}

/**
 * Build an object with the color description
 * 
 * @param {Color} color The color reference
 * @returns {Object} The given color description
 */
util.element.getColor = function(color) {

    var space = function(s, v) {
        var name = s.split('');
        var result = {};
        for (var i = 0; i < name.length; i++) {
            result[name[i]] = v[i];
        }
        return result;
    }

    if (color.space == ColorSpace.RGB) {
        return space('rgb', color.colorValue);
    } else if (color.space == ColorSpace.CMYK) {
        return space('cmyk', color.colorValue);
    } else if (color.space == ColorSpace.LAB) {
        return space('lab', color.colorValue);
    } else {
        return color.name;
    }
}

/**
 * Return all image contained inside an element
 * 
 * @param {PageItem} element 
 * @param {Folder} imgsFolder 
 * @param {Folder} assetsFolder 
 */
util.element.getImages = function(element, imgsFolder, assetsFolder) {
    var images = [];

    if (!element.hasOwnProperty('images')) {
        return images
    }

    for (var i = 0; i < element.images.length; i++) {
        var image = element.images[i];

        var item = {
            uid: image.label,
            type: 'image',
        }

        if (image && image.itemLink && image.itemLink.filePath) {
            item['source'] = util.fs.copyFileAndAssetIt(imgsFolder, image.itemLink.filePath.fsName, assetsFolder, false);
        }

        images.push(item);
    }
    return images;
}
