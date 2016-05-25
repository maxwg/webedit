/*******************************************************************************
** patchmatch.js
** Copyright (C) 2015, Max Wang <maxw@inbox.com>
*******************************************************************************/

const PATCHLEN = PATCHSIZE * PATCHSIZE;
var similarOff = {};

//s(x\bar) = arg min_s ||P(x+s) - P(x)||^2
//img:: YUV Image data
function GetSimilarFieldPeaks(img, numberOfPeaks, isWorker) {
    var patchBoundX = img.w - PATCHSIZE;
    var patchBoundY = img.h - PATCHSIZE;
    var h = {};

    var tau = Math.max(img.w, img.h) / 15;

    var whts = ApplyWHT(img, isWorker);

    if (isWorker)
        self.postMessage({ progress: true, task: "Building KDTree", complete: 20 });
    BuildKDTreeFromPoints(whts, isWorker)
    for (var y = 0; y <= patchBoundY; y++) {
        for (var x = 0; x <= patchBoundX; x++) {
            var mostSimilar = PatchMatch(whts, x, y, patchBoundX, patchBoundY, tau);
            if (mostSimilar.isDistance) {
                var coord = [(patch_wht.x - mostSimilar.x), (patch_wht.y - mostSimilar.y)];
                if (coord in h) {
                    h[coord]++;
                }
                else
                    h[coord] = 1;
                if (isWorker)
                    similarOff[y * img.w + x] = coord;
            }
        }
        if (isWorker && y % 10 == 0)
            self.postMessage({ progress: true, task: "Getting Similar Patches", complete: (y / patchBoundY * 20) + 65 });
    }

    if (isWorker)
        h = GaussianSparseWorker(h);
    else
        h = GaussianSparse(h);

    //Get the numberOfPeaks highest peaks.
    var peaks = new PriorityQueue({ comparator: function (a, b) { return a.height - b.height } });
    var hkeys = Object.keys(h);
    var hkl = hkeys.length;
    for (var k = 0; k < hkl; k++) {
        var key = hkeys[k];
        if (key in h) {
            var coord = key.split(",");
            var x = parseInt(coord[0], 10);
            var y = parseInt(coord[1], 10);
            var hval = h[[x, y]];
            var i;
            for (i = -8; i < 8; i++) {
                for (var j = -8; j < 8; j++) {
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
                peaks.queue({ x: x, y: y, height: hval });
                if (peaks.length > numberOfPeaks)
                    peaks.dequeue();
            }
        }

        if (k % 400 == 0 && isWorker)
            self.postMessage({ progress: true, task: "Finding Highest Peaks", complete: (k / hkl * 5) + 95 });

    }

    var maxPeaks = [];
    while (peaks.length > 0)
        maxPeaks.push(peaks.dequeue());
    maxPeaks.sort(function (a, b) { return b.height - a.height });
    return maxPeaks;
}

//return most similar patch
function PatchMatch(whts, x, y, patchBoundX, patchBoundY, minimumDistance) {
    patch_wht = whts[y * patchBoundX + x];
    var a = patch_wht.leaf;
    var leaf = patch_wht.leaf;
    var mostSimilar;
    var msDist = 1000000000000000000.0;
    var isDistance = false;
    var el = leaf.elements;
    var leafsz = el.length;
    var vsize = el[0].length;
    for (var i = 0; i < leafsz; i++) {
        var elem = el[i];
        var dx = elem.x - patch_wht.x;
        var dy = elem.y - patch_wht.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > minimumDistance) {
            if (!isDistance) {
                isDistance = true;
                msDist = 10000000000000000000.0;
            }
            var similarity = 0;
            for (var j = 0; j < vsize; j++) {
                var diff = patch_wht[j] - elem[j]
                similarity += diff * diff;
            }
            if (similarity < msDist) {
                msDist = similarity;
                mostSimilar = elem;
            }
        }
        else if (!isDistance) { //Hope for best -- Get furthest element.
            if (dist < msDist) {
                msDist = dist;
                mostSimilar = elem;
            }
        }
    }
    //if (!isDistance)
    //    msDist = 1000000000000000.0;
    //var cx = mostSimilar.x;
    //var cy = mostSimilar.y;
    //var ls1;
    //do {
    //    var r = Math.random();
    //    if (r < 0.25) {
    //        cx += cx == patchBoundX - (cy == patchBoundY ? 1 : 0) ? -1 : 1;
    //    }
    //    else if (r < 0.5) {
    //        cx += cx == 0 ? 1 : -1;
    //    }
    //    else if (r < 0.75) {
    //        cy += cy == patchBoundY ? -1 : 1;
    //    }
    //    else {
    //        cy += cy == 0 ? 1 : -1;
    //    }
    //    ls1 = whts[cx + cy * patchBoundX].leaf;
    //} while (ls1 == leaf);

    //cx = mostSimilar.x;
    //cy = mostSimilar.y;
    //var ls2;
    //do {
    //    var r = Math.random();
    //    if (r < 0.25) {
    //        cx += cx == patchBoundX - (cy == patchBoundY ? 1 : 0) ? -1 : 1;
    //    }
    //    else if (r < 0.5) {
    //        cx += cx == 0 ? 1 : -1;
    //    }
    //    else if (r < 0.75) {
    //        cy += cy == patchBoundY ? -1 : 1;
    //    }
    //    else {
    //        cy += cy == 0 ? 1 : -1;
    //    }
    //    ls2 = whts[cx + cy * patchBoundX].leaf;
    //} while (ls2 == leaf || ls2 == ls1);

    //var el = ls1.elements;
    //var leafsz = el.length;
    //var vsize = el[0].length;
    //for (var i = 0; i < leafsz; i++) {
    //    var elem = el[i];
    //    var dx = elem.x - patch_wht.x;
    //    var dy = elem.y - patch_wht.y;
    //    var dist = Math.sqrt(dx * dx + dy * dy);
    //    if (dist > minimumDistance) {
    //        isDistance = true;
    //        var similarity = 0;
    //        for (j = 0; j < vsize; j++) {
    //            var diff = patch_wht[j] - elem[j]
    //            similarity += diff * diff;
    //        }
    //        if (similarity < msDist) {
    //            msDist = similarity;
    //            mostSimilar = elem;
    //        }
    //    }
    //}

    //var el = ls2.elements;
    //var leafsz = el.length;
    //var vsize = el[0].length;
    //for (var i = 0; i < leafsz; i++) {
    //    var elem = el[i];
    //    var dx = elem.x - patch_wht.x;
    //    var dy = elem.y - patch_wht.y;
    //    var dist = Math.sqrt(dx * dx + dy * dy);
    //    if (dist > minimumDistance) {
    //        isDistance = true;
    //        var similarity = 0;
    //        for (var j = 0; j < vsize; j++) {
    //            var diff = patch_wht[j] - elem[j]
    //            similarity += diff * diff;
    //        }
    //        if (similarity < msDist) {
    //            msDist = similarity;
    //            mostSimilar = elem;
    //        }
    //    }
    //}
    mostSimilar.isDistance = isDistance;
    return mostSimilar;
}

//Obtains patch, and applys WHT to patches around all pixels of an image
//Pre-processing for performance reasons
//Return an array, indexed by pixel coordinates of [x+y*width]
function ApplyWHT(img, isWorker) {
    var patchBoundX = img.w - PATCHSIZE;
    var patchBoundY = img.h - PATCHSIZE;
    var points = [];
    for (y = 0; y <= patchBoundY; y++) {
        for (x = 0; x <= patchBoundX; x++) {
            var patch = GetPatch(img, x, y, PATCHSIZE);
            var wht = WalshHadamard(patch.y, PATCHLEN, 16);
            Array.prototype.push.apply(wht, WalshHadamard(patch.u, PATCHLEN, 4));
            Array.prototype.push.apply(wht, WalshHadamard(patch.v, PATCHLEN, 4));
            points.push({ x: x, y: y, v: wht });
        }
        if (isWorker && y % 5 == 0)
            self.postMessage({ progress: true, task: "Applying Walsh Hadamard", complete: (y / patchBoundY * 20) });
    }
    return points;
}

//  Apply's Walsh Hadamard transform to patches centred around every pixel of
//  an image, and combines this into a KD-Tree split at the dimension of maximum
//  variance. Return's the KD-Tree.
function BuildKDTreeFromPoints(points) {
    console.log("Building KDTREE");
    var d = new Date();
    var n = d.getTime();
    var why = new KDTree(points); //why do we even need kdtree -- what is leaf 0??
    delete why;
    d = new Date();
    n = d.getTime() - n;
    console.log("Built KDTREE in " + n + " milliseconds");
    //return kdt;
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

//Applys a Gaussian blur onto a sparse associative array.
function GaussianSparse(orig) {
    var blurred = {};
    var sz = ~~(Math.sqrt(gaussMat.length) / 2);
    for (var k in orig) {
        if (orig[k] > 3) { //Performance reasons -- assume counts less than this are negligible.
            blurred[k] = 0;
            var coord = k.split(",");
            var x = parseInt(coord[0], 10);
            var y = parseInt(coord[1], 10);
            var c = 0;
            for (i = -sz; i <= sz; i++) {
                for (j = -sz; j <= sz; j++) {
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

function GaussianSparseWorker(orig) {
    var blurred = {};
    var sz = ~~(Math.sqrt(gaussMat.length) / 2);
    var keys = Object.keys(orig);
    var origLen = keys.length;
    for (var z = 0; z < origLen; z++) {
        var k = keys[z];
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
        if (z % 300 == 0)
            self.postMessage({ progress: true, task: "Applying Gaussian Filter", complete: z / origLen * 10 + 85 });
    }
    return blurred;
}

/*
function GaussBox(sigma, n)  // standard deviation, number of boxes
{
    var wIdeal = Math.sqrt((12 * sigma * sigma / n) + 1);  // Ideal averaging filter width 
    var wl = Math.floor(wIdeal); if (wl %2 == 0) wl--;
    var wu = wl + 2;

    var mIdeal = (12 * sigma * sigma - n * wl * wl - 4 * n * wl - 3 * n) / (-4 * wl - 4);
    var m = Math.round(mIdeal);
    // var sigmaActual = Math.sqrt( (m*wl*wl + (n-m)*wu*wu - n)/12 );

    var sizes = []; for (var i = 0; i < n; i++) sizes.push(i < m ? wl : wu);
    return sizes;
}

function GaussianSparse(h, sigma) {
    var box = GaussBox(sigma, 3);
    var t = {};

   BoxBlurSparse(h, s, (box[0]-1)/2)
}

function BoxBlurSparse(s, t, r) {
    for (var k in s) {
        t[k] = s[k];
    }
    var iarr = 1 / (r + r + 1);
    for (var key in s) {
        var coord = key.split(",");
        var x = parseInt(coord[0], 10);
        var y = parseInt(coord[1], 10);
        var ri = r, first = s[coord];
        var val = (r + 1) * s[key];
        for (j = 0; j < r; j++) {
            val += ([x + j, y] in s) ? s[x + j, y] : 0;
        }
        for (j = 0; j <= r; j++) {
            val += 
        }
    }
}
function boxBlurH_4(scl, tcl, w, h, r) {
    var iarr = 1 / (r + r + 1);
    for (var i = 0; i < h; i++) {
        var ti = i * w, li = ti, ri = ti + r;
        var fv = scl[ti], lv = scl[ti + w - 1], val = (r + 1) * fv;
        for (var j = 0; j < r; j++) val += scl[ti + j];
        for (var j = 0  ; j <= r ; j++) { val += scl[ri++] - fv; tcl[ti++] = Math.round(val * iarr); }
        for (var j = r + 1; j < w - r; j++) { val += scl[ri++] - scl[li++]; tcl[ti++] = Math.round(val * iarr); }
        for (var j = w - r; j < w  ; j++) { val += lv - scl[li++]; tcl[ti++] = Math.round(val * iarr); }
    }
}
function boxBlurT_4(scl, tcl, w, h, r) {
    var iarr = 1 / (r + r + 1);
    for (var i = 0; i < w; i++) {
        var ti = i, li = ti, ri = ti + r * w;
        var fv = scl[ti], lv = scl[ti + w * (h - 1)], val = (r + 1) * fv;
        for (var j = 0; j < r; j++) val += scl[ti + j * w];
        for (var j = 0  ; j <= r ; j++) { val += scl[ri] - fv; tcl[ti] = Math.round(val * iarr); ri += w; ti += w; }
        for (var j = r + 1; j < h - r; j++) { val += scl[ri] - scl[li]; tcl[ti] = Math.round(val * iarr); li += w; ri += w; ti += w; }
        for (var j = h - r; j < h  ; j++) { val += lv - scl[li]; tcl[ti] = Math.round(val * iarr); li += w; ti += w; }
    }
}

function gaussBlur_4(scl, tcl, w, h, r) {
    var bxs = GaussBox(r, 3);
    boxBlur_4(scl, tcl, w, h, (bxs[0] - 1) / 2);
    boxBlur_4(tcl, scl, w, h, (bxs[1] - 1) / 2);
    boxBlur_4(scl, tcl, w, h, (bxs[2] - 1) / 2);
}
function boxBlur_4(scl, tcl, w, h, r) {
    for (var i = 0; i < scl.length; i++) tcl[i] = scl[i];
    boxBlurH_4(tcl, scl, w, h, r);
    boxBlurT_4(scl, tcl, w, h, r);
}*/
