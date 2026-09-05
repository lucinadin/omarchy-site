const MASK_64 = (1n << 64n) - 1n;

function rotateLeft64(value: bigint, amount: bigint) {
  return ((value << amount) | (value >> (64n - amount))) & MASK_64;
}

export class SeededRandom {
  private state: [bigint, bigint, bigint, bigint];

  constructor(seed: number) {
    let splitMix = BigInt(Math.trunc(seed)) & MASK_64;
    const nextSplitMix = () => {
      splitMix = (splitMix + 0x9e37_79b9_7f4a_7c15n) & MASK_64;
      let value = splitMix;
      value = ((value ^ (value >> 30n)) * 0xbf58_476d_1ce4_e5b9n) & MASK_64;
      value = ((value ^ (value >> 27n)) * 0x94d0_49bb_1331_11ebn) & MASK_64;
      return (value ^ (value >> 31n)) & MASK_64;
    };
    this.state = [nextSplitMix(), nextSplitMix(), nextSplitMix(), nextSplitMix()];
  }

  private nextUint64() {
    const [first, second, third, fourth] = this.state;
    const result = (rotateLeft64((first + fourth) & MASK_64, 23n) + first) & MASK_64;
    const shifted = (second << 17n) & MASK_64;
    const nextThird = third ^ first;
    const nextFourth = fourth ^ second;
    const nextSecond = second ^ nextThird;
    const nextFirst = first ^ nextFourth;
    this.state = [
      nextFirst & MASK_64,
      nextSecond & MASK_64,
      (nextThird ^ shifted) & MASK_64,
      rotateLeft64(nextFourth & MASK_64, 45n),
    ];
    return result;
  }

  private below(maximum: number) {
    if (!Number.isSafeInteger(maximum) || maximum < 1) {
      throw new RangeError("Random range must be a positive safe integer");
    }
    const bitSource = BigInt(maximum - 1);
    const bitCount = bitSource === 0n ? 0 : bitSource.toString(2).length;
    const shift = BigInt(64 - Math.max(bitCount, 1));
    while (true) {
      const candidate = Number(this.nextUint64() >> shift);
      if (candidate < maximum) return candidate;
    }
  }

  choice<T>(values: readonly T[]): T {
    return values[this.choiceIndex(values.length)];
  }

  choiceIndex(length: number) {
    return this.below(length);
  }

  integer(minimum: number, maximum: number) {
    if (!Number.isSafeInteger(minimum) || !Number.isSafeInteger(maximum) || minimum > maximum) {
      throw new RangeError("Integer range must contain safe integers in ascending order");
    }
    return minimum + this.below(maximum - minimum + 1);
  }

  random() {
    return Number(this.nextUint64() >> 11n) * (1 / 2 ** 53);
  }

  range(minimum: number, maximum: number) {
    if (!Number.isSafeInteger(minimum) || !Number.isSafeInteger(maximum) || minimum >= maximum) {
      throw new RangeError("Half-open range must contain safe integers in ascending order");
    }
    return minimum + this.below(maximum - minimum);
  }

  shuffle<T>(values: T[]) {
    for (let index = values.length - 1; index > 0; index -= 1) {
      const swapIndex = this.below(index + 1);
      [values[index], values[swapIndex]] = [values[swapIndex], values[index]];
    }
  }

  uniform(minimum: number, maximum: number) {
    return minimum + (maximum - minimum) * this.random();
  }
}
