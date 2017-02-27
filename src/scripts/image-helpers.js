/*  Get a size*size patch with top-right coordinate (x,y) -- Paper mentions 'centred' however TR more efficient.
    DOES NOT CHECK FOR INDEX OUT OF BOUNDS for performance.
    Returns a vector equivalent to the raster linearisation of the patch.
*/
var IMAGEHELPERS = function () {
    /*  Takes a canvas RGB data array (r,g,b,a) and converts it to YUV, ignoring alpha.
     returns object with properties {y:[], u:[], v:[], w:width, h:height}
     */
    function RGBtoYUV(imageData) {
        var imgPixels = (imageData.height * imageData.width);
        var y = [], u = [], v = [];
        var r, g, b;
        for (var i = 0; i < imgPixels; i++) {
            r = imageData.data[i * 4];
            g = imageData.data[i * 4 + 1];
            b = imageData.data[i * 4 + 2];
            y.push(r * .299000 + g * .587000 + b * .114000);
            u.push(r * -.168736 + g * -.331264 + b * .500000 + 128);
            v.push(r * .500000 + g * -.418688 + b * -.081312 + 128);
        }
        return {w: imageData.width, h: imageData.height, y: y, u: u, v: v};
    }

    /*  Takes YUV data in the format returned by RGBtoYUV and converts to an ImageData
     */
    function YUVtoRGB(imageData, context) {
        var imgPixels = (imageData.h * imageData.w);
        var canvasImg = context.createImageData(imageData.w, imageData.h);
        for (var i = 0; i < imgPixels; i++) {
            var y = imageData.y[i];
            var u = imageData.u[i];
            var v = imageData.v[i];
            canvasImg.data[i * 4] = y + 1.4075 * (v - 128);
            canvasImg.data[i * 4 + 1] = y - 0.3455 * (u - 128) - (0.7169 * (v - 128))
            canvasImg.data[i * 4 + 2] = y + 1.7790 * (u - 128)
            canvasImg.data[i * 4 + 3] = 255;
        }
        return canvasImg;
    }

    return {
        RGBtoYUV: RGBtoYUV,
        YUVtoRGB: YUVtoRGB
    }
}();
if(typeof module !== 'undefined' && module.exports)
    module.exports = IMAGEHELPERS;
else
    this.ImageHelpers = IMAGEHELPERS;