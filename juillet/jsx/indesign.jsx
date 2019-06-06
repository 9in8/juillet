#target InDesign
#include "json2.jsx"
#include "utils.jsx"

var globalActions = {};
var globalArguments = arguments;

/*****************************************************************************
 * Inspection functions
 *****************************************************************************/

var inspection = {}
var inspectionActions = {}

inspection.run = function(element, imgsFolder, assetsFolder) {
    var content = [];

    if (!element) return content;

    var items = element.pageItems.everyItem().getElements();
    var page = element.constructor.name == 'Page' ? element : element.parentPage;

    if (!page) return content;

    var idml = page.parent.parent;
    var idmlFile = idml.filePath;

    for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var itemName = item.constructor.name;

        if (item.isValid && itemName in inspectionActions) {

            var inspectionResult = inspectionActions[itemName](item, imgsFolder, assetsFolder);

            if (itemName == 'Group' || (itemName != 'Group' && item.parent.constructor.name != 'Group')) {
                // Generates the item preview
                var pageNumber = page.documentOffset;
                var itemPreview = idmlFile.parent.fsName + '/' + itemName + '_' + (pageNumber + 1) + '_' + item.label + '.png';
                util.idml.saveAs(idml, itemPreview, pageNumber, item);
                inspectionResult['preview'] = util.fs.copyFileAndAssetIt(imgsFolder, itemPreview, assetsFolder, true);
            }

            // Stores the item content
            content.push(inspectionResult);
        }
    }
    return content;
}

inspection.build = function(type, element, imgsFolder, assetsFolder) {
    var result = {
        uid: element.label,
        type: type,
        geometry: util.element.getGeometry(element),
    }
    var images = util.element.getImages(element, imgsFolder, assetsFolder);
    var content = inspection.run(element, imgsFolder, assetsFolder);

    if (images && images.length) {
        result['images'] = images;
    }

    if (content && content.length) {
        result['content'] = content;
    }
    return result;
}

var objs = ['Polygon', 'Oval', 'Rectangle', 'Group']
for (var i = 0; i < objs.length; i++) {
    var objectName = objs[i]
    inspectionActions[objectName] = function(element, imgsFolder, assetsFolder) {
        return inspection.build(objectName.toLowerCase(), element, imgsFolder, assetsFolder);
    }    
}

inspectionActions['TextFrame'] = function(element) {

    var story = element.parentStory;

    var texts = [];
    for (var i = 0; i < story.texts.length; i++) {
        var text = story.texts.item(i);

        var style = [text.fontStyle.toLowerCase()];

        if (text.underline) {
            style.push('underline');
        }

        if (text.strikeThru) {
            style.push('strikeout');
        }

        texts.push({
            type: 'text',
            text: text.contents.replace("\r", "\n"),
            fontName: text.appliedFont.name.replace("\t", " "),
            fontSize: text.pointSize,
            color: util.element.getColor(text.fillColor),
            style: style,
        });
    }

    return {
        uid: element.label,
        type: 'text_frame',
        content: texts,
        geometry: util.element.getGeometry(element),
    }
}

/*****************************************************************************
 * Exportable functions
 *****************************************************************************/

/**
 * Inspect a IDML file and returns its elements.
 * 
 * WARNING: all function arguments are extracted from args param!
 * 
 * @param {string} fileName The IDML file path
 * @param {string} units The measurament unit
 */
globalActions['inspect'] = function(args) {

    // Load the document
    var fileName = args[0];
    var idmlFile = new File(fileName);
    var idml = app.open(idmlFile);
    var isInspected = fileName.indexOf('.INSPECTED.') != -1;

    var pages = [];
    var fonts = [];

    try {

        // Tag elements
        if (!isInspected) {
            for (var i = 0; i < idml.allPageItems.length; i++) {
                var item = idml.allPageItems[i];
                item.label = util.generateUID();
            }
            fileName = fileName.replace('.idml', '.INSPECTED.idml');
            var inspectedFile = new File(fileName);
            idml.save(inspectedFile, false, 'File inspected and tagged!', true);
        }

        // Set the document measurament units
        var units = {
            mm: MeasurementUnits.MILLIMETERS,
            cm: MeasurementUnits.CENTIMETERS,
            pt: MeasurementUnits.POINTS,
            px: MeasurementUnits.PIXELS,
        }[args[1]];
        idml.viewPreferences.horizontalMeasurementUnits = units;
        idml.viewPreferences.verticalMeasurementUnits = units;

        var assetsFolder = new Folder(args[2]);
        var fontFolder = new Folder(assetsFolder.fsName + '/fonts/');
        var imgsFolder = new Folder(assetsFolder.fsName + '/images/');

        util.fs.createFolder(fontFolder);
        util.fs.createFolder(imgsFolder);

        // Get the font list used in the document
        for (var i = 0; i < idml.fonts.length; i++) {
            var font = idml.fonts.item(i);
            fonts.push({
                name: font.fullName,
                location: util.fs.copyFileAndAssetIt(fontFolder, font.location, assetsFolder, false),
            });
        }

        // Get the document content, by page
        for (var i = 0; i < idml.pages.length; i++) {
            var page = idml.pages.item(i);

            // Generate the page preview
            preview_file = idmlFile.parent.fsName + '/' + 'page_' + (i + 1) + '.jpg';
            util.idml.saveAs(idml, preview_file, i, 0);

            // Push page content to return
            pages.push({
                page: i + 1, 
                units: args[1],
                geometry: util.element.getGeometry(page),
                preview: util.fs.copyFileAndAssetIt(imgsFolder, preview_file, assetsFolder, true),
                content: inspection.run(page, imgsFolder, assetsFolder),
            });
        }
    } finally {
        // Always close the document
        idml.close(SaveOptions.NO);
    }

    return {
        fonts: fonts,
        pages: pages,
    }
}

/**
 * Find script arguments and call the target function.
 */
function main(actions) {
    // Action is the first script argument
    var action = globalArguments.shift();
    // Other ones will be the call argument
    var args = globalArguments;
    // Call the action function
    return globalActions[action](args);
}

// Aways returns a JSON, that will catch by the caller.
try {
    JSON.stringify(main());
} catch(err) {
    JSON.stringify({
        exception: err.constructor.name,
        error: err.message,
        file: err.file,
        line: err.line,
    });
}