const path = require('path');

module.exports = {
    entry: { 
        'main': './js/main.js',
        'restaurant_info': './js/restaurant_info.js'
    },
    output: {
        path: path.join(__dirname, 'dist'),
        filename: '[name].js'
    },
    mode: 'none'
}