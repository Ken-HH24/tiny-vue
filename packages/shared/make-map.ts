export const makeMap = (str: string, isLowerCase?: boolean) => {
  const map: Record<string, boolean | undefined> = {}
  str.split(',').forEach((ch) => {
    map[ch] = true
  })

  return isLowerCase ? (val: string) => !!map[val.toLowerCase()] : (val: string) => !!map[val]
}
