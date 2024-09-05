export function arrSubtraction(array1, array2) {
    return array1.filter(x => array2.indexOf(x) == -1);
}