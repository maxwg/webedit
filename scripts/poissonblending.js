//Javascript Implementation of Chris Tralie's poisson blend
//algorithm -- http://www.ctralie.com/Teaching/PoissonImageEditing/#source

var regionSize;
var diagonal;
var offDiagonal, result, target, prevResult;
const omega = 1.95;

//Where paintedArea is an array mapping node to pixel
//foreimage is a sparse array mapping pixel to rgb value.
function PoissonBlend(backImage, foreImage, paintedArea, label, pixelNode, isWorker) {
    regionSize = paintedArea.length;
    diagonal = new Uint8Array(regionSize);
    offDiagonal = new Int32Array(regionSize * 4);
    result = new Float32Array(regionSize * 3);
    prevResult = new Float32Array(regionSize * 3);
    target = new Float32Array(regionSize * 3);
    var width = backImage.width;
    var height = backImage.height;

    var neighbours = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (var i = 0; i < regionSize; i++) {
        var validNeighbours = 0;
        var selPx = paintedArea[i]
        var x = selPx % width;
        var y = ~~(selPx / width);

        var red = foreImage[selPx * 4];
        var green = foreImage[selPx * 4 + 1];
        var blue = foreImage[selPx * 4 + 2];

        target[i * 3] = 0.0;
        target[i * 3 + 1] = 0.0;
        target[i * 3 + 2] = 0.0;
        for (var k = 0; k < neighbours.length; k++) {
            var x2 = x + neighbours[k][0];
            var y2 = y + neighbours[k][1];
            offDiagonal[i * 4 + k] = -1;
            if (x2 < 0 || x2 > width - 1 || y2 < 0 || y2 > height - 1)
                continue;
            validNeighbours++;
            var index = pixelNode[x2 + y2 * width];
            index = index < 0 ? -index - 1 : index;
            if (index == undefined) { //border pixel
                target[i * 3] += backImage.data[(x2 + y2 * width) * 4];
                target[i * 3 + 1] += backImage.data[(x2 + y2 * width) * 4 + 1];
                target[i * 3 + 2] += backImage.data[(x2 + y2 * width) * 4 + 2];
            } else {
                offDiagonal[i * 4 + k] = index;
                var red2 = foreImage[(x2 + y2 * width) * 4];
                var green2 = foreImage[(x2 + y2 * width) * 4 + 1];
                var blue2 = foreImage[(x2 + y2 * width) * 4 + 2];
                target[i * 3] += red - red2;
                target[i * 3 + 1] += green - green2;
                target[i * 3 + 2] += blue - blue2;
            }
        }
        diagonal[i] = validNeighbours;
    }

    var iteration = 0;
    var error;
    var Norm = 1.0;
    do {
        error = PoissonError();
        if (iteration == 1)
            Norm = Math.log(error);
        iteration++;
        for (var i = 0; i < 100; i++)
            PoissonIteration();
        if (isWorker)
            self.postMessage({ progress: true, task: "Performing Poisson Blend", complete: 95 + 5 * Math.pow(1 / error, 0.1) });

    } while (error > 1.0);

    return result;
}

function PoissonIteration() {
    for (var i = 0; i < regionSize; i++) {
        prevResult[i * 3] = result[i * 3];
        prevResult[i * 3 + 1] = result[i * 3 + 1];
        prevResult[i * 3 + 2] = result[i * 3 + 2];
        result[i * 3] = target[i * 3];
        result[i * 3 + 1] = target[i * 3 + 1];
        result[i * 3 + 2] = target[i * 3 + 2];
        for (var n = 0; n < 4; n++) {
            if (offDiagonal[i * 4 + n] >= 0) {
                var index = offDiagonal[i * 4 + n];
                result[i * 3] += result[index * 3];
                result[i * 3 + 1] += result[index * 3 + 1];
                result[i * 3 + 2] += result[index * 3 + 2];
            }
        }

        result[i * 3] = prevResult[i * 3] + omega * (result[i * 3] / diagonal[i] - prevResult[i * 3]);
        result[i * 3 + 1] = prevResult[i * 3 + 1] + omega * (result[i * 3 + 1] / diagonal[i] - prevResult[i * 3 + 1]);
        result[i * 3 + 2] = prevResult[i * 3 + 2] + omega * (result[i * 3 + 2] / diagonal[i] - prevResult[i * 3 + 2]);
    }
}

function PoissonError() {
    var total = 0.0;
    for (var i = 0; i < regionSize; i++) {
        var e1 = target[i * 3];
        var e2 = target[i * 3 + 1];
        var e3 = target[i * 3 + 2];
        for (var n = 0; n < 4; n++) {
            if (offDiagonal[i * 4 + n] >= 0) {
                var index = offDiagonal[i * 4 + n];
                e1 += result[index * 3];
                e2 += result[index * 3 + 1];
                e3 += result[index * 3 + 2];
            }
        }
        e1 -= diagonal[i] * result[i * 3];
        e2 -= diagonal[i] * result[i * 3 + 1];
        e3 -= diagonal[i] * result[i * 3 + 2];
        total += e1 * e1 + e2 * e2 + e3 * e3;
    }
    return Math.sqrt(total);
}