
self.onmessage = function (e) {
    importScripts( "priorityqueue.js", "walshhadamard.js", "imagehelpers.js", "kdtree.js", "patchmatch.js");
    var yuv = RGBtoYUV(e.data.img);
    var offsets = GetSimilarFieldPeaks(yuv, e.data.peaks, true);
    self.postMessage({ "return": offsets , "similarOff" : similarOff});
};
