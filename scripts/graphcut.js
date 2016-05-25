function GraphCutOptimisation(image, area, offsets, iterations) {
    const INVALID_COST = 1000000000;
    var imgData = image.data;
    var imgLen = imgData.length;
    var aData = area.data;
    var imgW = image.width;
    var imgH = image.height;
    var alphaX, alphaY, pixel, px, py, p4;
    console.log(offsets);
    function findOptimalAssignment() {
        var label = []; //Array mapping pixel to its labelling (pixel offset * 4)
        var paintedArea = []; //Array mapping node to pixel
        var pixelNode = []; //Array mapping pixel to its corresponding node.
        var nodeCount = 0;
        for (var i = 3; i < imgLen; i += 4) {
            pixel = Math.floor(i / 4);
            if (aData[i] > 0) {
                label[pixel] = offsets[0];
                paintedArea.push(pixel);
                pixelNode[pixel] = nodeCount;
                nodeCount++;
            }
        }

        if (nodeCount > 0) {
            var graph = new MaxFlowGraph(nodeCount);
            for (var iter = 1; iter <= iterations; iter++) {
                var alphaLabel = (iter) % offsets.length;
                var alphaOff = offsets[alphaLabel];
                for (var i = 0, paintedPixels = paintedArea.length; i < paintedPixels; i++) {
                    //var
                    pixel = paintedArea[i];
                    p4 = pixel * 4;
                    px = pixel % imgW;
                    py = Math.floor(pixel / imgW);

                    //var
                    alphaX = px + alphaOff.x, alphaY = py + alphaOff.y;
                    var clX = px + label[pixel].x, clY = py + label[pixel].y;
                    var naCost = 0, aCost = 0;
                    var thisNode = pixelNode[pixel];
                    //****TODO: INVESTIGATE WHY TURNING ON THIS BIT OF CODE TO MAKE PAINTED PIXELS INVALID
                    //****MAKES THE INPAINTING SIGNIFICANTLY WORSE

                    //!(clX > 0 && clX < imgW - 1 && clY > 0 && clY < imgH - 1) ||
                    if (!(clX > 0 && clX < imgW - 1 && clY > 0 && clY < imgH - 1)) {
                        naCost += INVALID_COST;
                    }
                    if(aData[(clX + clY * imgW) * 4 + 3] != 0)
                        naCost += INVALID_COST/2;
                    //!(alphaX > 0 && alphaX < imgW - 1 && alphaY > 0 && alphaY < imgH - 1) ||
                    if (!(alphaX > 0 && alphaX < imgW - 1 && alphaY > 0 && alphaY < imgH - 1)) {
                        aCost += INVALID_COST;
                    }
                    if(aData[(alphaX + alphaY * imgW) * 4 + 3] != 0) aCost += INVALID_COST/2;
                    if (aCost < INVALID_COST && naCost < INVALID_COST) {
                        //top
                        if (py > 0) {
                            var cp = pixel - imgW;
                            var cp4 = cp * 4;
                            var node = pixelNode[cp];
                            if (node != undefined) {
                                var cost = PhotomontagePairwiseFnRGB(p4, cp4, alphaOff, label[cp]);
//                        if (isNaN(cost))
//                            console.log("1 broke");
                                graph.SetEdge(thisNode, node, cost);
                            } else {
                                naCost += PhotomontageUnaryFnRGB(p4, cp4, label[pixel]);
                                aCost += PhotomontageUnaryFnRGB(p4, cp4, alphaOff);
                            }
                        }

                        //bottom
                        if (py < imgH) {
                            var cp = pixel + imgW, cp4 = cp * 4;
                            var node = pixelNode[cp];
                            if (node != undefined) {
                                var cost = PhotomontagePairwiseFnRGB(p4, cp4, alphaOff, label[cp]);
//                        if (isNaN(cost))
//                            console.log("2 broke");
                                graph.SetEdge(thisNode, node, cost);
                            } else {
                                naCost += PhotomontageUnaryFnRGB(p4, cp4, label[pixel]);
                                aCost += PhotomontageUnaryFnRGB(p4, cp4, alphaOff);
                            }
                        }

                        //left
                        if (px < imgW) {
                            var cp = pixel - 1, cp4 = cp * 4;
                            var node = pixelNode[cp];
                            if (node != undefined) {
                                var cost = PhotomontagePairwiseFnRGB(p4, cp * 4, alphaOff, label[cp]);
//                        if (isNaN(cost))
//                            console.log("3 broke");
                                graph.SetEdge(thisNode, node, cost);
                            } else {
                                naCost += PhotomontageUnaryFnRGB(p4, cp4, label[pixel]);
                                aCost += PhotomontageUnaryFnRGB(p4, cp4, alphaOff);
                            }
                        }

                        //right
                        if (px > 0) {
                            var cp = pixel + 1, cp4 = cp * 4;
                            var node = pixelNode[cp];
                            if (node != undefined) {
                                var cost = PhotomontagePairwiseFnRGB(p4, cp * 4, alphaOff, label[cp]);
//                        if (isNaN(cost))
//                            console.log("4 broke");
                                graph.SetEdge(thisNode, node, cost);
                            } else {
                                naCost += PhotomontageUnaryFnRGB(p4, cp4, label[pixel]);
                                aCost += PhotomontageUnaryFnRGB(p4, cp4, alphaOff);
                            }
                        }
                    }
                    graph.SetSourceEdge(thisNode, naCost);
                    graph.SetTargetEdge(thisNode, aCost);
                }

                console.log(iter + ": " + graph.MaxFlowBK());

                for (var j = 0; j < nodeCount; j++) {
                    if (graph.cut[j] == MAX_FLOW_SOURCE || graph.cut[j] == MAX_FLOW_FREE) {
                        label[paintedArea[j]] = alphaOff;
                    }
                    //else if (graph.cut[j] != graph.TARGET) { //&& graph.cut[j] != MAX_FLOW_FREE) {
                    //    console.log("why? cut " + j + "TYPE : " + graph.cut[j]);
                    //}
                }
                graph.Reset();
            }

            var result = [];
            for (var i = 0; i < nodeCount; i++) {
                var pixel = paintedArea[i];
                var p4 = pixel * 4;
                var pixLabel = (label[pixel].x + label[pixel].y * imgW) * 4;
                result[p4] = imgData[p4 + pixLabel];
                result[p4 + 1] = imgData[p4 + pixLabel + 1];
                result[p4 + 2] = imgData[p4 + pixLabel + 2];
            }
            return result;
            //
            // for (var pixel in result) {
            //     imgData[pixel] = result[pixel];
            // }
        }
    }

    function PhotomontagePairwiseFnRGB(p1, p2, o1, o2) {
        o1 = (o1.x + o1.y * imgW) * 4;
        o2 = (o2.x+ o2.y * imgW) * 4;
        var tmp = imgData[p1 + o1] - imgData[p2 + o2];
        tmp = tmp * tmp;
        var rgbDiff = tmp;
        tmp = imgData[p1 + 1 + o1] - imgData[p2 + 1 + o2];
        tmp = tmp * tmp;
        rgbDiff += tmp;
        tmp = imgData[p1 + 2 + o1] - imgData[p2 + 2 + o2];
        tmp = tmp * tmp;
        rgbDiff += tmp;

        return isNaN(rgbDiff) ? INVALID_COST : rgbDiff;
    }

    function PhotomontageUnaryFnRGB(p1, p2, o1) {
        o1 = (o1.x + o1.y * imgW) * 4;
        var tmp = imgData[p1 + o1] - imgData[p2];
        tmp = tmp * tmp;
        var rgbDiff = tmp;
        tmp = imgData[p1 + 1 + o1] - imgData[p2 + 1];
        tmp = tmp * tmp;
        rgbDiff += tmp;
        tmp = imgData[p1 + 2 + o1] - imgData[p2 + 2];
        tmp = tmp * tmp;
        rgbDiff += tmp;

        return isNaN(rgbDiff) ? INVALID_COST : rgbDiff;
    }

    function PhotomontagePairwiseFn(p1, p2, o1, o2) {
        o1 = (o1.x + o1.y * imgW) * 4;
        o2 = (o2.x+ o2.y * imgW) * 4;
        var tmp = imgData[p1 + o1] - imgData[p1 + o2];
        tmp = tmp * tmp;
        var t1 = tmp;
        tmp = imgData[p1 + o1 + 1] - imgData[p1 + o2 + 1];
        tmp = tmp * tmp;
        t1 += tmp;
        tmp = imgData[p1 + o1 + 2] - imgData[p1 + o2 + 2];
        tmp = tmp * tmp;
        t1 += tmp;

        tmp = imgData[p2 + o1] - imgData[p2 + o2];
        tmp = tmp * tmp;
        var t2 = tmp;
        tmp = imgData[p2 + o1 + 1] - imgData[p2 + o2 + 1];
        tmp = tmp * tmp;
        t2 += tmp;
        tmp = imgData[p2 + o1 + 2] - imgData[p2 + o2 + 2];
        tmp = tmp * tmp;
        t2 += tmp;

        var cost = t1 + t2;
        if(isNaN(cost))
            console.log("WHAT HAPPENED PLS")
        return isNaN(cost) ? INVALID_COST : cost;
    }

    function PhotomontageUnaryFn(p1, p2, o1) {
        o1 = (o1.y + o1.y * imgW) * 4;
        var w4 = imgW * 4;
        var tmp = imgData[p1 + o1] - imgData[p1];
        tmp = tmp * tmp;
        var t1 = tmp;
        tmp = imgData[p1 + o1 + 1] - imgData[p1 + 1];
        tmp = tmp * tmp;
        t1 += tmp;
        tmp = imgData[p1 + o1 + 2] - imgData[p1 + 2];
        tmp = tmp * tmp;
        t1 += tmp;

        tmp = imgData[p2 + o1] - imgData[p2];
        tmp = tmp * tmp;
        var t2 = tmp;
        tmp = imgData[p2 + o1 + 1] - imgData[p2 + 1];
        tmp = tmp * tmp;
        t2 += tmp;
        tmp = imgData[p2 + o1 + 2] - imgData[p2 + 2];
        tmp = tmp * tmp;
        t2 += tmp;

        var cost = t1 + t2;

        return isNaN(cost) ? INVALID_COST : cost;
    }

    return findOptimalAssignment();
}