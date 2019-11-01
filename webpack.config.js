const path = require('path');

module.exports = {
    entry: { 
        'dist/main': './js/main.js',
        'dist/restaurant_info': './js/restaurant_info.js',
        'sw-prod': './sw.js'
    },
    output: {
        path: path.join(__dirname),
        filename: '[name].js'
    },
    mode: 'none'
}