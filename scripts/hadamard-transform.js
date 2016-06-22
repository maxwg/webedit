/*******************************************************************************
** hadamardtransform.js
** Copyright (C) 2015, Max Wang <maxw@inbox.com>
** Implements a dyadic ordered Walsh Hadamard Transform using the Gray Code
** Kernel Method, as specified in
** http://www.cs.haifa.ac.il/hagit/papers/papersOLD/GCKpami.pdf
*******************************************************************************/

"use strict";

var WalshHadamardTransform = function (data_len) {
    const DATA_LEN = data_len;
    const depth = ~~Math.sqrt(DATA_LEN);
    var deltas = [0];
    var signs = [0];
    establishGrayCodeOrder();

    function transform(data, noBases) {
        // calculate first (DC) kernel
        var ker1 = walshDCKernel(data);
        var ker2 = new Float32Array(DATA_LEN);

        // rest of kernels
        var baseIdx = data_len - 1;
        var bases = [ker1[baseIdx]];
        for (var i = 1; i < noBases; i++) {
            var delta = deltas[i];
            for (var j = 0; j < delta; j++) {
                ker2[j] = -ker1[j];
            }
            for (var j = delta; j < data_len; j++) {
                if (signs[i]) ker2[j] = -ker1[j] + ker1[j - delta] - ker2[j - delta];
                else ker2[j] = -ker1[j] - ker1[j - delta] + ker2[j - delta];
            }
            bases.push(ker2[baseIdx]);

            i++;
            if (i < noBases) {
                delta = deltas[i];
                for (var j = 0; j < delta; j++) {
                    ker1[j] = -ker2[j];
                }
                for (var j = delta; j < data_len; j++) {
                    if (signs[i]) ker1[j] = -ker2[j] + ker2[j - delta] - ker1[j - delta];
                    else ker1[j] = -ker2[j] - ker2[j - delta] + ker1[j - delta];
                }
                bases.push(ker1[baseIdx]);
            }
        }
        return bases;
    }

    function walshDCKernel(data) {
        var dc = new Float32Array(DATA_LEN);
        dc[0] = data[0];
        for (var i = 1; i < DATA_LEN; i++) {
            dc[i] = data[i] + dc[i - 1];
        }
        return dc;
    }

    function establishGrayCodeOrder() {
        var bit_len = ~~Math.log2(DATA_LEN) - 1;
        for (var i = 1; i < DATA_LEN; i++) {
            var prefix = gcPrefix(grayCode(i - 1), grayCode(i), bit_len);
            deltas.push(1 << prefix);
            signs.push((grayCode(i) >> (bit_len - prefix)) & 1);
        }
    }

    function gcPrefix(a, b, bits) {
        // find the length of the bitwise common prefix between a and b.
        var c = 0, n = 1 << bits;
        while (n && (a & n) == (b & n)) {
            c += 1;
            n >>= 1;
        }
        return c;
    }

    function grayCode(a) {
        // return the gray code representation of a
        return (a >> 1) ^ a;
    }

    return transform;
};

if (typeof module !== 'undefined' && module.exports)
    module.exports=WalshHadamardTransform;
else
    this.WHT = WalshHadamardTransform;