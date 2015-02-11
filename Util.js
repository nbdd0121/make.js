function isArrayLike(array) {
	if (Array.isArray(array)) return true;
	if (typeof(array) !== 'object') return false;
	return 'length' in array;
}

function toArray(array) {
	if (Array.isArray(array)) {
		return array;
	} else if (isArrayLike(array)) {
		return Array.prototype.slice.call(array);
	} else {
		return [array];
	}
}

exports.isArrayLike = isArrayLike;
exports.toArray = toArray;

exports.flattenArray = function flattenArray(array) {
	array = toArray(array);
	for (var i = 0; i < array.length; i++) {
		if (isArrayLike(array[i])) {
			break;
		}
	}
	if (i === array.length) {
		return array;
	}
	var result = [];
	for (var i = 0; i < array.length; i++) {
		if (isArrayLike(array[i])) {
			Array.prototype.push.apply(result, flattenArray(array[i]));
		} else {
			result.push(array[i]);
		}
	}
	return result;
}