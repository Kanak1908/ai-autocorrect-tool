let dictionary = new Set();
let wordList = [];

// Load dictionary
fetch("words_alpha.txt")
  .then(response => response.text())
  .then(text => {
    let words = text.split("\n");

    words.forEach(word => {
      word = word.trim().toLowerCase();

      if (/^[a-z]+$/.test(word)) {
        dictionary.add(word);
        wordList.push(word);
      }
    });

    console.log("Dictionary Loaded:", dictionary.size);
  });


// Levenshtein Distance
function levenshtein(a, b) {
  const matrix = Array.from({ length: b.length + 1 }, () =>
    Array(a.length + 1).fill(0)
  );

  for (let i = 0; i <= b.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}


// Smarter Suggestion
function getBestSuggestion(word, previousWord) {

  if (word.length <= 2) return word;
  if (dictionary.has(word)) return word;

  let bestMatch = word;
  let minScore = Infinity;

  for (let dictWord of wordList) {

    // Must start with same first letter (BIG improvement)
    if (dictWord[0] !== word[0]) continue;

    // Ignore very short words
    if (dictWord.length < 4) continue;

    // Limit length difference
    if (Math.abs(dictWord.length - word.length) > 2) continue;

    let distance = levenshtein(word, dictWord);

    if (distance <= 2) {

      let score = distance;

      // Prefer longer words
      score -= dictWord.length * 0.01;

      // Grammar boost for verbs
      if (previousWord) {
        previousWord = previousWord.toLowerCase();

        if (["i", "you", "we", "they"].includes(previousWord)) {
          if (dictWord.endsWith("ise") ||
              dictWord.endsWith("ize") ||
              dictWord.endsWith("ing") ||
              dictWord.endsWith("ed")) {
            score -= 1;
          }
        }
      }

      if (score < minScore) {
        minScore = score;
        bestMatch = dictWord;
      }
    }
  }

  return bestMatch;
}


// Context Helper
function applyBasicGrammarRules(words) {

  // Capitalize first word
  if (words.length > 0) {
    words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1);
  }

  return words;
}


// Correct Sentence
function correctSentence() {

  let input = document.getElementById("inputText").value.trim();

  if (!input) {
    document.getElementById("outputText").innerText = "";
    return;
  }

  let words = input.split(" ");
  let corrected = [];

  for (let i = 0; i < words.length; i++) {

    let originalWord = words[i];

    // Extract punctuation
    let prefix = originalWord.match(/^[^a-zA-Z]*/)[0];
    let suffix = originalWord.match(/[^a-zA-Z]*$/)[0];

    let cleanWord = originalWord
      .toLowerCase()
      .replace(/[^a-z]/g, "");

    if (cleanWord.length === 0) {
      corrected.push(originalWord);
      continue;
    }

    // Protect very small words
    if (cleanWord.length <= 2) {
      corrected.push(originalWord);
      continue;
    }

    let previousWord = i > 0
      ? corrected[i - 1].toLowerCase().replace(/[^a-z]/g, "")
      : null;

    let suggestion = getBestSuggestion(cleanWord, previousWord);

    // Restore capitalization
    if (originalWord[0] === originalWord[0].toUpperCase()) {
      suggestion = suggestion.charAt(0).toUpperCase() + suggestion.slice(1);
    }

    corrected.push(prefix + suggestion + suffix);
  }

  // Capitalize first word of sentence
  if (corrected.length > 0) {
    corrected[0] =
      corrected[0].charAt(0).toUpperCase() +
      corrected[0].slice(1);
  }

  document.getElementById("outputText").innerText =
    corrected.join(" ");
}