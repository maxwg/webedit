/* WALSH HADAMARD CURRENTLY TOO SLOW
    HOW INDEED DOES THE PAPER IMPLEMENT A 2 OPERATION WHT TRANSFORM
*/

/*
// Josh Allmann, 11 April 2013.
// Based on "The Gray Code Filter Kernels" by G. Ben-Artzi, et al.
// http://cs.haifa.ac.il/~hagit/papers/PAMI07-GrayCodeKernels.pdf
// to compile: gcc -o gck gck.c -lm

#include <stdio.h>
#include <stdlib.h>
#include <math.h>

static int gck_gc(int a)
{
    // return the gray code representation of a
    return (a >> 1) ^ a;
}

static int gck_prefix(int a, int b, int bits)
{
    // find the length of the bitwise common prefix between a and b.
    int c = 0, n = 1 << bits;
while (n && (a & n) == (b & n)) {
    c += 1;
    n >>= 1;
}
return c;
}

static void gck_dc(int *data, int *dc, int data_len, int dst_len)
{
    int i, kern_size = dst_len - data_len + 1;
if (data_len < kern_size) {
    fprintf(stderr, "Kernel larger than data. Exiting\n");
    exit(1);
}
dc[0] = data[0];
for (i = 1; i < kern_size; i++) {
    dc[i] = data[i] + dc[i-1];
}
for (; i < data_len; i++) {
    dc[i] = data[i] + dc[i-1] - data[i - kern_size];
}
for (; i < dst_len; i++) {
    dc[i] = dc[i - 1] - data[i - kern_size];
}
}

static int* gck_calc(int *data, int data_len, int kern_len, int bases)
{
    int i, j, bits, len = data_len + kern_len - 1;
int *res = malloc(len * sizeof(int) * bases), *p = res, *q = res;
// calculate first (DC) kernel
gck_dc(data, p, data_len, len);

// rest of kernels
bits = log2(kern_len) - 1;
for (i = 1; i < bases; i++) {
    int prefix = gck_prefix(gck_gc(i - 1), gck_gc(i), bits);
    int delta = 1 << prefix;
    int sign = (gck_gc(i) >> (bits - prefix)) & 1;
    q = p;
    p += len;
    for (j = 0; j < delta; j++) p[j] = -q[j];
    for (; j < len; j++) {
        if (sign) p[j] = q[j - delta] - p[j - delta] - q[j];
        else p[j] = p[j - delta] - q[j - delta] - q[j];
    }
}

for (i = 0; i < len*bases; i++){
    printf("%3d ", res[i]);
    if (i % len == len - 1)
        printf("\n");
}

return res;
}

static void print_res(int *p, int w, int kern_size, int bases)
{
    int i, len = w + kern_size - 1;
for (i = 0; i < bases; i++) {
    printf("%3d ", p[kern_size - 1]);
    p += len;
}
printf("\n");
}

#define BASES 8
#define KERN_LEN 8
int main()
{
    //int data[] = { 1, 2, 3, 4, 5, 6, 7, 8, 7, 6, 5, 4, 3, 2, 1, 0, 1, 2, 3, 4, 5 }, *res;
    int data[] = { 1, -1, -1, 1, 1, -1, -1, 1 }, *res;
    int size = sizeof(data)/sizeof(int);

    res = gck_calc(data, size, KERN_LEN, BASES);

    print_res(res, size, KERN_LEN, BASES);

    free(res);
    getchar();
    return 0;
}
#undef BASES
#undef KERN_LEN
*/

function GrayCode(a) {
    // return the gray code representation of a
    return (a >> 1) ^ a;
}

function GCPrefix(a, b, bits) {
    // find the length of the bitwise common prefix between a and b.
    var c = 0, n = 1 << bits;
    while (n && (a & n) == (b & n)) {
        c += 1;
        n >>= 1;
    }
    return c;
}

function GrayCodeDC(data, dc, data_len, dst_len) {
    var i, kern_size = dst_len - data_len + 1;
    dc[0] = data[0];
    for (i = 1; i < kern_size; i++) {
        dc[i] = data[i] + dc[i - 1];
    }
    for (; i < data_len; i++) {
        dc[i] = data[i] + dc[i - 1] - data[i - kern_size];
    }
    for (; i < dst_len; i++) {
        dc[i] = dc[i - 1] - data[i - kern_size];
    }
}

function Log2(n) {
    var log = 0;
    while (n >>= 1) log++;
    return log;
}

/*
    Calculates Walsh Hadamard using GCK -- currently sequency ordered !! should be dyadic
    Maybe try iDCT?? 
*/
function WalshHadamardGCK(data, data_len, kern_len, bases) {
    var i, j, bits, len = data_len + kern_len - 1;
    //int *res = malloc(len * sizeof(int) * bases), *p = res, *q = res;
    var res = [], p = 0, q = 0;
    // calculate first (DC) kernel
    GrayCodeDC(data, res, data_len, len);

    // rest of kernels
    bits = Log2(kern_len) - 1;
    for (i = 1; i < bases; i++) {
        var prefix = GCPrefix(GrayCode(i - 1), GrayCode(i), bits);
        var delta = 1 << prefix; 1
        var sign = (GrayCode(i) >> (bits - prefix)) & 1;
        q = p;
        p += len;
        for (j = 0; j < delta; j++) res[p + j] = -res[q + j];
        for (; j < len; j++) {
            if (sign) res[p + j] = res[q + j - delta] - res[p + j - delta] - res[q + j];
            else res[j + p] = res[p + j - delta] - res[q + j - delta] - res[q + j];
        }
    }
    return res;
}

/*  Basic Walsh Hadamard method
    -- Does not normalize data! However, this should make no difference for the 
       purpose of the inpainting algorithm
*/
function WalshHadamard(data, datalen, bases) {
    var gckWH = WalshHadamardGCK(data, datalen, datalen, bases);
    var rtn = [];
    var len = datalen + datalen - 1;
    var end = len * bases;
    for (i = datalen - 1; i < end; i += len) {
        rtn.push(gckWH[i])
    }
    return rtn;
}