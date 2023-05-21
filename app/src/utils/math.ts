
export function stdDev(values: number[]){
    const calculateMean = (values) => {
        return (values.reduce((sum, current) => sum + current)) / values.length;
    };

    // Calculate variance
    const calculateVariance = (values) => {
        const average = calculateMean(values);
        const squareDiffs = values.map((value) => {
            const diff = value - average;
            return diff * diff;
        });
        return calculateMean(squareDiffs);
    };

    // Calculate stand deviation
    const calculateSD = (variance) => {
        return Math.sqrt(variance);
    };

    return calculateSD(calculateVariance(values))
}

export function mean(values: number[]){
    let sum = values.reduce(function(a, b){
        return a + b;
    });

    return sum / values.length
}
