export const bytesToString = (bytes: number[]): string => {
    return Buffer.from(bytes)
      .filter(x => x)
      .toString();
  };

export const capitalizeFirst = s => (s && s[0].toUpperCase() + s.slice(1)) || ""