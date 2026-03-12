(function (global) {
	const encyclopedia = Array.isArray(global.Chess2EcoEncyclopediaData) ? global.Chess2EcoEncyclopediaData : [];
	const explorerBook = Array.isArray(global.Chess2OpeningExplorerBookData) ? global.Chess2OpeningExplorerBookData : encyclopedia;

	if (!Array.isArray(global.Chess2OpeningBookData) || !global.Chess2OpeningBookData.length) {
		global.Chess2OpeningBookData = explorerBook.slice();
	}
})(window);