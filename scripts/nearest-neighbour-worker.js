
self.onmessage = function (e) {
    importScripts( "hadamard-transform.js", "image-helpers.js", "kdtree.js", "nearest-neighbour.js", "nearest-neighbour-stats.js");
    var yuv = ImageHelpers.RGBtoYUV(e.data.img);
    var offsets = ANNStats(8)(yuv);
    self.postMessage({ "return": offsets });
};
