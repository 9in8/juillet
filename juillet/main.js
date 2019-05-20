const indesign = require('./indesign.js');

//var idmlFile = '/Users/rcsalvador/9in8/moby/idml/samples/F1973_cartaz_A3/F1973_cartaz_A3.idml';
var idmlFile = 'C:/9in8/idml/samples/F1973_cartaz_A3/F1973_cartaz_A3.idml';

indesign.inspect(idmlFile, function(result) {
  console.log(JSON.stringify(result, null, 4));
});
