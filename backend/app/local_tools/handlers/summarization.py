"""
Lightweight rule-based extractive summarization utility.
"""

import re
from typing import List

def handle_summarization(prompt: str) -> str:
    """
    Summarizes input text using extractive sentence frequency scoring.

    Args:
        prompt: The input task prompt.

    Returns:
        The extracted summary sentence(s).
    """
    # 1. Isolate text body to summarize if colon divider is present
    text_body = prompt
    if ":" in prompt:
        parts = prompt.split(":", 1)
        # Check if the part after the colon is substantial
        if len(parts[1].strip()) > 30:
            text_body = parts[1].strip()

    # 2. Split text into sentences using simple regex
    sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', text_body) if s.strip()]
    if not sentences:
        return "Unable to generate a summary."

    # 3. Stopwords list
    stopwords = {
        "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "with", 
        "is", "was", "were", "it", "this", "that", "of", "by", "as", "are", "from",
        "has", "had", "have", "be", "been", "which", "who", "whom", "whose", "about",
        "if", "then", "else", "not", "so", "up", "down", "out", "into", "over", "under"
    }

    # 4. Tokenize and calculate word frequencies (case-insensitive)
    word_freq = {}
    tokens = re.findall(r'\b[a-zA-Z]+\b', text_body.lower())
    for token in tokens:
        if token not in stopwords:
            word_freq[token] = word_freq.get(token, 0) + 1

    # 5. Score sentences based on sum of word frequencies
    sentence_scores = []
    for idx, sentence in enumerate(sentences):
        score = 0
        s_words = re.findall(r'\b[a-zA-Z]+\b', sentence.lower())
        for w in s_words:
            score += word_freq.get(w, 0)
        # Normalize score by word count to avoid favoring long sentences purely for length
        word_count = len(s_words)
        normalized_score = score / max(word_count, 1)
        sentence_scores.append((normalized_score, idx, sentence))

    # Sort descending by score
    sentence_scores.sort(key=lambda x: x[0], reverse=True)

    # 6. Parse length constraints from prompt
    prompt_lower = prompt.lower()
    num_sentences = 1
    if "one sentence" in prompt_lower or "1 sentence" in prompt_lower:
        num_sentences = 1
    elif "two sentences" in prompt_lower or "2 sentences" in prompt_lower:
        num_sentences = 2
    elif "three sentences" in prompt_lower or "3 sentences" in prompt_lower:
        num_sentences = 3

    # Limit by sentences available
    num_sentences = min(num_sentences, len(sentences))

    # Keep original ordering of extracted sentences
    top_selections = sentence_scores[:num_sentences]
    top_selections.sort(key=lambda x: x[1])

    summary = " ".join([item[2] for item in top_selections])
    return summary
