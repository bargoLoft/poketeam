export const getChosung = (text) => {
  if (!text) return "";
  const CHOSUNG = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
  let result = "";
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i) - 44032;
    if (code > -1 && code < 11172) {
      result += CHOSUNG[Math.floor(code / 588)];
    } else {
      result += text.charAt(i);
    }
  }
  return result;
};
