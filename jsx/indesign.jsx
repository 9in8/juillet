#target InDesign
#include "json2.jsx"

// fileName = arguments[0];
// var templateFile = new File(fileName);
// var template = app.open(templateFile);
// var myFile = new File('/Users/rcsalvador/9in8/moby/sparrow/test.pdf');
// template.exportFile(ExportFormat.pdfType, myFile, false, "Press Quality");
// template.close(SaveOptions.NO)


global_actions = {};
global_arguments = arguments;
global_inspection = {}

/**
 * Round a number with decimal precision
 * 
 * @param {float} number Number to round
 * @param {int} precision Decimal precision
 * @returns {float} The rounded value
 */
function round(number, precision) {
    var factor = Math.pow(10, precision);
    var tempNumber = number * factor;
    var roundedTempNumber = Math.round(tempNumber);
    return roundedTempNumber / factor;
}

/**
 * Return a geometric object based on the element bounds
 * 
 * @param {Array} bounds 
 * @returns {Object} Containing X, Y position and width, height
 */
function get_geometry(bounds) {
    var precision = 3
    return {
        x: round(bounds[1], precision),
        y: round(bounds[0], precision),
        width: round(bounds[3] - bounds[1], precision),
        height: round(bounds[2] - bounds[0], precision)
    }
}

/**
 * Build a object with the color description.
 * 
 * @param {Color} color 
 * @returns {Object} The given color description
 */
function get_color(color) {

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
 * TextFrame inspection function.
 */
global_inspection['TextFrame'] = function(element) {

    var story = element.parentStory;

    var texts = [];
    for (var i = 0; i < story.texts.length; i++) {
        var text = story.texts.item(i);

        var style = [];

        if (text.underline) {
            style.push('underline');
        }

        if (text.strikeThru) {
            style.push('strikeout');
        }
        
        // if (text.appliedFont.fontStyleName.toLowerCase() == 'bold') {
        //     style.push('bold');
        // }

        // if (text.appliedFont.fontStyleName.toLowerCase() == 'Italic') {
        //     style.push('italic');
        // }

        texts.push({
            text: text.contents.replace('\r', '\n'),
            fontName: text.appliedFont.name,    // TODO pegar o fullname
            fontSize: text.pointSize,
            color: get_color(text.fillColor),
            style: style,
        });
    }

    var bounds = element.geometricBounds

    return {
        id: element.id,
        type: 'text',
        content: texts,
        geometry: get_geometry(bounds)
    }
}

/**
 * Inspect a IDML file and returns its elements.
 * 
 * WARNING: all function arguments are extracted from args param!
 * 
 * @param {string} fileName The IDML file path
 * @param {string} units The measurament unit
 */
global_actions['inspect'] = function(args) {

    // Load the document
    var fileName = args[0];
    var idml_file = new File(fileName);
    var idml = app.open(idml_file);

    // Set the document measurament units
    var units = {
        mm: MeasurementUnits.MILLIMETERS,
        cm: MeasurementUnits.CENTIMETERS,
        pt: MeasurementUnits.POINTS,
        px: MeasurementUnits.PIXELS,
    }[args[1]];
    idml.viewPreferences.horizontalMeasurementUnits = units;
    idml.viewPreferences.verticalMeasurementUnits = units;

    var pages = [];
    var fonts = [];

    try {
        // Get the font list used in the document
        for (var i = 0; i < idml.fonts.length; i++) {
            var font = idml.fonts.item(i);
            fonts.push({
                name: font.fullName,
                location: font.location
            });
        }

        // Get the document content, by page
        for (var i = 0; i < idml.pages.length; i++) {
            var page = idml.pages.item(i);
            var content = [];
            for (var j = 0; j < page.allPageItems.length; j++) {
                var item = page.allPageItems[j];
                var itemName = item.constructor.name;
                if (itemName in global_inspection) {
                    content.push(global_inspection[itemName](item));
                }
            }
            pages.push({
                page: i+1, 
                units: args[1],
                geometry: get_geometry(page.bounds),
                preview: '',
                content: content
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

global_actions['exportAs'] = function(args) {
    throw Exception('Not Implemented!');
}

/**
 * Find script arguments and call the target function.
 */
function main(actions) {
    // Action is the first script argument
    var action = global_arguments.shift();
    // Other ones will be the call argument
    var args = global_arguments;
    // Call the action function
    return global_actions[action](args);
}

// Aways returns a JSON, that will catch by the caller.
JSON.stringify(main());