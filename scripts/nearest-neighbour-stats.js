/*******************************************************************************
 ** annstats.js
 ** Copyright (C) 2015, Max Wang <maxw@inbox.com>
 ** Implements the histogram function of Sun and He (2014), as specified in
 ** Image Completion Approaches Using the Statistics of Similar Patches
 **
 ** patch_size: size of patches for ANN process. Should be a power of 2.
 **
 ** Return: getMostCommonOffsets(img):: function
 **             @param img -> HTML5 Canvas Image()
 **             @return -> [[int x, int y, float height]];
 *
 *******************************************************************************/

"use strict";

var ANNSTATS = function (patch_size) {
    function getMostCommonOffsets(img) {
        var annField = GetAnnField ? GetAnnField(img, patch_size)
            : require('./nearest-neighbour.js')(img, patch_size);

        var h = {};
        for (var px in annField) {
            var os = annField[px];
            var ostring = os[0] + ',' + os[1];
            if (ostring in h)
                h[ostring]++;
            else
                h[ostring] = 1;
        }

        var offsets = [];
        var hkeys = Object.keys(h);
        for (var k = 0, hkl = hkeys.length; k < hkl; k++) {
            var key = hkeys[k];
            if (key in h) {
                var coord = key.split(",");
                var x = parseInt(coord[0], 10);
                var y = parseInt(coord[1], 10);
                var hval = h[key];
                for (var i = -6; i <= 6; i++) {
                    for (var j = -6; j <= 6; j++) {
                        var xiyj = [x + i, y + j];
                        if (h[xiyj] > hval) {
                            delete h[[x, y]];
                            j = 100; // not biggest
                            i = 100;
                        }
                        else {
                            delete h[xiyj];
                        }
                    }
                }
                if (i != 101) { // i == 101 => h[[x,y]] is not the biggest
                    offsets.push([x, y, hval]);
                }
            }
        }
        offsets.sort(function (a, b) {
            return b[2] - a[2]
        });
        var oLength = Math.min(1000, offsets.length), offTrim = [];
        for (var i = 0; i < oLength; i++)
            offTrim.push(new Int16Array([offsets[i][0], offsets[i][1]]));
        return offTrim;
    }


    //5x5 \sigma = 0.5 gauss matrix
    /*var gaussMat = [0.000002, 0.000212, 0.000922, 0.000212, 0.000002,
     0.000212, 0.024745, 0.107391, 0.024745, 0.000212,
     0.000922, 0.107391, 0.466066, 0.107391, 0.000922,
     0.000212, 0.024745, 0.107391, 0.024745, 0.000212,
     0.000002, 0.000212, 0.000922, 0.000212, 0.000002];*/

    //5x5 \sigma = \sqrt(2)
    var gaussMat = [0.03817737854429235, 0.08082151101249427, 0.10377687435515041, 0.08082151101249427, 0.03817737854429235,
        0.08082151101249427, 0.1710991401561097, 0.2196956447338621, 0.1710991401561097, 0.08082151101249427,
        0.10377687435515041, 0.2196956447338621, 0.28209479177387814, 0.2196956447338621, 0.10377687435515041,
        0.08082151101249427, 0.1710991401561097, 0.2196956447338621, 0.1710991401561097, 0.08082151101249427,
        0.03817737854429235, 0.08082151101249427, 0.10377687435515041, 0.08082151101249427, 0.03817737854429235]

    //var gaussMat = [0.024879, 0.107973, 0.024879,
    //                0.107973, 0.468592, 0.107973,
    //                0.024879, 0.107973, 0.024879];
    function gaussianSparse(orig) {
        var blurred = {};
        var sz = ~~(Math.sqrt(gaussMat.length) / 2);
        for (var k in orig) {
            if (orig[k] > 3) { //Performance reasons -- assume counts less than this are negligible.
                blurred[k] = 0;
                var coord = k.split(",");
                var x = parseInt(coord[0], 10);
                var y = parseInt(coord[1], 10);
                var c = 0;
                for (var i = -sz; i <= sz; i++) {
                    for (var j = -sz; j <= sz; j++) {
                        var xiyj = [x + i, y + i];
                        if (xiyj in orig)
                            blurred[k] += gaussMat[c] * orig[xiyj];
                        c++;
                    }
                }
            }
        }
        return blurred;
    }

    return getMostCommonOffsets;
}

if (typeof module !== 'undefined' && module.exports)
    module.exports = ANNSTATS;
else
    this.ANNStats = ANNSTATS;
