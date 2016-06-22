/*******************************************************************************
 ** nearestneighbour.js
 ** Copyright (C) 2015, Max Wang <maxw@inbox.com>
 ** Implements a propagation assisted KD-Tree as specified by Sun and He (2012) in
 ** Computing Nearest-Neighbor Fields via Propagation-Assisted KD-Trees
 **
 ** img : HTML5 Canvas Image()
 ** patch_size : size of the ANN patches. Larger = slower. Should be in powers of 2.
 **
 ** Return: {[x, y] : [x, y]} mapping coordinate to nearest neighbour offset.
 *
 *******************************************************************************/

"use strict";

var ANN = function (img, patch_size) {
    const PATCH_SIZE = patch_size, PATCH_LEN = patch_size * patch_size;
    const width = img.w, height = img.h;
    const minimumDistance = Math.max(width, height) / 12;
    const boundX = width - PATCH_SIZE, boundY = height - PATCH_SIZE;
    const vsize = 24;

    var Hadamard = WHT ? WHT(PATCH_LEN) : require('./hadamard-transform.js')(PATCH_LEN);
    var KDTREE = KDTree || require('./kdtree.js');
    function calculate() {
        var whts = applyWHT();
        KDTREE(whts, 36, 'map');
        var ann = {};
        for (var y = 0; y <= boundY; y++) {
            for (var x = 0; x <= boundX; x++) {
                var patch_wht = whts[y * boundX + x];
                var bestMatch = mostSimilarPatch(patch_wht, whts);
                if (bestMatch != null) {
                    var offset = new Int16Array([(patch_wht.x - bestMatch.x), (patch_wht.y - bestMatch.y)]);
                    ann[[x, y]] = offset;
                }
            }
        }
        return ann;
    }

    function mostSimilarPatch(patch, whtMap) {
        var x = patch.x, y = patch.y;
        var leaf0 = patch.leaf;
        var bestMatch = getBestMatch(patch, leaf0);
        //if(x>0){
        //    var bestMatch2 = getBestMatch(patch, whtMap[y * boundX + x - 1].leaf);
        //	if(bestMatch2[1] < bestMatch[1])
        //		bestMatch=bestMatch2;
        //}
        //if(y>0){
        //    var bestMatch2 = getBestMatch(patch, whtMap[(y - 1) * boundX + x].leaf);
        //	if(bestMatch2[1] < bestMatch[1])
        //		bestMatch=bestMatch2;
        //}
        return bestMatch[0];
    }

    function getBestMatch(patch, patches) {
        var mostSimilar;
        var msDist = 1000000000000000000.0;
        var isDistance = false;
        for (var i = 0, pcs = patches.length; i < pcs; i++) {
            var elem = patches[i];
            var dx = patch.x - elem.x;
            var dy = patch.y - elem.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > minimumDistance) {
                if (!isDistance) {
                   isDistance = true;
                   msDist = 10000000000000000000.0;
                }
                var similarity = 0;
                for (var j = 0; j < vsize; j++) {
                    var diff = patch[j] - elem[j]
                    similarity += diff * diff;
                }
                if (similarity < msDist) {
                    msDist = similarity;
                    mostSimilar = elem;
                }
            }
            else if (!isDistance) { //Hope for best -- Get furthest element.
               if (dist < msDist) {
                   msDist = dist*1000+100;
                   mostSimilar = elem;
               }
            }
        }
        return [mostSimilar, msDist];
    }

    function applyWHT() {
        var points = [];
        for (var y = 0; y <= boundY; y++) {
            for (var x = 0; x <= boundX; x++) {
                var patch = getPatch(x, y);
                var wht = [];
                wht.x = x;
                wht.y = y;
                Array.prototype.push.apply(wht, Hadamard(patch.y, 16));
                Array.prototype.push.apply(wht, Hadamard(patch.u, 4));
                Array.prototype.push.apply(wht, Hadamard(patch.v, 4));
                points.push(wht);
            }
            // if (isWorker && y % 5 == 0)
            //   self.postMessage({ progress: true, task: "Applying Walsh Hadamard", complete: (y / patchBoundY * 20) });
        }

        return points;
    }

    function getPatch(xC, yC) {
        var y = [], u = [], v = [];
        for (var i = 0; i < PATCH_SIZE; i++) {
            var pos = xC + (yC + i) * width;
            for (var j = 0; j < PATCH_SIZE; j++) {
                y.push(img.y[pos]);
                u.push(img.u[pos]);
                v.push(img.v[pos]);
                pos++;
            }
        }
        return {y: y, u: u, v: v};
    }

    return calculate();
};

if (typeof module !== 'undefined' && module.exports)
    module.exports = ANN;
else
    this.GetAnnField = ANN;
