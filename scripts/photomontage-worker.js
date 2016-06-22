var similarOff;
self.onmessage = function (e) {
    importScripts("image-helpers.js", "flow-graph.js", "photomontage-blend.js", "photomontage-graphcut.js");

    var inpainting = Photomontage(e.data.img, e.data.overlay, e.data.peaks, e.data.iterations);
    // var inpainting = GraphCutOptimisation(e.data.img, e.data.overlay, e.data.peaks, e.data.iterations, true, true);
    self.postMessage({ "return": inpainting });
};
