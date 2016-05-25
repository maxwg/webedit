var similarOff;
self.onmessage = function (e) {
    importScripts("graphcut.js", "poissonblending.js", "maxflow.js", "imagehelpers.js");
    similarOff = e.data.similar;
    var inpainting = GraphCutOptimisation(e.data.img, e.data.overlay, e.data.peaks, e.data.iterations, true, true);
    self.postMessage({ "return": inpainting[0], "label" : inpainting[1] });
};
