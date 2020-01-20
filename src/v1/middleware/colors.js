/**
 * Colors
 * Appends ANSI meta-codes to a textual data
 * https://en.wikipedia.org/wiki/ANSI_escape_code#Colors
 *
 * The 16 colors names:
 *   0. black     8. gray
 *   1. red       9. tomato
 *   2. green     10. lime
 *   3. brown     11. yellow
 *   4. navy      12. blue
 *   5. magenta   13. pink
 *   6. teal      14. cyan
 *   7. default   15. white
 *
 * usage:
 *   const clr = require('colors');
 *   process.stdout.write(clr([0..15], '16 colors'));
 *   process.stdout.write(clr.mono([0..26], '26 grey colors'));
 *   process.stdout.write(clr.red('Red Color'));
 *   process.stdout.write(clr.green('Green Color'));
 *   process.stdout.write(clr.blue('Blue Color'));
 *   process.stdout.write(clr(127, '127\'s color of 256'));
 *
 * @file
 * @ingroup Helpers
 * @version 1.0
 * @license MIT
 * @author Alexander Yukal <yukal@email.ua>
 */

// 26 grayscale colors
const MAP_MONO = [
    0x00, 0xE8, 0xE9, 0xEA, 0xEB, 0xEC, 0xED, 0xEE, 0xEF,
    0xF0, 0xF1, 0xF2, 0xF3, 0xF4, 0xF5, 0xF6, 0xF7, 0xF8,
    0xF9, 0xFA, 0xFB, 0xFC, 0xFD, 0xFE, 0xFF, 0x0F
];

/**
 * setcolor
 * Appends meta-codes to a textual data
 *
 * @param {integer} color Color number. 7 as default
 * @param {string} text Text data
 */
function setcolor() {
    const args = [ ...arguments ];
    let text = '';
    let color = 7;

    if (args.length > 1) {
        color = args.shift();
        text = args.shift();
    }
    else if (args.length == 1) {
        text = args.shift();
    }

    return setcolor.hasOwnProperty(color) 
        ? setcolor[color](text)
        : `\x1B[38;05;${color}m${text}\x1B[0m`
    ;
}

setcolor.mono = (color, text) => {
    const clr = MAP_MONO.length > color ?MAP_MONO[ color ] :0xF6;
    return setcolor(clr, text);
};

setcolor.black   = text => setcolor(0, text);
setcolor.red     = text => setcolor(1, text);
setcolor.green   = text => setcolor(2, text);
setcolor.brown   = text => setcolor(3, text);
setcolor.navy    = text => setcolor(4, text);
setcolor.magenta = text => setcolor(5, text);
setcolor.teal    = text => setcolor(6, text);
setcolor.default = text => setcolor(7, text);
setcolor.gray    = text => setcolor(8, text);
setcolor.tomato  = text => setcolor(9, text);
setcolor.lime    = text => setcolor(10, text);
setcolor.yellow  = text => setcolor(11, text);
setcolor.blue    = text => setcolor(12, text);
setcolor.pink    = text => setcolor(13, text);
setcolor.cyan    = text => setcolor(14, text);
setcolor.white   = text => setcolor(15, text);

module.exports = setcolor;
