(function (global) {
    const t = global.Chess2TestHarness;

    t.add('bitboards export is available', function () {
        t.assert(typeof global.BB_ATTACKS !== 'undefined', 'BB_ATTACKS is not exported on the global object.');
    });

    t.add('bitboard attack masks match basic reference counts', function () {
        t.equal(Number(global.BB_ATTACKS.popcount(global.BB_ATTACKS.knight[28])), 8, 'Knight attack count on e4 is wrong.');
        t.equal(Number(global.BB_ATTACKS.popcount(global.BB_ATTACKS.king[0])), 3, 'King attack count on a1 is wrong.');
        t.equal(Number(global.BB_ATTACKS.popcount(global.BB_ATTACKS.rookAttacks(27, 0n))), 14, 'Rook attack count on d4 is wrong.');
        t.equal(Number(global.BB_ATTACKS.popcount(global.BB_ATTACKS.bishopAttacks(27, 0n))), 13, 'Bishop attack count on d4 is wrong.');
    });
})(typeof self !== 'undefined' ? self : window);