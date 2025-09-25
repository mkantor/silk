// TODO: Switch to `Array.fromAsync`.
export const arrayFromAsync = async <T>(
  source: AsyncIterable<T>,
): Promise<readonly T[]> => {
  const array = []
  for await (const element of source) {
    array.push(element)
  }
  return array
}

// TODO: Switch to `Array.fromAsync`.
export const asArrayOfHTMLFragments = async (
  source: string | Promise<string> | AsyncIterable<string>,
) => {
  const array = []
  for await (const element of await source) {
    array.push(element)
  }
  return array
}
